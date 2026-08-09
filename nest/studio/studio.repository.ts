import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { MacroGroup, ThemeItemType, OverrideAction } from './vo/studio-theme.vo';

/**
 * 스튜디오 개인 큐레이션 데이터 접근 — user_studio_themes / user_studio_theme_items /
 * user_theme_overrides / user_hidden_recipes / user_hidden_themes / template_owns.
 * (설계 = docs/테마_조직화_설계_2026-06-24.md)
 */
@Injectable()
export class StudioRepository {
  constructor(private readonly db: DbService) {}

  // ── 조회 ──
  async customThemes(userId: string) {
    const r = await this.db.query<{ id: string; name: string; sort_order: number; macro_group: string }>(
      `SELECT id, name, sort_order, macro_group FROM user_studio_themes
        WHERE user_id = $1 AND origin = 'custom' ORDER BY sort_order, name`, [userId]);
    return r.rows;
  }
  async themeItems(userId: string) {
    const r = await this.db.query<{ theme_id: string; item_type: ThemeItemType; item_id: string }>(
      `SELECT user_studio_theme_id AS theme_id, item_type, item_id
         FROM user_studio_theme_items WHERE user_id = $1`, [userId]);
    return r.rows;
  }
  async hiddenRecipes(userId: string) {
    const r = await this.db.query<{ recipe_id: string }>(
      'SELECT recipe_id FROM user_hidden_recipes WHERE user_id = $1', [userId]);
    return r.rows;
  }
  async themeOverrides(userId: string) {
    const r = await this.db.query<{ theme_slug: string; item_type: ThemeItemType; item_id: string; action: OverrideAction }>(
      'SELECT theme_slug, item_type, item_id, action FROM user_theme_overrides WHERE user_id = $1', [userId]);
    return r.rows;
  }
  async hiddenThemes(userId: string) {
    const r = await this.db.query<{ theme_slug: string }>(
      'SELECT theme_slug FROM user_hidden_themes WHERE user_id = $1', [userId]);
    return r.rows;
  }
  /** 테마 멤버 중 creation(저장 룩)의 미리보기 — 비공개·삭제분은 결과에서 빠진다 */
  async creationPreviews(ids: number[]) {
    const r = await this.db.query<{ idx: number; file_path: string; metadata: any; handle: string }>(
      `SELECT gr.idx, gr.file_path, gr.metadata, split_part(u.email, '@', 1) AS handle
         FROM generation_results gr JOIN prompts p ON p.idx = gr.prompt_idx JOIN users u ON u.id = p.user_id
        WHERE gr.idx = ANY($1) AND gr.visibility = 'public' AND gr.status = 'success'
          AND gr.taken_down = false AND gr.file_path IS NOT NULL`, [ids]);
    return r.rows;
  }

  // ── 커스텀 테마 ──
  async nextSortOrder(userId: string): Promise<number> {
    const r = await this.db.query<{ n: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM user_studio_themes WHERE user_id = $1 AND origin = 'custom'`,
      [userId]);
    return r.rows[0].n;
  }
  async insertTheme(userId: string, name: string, sortOrder: number, group: MacroGroup) {
    const r = await this.db.query<{ id: string; name: string; sort_order: number; macro_group: string }>(
      `INSERT INTO user_studio_themes (user_id, name, sort_order, origin, macro_group)
       VALUES ($1, $2, $3, 'custom', $4)
       RETURNING id, name, sort_order, macro_group`, [userId, name, sortOrder, group]);
    return r.rows[0];
  }
  /** 부분 수정 — 전달된 필드만 SET(내 커스텀 테마만) */
  async updateTheme(userId: string, themeId: string, sets: string[], params: unknown[]) {
    const r = await this.db.query<{ id: string; name: string; sort_order: number; macro_group: string }>(
      `UPDATE user_studio_themes SET ${sets.join(', ')}
        WHERE id = $${params.length - 1} AND user_id = $${params.length} AND origin = 'custom'
       RETURNING id, name, sort_order, macro_group`, params);
    return r.rows[0] || null;
  }
  async deleteTheme(userId: string, themeId: string) {
    const r = await this.db.query<{ id: string }>(
      `DELETE FROM user_studio_themes WHERE id = $1 AND user_id = $2 AND origin = 'custom' RETURNING id`,
      [themeId, userId]);
    return r.rows[0] || null;
  }
  async isMyTheme(userId: string, themeId: string): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM user_studio_themes WHERE id = $1 AND user_id = $2 AND origin = 'custom'`,
      [themeId, userId]);
    return r.rowCount > 0;
  }

