import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { MarketplaceRepository } from './marketplace.repository';
import { CreditsService } from '../credits/credits.service';
import {
  TemplateCardVo, OwnedTemplateVo, MyTemplateVo, ThemeVo,
} from './vo/template.vo';
import {
  TemplateDetailDto, TemplateCreationDto, SavedTemplateDto, UseTemplateDto, AcquireResultDto,
  AddToMyTemplatesResultDto, ReportResultDto, BookmarkResultDto, DeletedTemplateDto,
  CreatorMeDto, EarningsDto, ApplyCreatorResultDto, CreatorStorefrontDto, FollowResultDto,
  RecipeGateDto, DefaultOfficialDto, OwnedInStudioResultDto,
  ListTemplatesQueryDto, CreateTemplateDto, UpdateTemplateDto,
} from './dto/template.dto';

// 도구 id 정규화(image/reel별 기본 도구) — 레지스트리는 설정 성격의 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveToolId } = require(path.join(__dirname, '..', '..', 'src', 'tools', 'registry.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

const CATEGORIES = new Set(['Influencer', 'Shopping', 'UGC', 'Custom']);
const TYPES = new Set(['image', 'reel']);
/** 크리에이터 수익 분배율 — 판매가의 70%가 제작자 포인트로 간다 */
const CREATOR_SHARE = 0.7;
/** 서로 다른 신고자 N명 → 자동 비공개 */
const REPORT_THRESHOLD = 3;
/** 템플릿 id는 UUID. 비UUID(레시피 슬러그 등)가 오면 캐스트 에러로 500이 나므로 404로 가드한다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_THEMES = 12;
/** 'people' 테마만 인플루언서 계열 — 나머지는 쇼핑 계열로 묶는다 */
const INFLUENCER_SLUGS = new Set(['people']);

function httpError(statusCode: number, message: string, extra?: Record<string, unknown>) {
  return Object.assign(new Error(message), { statusCode }, extra || {});
}

/**
 * 도메인 에러 → 응답 바디. 402(구매 필요)처럼 부가 data를 실어보내는 케이스가 있어
 * 레거시 라우트와 Nest 컨트롤러가 같은 변환을 쓰도록 공용화한다.
 */
export function toErrorBody(err: any) {
  return { success: false, error: err.message, ...(err.data ? { data: err.data } : {}) };
}

