const { Router } = require('express');
const { query } = require('../db/client');

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 스튜디오 개인 큐레이션 (설계 = docs/테마_조직화_설계_2026-06-24.md).
 *  - 기본 테마 섹션 = 프론트 파생(내장 레시피 vertical→테마 + 보유 마켓 템플릿). 숨긴 내장은 user_hidden_recipes로 제외.
 *  - 커스텀 테마 = user_studio_themes(origin='custom') + user_studio_theme_items. 아무 템플릿(내장/보유 마켓)이나 넣다/빼다.
 */

// GET /api/studio/themes — 내 커스텀 테마(+멤버) + 숨긴 내장 레시피.
router.get('/themes', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const themes = await query(
      `SELECT id, name, sort_order FROM user_studio_themes
        WHERE user_id = $1 AND origin = 'custom' ORDER BY sort_order, name`, [uid]);
    const items = await query(
      `SELECT user_studio_theme_id AS theme_id, item_type, item_id
         FROM user_studio_theme_items WHERE user_id = $1`, [uid]);
    const hidden = await query(`SELECT recipe_id FROM user_hidden_recipes WHERE user_id = $1`, [uid]);
    const overrides = await query(`SELECT theme_slug, item_type, item_id, action FROM user_theme_overrides WHERE user_id = $1`, [uid]);
    const hiddenThemes = await query(`SELECT theme_slug FROM user_hidden_themes WHERE user_id = $1`, [uid]);
    const byTheme = {};
    for (const it of items.rows) {
      (byTheme[it.theme_id] = byTheme[it.theme_id] || []).push({ itemType: it.item_type, itemId: it.item_id });
    }
    res.json({
      success: true,
      data: {
        customThemes: themes.rows.map((t) => ({
          id: t.id, name: t.name, sortOrder: t.sort_order, items: byTheme[t.id] || [],
        })),
        hiddenRecipes: hidden.rows.map((r) => r.recipe_id),
        themeOverrides: overrides.rows.map((o) => ({ themeSlug: o.theme_slug, itemType: o.item_type, itemId: o.item_id, action: o.action })),
        hiddenThemes: hiddenThemes.rows.map((r) => r.theme_slug),
      },
    });
  } catch (err) { next(err); }
});

// POST /api/studio/themes { name } — 커스텀 테마 생성.
router.post('/themes', async (req, res, next) => {
  try {
    const name = String((req.body && req.body.name) || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ success: false, error: '테마 이름이 필요합니다.' });
    const ord = await query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM user_studio_themes WHERE user_id = $1 AND origin = 'custom'`,
      [req.user.id]);
    const r = await query(
      `INSERT INTO user_studio_themes (user_id, name, sort_order, origin) VALUES ($1, $2, $3, 'custom')
       RETURNING id, name, sort_order`, [req.user.id, name, ord.rows[0].n]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id, name: r.rows[0].name, sortOrder: r.rows[0].sort_order, items: [] } });
  } catch (err) { next(err); }
});

// PATCH /api/studio/themes/:id { name?, sortOrder? } — 이름/순서 변경.
router.patch('/themes/:id', async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, error: '없는 테마' });
    const body = req.body || {};
    const sets = []; const params = [];
    if (typeof body.name === 'string' && body.name.trim()) { params.push(body.name.trim().slice(0, 60)); sets.push(`name = $${params.length}`); }
    if (body.sortOrder !== undefined) { params.push(parseInt(body.sortOrder, 10) || 0); sets.push(`sort_order = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, error: '변경할 내용이 없습니다.' });
    params.push(req.params.id, req.user.id);
    const r = await query(
      `UPDATE user_studio_themes SET ${sets.join(', ')}
        WHERE id = $${params.length - 1} AND user_id = $${params.length} AND origin = 'custom'
       RETURNING id, name, sort_order`, params);
    if (!r.rows[0]) return res.status(404).json({ success: false, error: '내 테마가 아니거나 없습니다.' });
    res.json({ success: true, data: { id: r.rows[0].id, name: r.rows[0].name, sortOrder: r.rows[0].sort_order } });
  } catch (err) { next(err); }
});

// DELETE /api/studio/themes/:id — 커스텀 테마 삭제(멤버십 CASCADE).
router.delete('/themes/:id', async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, error: '없는 테마' });
    const r = await query(
      `DELETE FROM user_studio_themes WHERE id = $1 AND user_id = $2 AND origin = 'custom' RETURNING id`,
      [req.params.id, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ success: false, error: '내 테마가 아니거나 없습니다.' });
    res.json({ success: true, data: { id: r.rows[0].id } });
  } catch (err) { next(err); }
});

