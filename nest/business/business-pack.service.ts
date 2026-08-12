import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BusinessRepository } from './business.repository';

// 팩 파이프라인은 레거시 단일소스를 그대로 호출한다 — 분류·플래너·캐논 레퍼 굽기·크레딧 정산·
//   백그라운드 작업이 전부 여기 얽혀 있어서, 어드민용으로 다시 구현하면 두 벌이 갈라진다.
//   `ops`는 Express 핸들러를 { status, body } 반환 함수로 바꿔주는 어댑터(nest/pack이 쓰는 것과 동일).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packRoute = require(path.join(__dirname, '..', '..', 'src', 'pack', 'pack.route.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const creditService = require(path.join(__dirname, '..', '..', 'src', 'credits', 'credit.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));

const packOps = packRoute.ops;
const packReads = packRoute.reads;

/** 스틸 1장 단가 — pack.route.js와 같은 식으로 파생시킨다(숫자를 베끼면 언젠가 갈라진다) */
const STILL_UNIT = creditService.imageCost('pro', 1, true);

/** 팩 업로드 임시 디렉터리 — 레거시 multer와 같은 위치 */
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic',
};

/** 한 팩에 넣을 수 있는 원본 수 — 레거시 라우트의 upload.array('photos', 10)과 맞춘다 */
const MAX_PHOTOS = 10;

@Injectable()
export class BusinessPackService {
  constructor(private readonly repo: BusinessRepository) {}

  /**
   * 1단계: 원본 사진을 AI가 훑어 카테고리·상태·SKU·촬영 렌즈를 제안한다.
   * 팩을 만들기 전에 관리자가 확인·수정할 값들이다.
   */
  async classify(user: any, businessId: string, mediaIds: string[], product: string) {
    const files = await this.stageFiles(businessId, mediaIds);
    try {
      const { body } = await packOps.classify({ user, body: { product: product || '' }, files });
      // 성공 시엔 classifyHandler가 임시 파일을 이미 지웠다 — 여기서 또 지우지 않는다.
      return body;
    } catch (err) {
      // 실패하면 핸들러가 정리 지점까지 못 갔다 → 우리가 만든 복사본은 우리가 치운다.
      this.discard(files);
      throw err;
    }
  }

  /**
   * 2단계: 팩 생성. 202로 즉시 반환되고 캐논 레퍼 굽기는 백그라운드로 돈다.
   * 생성된 팩은 곧바로 사업체에 연결해 둔다 — 실패해도 목록에 남아 재개할 수 있다.
   */
  async create(user: any, businessId: string, dto: any) {
    const files = await this.stageFiles(businessId, dto.mediaIds);

    // 레거시 핸들러는 멀티파트 폼 문자열을 기대한다(JSON.parse로 되읽는 필드가 있다).
    const body: Record<string, any> = {
      vertical: dto.vertical || 'beverage',
      product: dto.product || '',
      category: dto.category || '',
      item: dto.item || '',
      unit: dto.unit || '',
      sourceHasModel: String(!!dto.sourceHasModel),
    };
    if (dto.states) body.states = JSON.stringify(dto.states);
    if (dto.skus) body.skus = JSON.stringify(dto.skus);
    if (dto.lenses) body.lenses = JSON.stringify(dto.lenses);

    let status: number;
    let created: any;
    try {
      ({ status, body: created } = await packOps.create({ user, body, files }));
    } catch (err) {
      this.discard(files);
      throw err;
    }
    if (status >= 400 || !created || !created.id) {
      this.discard(files);
      throw new BadRequestException((created && created.error) || '팩 생성에 실패했습니다');
    }
    // 성공 경로에서는 지우지 않는다 — prepPack이 다음 tick에 이 파일들을 읽어 workDir로 복사한다.

    await this.repo.linkPack(businessId, String(created.id));
    return { packId: String(created.id), shareId: created.shareId, status: created.status };
  }

