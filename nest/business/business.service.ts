import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { BusinessRepository, toFilePath } from './business.repository';
import { BusinessCaptionService } from './business-caption.service';
import {
  CreateBusinessDto, EnqueueDto, GenerateCaptionDto, LinkAccountDto, LinkPackDto,
  RegisterMediaDto, UpdateBusinessDto, UpdateQueueDto,
} from './dto/business.dto';
import {
  BusinessAccountVo, BusinessListItemVo, BusinessMediaVo, BusinessPackVo,
  BusinessQueueVo, BusinessVo, CaptionDraftVo,
} from './vo/business.vo';

// 즉시 발행은 기존 스케줄러의 단일 항목 발행을 그대로 쓴다 —
//   BGM 머지·Zernio 업로드·상태 기록이 전부 거기 있고, 두 벌이 되면 갈라진다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const scheduler = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'scheduler.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const zernio = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'zernio.client.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const accountRepo = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'account.repository.js'));

/** 큐가 가질 수 있는 상태 — 임의 문자열이 들어오면 스케줄러가 영영 안 집는다 */
const QUEUE_STATUSES = ['pending', 'confirmed', 'scheduled', 'posted', 'cancelled'];
const BUSINESS_STATUSES = ['active', 'paused'];

@Injectable()
export class BusinessService {
  constructor(
    private readonly repo: BusinessRepository,
    private readonly captions: BusinessCaptionService,
  ) {}

  // ── 사업체 ──

  list(): Promise<BusinessListItemVo[]> {
    return this.repo.listBusinesses();
  }

  /** 존재 확인 겸 조회 — 하위 리소스 핸들러가 전부 이걸 먼저 태운다 */
  async get(id: string): Promise<BusinessVo> {
    const b = await this.repo.findBusiness(id);
    if (!b) throw new NotFoundException('사업체를 찾을 수 없습니다');
    return b;
  }

  /** 상세 화면 1회 로드 — 계정·미디어·팩·큐를 한 번에 내려 라운드트립을 줄인다 */
  async detail(id: string): Promise<{
    business: BusinessVo; accounts: BusinessAccountVo[]; media: BusinessMediaVo[];
    packs: BusinessPackVo[]; queue: BusinessQueueVo[];
  }> {
    const business = await this.get(id);
    const [accounts, media, packs, queue] = await Promise.all([
      this.repo.accountsOf(id),
      this.repo.mediaOf(id),
      this.repo.packsOf(id),
      this.repo.queueOf(id),
    ]);
    return { business, accounts, media, packs, queue };
  }

  create(body: CreateBusinessDto): Promise<BusinessVo> {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('사업체 이름은 필수입니다');
    return this.repo.insertBusiness({ name, industry: body.industry, memo: body.memo });
  }

  async update(id: string, body: UpdateBusinessDto): Promise<BusinessVo> {
    await this.get(id);
    if (body.status !== undefined && !BUSINESS_STATUSES.includes(body.status)) {
      throw new BadRequestException(`status는 ${BUSINESS_STATUSES.join(' | ')} 중 하나여야 합니다`);
    }
    if (body.name !== undefined && !body.name.trim()) {
      throw new BadRequestException('사업체 이름은 비울 수 없습니다');
    }
    return (await this.repo.updateBusiness(id, { ...body })) as BusinessVo;
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.removeBusiness(id);
  }

  // ── 인스타 계정 연결 ──

  /**
   * Zernio에서 연결된 계정을 끌어와 social_accounts에 동기화한다.
   * 관리자 화면의 "계정 불러오기" — 여기서 받은 계정을 사업체에 붙이면 연결 완료.
   */
  async syncAccounts(userId: string): Promise<BusinessAccountVo[]> {
    const remote = await zernio.listAccounts();
    const synced: BusinessAccountVo[] = [];
    for (const acc of remote) {
      synced.push(await accountRepo.insert({
        userId,
        platform: acc.platform,
        accountId: acc._id,
        username: acc.username,
        displayName: acc.displayName || acc.username,
        profileImage: acc.profileImage || null,
        followers: acc.followers || 0,
        metadata: acc,
      }));
    }
    return synced;
  }

  unlinkedAccounts(): Promise<BusinessAccountVo[]> {
    return this.repo.unlinkedAccounts();
  }

  accounts(id: string): Promise<BusinessAccountVo[]> {
    return this.repo.accountsOf(id);
  }

  async linkAccount(id: string, body: LinkAccountDto): Promise<BusinessAccountVo> {
    await this.get(id);
    if (!body.accountId) throw new BadRequestException('accountId는 필수입니다');
    const account = await this.repo.findAccount(body.accountId);
    if (!account) throw new NotFoundException('계정을 찾을 수 없습니다');
    if (account.business_id && account.business_id !== id) {
      throw new BadRequestException('이미 다른 사업체에 연결된 계정입니다 — 먼저 연결을 해제하세요');
    }
    return (await this.repo.setAccountBusiness(body.accountId, id)) as BusinessAccountVo;
  }

