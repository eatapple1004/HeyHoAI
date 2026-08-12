import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * 마켓플레이스 SQL 단일 창구.
 *
 * ⚠️ 응답에 나가는 컬럼은 `PUBLIC_COLS`로 고정한다 — `SELECT *`를 쓰면 내부 컬럼(status·origin·
 *   from_creation_idx 등)이 실수로 노출된다. 특히 **prompt는 유료 템플릿의 상품 그 자체**라
 *   보유 여부에 따라 서비스에서 가린다.
 */
export const PUBLIC_COLS = `id, creator_id, creator_handle, name, description, category, type, style, prompt,
  negative_prompt, tool, visibility, emoji, price_credits, use_price_credits, recipe_id, usage_count, likes_count,
  preview_media, reference_examples, target_image_url, is_official, created_at`;

/** JOIN(template_bookmarks 등)에서 created_at 모호성을 피하려고 mt.로 한정한 버전 */
const MT_COLS = PUBLIC_COLS.split(',').map((c) => 'mt.' + c.trim()).join(', ');

/** 템플릿의 글로벌 테마 slug 배열 — Explore 칩·필터용. 없으면 빈 배열. */
const THEMES_SUBQ = `COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order)
    FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
    WHERE tt.template_id = marketplace_templates.id), '{}') AS themes`;

/** 카드 썸네일 — 등록된 프리뷰가 없으면 이 템플릿으로 만든 공개 결과 중 좋아요 1위를 쓴다 */
const thumbSubq = (alias: string) => `COALESCE(${alias}.preview_media->>0,
  (SELECT '/'||regexp_replace(gr.file_path,'^tmp/','') FROM generation_results gr
    WHERE ((gr.template_source='marketplace' AND gr.template_id = ${alias}.id::text)
        OR (${alias}.recipe_id IS NOT NULL AND gr.template_source='recipe' AND gr.template_id = ${alias}.recipe_id))
      AND gr.visibility='public' AND gr.status='success' AND gr.taken_down=false AND gr.file_path IS NOT NULL
    ORDER BY gr.likes_count DESC, gr.created_at DESC LIMIT 1)) AS thumb`;

@Injectable()
export class MarketplaceRepository {
  constructor(private readonly db: DbService) {}

  // ── 테마 태그 ──

  async listThemes() {
    const r = await this.db.query('SELECT slug, name FROM themes ORDER BY sort_order, name');
    return r.rows;
  }

  async replaceThemes(templateId: string, slugs: string[]): Promise<void> {
    await this.db.query('DELETE FROM template_themes WHERE template_id = $1', [templateId]);
    if (slugs.length) {
      await this.db.query(
        `INSERT INTO template_themes (template_id, theme_id)
         SELECT $1, th.id FROM themes th WHERE th.slug = ANY($2::text[])
         ON CONFLICT DO NOTHING`, [templateId, slugs]);
    }
  }

  async countThemes(templateId: string): Promise<number> {
    const r = await this.db.query<{ c: number }>(
      'SELECT count(*)::int AS c FROM template_themes WHERE template_id = $1', [templateId]);
    return r.rows[0].c;
  }

