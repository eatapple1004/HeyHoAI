import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { BusinessRepository, toFilePath } from './business.repository';
import { BusinessPackService } from './business-pack.service';
import { BusinessPlanRepository, PlanItemVo } from './business-plan.repository';

// 팩 영상(광고 영상 1편)·잡 조회는 레거시 단일소스를 그대로 쓴다 — 팩 화면의 "🎬 광고 영상"과 같은 경로.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packRoute = require(path.join(__dirname, '..', '..', 'src', 'pack', 'pack.route.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ugcVideo = require(path.join(__dirname, '..', '..', 'src', 'ugc', 'ugcVideo.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require(path.join(__dirname, '..', '..', 'src', 'lib', 'logger'));
const log = logger('PlanPack');

/** 칸 형식별로 만들 컷 수(depth)와 칸에 붙일 장수 */
const DEPTH: Record<string, number> = { image: 2, carousel: 5 };
const ATTACH: Record<string, number> = { image: 1, carousel: 5 };
const POLL_MS = 10 * 1000;
/** 팩 단계(분석·레퍼·컷)와 영상 단계 각각의 최대 대기 */
const PACK_TIMEOUT_MS = 25 * 60 * 1000;
const VIDEO_TIMEOUT_MS = 30 * 60 * 1000;
/** 이보다 오래 소식이 없는 'generating' 칸은 서버 재시작 등으로 끊긴 것으로 보고 다시 돌릴 수 있게 한다 */
const STALE_MS = 40 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 월간 플랜 칸별 콘텐츠 팩 실행기(2026-10-15).
 *
 * 칸의 제작 지시(theme + brief)를 팩 브리프로 써서 **사람 손 없이 끝까지** 간다:
 *   사진·캐러셀: 분석(classify) → 팩 생성(레퍼 굽기) → ref_ready에서 바로 컷 생성 → done → 컷을 사업체 미디어로 등록 → 칸에 붙임
 *   릴스:       분석 → 팩 생성 → ref_ready에서 광고 영상 1편(팩 영상) → 잡 완료 → 영상 등록 → 칸에 붙임
 *
 * 백그라운드로 돈다(요청은 즉시 반환). 서버가 재시작되면 끊기는데, 칸에 남은 단계·시각으로 화면이 알아보고
 * 다시 돌릴 수 있다(STALE_MS). 빈 칸 일괄 실행은 **한 칸씩 순서대로** — 팩 생성은 메모리를 많이 써서
 * 여러 개를 동시에 돌리면 pm2 메모리 한도에 걸려 프로세스가 죽는다(2026-08 실측).
 */
@Injectable()
export class BusinessPlanPackService {
  /** 지금 이 프로세스에서 돌고 있는 칸 — 같은 칸 중복 실행 방지 */
  private running = new Set<string>();

  constructor(
    private readonly plans: BusinessPlanRepository,
    private readonly biz: BusinessRepository,
    private readonly packFlow: BusinessPackService,
  ) {}

  /** 칸 하나 시작. sourceMediaIds 없으면 사업체 기본 원본(★ 대표, 없으면 최근 원본 3장)을 쓴다. */
  async start(user: any, businessId: string, planId: string, itemId: string, sourceMediaIds?: string[]) {
    const { item } = await this.assert(businessId, planId, itemId);
    const sources = await this.pickSources(businessId, sourceMediaIds);
    this.assertStartable(item);
    await this.plans.updateItem(item.id, { gen_status: 'generating', gen_stage: 'queued', gen_error: null });
    this.running.add(item.id);
    setImmediate(() => { this.run(user, businessId, item.id, sources).finally(() => this.running.delete(item.id)); });
    return { itemId: item.id, sources: sources.length };
  }

  /** 아직 콘텐츠가 없는 칸 전부 — 순서대로 하나씩 */
  async startAll(user: any, businessId: string, planId: string, sourceMediaIds?: string[]) {
    const plan = await this.plans.findPlan(planId);
    if (!plan || plan.business_id !== businessId) throw new NotFoundException('플랜을 찾을 수 없습니다');
    if (plan.status !== 'draft') throw new BadRequestException('초안 상태에서만 콘텐츠를 만들 수 있습니다');
    const sources = await this.pickSources(businessId, sourceMediaIds);
    const targets = (await this.plans.itemsOf(planId)).filter((it) =>
      !it.media_ids.length && !(it.gen_status === 'generating' && !this.isStale(it)));
    for (const it of targets) await this.plans.updateItem(it.id, { gen_status: 'generating', gen_stage: 'queued', gen_error: null });
    targets.forEach((it) => this.running.add(it.id));
    setImmediate(async () => {
      for (const it of targets) {
        try { await this.run(user, businessId, it.id, sources); } finally { this.running.delete(it.id); }
      }
    });
    return { queued: targets.length, sources: sources.length };
  }

  // ── 실행 ──

