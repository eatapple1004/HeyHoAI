import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { BusinessRepository } from './business.repository';
import { BusinessService } from './business.service';
import { BusinessPlanRepository, MonthPlanVo, PlanItemVo } from './business-plan.repository';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));
// 해시태그 위생 규칙(스팸태그·30자·30개)은 레거시 단일소스를 그대로 쓴다 — 캡션 생성과 같은 규칙.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sanitizeCaptionHashtags } = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'caption.service.js'));

/**
 * 월간 운영 플랜 — 한 달치 인스타 게시 계획.
 *
 * 흐름(2026-10-13 사용자 결정: 컨펌은 Doppia와 고객 둘 다, 1차 채널은 인스타만):
 *   draft ─(Doppia 검수)→ doppia_approved ─(고객에게 보냄)→ sent ─(고객 승인)→ approved ─(일괄 예약)→ scheduled
 *   수정 요청이 오면 draft로 되돌린다. 항목 수정은 draft에서만 된다(승인된 걸 몰래 바꾸지 않게).
 *
 * 날짜·시간은 규칙으로 정하고(주당 횟수 → 요일, 저녁 7시 KST), 각 칸에 무엇을 올릴지만 Claude가 짠다.
 *   날짜까지 모델에 맡기면 매번 들쭉날쭉하고 과거 날짜·중복이 섞인다.
 */
export const PLAN_STATUSES = ['draft', 'doppia_approved', 'sent', 'approved', 'scheduled'];
const FORMATS = ['image', 'carousel', 'reel'];
/** 주당 게시 수 → 요일(0=일). 고객이 보기 편하게 고정 */
const WEEKDAYS: Record<number, number[]> = {
  1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6],
};
const POST_HOUR_KST = 19;
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

const PLANNER_SYSTEM = `너는 한국 소상공인·브랜드의 인스타그램을 대신 운영하는 마케터다. 한 달치 게시 계획을 짠다.
규칙:
1. 칸마다 서로 다른 주제로, 한 달 전체가 하나의 흐름(이번 달 테마)이 되게 짠다. 같은 말 반복 금지.
2. 그 달의 시즌·기념일(한국 기준)을 자연스럽게 반영한다. 억지로 끼워 넣지 않는다.
3. brief는 제작자가 그대로 따라 만들 수 있는 구체적 지시다(어떤 제품을, 어떤 장면·구도·분위기로). 2문장 이내.
4. 캡션은 사장님이 직접 쓴 듯한 말투, 짧게(두 줄 안팎). 과장·의학적 효능 주장 금지.
5. 해시태그는 5~10개, 지역·업종·상황을 섞는다. 팔로우 구걸 태그 금지.
6. format이 'post'인 칸은 사진 1장이면 'image', 여러 장(비교·과정·모음)이 어울리면 'carousel'로 정한다. 'reel' 칸은 그대로 'reel'.
7. 설명 없이 JSON만 반환한다.`;

@Injectable()
export class BusinessPlanService {
  private client: Anthropic | null = null;
  constructor(
    private readonly repo: BusinessPlanRepository,
    private readonly biz: BusinessRepository,
    private readonly business: BusinessService,
  ) {}

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  // ── 조회 ──

  async list(businessId: string): Promise<MonthPlanVo[]> {
    await this.assertBusiness(businessId);
    return this.repo.plansOf(businessId);
  }

  async detail(businessId: string, planId: string) {
    const business = await this.assertBusiness(businessId);
    const plan = await this.assertPlan(businessId, planId);
    const [items, media, accounts] = await Promise.all([
      this.repo.itemsOf(planId), this.biz.mediaOf(businessId), this.biz.accountsOf(businessId),
    ]);
    return { business, plan, items, media, accounts };
  }

  // ── 플랜 만들기·설정 ──