  async unlinkAccount(id: string, accountId: string): Promise<void> {
    await this.get(id);
    const account = await this.repo.findAccount(accountId);
    if (!account || account.business_id !== id) throw new NotFoundException('이 사업체의 계정이 아닙니다');
    await this.repo.setAccountBusiness(accountId, null);
  }

  // ── 미디어(오리지널 이미지 · 결과물) ──

  media(id: string, q: { isBase?: string; mediaType?: string }): Promise<BusinessMediaVo[]> {
    return this.repo.mediaOf(id, {
      isBase: q.isBase === undefined ? undefined : q.isBase === 'true',
      mediaType: q.mediaType,
    });
  }

  /**
   * 업로드된 파일을 사업체 미디어로 등록한다.
   * account_id는 비워둔다 — 계정 연동 전에도 자료를 받을 수 있어야 하고,
   * 발행 시점에 어느 계정으로 올릴지는 큐에서 따로 정한다.
   */
  async uploadMedia(id: string, file: any, isBase: boolean): Promise<BusinessMediaVo> {
    await this.get(id);
    if (!file) throw new BadRequestException('파일이 필요합니다');
    const mediaType = file.mimetype?.startsWith('video') ? 'video'
      : file.mimetype?.startsWith('audio') ? 'audio' : 'image';

    const media = await this.repo.insertMedia({
      businessId: id, filePath: `tmp/images/${file.filename}`, mediaType, source: 'upload',
    });
    return isBase ? ((await this.repo.setBaseMedia(id, media.id)) as BusinessMediaVo) : media;
  }

  /** 이미 서버에 있는 파일(팩 자산·생성물)을 사업체 미디어로 편입 — 같은 파일이면 기존 행 재사용 */
  async registerMedia(id: string, body: RegisterMediaDto): Promise<BusinessMediaVo> {
    await this.get(id);
    if (!body.url) throw new BadRequestException('url은 필수입니다');
    return this.resolveMedia(id, body.url, body.mediaType);
  }

  async setBase(id: string, mediaId: string): Promise<BusinessMediaVo> {
    await this.assertMediaOwned(id, mediaId);
    return (await this.repo.setBaseMedia(id, mediaId)) as BusinessMediaVo;
  }

  async removeMedia(id: string, mediaId: string): Promise<void> {
    await this.assertMediaOwned(id, mediaId);
    await this.repo.removeMedia(mediaId);
  }

  // ── 콘텐츠팩 ──

  packs(id: string): Promise<BusinessPackVo[]> {
    return this.repo.packsOf(id);
  }

  async linkPack(id: string, body: LinkPackDto): Promise<BusinessPackVo[]> {
    await this.get(id);
    const key = (body.pack || '').trim();
    if (!key) throw new BadRequestException('pack(팩 ID 또는 공유 ID)은 필수입니다');
    const pack = await this.repo.findPack(key);
    if (!pack) throw new NotFoundException('팩을 찾을 수 없습니다');
    await this.repo.linkPack(id, pack.id);
    return this.repo.packsOf(id);
  }

  async unlinkPack(id: string, packId: string): Promise<void> {
    await this.get(id);
    await this.repo.unlinkPack(id, packId);
  }

  // ── AI 캡션 ──

  async caption(id: string, body: GenerateCaptionDto): Promise<CaptionDraftVo> {
    const business = await this.get(id);

    // 미디어를 지정했으면 그 파일을 실제로 보고 쓴다(vision). 없으면 업종·메모만으로 쓴다.
    let filePath: string | null = null;
    let mediaType = 'image';
    if (body.mediaId) {
      const media = await this.repo.findMedia(body.mediaId);
      if (!media) throw new NotFoundException('미디어를 찾을 수 없습니다');
      filePath = media.file_path;
      mediaType = media.media_type;
    } else if (body.url) {
      filePath = toFilePath(body.url);
      mediaType = /\.(mp4|mov|webm|m4v)$/i.test(body.url) ? 'video' : 'image';
    }

    return this.captions.draft({
      businessName: business.name,
      industry: business.industry,
      memo: business.memo,
      filePath,
      mediaType,
      postType: body.postType,
      tone: body.tone,
      language: body.language,
      highlight: body.highlight,
    });
  }

  // ── 발행 큐 ──

  queue(id: string, status?: string): Promise<BusinessQueueVo[]> {
    return this.repo.queueOf(id, status);
  }

