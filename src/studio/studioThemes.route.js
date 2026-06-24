const { Router } = require('express');
const { query } = require('../db/client');

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 공개 creation(저장 룩)인지 검증 — Saved looks를 테마 멤버(item_type='creation')로 넣을 때 사용.
async function isPublicCreation(idx) {
  const r = await query(`SELECT 1 FROM generation_results WHERE idx = $1 AND visibility = 'public' AND status = 'success' AND taken_down = false`, [idx]);
  return !!r.rows[0];
}

// 내 템플릿을 studio 테마에 넣을 때 보유 보장: 미보유 + 내가 만든/저장한 것(creator_id=나)이면 자동 보유(무료).
//   studio 픽커는 mergeOwnedTemplates(=/owned)로만 카드를 올리므로, 보유돼야 테마에 보임. 남의 미보유=false(구매 필요).
async function ensureOwnedIfMine(userId, templateId) {
  const owned = await query(`SELECT 1 FROM template_owns WHERE user_id = $1 AND template_id = $2`, [userId, templateId]);
  if (owned.rows[0]) return true;
  const t = await query(`SELECT creator_id FROM marketplace_templates WHERE id = $1`, [templateId]);
  if (t.rows[0] && t.rows[0].creator_id === userId) {
    await query(`INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`, [userId, templateId]);
    return true;
  }
  return false;
}

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
    // 테마 멤버 중 creation(저장 룩)의 미리보기 해석 — 비공개/삭제분은 자동 제외(프론트는 map에 있는 것만 렌더).
    const creationIds = new Set();
    items.rows.forEach((it) => { if (it.item_type === 'creation') creationIds.add(parseInt(it.item_id, 10)); });
    overrides.rows.forEach((o) => { if (o.item_type === 'creation' && o.action === 'add') creationIds.add(parseInt(o.item_id, 10)); });
    const creationPreviews = {};
    const cids = [...creationIds].filter(Boolean);
    if (cids.length) {
      const cr = await query(
        `SELECT gr.idx, gr.file_path, gr.metadata, split_part(u.email, '@', 1) AS handle
           FROM generation_results gr JOIN prompts p ON p.idx = gr.prompt_idx JOIN users u ON u.id = p.user_id
          WHERE gr.idx = ANY($1) AND gr.visibility = 'public' AND gr.status = 'success' AND gr.taken_down = false AND gr.file_path IS NOT NULL`,
        [cids]
      );
      cr.rows.forEach((x) => { creationPreviews[x.idx] = {
        url: x.file_path ? `/${x.file_path.replace(/^tmp\//, '')}` : null,
        type: (x.metadata && x.metadata.type === 'video') ? 'video' : 'image',
        creatorHandle: x.handle ? '@' + x.handle : null,
      }; });
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
        creationPreviews,
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
    const reqType = req.body && req.body.itemType;
    const itemType = (reqType === 'template' || reqType === 'creation') ? reqType : 'recipe';
    const itemId = String((req.body && req.body.itemId) || '').slice(0, 200);
    if (!itemId) return res.status(400).json({ success: false, error: 'itemId가 필요합니다.' });
    const own = await query(
      `SELECT 1 FROM user_studio_themes WHERE id = $1 AND user_id = $2 AND origin = 'custom'`,
      [req.params.id, req.user.id]);
    if (!own.rows[0]) return res.status(404).json({ success: false, error: '내 테마가 아니거나 없습니다.' });
    if (itemType === 'template') {
      if (!UUID_RE.test(itemId)) return res.status(400).json({ success: false, error: '템플릿 id가 올바르지 않습니다.' });
      if (!(await ensureOwnedIfMine(req.user.id, itemId))) return res.status(403).json({ success: false, error: '먼저 이 템플릿을 보유해야 합니다.' });
    } else if (itemType === 'creation') {
      if (!/^\d+$/.test(itemId)) return res.status(400).json({ success: false, error: 'creation id가 올바르지 않습니다.' });
      if (!await isPublicCreation(parseInt(itemId, 10))) return res.status(404).json({ success: false, error: '저장할 수 없는 결과물입니다 (비공개·삭제·없음).' });
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
    const itemType = (req.params.itemType === 'template' || req.params.itemType === 'creation') ? req.params.itemType : 'recipe';
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
    const reqType = req.body && req.body.itemType;
    const itemType = (reqType === 'template' || reqType === 'creation') ? reqType : 'recipe';
    const itemId = String((req.body && req.body.itemId) || '').slice(0, 200);
    const action = req.body && req.body.action === 'remove' ? 'remove' : 'add';
    if (!slug || !itemId) return res.status(400).json({ success: false, error: 'slug·itemId 필요' });
    const ok = await query(`SELECT 1 FROM themes WHERE slug = $1`, [slug]);
    if (!ok.rows[0]) return res.status(404).json({ success: false, error: '없는 테마' });
    if (itemType === 'creation' && action === 'add') {
      if (!/^\d+$/.test(itemId)) return res.status(400).json({ success: false, error: 'creation id가 올바르지 않습니다.' });
      if (!await isPublicCreation(parseInt(itemId, 10))) return res.status(404).json({ success: false, error: '저장할 수 없는 결과물입니다 (비공개·삭제·없음).' });
    }
    // 기본 테마에 내 템플릿 추가(add) 시 보유 보장 → studio 픽커에 떠야 그 테마에 보임.
    if (itemType === 'template' && action === 'add' && UUID_RE.test(itemId)) {
      await ensureOwnedIfMine(req.user.id, itemId);
    }
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
    const itemType = (req.params.itemType === 'template' || req.params.itemType === 'creation') ? req.params.itemType : 'recipe';
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

// ── Save: creation(공개 or 본인) → 비공개 개인 템플릿 민팅 + 자동 보유 + studio 모드/테마 배치. ──
//   프롬프트는 템플릿에 저장 안 함(블랙박스): from_creation_idx 포인터만 → 생성 시 γ-1 해석. escrow는 γ-3.
//   결과: My templates(내 비공개 템플릿) + 선택한 studio 모드(category)/테마 셀프에 동시 등장.
router.post('/save-creation', async (req, res, next) => {
  try {
    const idx = parseInt((req.body && req.body.creationIdx), 10) || 0;
    if (!idx) return res.status(400).json({ success: false, error: 'creationIdx가 필요합니다.' });
    const category = (req.body && req.body.category === 'Shopping') ? 'Shopping' : 'Influencer'; // 모드(수동 선택)
    const themeKind = (req.body && req.body.themeKind === 'custom') ? 'custom' : 'default';
    const themeKey = String((req.body && req.body.themeKey) || '').slice(0, 80); // custom=themeId(uuid) / default=slug

    // creation 검증: 성공·미테이크다운 + (공개 or 본인). 미리보기·타입 해석.
    const cr = await query(
      `SELECT gr.file_path, gr.metadata, gr.visibility, p.user_id
         FROM generation_results gr JOIN prompts p ON p.idx = gr.prompt_idx
        WHERE gr.idx = $1 AND gr.status = 'success' AND gr.taken_down = false AND gr.file_path IS NOT NULL`,
      [idx]
    );
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ success: false, error: '저장할 수 없는 결과물입니다 (실패·삭제·없음).' });
    if (!(c.visibility === 'public' || c.user_id === req.user.id)) {
      return res.status(403).json({ success: false, error: '공개 결과물 또는 본인 것만 저장할 수 있습니다.' });
    }
    const type = (c.metadata && c.metadata.type === 'video') ? 'reel' : 'image';
    const previewUrl = `/${c.file_path.replace(/^tmp\//, '')}`;
    const name = String((req.body && req.body.name) || 'Saved look').slice(0, 120);
    const handle = '@' + String(req.user.email || 'creator').split('@')[0];

    // 비공개 템플릿 민팅(prompt='' = 블랙박스, from_creation_idx 포인터). preview=creation 이미지.
    const ins = await query(
      `INSERT INTO marketplace_templates
         (creator_id, creator_handle, name, category, type, style, prompt, visibility, emoji, from_creation_idx, preview_media)
       VALUES ($1,$2,$3,$4,$5,'Natural','','private','🎨',$6,$7::jsonb)
       RETURNING id`,
      [req.user.id, handle, name, category, type, idx, JSON.stringify([previewUrl])]
    );
    const templateId = ins.rows[0].id;

    // 자동 보유(내 거 — studio에서 바로 선택·생성 가능)
    await query(`INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`, [req.user.id, templateId]);

    // studio 테마 배치(커스텀=멤버십 / 기본=오버라이드 add). 잘못된 키는 조용히 스킵(템플릿은 My templates엔 이미 생김).
    if (themeKind === 'custom' && UUID_RE.test(themeKey)) {
      const own = await query(`SELECT 1 FROM user_studio_themes WHERE id = $1 AND user_id = $2 AND origin = 'custom'`, [themeKey, req.user.id]);
      if (own.rows[0]) await query(`INSERT INTO user_studio_theme_items (user_studio_theme_id, user_id, item_type, item_id) VALUES ($1,$2,'template',$3) ON CONFLICT DO NOTHING`, [themeKey, req.user.id, templateId]);
    } else if (themeKind === 'default' && themeKey) {
      const ok = await query(`SELECT 1 FROM themes WHERE slug = $1`, [themeKey]);
      if (ok.rows[0]) await query(
        `INSERT INTO user_theme_overrides (user_id, theme_slug, item_type, item_id, action) VALUES ($1,$2,'template',$3,'add')
         ON CONFLICT (user_id, theme_slug, item_type, item_id) DO UPDATE SET action = 'add'`,
        [req.user.id, themeKey, templateId]
      );
    }

    res.status(201).json({ success: true, data: { templateId, category, themeKind, themeKey } });
  } catch (err) { next(err); }
});