const clamp = (v: unknown, max: number) => Math.max(0, Math.min(parseInt(String(v), 10) || 0, max));
const toUrl = (p?: string | null) => (p ? `/${p.replace(/^tmp\//, '')}` : null);
const mediaType = (m: any) => (m && m.type === 'video' ? 'video' : 'image');
const slugGroup = (s: string) => (INFLUENCER_SLUGS.has(s) ? 'Influencer' : 'Shopping');

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly repo: MarketplaceRepository,
    private readonly credits: CreditsService,
  ) {}

  /**
   * 유료 과금이 실제로 도는가?
   * 공식 시드는 배포 즉시 라이브 유료, **비공식 유료 템플릿은 `MARKETPLACE_PAID` 점화 전엔 무료** 취급
   * (가격은 저장·노출만 하고 실제로 청구하지 않는다).
   */
  private paidActive(tpl: any): boolean {
    return env.MARKETPLACE_PAID === true || tpl.is_official === true;
  }

  /** 제작자는 자동 보유, 그 외는 owns 행 존재 여부 */
  private isOwned(userId: string, tpl: any): Promise<boolean> {
    if (tpl.creator_id === userId) return Promise.resolve(true);
    return this.repo.ownsTemplate(userId, tpl.id);
  }

  /** 테마 태그 재설정 — 유효 테마가 하나도 안 남으면 'general' 폴백("테마 없음 = General") */
  private async setTemplateThemes(templateId: string, slugs: unknown): Promise<string[]> {
    const arr = Array.isArray(slugs)
      ? [...new Set(slugs.filter((s: unknown) => typeof s === 'string' && s))].slice(0, MAX_THEMES) as string[]
      : [];
    await this.repo.replaceThemes(templateId, arr);
    if ((await this.repo.countThemes(templateId)) === 0) await this.repo.addGeneralTheme(templateId);
    return this.repo.listThemeSlugs(templateId);
  }

  // ── 목록·상세 ──

  listTemplates(userId: string, q: ListTemplatesQueryDto): Promise<TemplateCardVo[]> {
    const { category, feed, theme } = q || ({} as ListTemplatesQueryDto);
    return this.repo.listTemplates(userId, {
      category: category && CATEGORIES.has(category) ? category : undefined,
      feed: feed === '1' || (feed as unknown) === 'true',
      theme,
    }) as Promise<TemplateCardVo[]>;
  }

  /**
   * 템플릿 상세(상품 페이지).
   * ⚠️ **유료 미보유자에게는 prompt를 숨긴다** — 프롬프트가 곧 상품이라, 노출되면 구매 이유가 사라진다.
   */
  async getTemplate(userId: string, id: string): Promise<TemplateDetailDto> {
    if (!UUID_RE.test(id)) throw httpError(404, '템플릿을 찾을 수 없습니다.');
    const tpl = await this.repo.findTemplateDetail(id, userId);
    if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');

    if (tpl.price_credits > 0 && !tpl.mine && !tpl.owned) {
      tpl.prompt = null;
      tpl.negative_prompt = null;
    }
    // 포인터형 템플릿(prompt 비어 있음) — 내 것이면 원본 creation의 프롬프트로 폴백(편집 화면이 비지 않게)
    if (tpl.mine && tpl.from_creation_idx && (!tpl.prompt || !String(tpl.prompt).trim())) {
      const seed = await this.repo.findSeedPromptText(tpl.from_creation_idx);
      if (seed) tpl.prompt = seed;
    }
    delete tpl.from_creation_idx;   // 내부 포인터는 응답에서 제거

    const agg = await this.repo.aggregateCreations(id, tpl.recipe_id || '');
    tpl.creationsCount = agg.creations;
    tpl.totalLikes = agg.likes;
    if (tpl.mine) tpl.revenue = await this.repo.sumRoyalty(userId, id);   // 남의 수익은 비공개
    return tpl;
  }

  async getTemplateCreations(id: string): Promise<TemplateCreationDto[]> {
    const rows = await this.repo.listTemplateCreations(id);
    return rows.map((x: any) => ({
      idx: x.idx, url: toUrl(x.file_path), type: mediaType(x.metadata), likes: x.likes_count || 0,
    })) as TemplateCreationDto[];
  }

  // ── 등록·수정·삭제 ──

  /** 저장(Save as template). **비공개는 누구나**, 공개 게시만 크리에이터 게이트(마찰 최소화). */
  async createTemplate(user: { id: string; email?: string }, body: CreateTemplateDto): Promise<SavedTemplateDto> {
    const b: any = body || {};
    const { name, prompt, category } = b;
    if (!name || !prompt) throw httpError(400, 'name과 prompt는 필수입니다.');
    if (!CATEGORIES.has(category)) throw httpError(400, '유효한 category가 필요합니다.');
    const type = TYPES.has(b.type) ? b.type : 'image';
    const visibility = b.visibility === 'public' ? 'public' : 'private';

    if (visibility === 'public' && !(await this.repo.isCreator(user.id))) {
      throw httpError(403, '공개 게시는 먼저 크리에이터로 신청해 주세요.');
    }

    const created = await this.repo.insertTemplate({
      creatorId: user.id,
      handle: '@' + String(user.email || 'creator').split('@')[0],
      name: String(name).slice(0, 120),
      description: String(b.description || '').slice(0, 600),
      category,
      type,
      style: String(b.style ?? 'Natural').slice(0, 50),
      prompt: String(prompt).slice(0, 8000),
      negativePrompt: String(b.negativePrompt ?? '').slice(0, 1000),
      tool: resolveToolId(b.tool, type === 'reel' ? 'reel' : 'image'),
      visibility,
      emoji: String(b.emoji ?? '🎨').slice(0, 8),
      price: clamp(b.priceCredits, 100),
      usePrice: clamp(b.usePriceCredits, 50),          // 사용당 로열티는 소액(≤50)
      preview: Array.isArray(b.previewMedia) ? b.previewMedia.slice(0, 6) : [],
      // 전시용 레퍼런스 — 생성에는 주입하지 않고 상세 갤러리에만 쓴다
      refExamples: Array.isArray(b.referenceExamples)
        ? b.referenceExamples.filter((u: unknown) => typeof u === 'string' && u).slice(0, 6) : [],
      targetImg: b.targetImageUrl ? String(b.targetImageUrl).slice(0, 4_000_000) : null,
    });

    // 크리에이터는 자기 템플릿 자동 보유 → 스튜디오 픽커에 바로 뜬다
    await this.repo.insertOwn(user.id, created.id, 'free', 0);

    // 씨앗 creation 역링크 + 좋아요 롤업 — **공개 게시일 때만**.
    // 비공개 템플릿에 역링크하면 그 creation에 열 수 없는 Get CTA(막다른 링크)가 생긴다.
    const srcIdx = parseInt(b.sourceResultIdx, 10);
    if (srcIdx && visibility === 'public') {
      const seedLikes = await this.repo.linkSeedCreation(created.id, srcIdx, user.id);
      if (seedLikes && seedLikes > 0) {
        await this.repo.addLikes(created.id, seedLikes);
        created.likes_count = (created.likes_count || 0) + seedLikes;
      }
    }
    created.themes = await this.setTemplateThemes(created.id, b.themeSlugs);
    return created;
  }

  /** 부분 업데이트 — 화이트리스트 필드만. 비공개→공개 전환에만 게이트가 걸린다. */
  async updateTemplate(userId: string, id: string, body: UpdateTemplateDto): Promise<SavedTemplateDto> {
    const b: any = body || {};
    const cur = await this.repo.findOwnTemplate(id, userId);
    if (!cur) throw httpError(404, '내 템플릿이 아니거나 없습니다.');

    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, value: unknown) => {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    };

    if (typeof b.name === 'string' && b.name.trim()) push('name', b.name.trim().slice(0, 120));
    if (b.category !== undefined && CATEGORIES.has(b.category)) push('category', b.category);
    if (b.description !== undefined) push('description', String(b.description || '').slice(0, 600));
    if (b.priceCredits !== undefined) push('price_credits', clamp(b.priceCredits, 100));
    if (b.usePriceCredits !== undefined) push('use_price_credits', clamp(b.usePriceCredits, 50));
    if (typeof b.prompt === 'string' && b.prompt.trim()) push('prompt', String(b.prompt).slice(0, 8000));
    if (b.negativePrompt !== undefined) push('negative_prompt', String(b.negativePrompt).slice(0, 1000));
    if (b.targetImageUrl !== undefined) {
      push('target_image_url', b.targetImageUrl ? String(b.targetImageUrl).slice(0, 4_000_000) : null);
    }
    if (b.visibility !== undefined) {
      const vis = b.visibility === 'public' ? 'public' : 'private';
      if (vis === 'public' && cur.visibility !== 'public') {
        if (!(await this.repo.isCreator(userId))) {
          throw httpError(403, '공개 게시는 먼저 크리에이터로 신청해 주세요.');
        }
        // 원본 creation이 비공개인데 템플릿만 공개하면, Explore에서 원본을 볼 수 없는 상태가 된다.
        if (cur.from_creation_idx && !(await this.repo.isCreationPublic(cur.from_creation_idx))) {
          throw httpError(409, '원본 creation을 공개(Private Mode OFF)한 뒤에 Explore에 공개할 수 있습니다.');
        }
      }
      push('visibility', vis);
    }

    const hasThemes = b.themeSlugs !== undefined;    // 테마만 바꾸는 것도 허용
    if (!sets.length && !hasThemes) throw httpError(400, '변경할 내용이 없습니다.');

    const row = sets.length
      ? await this.repo.updateTemplate(id, sets, params)
      : await this.repo.findPublicCols(id);
    if (hasThemes) row.themes = await this.setTemplateThemes(id, b.themeSlugs);
    return row;
  }

  async deleteTemplate(userId: string, id: string): Promise<DeletedTemplateDto> {
    const deleted = await this.repo.deleteTemplate(id, userId);
    if (!deleted) throw httpError(404, '내 템플릿이 아니거나 없습니다.');
    return { id: deleted };
  }

  // ── 사용·구매 ──

  /**
   * 스튜디오 적용 파라미터 반환 + 사용 기록.
   * buy-to-own: 유료 미보유는 402(구매 필요), 무료 미보유는 그 자리에서 보유 처리.
   * 사용 시점엔 과금하지 않는다(구매료=/acquire, 사용당 로열티=생성 시점).
   */
  async useTemplate(userId: string, id: string): Promise<{ data: UseTemplateDto; charged: number }> {
    const tpl = await this.repo.findUsableTemplate(id, userId);
    if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');

    if (!(await this.isOwned(userId, tpl))) {
      if (tpl.price_credits > 0) {
        throw httpError(402, '먼저 구매해야 사용할 수 있습니다.', {
          data: { needPurchase: true, price: tpl.price_credits },
        });
      }
      await this.repo.insertOwn(userId, tpl.id, 'free', 0);
    }

    await this.repo.incrementUsage(tpl.id);
    return {
      data: {
        id: tpl.id, name: tpl.name, category: tpl.category, type: tpl.type, style: tpl.style,
        prompt: tpl.prompt, negativePrompt: tpl.negative_prompt || '', tool: tpl.tool || null,
        emoji: tpl.emoji,
        recipeId: tpl.recipe_id || null,   // recipe-backed면 스튜디오가 리치 레시피를 로드한다
      },
      charged: 0,
    };
  }

  /**
   * 보유 획득. 무료=즉시, 유료=1회 과금 + 크리에이터 70% 로열티.
   *
   * ⚠️ 돈이 오가는 경로 — 세 가지를 지킨다:
   *   ① 이미 보유면 **멱등**(무과금)
   *   ② `INSERT ... DO NOTHING`이 0행이면 **동시 구매**로 보고 즉시 환불
   *   ③ 어떤 실패든 catch에서 환불(크레딧만 빠지고 보유는 없는 상태를 만들지 않는다)
   */
  async acquireTemplate(user: { id: string; role?: string }, id: string): Promise<{ data: AcquireResultDto; charged: number }> {
    let charge: { amount: number; refund: () => Promise<void> } | null = null;
    try {
      const tpl = await this.repo.findAcquirableTemplate(id, user.id);
      if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');

      if (await this.isOwned(user.id, tpl)) {
        return { data: { id: tpl.id, owned: true, alreadyOwned: true }, charged: 0 };
      }

      const effectivePrice = this.paidActive(tpl) ? tpl.price_credits : 0;
      let source: 'free' | 'purchase' = 'free';
      let pricePaid = 0;
      if (effectivePrice > 0) {
        charge = await this.credits.charge(user, effectivePrice, {
          type: 'template_purchase', description: `템플릿 구매: ${tpl.name}`, refId: tpl.id,
        });
        source = 'purchase';
        pricePaid = charge ? charge.amount : effectivePrice;   // admin은 charge=null(무과금)
      }

      const inserted = await this.repo.insertOwn(user.id, tpl.id, source, pricePaid);
      if (inserted === 0) {
        if (charge) await charge.refund();
        return { data: { id: tpl.id, owned: true, alreadyOwned: true }, charged: 0 };
      }

      // 로열티는 **구매가 확정된 뒤에만**. 실패해도 구매는 유지한다(사후 정산 가능).
      if (charge && tpl.creator_id && effectivePrice > 0) {
        const royalty = Math.round(effectivePrice * CREATOR_SHARE);
        if (royalty > 0) {
          await this.credits.addPoints(tpl.creator_id, royalty, {
            type: 'royalty', description: `템플릿 판매: ${tpl.name}`, refId: tpl.id,
          }).catch(() => {});
        }
      }
      return { data: { id: tpl.id, owned: true, source }, charged: pricePaid };
    } catch (err) {
      if (charge) await charge.refund();
      throw err;
    }
  }

  /** 내 템플릿을 My templates에 추가(멱등). 내 것 전용. */
  async addToMyTemplates(userId: string, id: string): Promise<AddToMyTemplatesResultDto> {
    if (!(await this.repo.findMyActiveTemplate(id, userId))) {
      throw httpError(404, '내 템플릿이 아니거나 없습니다.');
    }
    await this.repo.insertOwn(userId, id, 'free', 0);
    return { id, added: true };
  }

  // ── 신고·저장 ──

  /** 신고(중복 무시). 서로 다른 신고자가 임계치를 넘으면 자동 비공개. */
  async reportTemplate(userId: string, id: string, reasonRaw: string): Promise<ReportResultDto> {
    const tpl = await this.repo.findTemplateForReport(id);
    if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');
    if (tpl.creator_id === userId) throw httpError(400, '본인 템플릿은 신고할 수 없습니다.');

    await this.repo.insertReport(id, userId, String(reasonRaw || 'other').slice(0, 40));
    const reporters = await this.repo.countDistinctReporters(id);
    let takenDown = false;
    if (reporters >= REPORT_THRESHOLD && tpl.status === 'active') {
      await this.repo.takeDown(id);
      takenDown = true;
    }
    return { reported: true, takenDown };
  }

  async bookmarkTemplate(userId: string, id: string): Promise<BookmarkResultDto> {
    if (!(await this.repo.findBookmarkableTemplate(id, userId))) {
      throw httpError(404, '템플릿을 찾을 수 없습니다.');
    }
    await this.repo.insertBookmark(userId, id);
    return { bookmarked: true };
  }

  async unbookmarkTemplate(userId: string, id: string): Promise<BookmarkResultDto> {
    await this.repo.deleteBookmark(userId, id);
    return { bookmarked: false };
  }

  listBookmarks(userId: string): Promise<TemplateCardVo[]> {
    return this.repo.listBookmarks(userId) as Promise<TemplateCardVo[]>;
  }

  listThemes(): Promise<ThemeVo[]> {
    return this.repo.listThemes() as Promise<ThemeVo[]>;
  }

  // ── 크리에이터 ──

  /** 크리에이터 상태 + 내 템플릿 + 오피셜 마스터(둘 다 스튜디오 테마에 넣고 뺄 수 있다) */
  async getMe(userId: string): Promise<CreatorMeDto> {
    const [flags, templates, official] = await Promise.all([
      this.repo.findCreatorFlags(userId),
      this.repo.listMyTemplates(userId),
      this.repo.listOfficialTemplates(userId),
    ]);
    return {
      isCreator: flags?.is_creator || false,
      templates: templates as MyTemplateVo[],
      official: official as MyTemplateVo[],
    };
  }

  /** 셀러 정산 — 로열티는 **포인트**로 적립된다(크레딧이 아니라 현금성). */
  async getEarnings(user: { id: string; email?: string }): Promise<EarningsDto> {
    const [flags, totals, templates, recent] = await Promise.all([
      this.repo.findCreatorFlags(user.id),
      this.repo.royaltyTotals(user.id),
      this.repo.earningsByTemplate(user.id),
      this.repo.recentRoyalties(user.id),
    ]);
    return {
      isCreator: flags?.is_creator || false,
      handle: '@' + String(user.email || 'creator').split('@')[0],
      creatorShare: CREATOR_SHARE,
      pointBalance: flags?.point_balance || 0,
      totalEarned: totals.total_earned,
      payoutCount: totals.payout_count,
      templates,
      recent,
    } as EarningsDto;
  }

  /** 크리에이터 신청 — 즉시 승인(심사 없음) */
  async applyCreator(userId: string): Promise<ApplyCreatorResultDto> {
    await this.repo.markCreator(userId);
    return { isCreator: true };
  }

  /** 공개 스토어프론트. prompt는 실어보내지 않는다(블랙박스 보호). */
  async getCreator(userId: string, handleParam: string): Promise<CreatorStorefrontDto> {
    const raw = this.normalizeHandle(handleParam);
    if (!raw) throw httpError(400, 'handle이 필요합니다.');
    const handle = '@' + raw;

    const creatorId = await this.repo.resolveCreatorId(raw);
    const [templates, showcase] = await Promise.all([
      this.repo.listCreatorTemplates(handle, userId, creatorId),
      this.repo.listCreatorShowcase(raw),
    ]);
    if (!templates.length && !showcase.length) throw httpError(404, '크리에이터를 찾을 수 없습니다.');

    const isOwn = !!creatorId && creatorId === userId;
    let followers = 0;
    let following = false;
    if (creatorId) {
      followers = await this.repo.followerCount(creatorId);
      if (!isOwn) following = await this.repo.isFollowing(creatorId, userId);
    }
    return {
      handle,
      templateCount: templates.length,
      totalLikes: templates.reduce((s: number, t: any) => s + (t.likes_count || 0), 0),
      followers,
      following,
      isOwn,
      templates,
      showcase: showcase.map((r: any) => ({ idx: r.idx, url: toUrl(r.file_path), type: mediaType(r.metadata) })),
    } as CreatorStorefrontDto;
  }

  async followCreator(userId: string, handleParam: string): Promise<FollowResultDto> {
    const creatorId = await this.requireCreatorId(handleParam);
    if (creatorId === userId) throw httpError(400, '자기 자신은 팔로우할 수 없습니다.');
    await this.repo.insertFollow(userId, creatorId);
    return { following: true, followers: await this.repo.followerCount(creatorId) };
  }

  async unfollowCreator(userId: string, handleParam: string): Promise<FollowResultDto> {
    const creatorId = await this.requireCreatorId(handleParam);
    await this.repo.deleteFollow(userId, creatorId);
    return { following: false, followers: await this.repo.followerCount(creatorId) };
  }

  // ── 라이브러리/스튜디오 ──

  async listRecipeGates(userId: string): Promise<RecipeGateDto[]> {
    const rows = await this.repo.listRecipeGates(userId);
    return rows.map((x: any) => ({
      templateId: x.id, recipeId: x.recipe_id, price: x.price_credits, owned: x.owned, in_studio: x.in_studio,
    })) as RecipeGateDto[];
  }

  /**
   * 보유 템플릿 전부(Library My templates의 정본).
   *
   * 테마 판단 규칙(2026-06-27 확정):
   *   · **공식 = 라벨** — `template_themes`가 그대로 테마(처음부터 스튜디오에 있는 것)
   *   · **비공식 = 포스트잇** — 사용자가 붙인 개인 배치가 우선(기본테마 오버라이드 + 커스텀테마 배치)
   */
  async listOwned(userId: string): Promise<OwnedTemplateVo[]> {
    const rows = await this.repo.listOwned(userId);
    const ids = rows.filter((t: any) => !t.is_official).map((t: any) => String(t.id));

    const ovAdd: Record<string, Set<string>> = {};
    const ovRem: Record<string, Set<string>> = {};
    const customGrp: Record<string, Set<string>> = {};
    if (ids.length) {
      const [overrides, placements] = await Promise.all([
        this.repo.listThemeOverrides(userId, ids),
        this.repo.listCustomThemePlacements(userId, ids),
      ]);
      for (const o of overrides) {
        const m = o.action === 'add' ? ovAdd : ovRem;
        (m[o.item_id] = m[o.item_id] || new Set()).add(o.theme_slug);
      }
      for (const x of placements) {
        (customGrp[x.item_id] = customGrp[x.item_id] || new Set())
          .add(x.macro_group === 'Influencer' ? 'Influencer' : 'Shopping');
      }
    }

    return rows.map((t: any) => {
      const id = String(t.id);
      const label: string[] = t.label_themes || [];
      delete t.label_themes;
      if (t.is_official) {
        return { ...t, themes: label, macroGroup: label.some((s) => INFLUENCER_SLUGS.has(s)) ? 'Influencer' : 'Shopping' };
      }
      // 포스트잇 우선: add가 하나라도 있으면 그것만 쓰고 라벨은 무시, 없으면 라벨−remove로 폴백
      const adds = [...(ovAdd[id] || [])];
      const removes = ovRem[id] || new Set<string>();
      const customGroups = [...(customGrp[id] || [])];
      const hasPostit = adds.length > 0 || customGroups.length > 0;
      const themes = adds.length ? adds : (hasPostit ? [] : label.filter((s) => !removes.has(s)));
      const groups = new Set<string>([...adds.map(slugGroup), ...customGroups]);
      if (!groups.size) themes.forEach((s) => groups.add(slugGroup(s)));
      return { ...t, themes, macroGroup: groups.has('Influencer') ? 'Influencer' : 'Shopping' };
    }) as OwnedTemplateVo[];
  }

  /** In Studio ↔ Library only 일괄 이동 */
  async setOwnedInStudio(userId: string, body: any = {}): Promise<OwnedInStudioResultDto> {
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter((x: string) => UUID_RE.test(x)) : [];
    const inStudio = body.in_studio !== false;
    if (!ids.length) throw httpError(400, 'ids가 필요합니다.');
    return { updated: await this.repo.setInStudio(userId, ids, inStudio), in_studio: inStudio };
  }

  async listDefaultOfficials(userId: string): Promise<DefaultOfficialDto[]> {
    const rows = await this.repo.listDefaultOfficials(userId);
    return rows.map((t: any) => ({
      ...t,
      in_studio: true,
      macroGroup: (t.themes || []).some((s: string) => INFLUENCER_SLUGS.has(s)) ? 'Influencer' : 'Shopping',
    })) as DefaultOfficialDto[];
  }

  // ── 내부 ──

  private normalizeHandle(raw: string): string {
    return String(raw || '').replace(/^@+/, '').slice(0, 80);
  }

  private async requireCreatorId(handleParam: string): Promise<string> {
    const creatorId = await this.repo.resolveCreatorId(this.normalizeHandle(handleParam));
    if (!creatorId) throw httpError(404, '크리에이터를 찾을 수 없습니다.');
    return creatorId;
  }
}