  async addGeneralTheme(templateId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO template_themes (template_id, theme_id)
       SELECT $1, id FROM themes WHERE slug = 'general' ON CONFLICT DO NOTHING`, [templateId]);
  }

  async listThemeSlugs(templateId: string): Promise<string[]> {
    const r = await this.db.query<{ slug: string }>(
      `SELECT th.slug FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
        WHERE tt.template_id = $1 ORDER BY th.sort_order`, [templateId]);
    return r.rows.map((x) => x.slug);
  }

  // ── 조회 ──

  /** Explore 카탈로그 — 공개(발행)된 것만. 내 미공개는 여기 안 나온다(Creator Studio에서만 관리). */
  async listTemplates(userId: string, f: { category?: string; feed?: boolean; theme?: string }) {
    const params: unknown[] = [userId];
    let where = f.feed
      ? `status = 'active' AND visibility = 'public' AND price_credits = 0`   // Library Feed = 공개 무료만
      : `status = 'active' AND visibility = 'public'`;
    if (f.category) {
      params.push(f.category);
      where += ` AND category = $${params.length}`;
    }
    if (f.theme) {
      params.push(f.theme);
      where += ` AND EXISTS(SELECT 1 FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
                            WHERE tt.template_id = marketplace_templates.id AND th.slug = $${params.length})`;
    }
    const order = f.feed ? 'likes_count DESC, usage_count DESC' : 'is_official DESC, usage_count DESC';
    const r = await this.db.query(
      `SELECT ${PUBLIC_COLS}, (creator_id = $1) AS mine,
              EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $1) AS bookmarked,
              (EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = marketplace_templates.id AND ow.user_id = $1)
                 OR (marketplace_templates.is_official = true AND marketplace_templates.price_credits = 0)) AS owned,
              ${thumbSubq('marketplace_templates')},
              ${THEMES_SUBQ}
         FROM marketplace_templates WHERE ${where}
        ORDER BY ${order} LIMIT 200`, params);
    return r.rows;
  }

  /** 상세 — 공개이거나 내 것만 */
  async findTemplateDetail(id: string, userId: string) {
    const r = await this.db.query(
      `SELECT ${PUBLIC_COLS}, marketplace_templates.from_creation_idx, (creator_id = $2) AS mine,
              EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $2) AS bookmarked,
              (EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = marketplace_templates.id AND ow.user_id = $2)
                 OR (marketplace_templates.is_official = true AND marketplace_templates.price_credits = 0)) AS owned,
              ${THEMES_SUBQ}
         FROM marketplace_templates
        WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`, [id, userId]);
    return r.rows[0] || null;
  }

  async findSeedPromptText(creationIdx: number): Promise<string | null> {
    const r = await this.db.query<{ prompt_text: string }>(
      `SELECT p.prompt_text FROM generation_results gr JOIN prompts p ON p.idx = gr.prompt_idx WHERE gr.idx = $1`,
      [creationIdx]);
    return r.rows[0]?.prompt_text || null;
  }

  /**
   * 이 템플릿으로 만들어진 결과 수 + 좋아요 합.
   * ⚠️ recipe-backed 공식 템플릿의 결과는 `source='recipe', template_id=recipe_id`로 귀속되므로 **둘 다** 매칭.
   */
  async aggregateCreations(id: string, recipeId: string) {
    const r = await this.db.query<{ creations: number; likes: number }>(
      `SELECT COUNT(*)::int AS creations, COALESCE(SUM(likes_count), 0)::int AS likes
         FROM generation_results
        WHERE ((template_source = 'marketplace' AND template_id = $1)
            OR ($2 <> '' AND template_source = 'recipe' AND template_id = $2))
          AND status = 'success' AND taken_down = false`, [id, recipeId]);
    return r.rows[0];
  }

  /** 로열티 합(포인트) — 본인 템플릿에만 노출한다 */
  async sumRoyalty(userId: string, templateId: string): Promise<number> {
    const r = await this.db.query<{ revenue: number }>(
      `SELECT COALESCE(SUM(amount), 0)::int AS revenue
         FROM point_ledger WHERE user_id = $1 AND type = 'royalty' AND ref_id = $2`,
      [userId, String(templateId)]);
    return r.rows[0].revenue;
  }

  async listTemplateCreations(id: string) {
    const r = await this.db.query(
      `SELECT gr.idx, gr.file_path, gr.metadata, gr.likes_count
         FROM generation_results gr
         JOIN marketplace_templates mt ON mt.id = $1
        WHERE ((gr.template_source = 'marketplace' AND gr.template_id = mt.id::text)
            OR (mt.recipe_id IS NOT NULL AND gr.template_source = 'recipe' AND gr.template_id = mt.recipe_id))
          AND gr.visibility = 'public' AND gr.status = 'success'
          AND gr.taken_down = false AND gr.file_path IS NOT NULL
        ORDER BY gr.likes_count DESC, gr.created_at DESC LIMIT 60`, [id]);
    return r.rows;
  }

  // ── 소유·게시 ──

  async isCreator(userId: string): Promise<boolean> {
    const r = await this.db.query<{ is_creator: boolean }>('SELECT is_creator FROM users WHERE id = $1', [userId]);
    return !!r.rows[0]?.is_creator;
  }

  async ownsTemplate(userId: string, templateId: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM template_owns WHERE user_id = $1 AND template_id = $2', [userId, templateId]);
    return r.rows.length > 0;
  }

  /** 보유 추가(멱등) — 이미 있으면 rowCount 0을 돌려준다(동시 구매 판정에 쓰인다) */
  async insertOwn(userId: string, templateId: string, source: string, pricePaid: number): Promise<number> {
    const r = await this.db.query(
      `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, template_id) DO NOTHING RETURNING user_id`,
      [userId, templateId, source, pricePaid]);
    return r.rowCount;
  }

  async insertTemplate(d: {
    creatorId: string; handle: string; name: string; description: string; category: string;
    type: string; style: string; prompt: string; negativePrompt: string; tool: string;
    visibility: string; emoji: string; price: number; usePrice: number;
    preview: unknown; refExamples: unknown; targetImg: string | null;
  }) {
    const r = await this.db.query(
      `INSERT INTO marketplace_templates
         (creator_id, creator_handle, name, description, category, type, style, prompt, negative_prompt,
          tool, visibility, emoji, price_credits, use_price_credits, preview_media, reference_examples, target_image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17)
       RETURNING ${PUBLIC_COLS}`,
      [d.creatorId, d.handle, d.name, d.description, d.category, d.type, d.style, d.prompt,
       d.negativePrompt, d.tool, d.visibility, d.emoji, d.price, d.usePrice,
       JSON.stringify(d.preview), JSON.stringify(d.refExamples), d.targetImg]);
    return r.rows[0];
  }

  /**
   * 씨앗 creation 역링크 — **본인 소유이고 아직 어디에도 안 묶인** 결과만 이 템플릿에 귀속시킨다.
   * @returns 그 결과의 좋아요 수(등록 즉시 사회적 증명으로 롤업), 링크 실패면 null
   */
  async linkSeedCreation(templateId: string, creationIdx: number, userId: string): Promise<number | null> {
    const r = await this.db.query<{ likes_count: number }>(
      `UPDATE generation_results gr
          SET template_id = $1, template_source = 'marketplace'
         FROM prompts p
        WHERE p.idx = gr.prompt_idx AND gr.idx = $2 AND p.user_id = $3
          AND gr.template_id IS NULL
        RETURNING gr.likes_count`, [templateId, creationIdx, userId]);
    return r.rows[0] ? (r.rows[0].likes_count || 0) : null;
  }

  async addLikes(templateId: string, likes: number): Promise<void> {
    await this.db.query('UPDATE marketplace_templates SET likes_count = likes_count + $2 WHERE id = $1', [templateId, likes]);
  }

  async findOwnTemplate(id: string, userId: string) {
    const r = await this.db.query<{ id: string; visibility: string; from_creation_idx: number | null }>(
      `SELECT id, visibility, from_creation_idx FROM marketplace_templates WHERE id = $1 AND creator_id = $2`,
      [id, userId]);
    return r.rows[0] || null;
  }

  async isCreationPublic(creationIdx: number): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM generation_results WHERE idx = $1 AND visibility = 'public' AND taken_down = false`,
      [creationIdx]);
    return r.rows.length > 0;
  }

  /** sets/params는 서비스가 화이트리스트로 만들어 넘긴다(컬럼명이 외부 입력이 되지 않도록) */
  async updateTemplate(id: string, sets: string[], params: unknown[]) {
    params.push(id);
    const r = await this.db.query(
      `UPDATE marketplace_templates SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${PUBLIC_COLS}`,
      params);
    return r.rows[0];
  }

  async findPublicCols(id: string) {
    const r = await this.db.query(`SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE id = $1`, [id]);
    return r.rows[0];
  }

  async deleteTemplate(id: string, userId: string): Promise<string | null> {
    const r = await this.db.query<{ id: string }>(
      `DELETE FROM marketplace_templates WHERE id = $1 AND creator_id = $2 RETURNING id`, [id, userId]);
    return r.rows[0] ? r.rows[0].id : null;
  }

  /** 사용 가능 판정 — 공개 · 내 것 · 보유 중 하나 (타인 비공개 누수 방지) */
  async findUsableTemplate(id: string, userId: string) {
    const r = await this.db.query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates
        WHERE id = $1 AND status = 'active'
          AND (visibility = 'public' OR creator_id = $2
               OR EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $2))`,
      [id, userId]);
    return r.rows[0] || null;
  }

  /** 구매 가능 판정 — 공개 · 내 것 · **원본 creation이 공개**면 딥링크로 구매 가능 */
  async findAcquirableTemplate(id: string, userId: string) {
    const r = await this.db.query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates
        WHERE id = $1 AND status = 'active'
          AND (visibility = 'public' OR creator_id = $2
               OR EXISTS(SELECT 1 FROM generation_results gr WHERE gr.idx = marketplace_templates.from_creation_idx
                           AND gr.visibility = 'public' AND gr.taken_down = false))`,
      [id, userId]);
    return r.rows[0] || null;
  }

  async incrementUsage(id: string): Promise<void> {
    await this.db.query('UPDATE marketplace_templates SET usage_count = usage_count + 1 WHERE id = $1', [id]);
  }

  async findMyActiveTemplate(id: string, userId: string) {
    const r = await this.db.query<{ id: string }>(
      `SELECT id FROM marketplace_templates WHERE id = $1 AND status = 'active' AND creator_id = $2`, [id, userId]);
    return r.rows[0] || null;
  }

  // ── 신고·저장 ──

  async findTemplateForReport(id: string) {
    const r = await this.db.query<{ id: string; creator_id: string; status: string }>(
      `SELECT id, creator_id, status FROM marketplace_templates WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async insertReport(templateId: string, reporterId: string, reason: string): Promise<void> {
    await this.db.query(
      `INSERT INTO template_reports (template_id, reporter_id, reason) VALUES ($1,$2,$3)
       ON CONFLICT (template_id, reporter_id) DO NOTHING`, [templateId, reporterId, reason]);
  }

  /** 같은 사람이 여러 번 눌러도 1로 세도록 DISTINCT */
  async countDistinctReporters(templateId: string): Promise<number> {
    const r = await this.db.query<{ n: number }>(
      `SELECT COUNT(DISTINCT reporter_id)::int AS n FROM template_reports WHERE template_id = $1`, [templateId]);
    return r.rows[0].n;
  }

  async takeDown(templateId: string): Promise<void> {
    await this.db.query(`UPDATE marketplace_templates SET status = 'taken_down' WHERE id = $1`, [templateId]);
  }

  async findBookmarkableTemplate(id: string, userId: string) {
    const r = await this.db.query<{ id: string }>(
      `SELECT id FROM marketplace_templates WHERE id = $1 AND status = 'active'
        AND (visibility = 'public' OR creator_id = $2)`, [id, userId]);
    return r.rows[0] || null;
  }

  async insertBookmark(userId: string, templateId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO template_bookmarks (user_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, templateId]);
  }

  async deleteBookmark(userId: string, templateId: string): Promise<void> {
    await this.db.query(`DELETE FROM template_bookmarks WHERE user_id = $1 AND template_id = $2`, [userId, templateId]);
  }

  async listBookmarks(userId: string) {
    const r = await this.db.query(
      `SELECT ${MT_COLS}, (mt.creator_id = $1) AS mine, true AS bookmarked
         FROM template_bookmarks tb
         JOIN marketplace_templates mt ON mt.id = tb.template_id
        WHERE tb.user_id = $1 AND mt.status = 'active'
        ORDER BY tb.created_at DESC`, [userId]);
    return r.rows;
  }

  // ── 크리에이터 ──

  /** My templates — auto 자동민팅 중 아직 보유(owns)하지 않은 건 숨긴다(누출 방지) */
  async listMyTemplates(userId: string) {
    const r = await this.db.query(
      `SELECT ${PUBLIC_COLS}, from_creation_idx, origin,
              EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $1) AS added_to_library,
              ${THEMES_SUBQ} FROM marketplace_templates
        WHERE creator_id = $1
          AND (origin <> 'auto' OR EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $1))
        ORDER BY created_at DESC`, [userId]);
    return r.rows;
  }

  async listOfficialTemplates(userId: string) {
    const r = await this.db.query(
      `SELECT ${PUBLIC_COLS}, from_creation_idx, origin,
              EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $1) AS added_to_library,
              ${THEMES_SUBQ} FROM marketplace_templates
        WHERE is_official = true AND status = 'active' AND visibility = 'public'
        ORDER BY created_at DESC`, [userId]);
    return r.rows;
  }

  async findCreatorFlags(userId: string) {
    const r = await this.db.query<{ is_creator: boolean; point_balance: number }>(
      'SELECT is_creator, point_balance FROM users WHERE id = $1', [userId]);
    return r.rows[0] || null;
  }

  async royaltyTotals(userId: string) {
    const r = await this.db.query<{ total_earned: number; payout_count: number }>(
      `SELECT COALESCE(SUM(amount), 0)::int AS total_earned, COUNT(*)::int AS payout_count
         FROM point_ledger WHERE user_id = $1 AND type = 'royalty'`, [userId]);
    return r.rows[0];
  }

  /** 템플릿별 수익 — ref_id는 TEXT라 mt.id::text로 조인 */
  async earningsByTemplate(userId: string) {
    const r = await this.db.query(
      `SELECT mt.id, mt.name, mt.description, mt.emoji, mt.category, mt.type, mt.price_credits,
              mt.use_price_credits, mt.usage_count, mt.visibility, mt.origin, mt.from_creation_idx, mt.created_at,
              COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order) FROM template_themes tt
                          JOIN themes th ON th.id = tt.theme_id WHERE tt.template_id = mt.id), '{}') AS themes,
              EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = mt.id AND o.user_id = $1) AS added_to_library,
              COALESCE(SUM(pl.amount), 0)::int AS earned,
              COUNT(pl.id)::int AS uses_paid
         FROM marketplace_templates mt
         LEFT JOIN point_ledger pl ON pl.ref_id = mt.id::text AND pl.user_id = $1 AND pl.type = 'royalty'
        WHERE mt.creator_id = $1
          AND (mt.origin <> 'auto' OR EXISTS(SELECT 1 FROM template_owns o2 WHERE o2.template_id = mt.id AND o2.user_id = $1))
        GROUP BY mt.id
        ORDER BY earned DESC, mt.created_at DESC`, [userId]);
    return r.rows;
  }

  async recentRoyalties(userId: string) {
    const r = await this.db.query(
      `SELECT amount, description, created_at FROM point_ledger
        WHERE user_id = $1 AND type = 'royalty' ORDER BY created_at DESC LIMIT 20`, [userId]);
    return r.rows;
  }

  async markCreator(userId: string): Promise<void> {
    await this.db.query('UPDATE users SET is_creator = true WHERE id = $1', [userId]);
  }

  /** 핸들(이메일 로컬파트) → 사용자 id */
  async resolveCreatorId(localPart: string): Promise<string | null> {
    const r = await this.db.query<{ id: string }>(
      "SELECT id FROM users WHERE split_part(email, '@', 1) = $1 LIMIT 1", [localPart]);
    return r.rows[0] ? r.rows[0].id : null;
  }

  /**
   * 스토어프론트 템플릿 — **creator_id로** 매칭한다.
   * creator_handle 문자열로 매칭하면 핸들이 어긋났을 때 본인 공개 템플릿이 0건으로 뜬다(과거 버그).
   * 공식 템플릿은 creator_id가 NULL이라 handle로 받는다.
   */
  async listCreatorTemplates(handle: string, userId: string, creatorId: string | null) {
    const r = await this.db.query(
      `SELECT id, creator_handle, name, category, type, style, tool, emoji,
              price_credits, usage_count, likes_count, preview_media, is_official, created_at,
              EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $2) AS bookmarked
         FROM marketplace_templates
        WHERE status = 'active' AND visibility = 'public'
          AND ( ($3::uuid IS NOT NULL AND creator_id = $3) OR (creator_id IS NULL AND creator_handle = $1) )
        ORDER BY is_official DESC, usage_count DESC, created_at DESC LIMIT 100`,
      [handle, userId, creatorId]);
    return r.rows;
  }

  async listCreatorShowcase(localPart: string) {
    const r = await this.db.query(
      `SELECT gr.idx, gr.file_path, gr.metadata
         FROM generation_results gr
         JOIN prompts p ON p.idx = gr.prompt_idx
         JOIN users u   ON u.id = p.user_id
        WHERE split_part(u.email, '@', 1) = $1 AND gr.visibility = 'public'
          AND gr.status = 'success' AND gr.taken_down = false AND gr.file_path IS NOT NULL
        ORDER BY gr.created_at DESC LIMIT 12`, [localPart]);
    return r.rows;
  }

  async followerCount(creatorId: string): Promise<number> {
    const r = await this.db.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM follows WHERE creator_id = $1', [creatorId]);
    return r.rows[0].n;
  }

  async isFollowing(creatorId: string, followerId: string): Promise<boolean> {
    const r = await this.db.query(
      'SELECT 1 FROM follows WHERE creator_id = $1 AND follower_id = $2', [creatorId, followerId]);
    return r.rows.length > 0;
  }

  async insertFollow(followerId: string, creatorId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO follows (follower_id, creator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [followerId, creatorId]);
  }

  async deleteFollow(followerId: string, creatorId: string): Promise<void> {
    await this.db.query('DELETE FROM follows WHERE follower_id = $1 AND creator_id = $2', [followerId, creatorId]);
  }

  // ── 라이브러리/스튜디오 ──

  /** recipe-backed 유료 템플릿의 보유 게이트 — 스튜디오가 레시피를 보여줄지 결정한다 */
  async listRecipeGates(userId: string) {
    const r = await this.db.query(
      `SELECT mt.id, mt.recipe_id, mt.price_credits,
              EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = mt.id AND ow.user_id = $1) AS owned,
              COALESCE((SELECT ow.in_studio FROM template_owns ow WHERE ow.template_id = mt.id AND ow.user_id = $1), true) AS in_studio
         FROM marketplace_templates mt
        WHERE mt.recipe_id IS NOT NULL AND mt.status = 'active' AND mt.price_credits > 0`, [userId]);
    return r.rows;
  }

  /** 보유 템플릿 — 무료 오피셜은 owns 행이 없어도 "기본 제공"으로 포함한다 */
  async listOwned(userId: string) {
    const r = await this.db.query(
      `SELECT ${MT_COLS}, mt.from_creation_idx, mt.origin, true AS owned,
              COALESCE(ow.source, 'default') AS own_source, COALESCE(ow.in_studio, true) AS in_studio,
              (mt.creator_id = $1) AS mine,
              ${thumbSubq('mt')},
              COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order)
                FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
                WHERE tt.template_id = mt.id), '{}') AS label_themes
         FROM marketplace_templates mt
         LEFT JOIN template_owns ow ON ow.template_id = mt.id AND ow.user_id = $1
        WHERE mt.status = 'active'
          AND (ow.user_id IS NOT NULL OR (mt.is_official = true AND mt.price_credits = 0))
        ORDER BY COALESCE(ow.created_at, mt.created_at) DESC`, [userId]);
    return r.rows;
  }

  async listThemeOverrides(userId: string, ids: string[]) {
    const r = await this.db.query<{ item_id: string; theme_slug: string; action: string }>(
      `SELECT item_id, theme_slug, action FROM user_theme_overrides
        WHERE user_id = $1 AND item_type = 'template' AND item_id = ANY($2)`, [userId, ids]);
    return r.rows;
  }

  async listCustomThemePlacements(userId: string, ids: string[]) {
    const r = await this.db.query<{ item_id: string; macro_group: string }>(
      `SELECT i.item_id, t.macro_group FROM user_studio_theme_items i
         JOIN user_studio_themes t ON t.id = i.user_studio_theme_id
        WHERE i.user_id = $1 AND i.item_type = 'template' AND i.item_id = ANY($2)`, [userId, ids]);
    return r.rows;
  }

  async setInStudio(userId: string, ids: string[], inStudio: boolean): Promise<string[]> {
    const r = await this.db.query<{ template_id: string }>(
      `UPDATE template_owns SET in_studio = $3 WHERE user_id = $1 AND template_id = ANY($2::uuid[])
       RETURNING template_id`, [userId, ids, inStudio]);
    return r.rows.map((x) => x.template_id);
  }

  /** 기본 제공 공식 템플릿 — 소유와 무관하게 모든 사용자 스튜디오에 노출 */
  async listDefaultOfficials(userId: string) {
    const r = await this.db.query(
      `SELECT ${MT_COLS}, mt.from_creation_idx, mt.origin, false AS owned, (mt.creator_id = $1) AS mine,
              COALESCE(mt.preview_media->>0, (SELECT '/'||regexp_replace(gr.file_path,'^tmp/','') FROM generation_results gr
                 WHERE gr.template_source='marketplace' AND gr.template_id = mt.id::text
                   AND gr.visibility='public' AND gr.status='success' AND gr.taken_down=false AND gr.file_path IS NOT NULL
                 ORDER BY gr.likes_count DESC, gr.created_at DESC LIMIT 1)) AS thumb,
              COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order)
                FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
                WHERE tt.template_id = mt.id), '{}') AS themes
         FROM marketplace_templates mt
        WHERE mt.is_official = true AND mt.status = 'active'
          AND mt.price_credits = 0 AND mt.recipe_id IS NULL
        ORDER BY mt.created_at DESC`, [userId]);
    return r.rows;
  }
}