  private async run(user: any, businessId: string, itemId: string, sources: string[]) {
    const item = await this.plans.findItem(itemId);
    if (!item) return;
    const set = (patch: Record<string, unknown>) => this.plans.updateItem(itemId, patch);
    try {
      const brief = [item.theme, item.brief].filter(Boolean).join('. ').slice(0, 900) || '제품 소개 컷';

      // ① 분석 — 카테고리·상태·촬영 축. 사람 확인 없이 제안값을 그대로 쓴다.
      await set({ gen_stage: 'classify' });
      const cls: any = await this.packFlow.classify(user, businessId, sources, brief);

      // ② 팩 생성 — 레퍼는 백그라운드로 구워진다
      await set({ gen_stage: 'ref' });
      const created = await this.packFlow.create(user, businessId, {
        mediaIds: sources, product: brief,
        vertical: cls.vertical, category: cls.category, item: cls.item, unit: cls.unit,
        sourceHasModel: !!cls.sourceHasModel,
        states: Array.isArray(cls.states) && cls.states.length ? cls.states : undefined,
        skus: cls.skus, lenses: cls.lenses,
      });
      const packId = String(created.packId);
      await set({ pack_id: packId });

      // ③ 레퍼 준비 대기
      const ready = await this.waitPack(user, businessId, packId, ['ref_ready', 'done']);

      let mediaIds: string[];
      if (item.format === 'reel') {
        // ④-릴스: 팩 재료로 광고 영상 1편
        await set({ gen_stage: 'video' });
        const { status, body } = await packRoute.ops.video({ user, params: { id: packId }, body: {} });
        if (status >= 400 || !body || !body.jobId) throw new Error((body && body.error) || '광고 영상을 시작하지 못했습니다');
        await set({ video_job_id: String(body.jobId) });
        const url = await this.waitVideo(user, String(body.jobId));
        mediaIds = [(await this.register(businessId, url, 'video')).id];
      } else {
        // ④-사진: 컷 생성
        await set({ gen_stage: 'cuts' });
        if (ready.status !== 'done') await this.packFlow.generate(user, businessId, packId, DEPTH[item.format] || 2);
        const done = await this.waitPack(user, businessId, packId, ['done']);
        const urls: string[] = (done.stillUrls || []).slice(0, ATTACH[item.format] || 1);
        if (!urls.length) throw new Error('팩이 컷을 만들지 못했습니다');
        mediaIds = [];
        for (const u of urls) mediaIds.push((await this.register(businessId, u, 'image')).id);
      }

      // ⑤ 칸에 붙인다 — 그 사이 관리자가 직접 붙였으면 덮어쓰지 않는다
      const latest = await this.plans.findItem(itemId);
      if (latest && latest.media_ids.length) {
        await set({ gen_status: 'ready', gen_stage: 'done' });
      } else {
        await set({ media_ids: mediaIds, gen_status: 'ready', gen_stage: 'done' });
      }
      log.info(`plan item ${itemId} ← pack ${packId} (${mediaIds.length})`);
    } catch (e: any) {
      log.warn(`plan item ${itemId} pack failed: ${e.message}`);
      await set({ gen_status: 'failed', gen_stage: 'failed', gen_error: String(e.message || e).slice(0, 500) });
    }
  }

  private async waitPack(user: any, businessId: string, packId: string, want: string[]) {
    const until = Date.now() + PACK_TIMEOUT_MS;
    while (Date.now() < until) {
      const s: any = await this.packFlow.status(user, businessId, packId);
      if (want.includes(s.status)) return s;
      if (s.status === 'failed') throw new Error(`팩 실패: ${s.error || '원인 미상'}`);
      await sleep(POLL_MS);
    }
    throw new Error('팩이 제한 시간 안에 끝나지 않았습니다');
  }

  private async waitVideo(user: any, jobId: string): Promise<string> {
    const until = Date.now() + VIDEO_TIMEOUT_MS;
    while (Date.now() < until) {
      const j = await ugcVideo.getJob(jobId, user.id);
      if (j && j.status === 'succeeded' && j.resultUrl) return j.resultUrl;
      if (j && j.status === 'failed') throw new Error(`영상 실패: ${j.error || '원인 미상'}`);
      await sleep(POLL_MS);
    }
    throw new Error('영상이 제한 시간 안에 끝나지 않았습니다');
  }

  /** 팩 결과 URL → 사업체 미디어(같은 파일이면 기존 것 재사용) */
  private async register(businessId: string, url: string, mediaType: string) {
    const filePath = toFilePath(url);
    const existing = await this.biz.findMediaByPath(businessId, filePath);
    if (existing) return existing;
    return this.biz.insertMedia({ businessId, filePath, mediaType, source: 'import' });
  }

  // ── 검증 ──

  private async pickSources(businessId: string, ids?: string[]): Promise<string[]> {
    const media = await this.biz.mediaOf(businessId);
    const images = media.filter((m: any) => m.media_type === 'image');
    if (Array.isArray(ids) && ids.length) {
      const own = new Set(images.map((m: any) => m.id));
      if (ids.some((id) => !own.has(id))) throw new BadRequestException('원본은 이 사업체의 사진이어야 합니다');
      return ids.slice(0, 10);
    }
    const originals = images.filter((m: any) => m.source === 'upload');
    const base = originals.filter((m: any) => m.is_base);
    const pick = (base.length ? base : originals).slice(0, 3).map((m: any) => m.id);
    if (!pick.length) throw new BadRequestException('팩에 쓸 원본 사진이 없습니다 — 사업체 화면에서 원본을 먼저 올리세요');
    return pick;
  }

  private assertStartable(item: PlanItemVo) {
    if (this.running.has(item.id) || (item.gen_status === 'generating' && !this.isStale(item))) {
      throw new BadRequestException('이 칸은 이미 만들고 있습니다');
    }
  }

  private isStale(item: PlanItemVo): boolean {
    return Date.now() - new Date(item.updated_at).getTime() > STALE_MS && !this.running.has(item.id);
  }

  private async assert(businessId: string, planId: string, itemId: string) {
    const plan = await this.plans.findPlan(planId);
    if (!plan || plan.business_id !== businessId) throw new NotFoundException('플랜을 찾을 수 없습니다');
    if (plan.status !== 'draft') throw new BadRequestException('초안 상태에서만 콘텐츠를 만들 수 있습니다');
    const item = await this.plans.findItem(itemId);
    if (!item || item.plan_id !== planId) throw new NotFoundException('항목을 찾을 수 없습니다');
    return { plan, item };
  }
}
