import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { OwnershipService } from '../common/security/ownership.service';
import { AccountsRepository } from './accounts.repository';
import { SocialAccountVo, AccountMediaVo, PostQueueItemVo, ReelTemplateVo, OutfitPromptVo } from './vo/account.vo';
import { ListAccountsQueryDto, ListMediaQueryDto, ListPostQueueQueryDto } from './dto/account.dto';

/**
 * ⚠️ 외부 연동은 이식하지 않는다 —
 *   `zernio.client`(인스타 계정·지표 API), `scheduler`(백그라운드 발행 루프),
 *   `accountGeneration.service`(Gemini 의상 · Kling 릴스). 전부 외부 API 호출·폴링 덩어리라
 *   TS 재작성 이득보다 리스크가 크고, 로컬에서 성공 경로 검증도 불가능하다.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const zernio = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'zernio.client.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const accountGen = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'accountGeneration.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const scheduler = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'scheduler.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

/** 레거시와 동일한 multer 설정(tmp/images 디스크 저장·100MB) — FileInterceptor에 그대로 넘긴다. */
const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
export const ACCOUNT_UPLOAD_OPTIONS = {
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req: any, file: any, cb: any) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
};

const ACCOUNT_STATUSES = ['active', 'paused', 'disabled'];

type OpResult = { status: number; body: any };
const ok = (body: any): OpResult => ({ status: 200, body });
const created = (body: any): OpResult => ({ status: 201, body });
const fail = (status: number, error: string): OpResult => ({ status, body: { success: false, error } });

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly repo: AccountsRepository,
    private readonly ownership: OwnershipService,
  ) {}

  /** 계정 소유권 검증(= 레거시 `router.param('id')`). 실패 시 statusCode 에러 throw. */
  assertOwned(accountId: string, userId: string) {
    return this.ownership.assertAccountOwned(accountId, userId);
  }

  /**
   * 쓰기 계열 엔드포인트 실행 → `{status, body}`.
   *
   * 상태코드를 **핸들러가 정한다**(201 생성, 400/404 실패). 컨트롤러는 그 값을 그대로 쓴다 —
   * Nest 기본 201로 덮이면 레거시와 응답이 갈리기 때문.
   */
  op(name: string, req: any): Promise<OpResult> {
    const fn = (this.ops as any)[name];
    if (!fn) throw httpError(500, `Unknown account op: ${name}`);
    return fn.call(this, req);
  }

  private readonly ops: Record<string, (req: any) => Promise<OpResult>> = {
    // ── 계정 ──

    /** Zernio에 연결된 계정을 가져와 DB에 upsert */
    sync: async (req) => {
      const accounts = await zernio.listAccounts();
      const synced: SocialAccountVo[] = [];
      for (const acc of accounts) {
        synced.push(await this.repo.upsertAccount({
          userId: req.user.id,
          platform: acc.platform,
          accountId: acc._id,
          username: acc.username,
          displayName: acc.displayName || acc.username,
          profileImage: acc.profileImage || null,
          followers: acc.followers || 0,
          metadata: acc,
        }));
      }
      return ok({ success: true, data: synced, synced: synced.length });
    },

    patchStatus: async (req) => {
      const { status } = req.body || {};
      if (!ACCOUNT_STATUSES.includes(status)) return fail(400, 'Invalid status');
      const account = await this.repo.updateAccountStatus(req.params.id, status);
      if (!account) return fail(404, 'Account not found');
      return ok({ success: true, data: account });
    },

    /** 기본 캡션은 metadata JSON 안에 산다 — 전달된 키만 덮어써서 다른 키를 지우지 않는다 */
    patchDefaultCaptions: async (req) => {
      const { defaultImageCaption, defaultReelCaption } = req.body || {};
      const account = await this.repo.findAccountById(req.params.id);
      if (!account) return fail(404, 'Account not found');
      const metadata: any = (account as any).metadata || {};
      if (defaultImageCaption !== undefined) metadata.defaultImageCaption = defaultImageCaption;
      if (defaultReelCaption !== undefined) metadata.defaultReelCaption = defaultReelCaption;
      await this.repo.updateAccountMetadata(req.params.id, metadata);
      return ok({ success: true, data: metadata });
    },

    deleteAccount: async (req) => {
      const account = await this.repo.removeAccount(req.params.id);
      if (!account) return fail(404, 'Account not found');
      return ok({ success: true, data: account });
    },

    // ── 기본 사진 · 생성 ──

    postBasePhoto: async (req) => {
      const { mediaId } = req.body || {};
      if (!mediaId) return fail(400, 'mediaId is required');
      const media = await this.repo.setBaseMedia(req.params.id, mediaId);
      if (!media) return fail(404, 'Media not found');
      return ok({ success: true, data: media });
    },

    postGenerateOutfits: async (req) => {
      const results = await accountGen.generateOutfits(req.params.id, req.body || {});
      return ok({ success: true, results });
    },

    postGenerateReel: async (req) => ok(await accountGen.generateReel(req.params.id, req.body || {})),

    postBatchReels: async (req) => {
      const { templateId, mediaIds } = req.body || {};
      if (!templateId || !Array.isArray(mediaIds) || mediaIds.length === 0) {
        return fail(400, 'templateId and mediaIds[] are required');
      }
      await this.ownership.assertAccountResourceOwned('reel_templates', templateId, req.user.id);
      const results = await accountGen.batchReels(req.params.id, { templateId, mediaIds });
      return ok({ success: true, results });
    },

    deleteReelTemplates: async (req) => {
      await this.ownership.assertAccountResourceOwned('reel_templates', req.params.templateId, req.user.id);
      const t = await this.repo.removeReelTemplate(req.params.templateId);
      if (!t) return fail(404, 'Template not found');
      return ok({ success: true, data: t });
    },

    // ── 의상 프롬프트 ──

    postOutfitPrompts: async (req) => {
      const { name, prompt } = req.body || {};
      if (!prompt) return fail(400, 'Prompt is required');
      const saved = await this.repo.insertOutfitPrompt({
        accountId: req.params.id,
        name: name || String(prompt).slice(0, 60),   // 이름 생략 시 프롬프트 앞부분을 이름으로
        prompt,
      });
      return created({ success: true, data: saved });
    },

    patchOutfitPrompts: async (req) => {
      await this.ownership.assertAccountResourceOwned('outfit_prompts', req.params.promptId, req.user.id);
      const { name, prompt } = req.body || {};
      const updated = await this.repo.updateOutfitPrompt(req.params.promptId, { name, prompt });
      if (!updated) return fail(404, 'Not found');
      return ok({ success: true, data: updated });
    },

    deleteOutfitPrompts: async (req) => {
      await this.ownership.assertAccountResourceOwned('outfit_prompts', req.params.promptId, req.user.id);
      const deleted = await this.repo.removeOutfitPrompt(req.params.promptId);
      if (!deleted) return fail(404, 'Not found');
      return ok({ success: true, data: deleted });
    },

    // ── 발행 큐 ──

    postPostQueue: async (req) => {
      const { imageMediaId, reelMediaId, imageCaption, reelCaption, hashtags, bgmMediaId } = req.body || {};
      if (!imageMediaId && !reelMediaId) {
        return fail(400, 'At least imageMediaId or reelMediaId is required');
      }
      const item = await this.repo.insertQueueItem({
        accountId: req.params.id, imageMediaId, reelMediaId, imageCaption, reelCaption, hashtags, bgmMediaId,
      });
      return created({ success: true, data: item });
    },

    patchPostQueue: async (req) => {
      await this.ownership.assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
      const { imageCaption, reelCaption, hashtags, status, bgmMediaId } = req.body || {};
      const item = await this.repo.updateQueueItem(req.params.queueId, {
        imageCaption, reelCaption, hashtags, status, bgmMediaId,
      });
      if (!item) return fail(404, 'Not found');
      return ok({ success: true, data: item });
    },

    /** 스케줄러를 수동으로 한 바퀴 돌린다(확정 항목 전체 발행) */
    postPublishNow: async () => {
      await scheduler.publishConfirmedItems();
      return ok({ success: true, message: 'Publish triggered' });
    },

    postPostQueuePublish: async (req) => {
      await this.ownership.assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
      return ok({ success: true, data: await scheduler.publishSingleItem(req.params.queueId) });
    },

    /** 복제는 항상 pending으로 — 원본이 posted였어도 발행 이력(URL·시각)은 따라오지 않는다 */
    postPostQueueDuplicate: async (req) => {
      await this.ownership.assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
      const original: any = await this.repo.findQueueItemById(req.params.queueId);
      if (!original) return fail(404, 'Not found');
      const copy = await this.repo.insertQueueItem({
        accountId: original.account_id,
        imageMediaId: original.image_media_id,
        reelMediaId: original.reel_media_id,
        imageCaption: original.image_caption,
        reelCaption: original.reel_caption,
        hashtags: original.hashtags,
        bgmMediaId: original.bgm_media_id,
      });
      return created({ success: true, data: copy });
    },

    /** 재업로드 — 발행 이력을 지우고 confirmed로 되돌린 뒤 즉시 다시 올린다 */
    postPostQueueReupload: async (req) => {
      await this.ownership.assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
      await this.repo.updateQueueItem(req.params.queueId, {
        status: 'confirmed', postedAt: null, imagePostUrl: null, reelPostUrl: null,
      });
      return ok({ success: true, data: await scheduler.publishSingleItem(req.params.queueId) });
    },

    deletePostQueue: async (req) => {
      await this.ownership.assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
      const item = await this.repo.removeQueueItem(req.params.queueId);
      if (!item) return fail(404, 'Not found');
      return ok({ success: true, data: item });
    },

    // ── 미디어 ──

    postMediaUpload: async (req) => {
      if (!req.file) return fail(400, 'File is required');
      const account = await this.repo.findAccountById(req.params.id);
      if (!account) return fail(404, 'Account not found');
      const mime = String(req.file.mimetype || '');
      const mediaType = mime.startsWith('video') ? 'video' : mime.startsWith('audio') ? 'audio' : 'image';
      const { caption, hashtags } = req.body || {};
      const media = await this.repo.insertMedia({
        accountId: req.params.id,
        filePath: `tmp/images/${req.file.filename}`,
        mediaType,
        caption: caption || null,
        // multipart는 값이 전부 문자열이라 해시태그가 JSON 문자열로 온다
        hashtags: hashtags ? JSON.parse(hashtags) : [],
      });
      return created({ success: true, data: media });
    },

    /** 생성 페이지에서 만든 파일을 계정 미디어로 등록(업로드 없이 경로만) */
    postMediaRegister: async (req) => {
      const { filePath, mediaType, caption, hashtags } = req.body || {};
      if (!filePath) return fail(400, 'filePath is required');
      const account = await this.repo.findAccountById(req.params.id);
      if (!account) return fail(404, 'Account not found');
      const media = await this.repo.insertMedia({
        accountId: req.params.id,
        filePath,
        mediaType: mediaType || 'image',
        caption: caption || null,
        hashtags: hashtags || [],
      });
      return created({ success: true, data: media });
    },

    patchMedia: async (req) => {
      await this.ownership.assertAccountResourceOwned('account_media', req.params.mediaId, req.user.id);
      const { caption, hashtags, status } = req.body || {};
      const media = await this.repo.updateMedia(req.params.mediaId, { caption, hashtags, status });
      if (!media) return fail(404, 'Media not found');
      return ok({ success: true, data: media });
    },

    deleteMedia: async (req) => {
      await this.ownership.assertAccountResourceOwned('account_media', req.params.mediaId, req.user.id);
      const media = await this.repo.removeMedia(req.params.mediaId);
      if (!media) return fail(404, 'Media not found');
      return ok({ success: true, data: media });
    },
  };

  // ── 조회 — 응답은 Nest가 직렬화한다. 소유권은 컨트롤러가 먼저 검증한 뒤 호출 ──

  list(userId: string, q: ListAccountsQueryDto): Promise<SocialAccountVo[]> {
    const { platform, status } = q || ({} as ListAccountsQueryDto);
    return this.repo.findAccounts({ userId, platform: platform || undefined, status: status || undefined });
  }

  async account(accountId: string): Promise<SocialAccountVo> {
    const account = await this.repo.findAccountById(accountId);
    if (!account) throw httpError(404, 'Account not found');
    return account;
  }

  /** Zernio 계정 지표 — 우리 DB의 계정 행에서 외부 account_id를 찾아 호출한다 */
  async analyticsDetail(accountId: string) {
    const account: any = await this.account(accountId);
    return zernio.getAccountDetail(account.account_id);
  }

  async analyticsPosts(accountId: string) {
    const account: any = await this.account(accountId);
    return zernio.getPosts(account.account_id);
  }

  basePhoto(accountId: string): Promise<AccountMediaVo | null> {
    return this.repo.findBaseMedia(accountId);
  }

  reelTemplates(accountId: string): Promise<ReelTemplateVo[]> {
    return this.repo.findReelTemplates(accountId);
  }

  outfitPrompts(accountId: string): Promise<OutfitPromptVo[]> {
    return this.repo.findOutfitPrompts(accountId);
  }

  postQueue(accountId: string, q: ListPostQueueQueryDto): Promise<PostQueueItemVo[]> {
    return this.repo.findQueueByAccount(accountId, { status: (q || {}).status || undefined });
  }

  /** { data, total } — total은 응답 최상위 필드 */
  async media(accountId: string, q: ListMediaQueryDto): Promise<{ data: AccountMediaVo[]; total: number }> {
    const { status, limit, offset } = q || ({} as ListMediaQueryDto);
    const data = await this.repo.findMediaByAccount(accountId, {
      status: status || undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      offset: offset ? parseInt(String(offset), 10) : undefined,
    });
    return { data, total: await this.repo.countMedia(accountId) };
  }
}
