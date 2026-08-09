import { Injectable } from '@nestjs/common';
import { StudioRepository } from './studio.repository';
import { MacroGroup, ThemeItemType, CreationPreviewVo } from './vo/studio-theme.vo';
import {
  StudioThemesDto, StudioThemeDto, DeletedThemeDto, ThemeItemResultDto,
  HiddenRecipeResultDto, HiddenThemeResultDto, GlobalThemeItemResultDto,
  CreateStudioThemeDto, UpdateStudioThemeDto, AddThemeItemDto, SetGlobalThemeItemDto,
} from './dto/studio.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 테마 슬러그 → 대분류. general·ugc는 중립(자동 분류 안 함). 프론트 CAT_THEMES와 동기화.
 *   B안: 내 미분류(Custom) 템플릿에 구체 테마를 적용하면 그 대분류로 승격 → 스튜디오 모드 정합.
 */
const THEME_MACRO: Record<string, MacroGroup> = {
  people: 'Influencer', beauty: 'Shopping', fashion: 'Shopping', jewelry: 'Shopping',
  pet: 'Shopping', food: 'Shopping', coffee: 'Shopping', home: 'Shopping', tech: 'Shopping',
};

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}
/** 커스텀 테마 대분류 — "Your themes" 중립 버킷은 폐지, 전부 Influencer 또는 Shopping */
function normGroup(g?: string): MacroGroup {
  return g === 'Influencer' ? 'Influencer' : 'Shopping';
}
function normItemType(t?: string): ThemeItemType {
  return t === 'template' || t === 'creation' ? t : 'recipe';
}

@Injectable()
export class StudioService {
  constructor(private readonly repo: StudioRepository) {}

  /**
   * 내 템플릿을 테마에 넣을 때 보유 보장 — 미보유 + 내가 만든 수동 템플릿이면 자동 보유(무료).
   *   ⚠️ 자동민팅(origin='auto')은 제외 — My templates 추가는 명시적 add-to-my-templates로만.
   */
  private async ensureOwnedIfMine(userId: string, templateId: string): Promise<boolean> {
    if (await this.repo.isOwned(userId, templateId)) return true;
    const t = await this.repo.templateOrigin(templateId);
    if (t && t.creator_id === userId && t.origin !== 'auto') {
      await this.repo.grantFreeOwn(userId, templateId);
      return true;
    }
    return false;
  }

  /** 화면 한 번 그리는 데 필요한 개인 설정 전부 */
  async getThemes(userId: string): Promise<StudioThemesDto> {
    const [themes, items, hidden, overrides, hiddenThemes] = await Promise.all([
      this.repo.customThemes(userId), this.repo.themeItems(userId), this.repo.hiddenRecipes(userId),
      this.repo.themeOverrides(userId), this.repo.hiddenThemes(userId),
    ]);
    const byTheme: Record<string, Array<{ itemType: ThemeItemType; itemId: string }>> = {};
    for (const it of items) {
      (byTheme[it.theme_id] = byTheme[it.theme_id] || []).push({ itemType: it.item_type, itemId: it.item_id });
    }
    // creation 미리보기 — 비공개·삭제분은 map에 없어 프론트가 자동으로 렌더하지 않는다.
    const creationIds = new Set<number>();
    items.forEach((it) => { if (it.item_type === 'creation') creationIds.add(parseInt(it.item_id, 10)); });
    overrides.forEach((o) => { if (o.item_type === 'creation' && o.action === 'add') creationIds.add(parseInt(o.item_id, 10)); });
    const cids = [...creationIds].filter(Boolean);
    const creationPreviews: Record<string, CreationPreviewVo> = {};
    if (cids.length) {
      for (const x of await this.repo.creationPreviews(cids)) {
        creationPreviews[x.idx] = {
          url: x.file_path ? `/${x.file_path.replace(/^tmp\//, '')}` : null,
          type: (x.metadata && x.metadata.type === 'video') ? 'video' : 'image',
          creatorHandle: x.handle ? '@' + x.handle : null,
        };
      }
    }
    return {
      customThemes: themes.map((t) => ({
        id: t.id, name: t.name, sortOrder: t.sort_order, group: normGroup(t.macro_group), items: byTheme[t.id] || [],
      })),
      hiddenRecipes: hidden.map((r) => r.recipe_id),
      themeOverrides: overrides.map((o) => ({ themeSlug: o.theme_slug, itemType: o.item_type, itemId: o.item_id, action: o.action })),
      hiddenThemes: hiddenThemes.map((r) => r.theme_slug),
      creationPreviews,
    };
  }

  async createTheme(userId: string, body: CreateStudioThemeDto): Promise<StudioThemeDto> {
    const name = String(body?.name || '').trim().slice(0, 60);
    if (!name) throw httpError(400, '테마 이름이 필요합니다.');
    const group = normGroup(body?.group);
    const sortOrder = await this.repo.nextSortOrder(userId);
    const row = await this.repo.insertTheme(userId, name, sortOrder, group);
    return { id: row.id, name: row.name, sortOrder: row.sort_order, group: normGroup(row.macro_group), items: [] };
  }