// POST /api/studio/themes/:id/items { itemType, itemId } — 테마에 넣기(마켓 템플릿은 보유 검증).
router.post('/themes/:id/items', async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, error: '없는 테마' });
    const itemType = req.body && req.body.itemType === 'template' ? 'template' : 'recipe';
    const itemId = String((req.body && req.body.itemId) || '').slice(0, 200);
    if (!itemId) return res.status(400).json({ success: false, error: 'itemId가 필요합니다.' });
    const own = await query(
      `SELECT 1 FROM user_studio_themes WHERE id = $1 AND user_id = $2 AND origin = 'custom'`,
      [req.params.id, req.user.id]);
    if (!own.rows[0]) return res.status(404).json({ success: false, error: '내 테마가 아니거나 없습니다.' });
    if (itemType === 'template') {
      if (!UUID_RE.test(itemId)) return res.status(400).json({ success: false, error: '템플릿 id가 올바르지 않습니다.' });
      const owned = await query(`SELECT 1 FROM template_owns WHERE user_id = $1 AND template_id = $2`, [req.user.id, itemId]);
      if (!owned.rows[0]) return res.status(403).json({ success: false, error: '먼저 이 템플릿을 보유해야 합니다.' });
    }
    await query(
      `INSERT INTO user_studio_theme_items (user_studio_theme_id, user_id, item_type, item_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [req.params.id, req.user.id, itemType, itemId]);
    res.json({ success: true, data: { themeId: req.params.id, itemType, itemId } });
  } catch (err) { next(err); }
});

// DELETE /api/studio/themes/:id/items/:itemType/:itemId — 테마에서 빼기.
router.delete('/themes/:id/items/:itemType/:itemId', async (req, res, next) => {
  try {
    const itemType = req.params.itemType === 'template' ? 'template' : 'recipe';
    await query(
      `DELETE FROM user_studio_theme_items
        WHERE user_studio_theme_id = $1 AND user_id = $2 AND item_type = $3 AND item_id = $4`,
      [req.params.id, req.user.id, itemType, req.params.itemId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/studio/hidden/:recipeId — 기본 섹션에서 내장 레시피 숨김.
router.post('/hidden/:recipeId', async (req, res, next) => {
  try {
    const rid = String(req.params.recipeId || '').slice(0, 200);
    if (!rid) return res.status(400).json({ success: false, error: 'recipeId 필요' });
    await query(`INSERT INTO user_hidden_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.user.id, rid]);
    res.json({ success: true, data: { recipeId: rid, hidden: true } });
  } catch (err) { next(err); }
});

// DELETE /api/studio/hidden/:recipeId — 다시 보이기.
router.delete('/hidden/:recipeId', async (req, res, next) => {
  try {
    await query(`DELETE FROM user_hidden_recipes WHERE user_id = $1 AND recipe_id = $2`, [req.user.id, req.params.recipeId]);
    res.json({ success: true, data: { recipeId: req.params.recipeId, hidden: false } });
  } catch (err) { next(err); }
});

// ── 기본(글로벌) 테마 개인 오버라이드: 특정 테마에 템플릿 add/remove ──
// POST /api/studio/global-themes/:slug/items { itemType, itemId, action:'add'|'remove' }
router.post('/global-themes/:slug/items', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').slice(0, 60);
    const itemType = req.body && req.body.itemType === 'template' ? 'template' : 'recipe';
    const itemId = String((req.body && req.body.itemId) || '').slice(0, 200);
    const action = req.body && req.body.action === 'remove' ? 'remove' : 'add';
    if (!slug || !itemId) return res.status(400).json({ success: false, error: 'slug·itemId 필요' });
    const ok = await query(`SELECT 1 FROM themes WHERE slug = $1`, [slug]);
    if (!ok.rows[0]) return res.status(404).json({ success: false, error: '없는 테마' });
    await query(
      `INSERT INTO user_theme_overrides (user_id, theme_slug, item_type, item_id, action)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, theme_slug, item_type, item_id) DO UPDATE SET action = EXCLUDED.action`,
      [req.user.id, slug, itemType, itemId, action]
    );
    res.json({ success: true, data: { themeSlug: slug, itemType, itemId, action } });
  } catch (err) { next(err); }
});

// DELETE /api/studio/global-themes/:slug/items/:itemType/:itemId — 오버라이드 해제(태그 기본값으로 복귀)
router.delete('/global-themes/:slug/items/:itemType/:itemId', async (req, res, next) => {
  try {
    const itemType = req.params.itemType === 'template' ? 'template' : 'recipe';
    await query(
      `DELETE FROM user_theme_overrides WHERE user_id = $1 AND theme_slug = $2 AND item_type = $3 AND item_id = $4`,
      [req.user.id, req.params.slug, itemType, req.params.itemId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/studio/hidden-themes/:slug — 기본 테마 통째로 제거
router.post('/hidden-themes/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').slice(0, 60);
    if (!slug) return res.status(400).json({ success: false, error: 'slug 필요' });
    await query(`INSERT INTO user_hidden_themes (user_id, theme_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, slug]);
    res.json({ success: true, data: { themeSlug: slug, hidden: true } });
  } catch (err) { next(err); }
});

// DELETE /api/studio/hidden-themes/:slug — 기본 테마 다시 보이기
router.delete('/hidden-themes/:slug', async (req, res, next) => {
  try {
    await query(`DELETE FROM user_hidden_themes WHERE user_id = $1 AND theme_slug = $2`, [req.user.id, req.params.slug]);
    res.json({ success: true, data: { themeSlug: req.params.slug, hidden: false } });
  } catch (err) { next(err); }
});

module.exports = { router };