  async create(businessId: string, body: any): Promise<MonthPlanVo> {
    await this.assertBusiness(businessId);
    const month = String(body.month || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month는 YYYY-MM 형식이어야 합니다');
    const exists = (await this.repo.plansOf(businessId)).find((p) => p.month === month);
    if (exists) throw new BadRequestException(`${month} 플랜이 이미 있습니다`);
    const accounts = await this.biz.accountsOf(businessId);
    const accountId = body.accountId || (accounts.find((a: any) => a.platform === 'instagram_meta') || accounts[0] || {} as any).id || null;
    return this.repo.insertPlan({
      businessId, accountId, month,
      postsPerWeek: this.clampPpw(body.postsPerWeek),
      reelRatio: this.clampRatio(body.reelRatio),
      brief: body.brief ? String(body.brief).slice(0, 2000) : null,
    });
  }

  async updateSettings(businessId: string, planId: string, body: any): Promise<MonthPlanVo> {
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);
    const patch: Record<string, unknown> = {};
    if (body.postsPerWeek !== undefined) patch.posts_per_week = this.clampPpw(body.postsPerWeek);
    if (body.reelRatio !== undefined) patch.reel_ratio = this.clampRatio(body.reelRatio);
    if (body.brief !== undefined) patch.brief = body.brief ? String(body.brief).slice(0, 2000) : null;
    if (body.accountId !== undefined) {
      const accounts = await this.biz.accountsOf(businessId);
      if (body.accountId && !accounts.some((a: any) => a.id === body.accountId)) throw new BadRequestException('이 사업체의 계정이 아닙니다');
      patch.account_id = body.accountId || null;
    }
    return this.repo.updatePlan(planId, patch);
  }

  async remove(businessId: string, planId: string): Promise<void> {
    const plan = await this.assertPlan(businessId, planId);
    if (plan.status === 'scheduled') throw new BadRequestException('이미 예약된 플랜은 지울 수 없습니다 — 발행 큐에서 먼저 취소하세요');
    await this.repo.deletePlan(planId);
  }

  // ── 사진으로 한 달 짜기(2026-10-17) ──

