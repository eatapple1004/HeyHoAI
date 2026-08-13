const { Router } = require('express');
const svc = require('./studioThemes.service');

const router = Router();

/**
 * 스튜디오 개인 큐레이션 (설계 = docs/테마_조직화_설계_2026-06-24.md).
 * 로직은 studioThemes.service.js 단일소스(레거시·Nest 공용) — 여기는 얇은 라우트.
 */

// statusCode 도메인 에러는 그대로 응답(전역 errorHandler와 동일 형식).
function handle(err, res, next) {
  if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
  next(err);
}

// GET /api/studio/themes — 내 커스텀 테마(+멤버) + 숨긴 내장 레시피.
router.get('/themes', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getThemes(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

// POST /api/studio/themes { name } — 커스텀 테마 생성.
router.post('/themes', async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await svc.createTheme(req.user.id, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

// PATCH /api/studio/themes/:id { name?, sortOrder?, group? } — 이름/순서 변경.
router.patch('/themes/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.updateTheme(req.user.id, req.params.id, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

// DELETE /api/studio/themes/:id — 커스텀 테마 삭제(멤버십 CASCADE).
router.delete('/themes/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.deleteTheme(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

// POST /api/studio/themes/:id/items { itemType, itemId } — 테마에 넣기(마켓 템플릿은 보유 검증).
router.post('/themes/:id/items', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.addItem(req.user.id, req.params.id, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

// DELETE /api/studio/themes/:id/items/:itemType/:itemId — 테마에서 빼기.
router.delete('/themes/:id/items/:itemType/:itemId', async (req, res, next) => {
  try {
    await svc.removeItem(req.user.id, req.params.id, req.params.itemType, req.params.itemId);
    res.json({ success: true });
  } catch (err) { handle(err, res, next); }
});

// POST /api/studio/hidden/:recipeId — 기본 섹션에서 내장 레시피 숨김.
router.post('/hidden/:recipeId', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.hideRecipe(req.user.id, req.params.recipeId) });
  } catch (err) { handle(err, res, next); }
});

// DELETE /api/studio/hidden/:recipeId — 다시 보이기.
router.delete('/hidden/:recipeId', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.unhideRecipe(req.user.id, req.params.recipeId) });
  } catch (err) { handle(err, res, next); }
});

// ── 기본(글로벌) 테마 개인 오버라이드: 특정 테마에 템플릿 add/remove ──
// POST /api/studio/global-themes/:slug/items { itemType, itemId, action:'add'|'remove' }
router.post('/global-themes/:slug/items', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.setGlobalThemeItem(req.user.id, req.params.slug, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

// DELETE /api/studio/global-themes/:slug/items/:itemType/:itemId — 오버라이드 해제(태그 기본값으로 복귀)
router.delete('/global-themes/:slug/items/:itemType/:itemId', async (req, res, next) => {
  try {
    await svc.removeGlobalThemeItem(req.user.id, req.params.slug, req.params.itemType, req.params.itemId);
    res.json({ success: true });
  } catch (err) { handle(err, res, next); }
});

// POST /api/studio/hidden-themes/:slug — 기본 테마 통째로 제거
router.post('/hidden-themes/:slug', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.hideTheme(req.user.id, req.params.slug) });
  } catch (err) { handle(err, res, next); }
});

// DELETE /api/studio/hidden-themes/:slug — 기본 테마 다시 보이기
router.delete('/hidden-themes/:slug', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.unhideTheme(req.user.id, req.params.slug) });
  } catch (err) { handle(err, res, next); }
});

// (폐기·P4) POST /api/studio/save-creation 제거 — 수동 민팅은 자동민팅(P1)+add-to-my-templates(P2)로 일원화.
// (폐기·P4) GET/POST/DELETE /api/studio/saved-creations 제거 — 옛 플랫 "Saved looks"(미사용).
//   user_saved_creations 테이블은 deprecate(잔존)·코드 미사용.

module.exports = { router };