  /**
   * 선택한 이미지/릴스를 발행 큐에 넣는다.
   * scheduledAt이 있으면 status=scheduled(스케줄러가 도래분을 집어 발행),
   * 없으면 confirmed(다음 발행 루프에서 계정당 1건 FIFO).
   */
  async enqueue(id: string, body: EnqueueDto): Promise<BusinessQueueVo> {
    await this.get(id);
    const accountId = await this.pickAccount(id, body.accountId);

    const imageMediaId = body.imageMediaId
      || (body.imageUrl ? (await this.resolveMedia(id, body.imageUrl, 'image')).id : null);
    const reelMediaId = body.reelMediaId
      || (body.reelUrl ? (await this.resolveMedia(id, body.reelUrl, 'video')).id : null);

    if (!imageMediaId && !reelMediaId) {
      throw new BadRequestException('게시할 이미지 또는 릴스를 하나 이상 선택하세요');
    }
    if (imageMediaId) await this.assertMediaOwned(id, imageMediaId);
    if (reelMediaId) await this.assertMediaOwned(id, reelMediaId);

    if (body.scheduledAt && new Date(body.scheduledAt).getTime() <= Date.now()) {
      throw new BadRequestException('예약 시각은 현재보다 미래여야 합니다');
    }

    return this.repo.insertQueue({
      accountId, imageMediaId, reelMediaId, bgmMediaId: body.bgmMediaId,
      imageCaption: body.imageCaption, reelCaption: body.reelCaption,
      hashtags: body.hashtags, scheduledAt: body.scheduledAt,
    });
  }

  async updateQueue(id: string, queueId: string, body: UpdateQueueDto): Promise<BusinessQueueVo> {
    const current = await this.assertQueueOwned(id, queueId);
    if (body.status !== undefined && !QUEUE_STATUSES.includes(body.status)) {
      throw new BadRequestException(`status는 ${QUEUE_STATUSES.join(' | ')} 중 하나여야 합니다`);
    }
    if (body.scheduledAt && new Date(body.scheduledAt).getTime() <= Date.now()) {
      throw new BadRequestException('예약 시각은 현재보다 미래여야 합니다');
    }

    // 예약 시각과 상태는 함께 움직여야 한다 — 시각만 바꾸고 상태가 confirmed로 남으면
    //   다음 발행 루프가 예약을 무시하고 바로 올려버린다.
    const patch: Record<string, unknown> = { ...body };
    if (body.scheduledAt !== undefined && body.status === undefined) {
      patch.status = body.scheduledAt ? 'scheduled' : 'confirmed';
    }
    // scheduled인데 시각이 없으면 스케줄러가 영영 안 집는다 — 조용히 묻히느니 여기서 막는다.
    const nextScheduledAt = body.scheduledAt !== undefined ? body.scheduledAt : current.scheduled_at;
    if (patch.status === 'scheduled' && !nextScheduledAt) {
      throw new BadRequestException('예약(scheduled)으로 두려면 scheduledAt이 필요합니다');
    }
    return (await this.repo.updateQueue(queueId, patch)) as BusinessQueueVo;
  }

  /** 예약을 무시하고 지금 올린다(관리자 수동 발행) */
  async publishNow(id: string, queueId: string): Promise<{ imagePostUrl: string | null; reelPostUrl: string | null }> {
    await this.assertQueueOwned(id, queueId);
    return scheduler.publishSingleItem(queueId);
  }

  async removeQueue(id: string, queueId: string): Promise<void> {
    await this.assertQueueOwned(id, queueId);
    await this.repo.removeQueue(queueId);
  }

  // ── 내부 헬퍼 ──

  /** 발행 계정 결정 — 지정이 없으면 활성 계정이 정확히 하나일 때만 자동 선택한다 */
  private async pickAccount(businessId: string, accountId?: string): Promise<string> {
    const accounts = await this.repo.accountsOf(businessId);
    if (accountId) {
      if (!accounts.some((a) => a.id === accountId)) {
        throw new BadRequestException('이 사업체에 연결된 계정이 아닙니다');
      }
      return accountId;
    }
    const active = accounts.filter((a) => a.status === 'active');
    if (active.length === 1) return active[0].id;
    if (!active.length) throw new BadRequestException('발행하려면 인스타그램 계정을 먼저 연결하세요');
    throw new BadRequestException('활성 계정이 여러 개입니다 — accountId를 지정하세요');
  }

  /** URL/파일명을 사업체 미디어로 해석한다(없으면 편입 등록) */
  private async resolveMedia(businessId: string, url: string, mediaType?: string): Promise<BusinessMediaVo> {
    const filePath = toFilePath(url);
    const existing = await this.repo.findMediaByPath(businessId, filePath);
    if (existing) return existing;
    return this.repo.insertMedia({
      businessId,
      filePath,
      mediaType: mediaType || (/\.(mp4|mov|webm|m4v)$/i.test(url) ? 'video' : 'image'),
      source: 'import',
    });
  }

  private async assertMediaOwned(businessId: string, mediaId: string): Promise<void> {
    const all = await this.repo.mediaOf(businessId);
    if (!all.some((m) => m.id === mediaId)) throw new NotFoundException('이 사업체의 미디어가 아닙니다');
  }

  private async assertQueueOwned(businessId: string, queueId: string): Promise<BusinessQueueVo> {
    const q = await this.repo.findQueue(queueId);
    if (!q || (q as any).business_id !== businessId) {
      throw new NotFoundException('이 사업체의 발행 건이 아닙니다');
    }
    return q;
  }
}