  /** 이 달에 몇 칸이 잡히는지 — 새 플랜 화면이 '사진 N장 올려 주세요'를 말하려고 쓴다(서버와 같은 규칙) */
  preview(month: string, postsPerWeek: any, reelRatio: any) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) throw new BadRequestException('month는 YYYY-MM 형식이어야 합니다');
    const s = this.slots(month, this.clampPpw(postsPerWeek), this.clampRatio(reelRatio));
    return { count: s.length, reels: s.filter((x) => x.kind === 'reel').length, dates: s.map((x) => x.date) };
  }

  /**
   * 사진 N장(= 이 달 칸 수)을 받아 한 달을 짠다. 올린 순서대로 날짜 칸에 한 장씩 배치하고,
   * 각 사진을 그 칸의 '이 게시물 원본'으로 묶는다. Claude가 **사진을 직접 보고** 주제·제작 지시·캡션을 쓴다 —
   * 사진에 없는 제품을 지어내던 문제(단풍잎 북마크 ↔ 새 작품)를 원천 차단한다.
   * 8장씩 나눠 동시에 보낸다 — 한 번에 13~30장을 보내면 Cloudflare 100초 제한에 걸릴 수 있다.
   */
  async draftFromPhotos(businessId: string, planId: string, files: any[]) {
    const business = await this.assertBusiness(businessId);
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);
    const images = (files || []).filter((f) => f && String(f.mimetype || '').startsWith('image/'));
    const slots = this.slots(plan.month, plan.posts_per_week, Number(plan.reel_ratio));
    if (!slots.length) throw new BadRequestException('이 달에는 남은 게시 날짜가 없습니다(오늘 이후 날짜만 잡습니다)');
    if (images.length < slots.length) {
      throw new BadRequestException(`이 달 게시물은 ${slots.length}개라 사진 ${slots.length}장이 필요합니다 (올린 사진 ${images.length}장)`);
    }
    const use = images.slice(0, slots.length);

    // 사진 → 사업체 미디어(R2 영속) + Claude에 보낼 축소본
    const [, mm] = plan.month.split('-').map(Number);
    const media: { id: string; b64: string }[] = [];
    for (let i = 0; i < use.length; i++) {
      const f = use[i];
      const b64 = await this.visionJpeg(f.path);
      const m = await this.business.uploadMedia(businessId, f, false, `${mm}월 플랜 원본 #${i + 1} (${slots[i].date.slice(5)})`);
      media.push({ id: m.id, b64 });
    }

    const head = [
      `사업체: ${business.name}`,
      business.industry ? `업종: ${business.industry}` : '',
      business.memo ? `참고사항: ${business.memo}` : '',
      plan.brief ? `이번 달 강조할 것: ${plan.brief}` : '',
      plan.customer_feedback ? `고객이 남긴 수정 요청(반드시 반영): ${plan.customer_feedback}` : '',
      `월: ${plan.month} · 전체 ${slots.length}칸: ` + slots.map((s, i) => `i=${i} ${s.date.slice(5)}(${DOW_KO[s.dow]}) ${s.kind}`).join(', '),
    ].filter(Boolean).join('\n');
    const RULE = '각 칸에는 그 번호의 사진이 붙어 있다. 그 칸의 주인공은 반드시 그 사진 속 실제 제품이다 — 사진에 없는 제품·소품을 지어내지 마라. '
      + '제작 지시는 그 사진 속 제품을 어떤 장면·구도·분위기로 연출할지 쓴다. 한 달 전체가 겹치지 않는 흐름이 되게 하라.';

    const batches: number[][] = [];
    for (let i = 0; i < slots.length; i += 8) batches.push(slots.slice(i, i + 8).map((_, k) => i + k));
    const results = await Promise.all(batches.map(async (idxs) => {
      const content: any[] = [{ type: 'text', text: `${head}\n\n${RULE}\n\n이번에 채울 칸: ${idxs.join(', ')}` }];
      for (const i of idxs) {
        content.push({ type: 'text', text: `i=${i} | ${slots[i].date}(${DOW_KO[slots[i].dow]}) | ${slots[i].kind} — 이 칸의 사진:` });
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: media[i].b64 } });
      }
      content.push({ type: 'text', text: '반환 형식: {"monthTheme":"이번 달 한 줄 테마","items":[{"i":0,"format":"image|carousel|reel","theme":"주제(20자 이내)","brief":"제작 지시","caption":"캡션","hashtags":["태그"]}]}' });
      const response = await this.anthropic().messages.create({
        model: env.CLAUDE_MODEL, max_tokens: 6000, system: PLANNER_SYSTEM, messages: [{ role: 'user', content }],
      });
      const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      if (!match) throw new InternalServerErrorException('플랜 생성 실패 — 모델이 JSON을 반환하지 않았습니다');
      try { return JSON.parse(match[1]); } catch (e) { throw new InternalServerErrorException('플랜 생성 실패 — JSON을 읽을 수 없습니다'); }
    }));

    const byI = new Map<number, any>();
    results.forEach((r) => (r.items || []).forEach((x: any) => byI.set(Number(x.i), x)));
    await this.repo.clearDraftItems(planId);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const x = byI.get(i) || {};
      const format = s.kind === 'reel' ? 'reel' : (x.format === 'carousel' ? 'carousel' : 'image');
      const { sanitizedHashtags } = sanitizeCaptionHashtags({ hashtags: Array.isArray(x.hashtags) ? x.hashtags : [] });
      const it = await this.repo.insertItem(planId, {
        postAt: s.postAt, format,
        theme: x.theme ? String(x.theme).slice(0, 200) : null,
        brief: x.brief ? String(x.brief).slice(0, 2000) : null,
        caption: x.caption ? String(x.caption).slice(0, 2200) : null,
        hashtags: sanitizedHashtags,
      });
      await this.repo.updateItem(it.id, { source_media_ids: [media[i].id] });
    }
    const theme = results.map((r) => r.monthTheme).find(Boolean);
    if (theme && !plan.brief) await this.repo.updatePlan(planId, { brief: `[AI 테마] ${String(theme).slice(0, 300)}` });
    return this.detail(businessId, planId);
  }

  /** Claude 비전용 축소본(긴 변 768px JPEG) — 원본 그대로 보내면 토큰·시간이 커진다 */
  private async visionJpeg(filePath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');
    const buf = await sharp(fs.readFileSync(filePath)).rotate().resize(768, 768, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
    return buf.toString('base64');
  }

  // ── AI 초안 ──

  /** 날짜 칸을 규칙으로 만들고, 각 칸의 형식·주제·제작 지시·캡션을 Claude가 채운다. 기존 초안은 갈아엎는다. */
  async draft(businessId: string, planId: string) {
    const business = await this.assertBusiness(businessId);
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);

    const slots = this.slots(plan.month, plan.posts_per_week, Number(plan.reel_ratio));
    if (!slots.length) throw new BadRequestException('이 달에는 남은 게시 날짜가 없습니다(오늘 이후 날짜만 잡습니다)');

    const media = await this.biz.mediaOf(businessId);
    const originals = media.filter((m: any) => m.source === 'upload' && m.media_type !== 'audio');
    const user = [
      `사업체: ${business.name}`,
      business.industry ? `업종: ${business.industry}` : '',
      business.memo ? `참고사항: ${business.memo}` : '',
      plan.brief ? `이번 달 강조할 것: ${plan.brief}` : '',
      plan.customer_feedback ? `고객이 남긴 수정 요청(반드시 반영): ${plan.customer_feedback}` : '',
      `보유 원본: 사진 ${originals.filter((m: any) => m.media_type !== 'video').length}장, 영상 ${originals.filter((m: any) => m.media_type === 'video').length}개`,
      `월: ${plan.month}`,
      '',
      '아래 칸을 모두 채워라. i는 그대로 돌려준다.',
      ...slots.map((s, i) => `i=${i} | ${s.date}(${DOW_KO[s.dow]}) | ${s.kind}`),
      '',
      '반환 형식: {"monthTheme":"이번 달 한 줄 테마","items":[{"i":0,"format":"image|carousel|reel","theme":"주제(20자 이내)","brief":"제작 지시","caption":"캡션","hashtags":["태그"]}]}',
    ].filter((l) => l !== '').join('\n');

    const response = await this.anthropic().messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 8000,
      system: PLANNER_SYSTEM,
      messages: [{ role: 'user', content: user }],
    });
    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!match) throw new InternalServerErrorException('플랜 생성 실패 — 모델이 JSON을 반환하지 않았습니다');
    let raw: any;
    try { raw = JSON.parse(match[1]); } catch (e) { throw new InternalServerErrorException('플랜 생성 실패 — JSON을 읽을 수 없습니다'); }
    const byI = new Map<number, any>((raw.items || []).map((x: any) => [Number(x.i), x]));

    await this.repo.clearDraftItems(planId);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const x = byI.get(i) || {};
      const format = s.kind === 'reel' ? 'reel' : (x.format === 'carousel' ? 'carousel' : 'image');
      const { sanitizedHashtags } = sanitizeCaptionHashtags({ hashtags: Array.isArray(x.hashtags) ? x.hashtags : [] });
      await this.repo.insertItem(planId, {
        postAt: s.postAt, format,
        theme: x.theme ? String(x.theme).slice(0, 200) : null,
        brief: x.brief ? String(x.brief).slice(0, 2000) : null,
        caption: x.caption ? String(x.caption).slice(0, 2200) : null,
        hashtags: sanitizedHashtags,
      });
    }
    if (raw.monthTheme && !plan.brief) await this.repo.updatePlan(planId, { brief: `[AI 테마] ${String(raw.monthTheme).slice(0, 300)}` });
    return this.detail(businessId, planId);
  }

  // ── 항목 ──

  async addItem(businessId: string, planId: string, body: any): Promise<PlanItemVo> {
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);
    return this.repo.insertItem(planId, {
      postAt: this.parsePostAt(body.postAt, plan.month),
      format: FORMATS.includes(body.format) ? body.format : 'image',
      theme: body.theme || null, brief: body.brief || null, caption: body.caption || null,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
    });
  }

  async updateItem(businessId: string, planId: string, itemId: string, body: any): Promise<PlanItemVo> {
    const plan = await this.assertPlan(businessId, planId);
    const item = await this.assertItem(planId, itemId);
    // 피드백(수정 요청 메모)은 어느 단계에서나 남길 수 있다 — 고객 확인 중에 받은 의견을 적어 두는 칸이다.
    const onlyFeedback = Object.keys(body).every((k) => k === 'feedback');
    if (!onlyFeedback) this.assertDraft(plan);

    const patch: Record<string, unknown> = {};
    if (body.postAt !== undefined) patch.post_at = this.parsePostAt(body.postAt, plan.month);
    if (body.format !== undefined) {
      if (!FORMATS.includes(body.format)) throw new BadRequestException('format은 image | carousel | reel');
      patch.format = body.format;
    }
    for (const k of ['theme', 'brief', 'caption', 'feedback']) if (body[k] !== undefined) patch[k] = body[k] || null;
    if (body.hashtags !== undefined) {
      const tags = Array.isArray(body.hashtags) ? body.hashtags : String(body.hashtags).split(/[\s,]+/);
      patch.hashtags = sanitizeCaptionHashtags({ hashtags: tags.map((t: string) => t.replace(/^#/, '')).filter(Boolean) }).sanitizedHashtags;
    }
    if (body.mediaIds !== undefined) {
      const ids: string[] = Array.isArray(body.mediaIds) ? body.mediaIds : [];
      // 칸끼리 분리 — 이 칸의 원본·팩 결과·이미 붙은 것만 고를 수 있다(다른 칸·예전 작업 사진 금지)
      const allowed = new Set([...(item.source_media_ids || []), ...(item.candidate_media_ids || []), ...(item.media_ids || [])]);
      if (ids.some((id) => !allowed.has(id))) throw new BadRequestException('이 게시물의 원본·결과에서만 고를 수 있습니다');
      patch.media_ids = ids.slice(0, 10);
      patch.gen_status = ids.length ? 'ready' : 'planned';
    }
    return this.repo.updateItem(item.id, patch);
  }

  /**
   * 게시물 전용 원본 올리기(2026-10-17). 칸마다 실제로 찍을 제품 사진을 따로 받아 그 칸의 팩에 쓴다 —
   * 사업체 공용 원본만 쓰면 AI가 기획한 제품과 팩이 찍는 제품이 어긋났다(단풍잎 북마크 ↔ 새 작품, 10-15 실측).
   * 파일은 사업체 미디어로 저장(R2 영속)하고 칸의 source_media_ids에 덧붙인다. 초안에서만.
   */
  async addItemSources(businessId: string, planId: string, itemId: string, files: any[]): Promise<PlanItemVo> {
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);
    const item = await this.assertItem(planId, itemId);
    const images = (files || []).filter((f) => f && String(f.mimetype || '').startsWith('image/'));
    if (!images.length) throw new BadRequestException('사진 파일(jpg·png·webp)을 올려 주세요');
    const room = 10 - item.source_media_ids.length;
    if (room <= 0) throw new BadRequestException('게시물 원본은 최대 10장입니다');
    const d = new Date(new Date(item.post_at).getTime() + 9 * 3600 * 1000);
    const caption = `게시물 원본 (${d.getUTCMonth() + 1}/${d.getUTCDate()} ${item.theme || ''})`.trim().slice(0, 200);
    const added: string[] = [];
    for (const f of images.slice(0, room)) added.push((await this.business.uploadMedia(businessId, f, false, caption)).id);
    return this.repo.updateItem(item.id, { source_media_ids: [...item.source_media_ids, ...added] });
  }

  /** 게시물 원본에서 빼기 — 사업체 미디어 자체는 지우지 않는다(다른 칸·팩이 쓸 수 있다) */
  async removeItemSource(businessId: string, planId: string, itemId: string, mediaId: string): Promise<PlanItemVo> {
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);
    const item = await this.assertItem(planId, itemId);
    return this.repo.updateItem(item.id, { source_media_ids: item.source_media_ids.filter((id) => id !== mediaId) });
  }

  async removeItem(businessId: string, planId: string, itemId: string): Promise<void> {
    const plan = await this.assertPlan(businessId, planId);
    this.assertDraft(plan);
    await this.assertItem(planId, itemId);
    await this.repo.deleteItem(itemId);
  }

  // ── 컨펌 단계 ──

  /**
   * doppia_approve: 내부 검수 끝(모든 칸에 콘텐츠·캡션이 있어야 함)
   * send: 고객에게 보냄(고객 화면이 생기기 전까지는 상태만 바뀐다)
   * customer_approve: 고객 승인 기록(고객 화면 전까지는 관리자가 대신 누른다)
   * request_changes: 수정 요청 → draft로(메모 남김)
   */
  async transition(businessId: string, planId: string, body: any, adminId: string | null) {
    const plan = await this.assertPlan(businessId, planId);
    const action = String(body.action || '');
    const now = new Date().toISOString();

    if (action === 'doppia_approve') {
      if (plan.status !== 'draft') throw new BadRequestException('초안 상태에서만 검수 완료할 수 있습니다');
      const problems = this.readiness(await this.repo.itemsOf(planId), await this.biz.mediaOf(businessId));
      if (problems.length) throw new BadRequestException(`아직 준비 안 된 칸이 있습니다 — ${problems.slice(0, 5).join(' · ')}${problems.length > 5 ? ` 외 ${problems.length - 5}건` : ''}`);
      return this.repo.updatePlan(planId, { status: 'doppia_approved', doppia_approved_at: now, doppia_approved_by: adminId });
    }
    if (action === 'send') {
      if (plan.status !== 'doppia_approved') throw new BadRequestException('Doppia 검수가 끝난 플랜만 고객에게 보낼 수 있습니다');
      return this.repo.updatePlan(planId, { status: 'sent', sent_at: now });
    }
    if (action === 'customer_approve') {
      if (plan.status !== 'sent') throw new BadRequestException('고객에게 보낸 플랜만 승인 처리할 수 있습니다');
      return this.repo.updatePlan(planId, { status: 'approved', customer_approved_at: now });
    }
    if (action === 'request_changes') {
      if (!['doppia_approved', 'sent', 'approved'].includes(plan.status)) throw new BadRequestException('이 단계에서는 수정 요청을 받을 수 없습니다');
      return this.repo.updatePlan(planId, {
        status: 'draft', customer_feedback: body.feedback ? String(body.feedback).slice(0, 2000) : plan.customer_feedback,
        doppia_approved_at: null, sent_at: null, customer_approved_at: null,
      });
    }
    throw new BadRequestException('action은 doppia_approve | send | customer_approve | request_changes');
  }

  /** 고객 승인된 플랜을 발행 큐에 날짜별 예약으로 한꺼번에 넣는다. */
  async schedule(businessId: string, planId: string) {
    const plan = await this.assertPlan(businessId, planId);
    if (plan.status !== 'approved') throw new BadRequestException('고객 승인된 플랜만 예약할 수 있습니다');
    if (!plan.account_id) throw new BadRequestException('발행할 인스타 계정이 지정되지 않았습니다');
    const items = await this.repo.itemsOf(planId);
    const media = await this.biz.mediaOf(businessId);
    const problems = this.readiness(items, media);
    if (problems.length) throw new BadRequestException(`준비 안 된 칸: ${problems.slice(0, 5).join(' · ')}`);

    const byId = new Map(media.map((m: any) => [m.id, m]));
    const skipped: string[] = [];
    let created = 0;
    for (const it of items) {
      if (it.queue_id) continue;
      if (new Date(it.post_at).getTime() <= Date.now()) { skipped.push(this.label(it) + '(지난 날짜)'); continue; }
      const tags = (it.hashtags || []).map((t) => t.replace(/^#/, ''));
      const q = it.format === 'reel'
        ? await this.biz.insertQueue({
          accountId: plan.account_id, reelMediaId: it.media_ids.find((id) => (byId.get(id) as any)?.media_type === 'video') || null,
          reelCaption: it.caption, hashtags: tags, scheduledAt: it.post_at,
        })
        : await this.biz.insertQueue({
          accountId: plan.account_id, imageMediaIds: it.media_ids.filter((id) => (byId.get(id) as any)?.media_type !== 'video'),
          imageCaption: it.caption, hashtags: tags, scheduledAt: it.post_at,
        });
      await this.repo.updateItem(it.id, { queue_id: q.id });
      created += 1;
    }
    await this.repo.updatePlan(planId, { status: 'scheduled', scheduled_at: new Date().toISOString() });
    return { created, skipped };
  }

  // ── 내부 ──

  /** 칸마다 무엇이 비었는지 사람이 읽을 문장으로 */
  private readiness(items: PlanItemVo[], media: any[]): string[] {
    if (!items.length) return ['게시 칸이 하나도 없습니다'];
    const byId = new Map(media.map((m: any) => [m.id, m]));
    const out: string[] = [];
    for (const it of items) {
      const picked = it.media_ids.map((id) => byId.get(id)).filter(Boolean) as any[];
      const videos = picked.filter((m) => m.media_type === 'video').length;
      const images = picked.length - videos;
      if (!it.caption || !it.caption.trim()) out.push(`${this.label(it)} 캡션 없음`);
      if (it.format === 'reel' && !videos) out.push(`${this.label(it)} 릴스 영상 없음`);
      if (it.format === 'image' && images < 1) out.push(`${this.label(it)} 사진 없음`);
      if (it.format === 'carousel' && images < 2) out.push(`${this.label(it)} 캐러셀 사진 2장 이상 필요`);
    }
    return out;
  }

  private label(it: PlanItemVo): string {
    const d = new Date(new Date(it.post_at).getTime() + 9 * 3600 * 1000);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  }

  /** 이 달의 게시 칸 — 오늘(KST) 이후 날짜만, 릴스는 고르게 섞는다 */
  private slots(month: string, ppw: number, reelRatio: number) {
    const [y, m] = month.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const wanted = WEEKDAYS[this.clampPpw(ppw)];
    const dates: Array<{ date: string; dow: number }> = [];
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      if (date > todayKst && wanted.includes(dow)) dates.push({ date, dow });
    }
    const reels = Math.round(dates.length * this.clampRatio(reelRatio));
    const reelIdx = new Set<number>();
    for (let k = 0; k < reels; k++) reelIdx.add(Math.min(dates.length - 1, Math.floor(((k + 0.5) * dates.length) / reels)));
    return dates.map((x, i) => ({
      ...x, kind: reelIdx.has(i) ? 'reel' : 'post',
      postAt: `${x.date}T${String(POST_HOUR_KST).padStart(2, '0')}:00:00+09:00`,
    }));
  }

  private parsePostAt(v: any, month: string): string {
    const t = new Date(String(v || ''));
    if (isNaN(t.getTime())) throw new BadRequestException('postAt이 올바른 날짜가 아닙니다');
    const kstMonth = new Date(t.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);
    if (kstMonth !== month) throw new BadRequestException(`게시 날짜는 ${month} 안이어야 합니다`);
    return t.toISOString();
  }

  private clampPpw(v: any): number { const n = Math.round(Number(v) || 3); return Math.min(7, Math.max(1, n)); }
  private clampRatio(v: any): number { const n = Number(v); return isNaN(n) ? 0.33 : Math.min(1, Math.max(0, n)); }

  private assertDraft(plan: MonthPlanVo) {
    if (plan.status !== 'draft') throw new BadRequestException('수정하려면 먼저 수정 요청으로 초안 상태로 되돌리세요');
  }

  private async assertBusiness(id: string) {
    const b = await this.biz.findBusiness(id);
    if (!b) throw new NotFoundException('사업체를 찾을 수 없습니다');
    return b;
  }

  private async assertPlan(businessId: string, planId: string): Promise<MonthPlanVo> {
    const p = await this.repo.findPlan(planId);
    if (!p || p.business_id !== businessId) throw new NotFoundException('플랜을 찾을 수 없습니다');
    return p;
  }

  private async assertItem(planId: string, itemId: string): Promise<PlanItemVo> {
    const it = await this.repo.findItem(itemId);
    if (!it || it.plan_id !== planId) throw new NotFoundException('항목을 찾을 수 없습니다');
    return it;
  }
}