// ── γ-2: 저장한 공개 creation 룩(재사용용 참조). 사용 = γ-1 fromCreationIdx 블랙박스 경로. ──
// POST /api/studio/saved-creations/:idx — 공개 creation을 내 "Saved looks"에 저장(멱등).
router.post('/saved-creations/:idx', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10) || 0;
    if (!idx) return res.status(400).json({ success: false, error: 'idx가 필요합니다.' });
    const ok = await query(
      `SELECT 1 FROM generation_results WHERE idx = $1 AND visibility = 'public' AND status = 'success' AND taken_down = false`,
      [idx]
    );
    if (!ok.rows[0]) return res.status(404).json({ success: false, error: '저장할 수 없는 결과물입니다 (비공개·삭제·없음).' });
    await query(`INSERT INTO user_saved_creations (user_id, creation_idx) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.user.id, idx]);
    res.json({ success: true, data: { idx, saved: true } });
  } catch (err) { next(err); }
});

// DELETE /api/studio/saved-creations/:idx — 저장 해제.
router.delete('/saved-creations/:idx', async (req, res, next) => {
  try {
    await query(`DELETE FROM user_saved_creations WHERE user_id = $1 AND creation_idx = $2`, [req.user.id, parseInt(req.params.idx, 10) || 0]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/studio/saved-creations — 내 저장 룩(미리보기·작성자·타입 해석). 비공개/삭제분 자동 제외.
router.get('/saved-creations', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT gr.idx, gr.file_path, gr.metadata, split_part(u.email, '@', 1) AS creator_handle
         FROM user_saved_creations s
         JOIN generation_results gr ON gr.idx = s.creation_idx
         JOIN prompts p ON p.idx = gr.prompt_idx
         JOIN users u ON u.id = p.user_id
        WHERE s.user_id = $1 AND gr.visibility = 'public' AND gr.status = 'success' AND gr.taken_down = false AND gr.file_path IS NOT NULL
        ORDER BY s.saved_at DESC LIMIT 60`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows.map((x) => ({
      idx: x.idx,
      url: x.file_path ? `/${x.file_path.replace(/^tmp\//, '')}` : null,
      type: (x.metadata && x.metadata.type === 'video') ? 'video' : 'image',
      creatorHandle: x.creator_handle ? '@' + x.creator_handle : null,
    })) });
  } catch (err) { next(err); }
});

module.exports = { router };