  async updateTheme(userId: string, themeId: string, body: UpdateStudioThemeDto): Promise<StudioThemeDto> {
    if (!UUID_RE.test(themeId)) throw httpError(404, '없는 테마');
    const sets: string[] = []; const params: unknown[] = [];
    if (typeof body?.name === 'string' && body.name.trim()) { params.push(body.name.trim().slice(0, 60)); sets.push(`name = $${params.length}`); }
    if (body?.sortOrder !== undefined) { params.push(parseInt(String(body.sortOrder), 10) || 0); sets.push(`sort_order = $${params.length}`); }
    if (body?.group !== undefined) { params.push(normGroup(body.group)); sets.push(`macro_group = $${params.length}`); }
    if (!sets.length) throw httpError(400, '변경할 내용이 없습니다.');
    params.push(themeId, userId);
    const row = await this.repo.updateTheme(userId, themeId, sets, params);
    if (!row) throw httpError(404, '내 테마가 아니거나 없습니다.');
    return { id: row.id, name: row.name, sortOrder: row.sort_order, group: normGroup(row.macro_group) };
  }

  async deleteTheme(userId: string, themeId: string): Promise<DeletedThemeDto> {
    if (!UUID_RE.test(themeId)) throw httpError(404, '없는 테마');
    const row = await this.repo.deleteTheme(userId, themeId);
    if (!row) throw httpError(404, '내 테마가 아니거나 없습니다.');
    return { id: row.id };
  }

  /** 테마에 넣기 — 마켓 템플릿은 보유 검증, creation은 공개 여부 검증 */
  async addItem(userId: string, themeId: string, body: AddThemeItemDto): Promise<ThemeItemResultDto> {
    if (!UUID_RE.test(themeId)) throw httpError(404, '없는 테마');
    const itemType = normItemType(body?.itemType);
    const itemId = String(body?.itemId || '').slice(0, 200);
    if (!itemId) throw httpError(400, 'itemId가 필요합니다.');
    if (!(await this.repo.isMyTheme(userId, themeId))) throw httpError(404, '내 테마가 아니거나 없습니다.');
    if (itemType === 'template') {
      if (!UUID_RE.test(itemId)) throw httpError(400, '템플릿 id가 올바르지 않습니다.');
      if (!(await this.ensureOwnedIfMine(userId, itemId))) throw httpError(403, '먼저 이 템플릿을 보유해야 합니다.');
    } else if (itemType === 'creation') {
      if (!/^\d+$/.test(itemId)) throw httpError(400, 'creation id가 올바르지 않습니다.');
      if (!(await this.repo.isPublicCreation(parseInt(itemId, 10)))) {
        throw httpError(404, '저장할 수 없는 결과물입니다 (비공개·삭제·없음).');
      }
    }
    await this.repo.addItem(themeId, userId, itemType, itemId);
    return { themeId, itemType, itemId };
  }

  async removeItem(userId: string, themeId: string, itemType: string, itemId: string): Promise<void> {
    await this.repo.removeItem(themeId, userId, normItemType(itemType), itemId);
  }

  async hideRecipe(userId: string, recipeId: string): Promise<HiddenRecipeResultDto> {
    const rid = String(recipeId || '').slice(0, 200);
    if (!rid) throw httpError(400, 'recipeId 필요');
    await this.repo.hideRecipe(userId, rid);
    return { recipeId: rid, hidden: true };
  }
  async unhideRecipe(userId: string, recipeId: string): Promise<HiddenRecipeResultDto> {
    await this.repo.unhideRecipe(userId, recipeId);
    return { recipeId, hidden: false };
  }

  /** 기본(글로벌) 테마 개인 오버라이드 — 내 미분류 템플릿은 대분류로 승격될 수 있다 */
  async setGlobalThemeItem(userId: string, slugParam: string, body: SetGlobalThemeItemDto): Promise<GlobalThemeItemResultDto> {
    const slug = String(slugParam || '').slice(0, 60);
    const itemType = normItemType(body?.itemType);
    const itemId = String(body?.itemId || '').slice(0, 200);
    const action = body?.action === 'remove' ? 'remove' : 'add';
    if (!slug || !itemId) throw httpError(400, 'slug·itemId 필요');
    if (!(await this.repo.themeExists(slug))) throw httpError(404, '없는 테마');
    if (itemType === 'creation' && action === 'add') {
      if (!/^\d+$/.test(itemId)) throw httpError(400, 'creation id가 올바르지 않습니다.');
      if (!(await this.repo.isPublicCreation(parseInt(itemId, 10)))) {
        throw httpError(404, '저장할 수 없는 결과물입니다 (비공개·삭제·없음).');
      }
    }
    // 기본 테마에 내 템플릿 추가 시 보유 보장 → studio 픽커에 떠야 그 테마에 보인다.
    if (itemType === 'template' && action === 'add' && UUID_RE.test(itemId)) {
      await this.ensureOwnedIfMine(userId, itemId);
    }
    await this.repo.upsertOverride(userId, slug, itemType, itemId, action);
    let category: string | null = null;
    if (itemType === 'template' && action === 'add' && UUID_RE.test(itemId) && THEME_MACRO[slug]) {
      category = await this.repo.promoteCategory(itemId, userId, THEME_MACRO[slug]);
    }
    return { themeSlug: slug, itemType, itemId, action, category };
  }

  async removeGlobalThemeItem(userId: string, slug: string, itemType: string, itemId: string): Promise<void> {
    await this.repo.deleteOverride(userId, slug, normItemType(itemType), itemId);
  }

  async hideTheme(userId: string, slugParam: string): Promise<HiddenThemeResultDto> {
    const slug = String(slugParam || '').slice(0, 60);
    if (!slug) throw httpError(400, 'slug 필요');
    await this.repo.hideTheme(userId, slug);
    return { themeSlug: slug, hidden: true };
  }
  async unhideTheme(userId: string, slug: string): Promise<HiddenThemeResultDto> {
    await this.repo.unhideTheme(userId, slug);
    return { themeSlug: slug, hidden: false };
  }
}