/**
 * 크리에이터·라이브러리 영역 컨트롤러(`/api/marketplace/creators`·`/me`·`/owned` …)가 주입받는 서비스.
 * 로직은 `MarketplaceService`에 한 벌만 두고 여기서는 위임만 한다 — 규칙이 두 곳으로 갈라지지 않게.
 */
@Injectable()
export class MarketplaceCreatorsService {
  constructor(private readonly market: MarketplaceService) {}

  listThemes(): Promise<ThemeVo[]> { return this.market.listThemes(); }
  getMe(userId: string): Promise<CreatorMeDto> { return this.market.getMe(userId); }
  getEarnings(user: any): Promise<EarningsDto> { return this.market.getEarnings(user); }
  applyCreator(userId: string): Promise<ApplyCreatorResultDto> { return this.market.applyCreator(userId); }
  getCreator(userId: string, handle: string): Promise<CreatorStorefrontDto> { return this.market.getCreator(userId, handle); }
  followCreator(userId: string, handle: string): Promise<FollowResultDto> { return this.market.followCreator(userId, handle); }
  unfollowCreator(userId: string, handle: string): Promise<FollowResultDto> { return this.market.unfollowCreator(userId, handle); }
  listBookmarks(userId: string): Promise<TemplateCardVo[]> { return this.market.listBookmarks(userId); }
  listRecipeGates(userId: string): Promise<RecipeGateDto[]> { return this.market.listRecipeGates(userId); }
  listOwned(userId: string): Promise<OwnedTemplateVo[]> { return this.market.listOwned(userId); }
  setOwnedInStudio(userId: string, body: any): Promise<OwnedInStudioResultDto> { return this.market.setOwnedInStudio(userId, body || {}); }
  listDefaultOfficials(userId: string): Promise<DefaultOfficialDto[]> { return this.market.listDefaultOfficials(userId); }
}