  /**
   * 진행 상태 폴링. 화면이 알아야 할 것만 추려서 준다 —
   * 팩 원본 응답은 자산 전체가 실려 있어 폴링마다 주고받기엔 크다.
   */
  async status(user: any, businessId: string, packId: string) {
    await this.assertPackLinked(businessId, packId);
    const pack = await packReads.pack(user.id, packId);

    const assets = pack.assets || [];
    const cuts = ((pack.config || {}).plan || {}).cuts || [];
    const stillsDone = new Set(
      assets.filter((a: any) => a.kind === 'still' && a.url).map((a: any) => a.cut_key));
    const remaining = cuts.filter((c: any) => !stillsDone.has(c.key)).length;

    return {
      packId: String(pack.id),
      shareId: pack.share_id,
      status: pack.status,             // processing | ref_ready | done | failed
      error: pack.error || null,
      plannedCuts: cuts.length,
      stillsDone: stillsDone.size,
      remaining,
      /** 남은 컷을 다 만들 때의 비용. 관리자 계정은 면제라 화면에서 안내용으로만 쓴다. */
      stillUnit: STILL_UNIT,
      stillCost: remaining * STILL_UNIT,
      refUrls: assets.filter((a: any) => a.kind === 'ref' && a.url).map((a: any) => a.url),
      stillUrls: assets.filter((a: any) => a.kind === 'still' && a.url).map((a: any) => a.url),
      ref: pack.ref || null,           // 굽기 무료 잔여(refInfo)
    };
  }

  /**
   * 3단계: 캐논 레퍼를 확인한 뒤 컷 생성 시작(ref_ready 상태에서만).
   * 크레딧 차감이 여기서 일어나므로 자동으로 태우지 않고 관리자가 눌러야 한다.
   */
  async generate(user: any, businessId: string, packId: string, depth: number) {
    await this.assertPackLinked(businessId, packId);
    const { status, body } = await packOps.generate({
      user, params: { id: packId }, body: { depth: depth || 0 },
    });
    if (status >= 400) throw new BadRequestException((body && body.error) || '컷 생성을 시작하지 못했습니다');
    return body;
  }

  // ── 내부 ──

  /** 임시 복사본 정리 — 이미 지워졌을 수 있으므로 실패는 무시한다 */
  private discard(files: { path: string }[]): void {
    for (const f of files) {
      try { fs.unlinkSync(f.path); } catch { /* 이미 정리됨 */ }
    }
  }

  private async assertPackLinked(businessId: string, packId: string): Promise<void> {
    const packs = await this.repo.packsOf(businessId);
    if (!packs.some((p) => p.pack_id === String(packId))) {
      throw new NotFoundException('이 사업체에 연결된 팩이 아닙니다');
    }
  }

  /**
   * 선택한 사업체 미디어를 팩 업로드 임시경로로 **복사**한다.
   *
   * ⚠️ 원본 경로를 그대로 넘기면 안 된다 — classify 핸들러는 처리 후 `req.files`의 파일을
   *   지우고(정상 동작: 멀터 임시파일 정리), 업로드 정규화도 거절 시 삭제한다.
   *   경로를 넘겼다면 사업체의 원본 사진이 사라진다.
   */
  private async stageFiles(businessId: string, mediaIds: string[]) {
    if (!Array.isArray(mediaIds) || !mediaIds.length) {
      throw new BadRequestException('팩에 쓸 원본 이미지를 선택하세요');
    }
    if (mediaIds.length > MAX_PHOTOS) {
      throw new BadRequestException(`원본은 최대 ${MAX_PHOTOS}장까지 넣을 수 있습니다`);
    }

    const owned = await this.repo.mediaOf(businessId);
    const files: { path: string; mimetype: string; originalname: string }[] = [];

    for (const mediaId of mediaIds) {
      const media = owned.find((m) => m.id === mediaId);
      if (!media) throw new NotFoundException('이 사업체의 미디어가 아닙니다');
      if (media.media_type !== 'image') {
        throw new BadRequestException('팩 원본은 이미지만 넣을 수 있습니다');
      }

      const filename = media.file_path.split('/').pop() as string;
      const ext = path.extname(filename).toLowerCase();
      const buf = await this.readMedia(filename);
      if (!buf) throw new BadRequestException(`원본 파일을 찾을 수 없습니다: ${filename}`);

      const staged = path.join(UPLOAD_DIR, `${crypto.randomUUID()}${ext || '.jpg'}`);
      fs.writeFileSync(staged, buf);
      files.push({
        path: staged,
        mimetype: MIME_BY_EXT[ext] || 'image/jpeg',
        originalname: filename,
      });
    }
    return files;
  }

  /** 로컬 tmp → 오브젝트 스토리지 순으로 읽는다(R2로 오프로드된 과거 파일 대응) */
  private async readMedia(filename: string): Promise<Buffer | null> {
    const local = path.join(process.cwd(), 'tmp', 'images', filename);
    if (fs.existsSync(local)) return fs.readFileSync(local);
    if (!mediaStore.isRemote()) return null;

    const obj = await mediaStore.getObject(filename);
    if (!obj || !obj.Body) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of obj.Body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
}