  // ── 테마 멤버 ──
  async addItem(themeId: string, userId: string, itemType: ThemeItemType, itemId: string) {
    await this.db.query(
      `INSERT INTO user_studio_theme_items (user_studio_theme_id, user_id, item_type, item_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [themeId, userId, itemType, itemId]);
  }
  async removeItem(themeId: string, userId: string, itemType: ThemeItemType, itemId: string) {
    await this.db.query(
      `DELETE FROM user_studio_theme_items
        WHERE user_studio_theme_id = $1 AND user_id = $2 AND item_type = $3 AND item_id = $4`,
      [themeId, userId, itemType, itemId]);
  }

  // ── 숨김 ──
  async hideRecipe(userId: string, recipeId: string) {
    await this.db.query(
      `INSERT INTO user_hidden_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, recipeId]);
  }
  async unhideRecipe(userId: string, recipeId: string) {
    await this.db.query('DELETE FROM user_hidden_recipes WHERE user_id = $1 AND recipe_id = $2', [userId, recipeId]);
  }
  async hideTheme(userId: string, slug: string) {
    await this.db.query(
      `INSERT INTO user_hidden_themes (user_id, theme_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, slug]);
  }
  async unhideTheme(userId: string, slug: string) {
    await this.db.query('DELETE FROM user_hidden_themes WHERE user_id = $1 AND theme_slug = $2', [userId, slug]);
  }

  // ── 글로벌 테마 오버라이드 ──
  async themeExists(slug: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM themes WHERE slug = $1', [slug]);
    return r.rowCount > 0;
  }
  async upsertOverride(userId: string, slug: string, itemType: ThemeItemType, itemId: string, action: OverrideAction) {
    await this.db.query(
      `INSERT INTO user_theme_overrides (user_id, theme_slug, item_type, item_id, action)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, theme_slug, item_type, item_id) DO UPDATE SET action = EXCLUDED.action`,
      [userId, slug, itemType, itemId, action]);
  }
  async deleteOverride(userId: string, slug: string, itemType: ThemeItemType, itemId: string) {
    await this.db.query(
      `DELETE FROM user_theme_overrides WHERE user_id = $1 AND theme_slug = $2 AND item_type = $3 AND item_id = $4`,
      [userId, slug, itemType, itemId]);
  }

  // ── 보유·승격 ──
  /** 공개 creation(저장 룩)인지 — 테마 멤버로 넣을 수 있는지 판정 */
  async isPublicCreation(idx: number): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM generation_results WHERE idx = $1 AND visibility = 'public' AND status = 'success' AND taken_down = false`,
      [idx]);
    return r.rowCount > 0;
  }
  async isOwned(userId: string, templateId: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM template_owns WHERE user_id = $1 AND template_id = $2', [userId, templateId]);
    return r.rowCount > 0;
  }
  async templateOrigin(templateId: string) {
    const r = await this.db.query<{ creator_id: string | null; origin: string }>(
      'SELECT creator_id, origin FROM marketplace_templates WHERE id = $1', [templateId]);
    return r.rows[0] || null;
  }
  async grantFreeOwn(userId: string, templateId: string) {
    await this.db.query(
      `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`,
      [userId, templateId]);
  }
  /** 미분류(Custom) 내 템플릿을 대분류로 승격 — 승격됐으면 새 category 반환 */
  async promoteCategory(templateId: string, userId: string, category: string): Promise<string | null> {
    const r = await this.db.query<{ category: string }>(
      `UPDATE marketplace_templates SET category = $3
         WHERE id = $1 AND creator_id = $2 AND category = 'Custom' RETURNING category`,
      [templateId, userId, category]);
    return r.rows[0]?.category ?? null;
  }
}
