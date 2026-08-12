const { Router } = require('express');
const svc = require('./marketplace.service');

const router = Router();

// statusCode 도메인 에러는 그대로 응답(402는 data 동봉 — toErrorBody가 처리).
function handle(err, res, next) {
  if (err.statusCode) return res.status(err.statusCode).json(svc.toErrorBody(err));
  next(err);
}

// ─────────────────────────────────────────────────────────────
// /templates 서브트리 = NestJS로 이관 완료(dev). 아래는 prod/staging용 얇은 라우트로,
// 로직은 marketplace.service.js를 그대로 호출한다(로직 이중화 금지).
// ─────────────────────────────────────────────────────────────

/** GET /api/marketplace/templates?category=&feed=1&theme= — 카탈로그 */
router.get('/templates', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listTemplates(req.user.id, req.query) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/templates/:id — 템플릿 상세(유료는 prompt 블랙박스) */
router.get('/templates/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/templates/:id/creations — 이 템플릿으로 만든 공개 creation들 */
router.get('/templates/:id/creations', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getTemplateCreations(req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates — 템플릿 저장(Save as template) */
router.post('/templates', async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await svc.createTemplate(req.user, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

/** PATCH /api/marketplace/templates/:id — 내 템플릿 편집 */
router.patch('/templates/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.updateTemplate(req.user.id, req.params.id, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/marketplace/templates/:id — 내 템플릿 내리기 */
router.delete('/templates/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.deleteTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/use — 사용(보유 게이트) */
router.post('/templates/:id/use', async (req, res, next) => {
  try {
    const out = await svc.useTemplate(req.user.id, req.params.id);
    res.json({ success: true, ...out });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/acquire — 보유 획득(유료면 과금+로열티) */
router.post('/templates/:id/acquire', async (req, res, next) => {
  try {
    const out = await svc.acquireTemplate(req.user, req.params.id);
    res.json({ success: true, ...out });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/add-to-my-templates — 내 템플릿을 My templates에 추가(멱등) */
router.post('/templates/:id/add-to-my-templates', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.addToMyTemplates(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/report — 신고(누적 시 자동 테이크다운) */
router.post('/templates/:id/report', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.reportTemplate(req.user.id, req.params.id, (req.body || {}).reason) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/bookmark — 저장(멱등) */
router.post('/templates/:id/bookmark', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.bookmarkTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/marketplace/templates/:id/bookmark — 저장 해제 */
router.delete('/templates/:id/bookmark', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.unbookmarkTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

// ─────────────────────────────────────────────────────────────
// 크리에이터·라이브러리 영역도 이관 완료(dev) — 아래는 prod/staging용 얇은 라우트.
// ─────────────────────────────────────────────────────────────

/** GET /api/marketplace/themes — 글로벌 테마 목록 */
router.get('/themes', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listThemes() });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/me — 크리에이터 상태 + 내가 게시한 템플릿 */
router.get('/me', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getMe(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/earnings — 셀러(크리에이터) 정산 대시보드 */
router.get('/earnings', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getEarnings(req.user) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/apply — 크리에이터 신청(즉시 승인) */
router.post('/apply', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.applyCreator(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/creators/:handle — 크리에이터 공개 스토어프론트 */
router.get('/creators/:handle', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getCreator(req.user.id, req.params.handle) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/creators/:handle/follow — 팔로우(멱등) */
router.post('/creators/:handle/follow', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.followCreator(req.user.id, req.params.handle) });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/marketplace/creators/:handle/follow — 언팔로우(멱등) */
router.delete('/creators/:handle/follow', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.unfollowCreator(req.user.id, req.params.handle) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/bookmarks — 내가 저장한 템플릿(Library Saved 탭) */
router.get('/bookmarks', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listBookmarks(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/recipe-gates — recipe-backed 유료 템플릿 게이트 */
router.get('/recipe-gates', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listRecipeGates(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/owned — 보유 템플릿 전부(Library My templates 정본) */
router.get('/owned', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listOwned(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** PATCH /api/marketplace/owned/in-studio { ids, in_studio } — 보유 템플릿 일괄 스튜디오 배치/해제 */
router.patch('/owned/in-studio', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.setOwnedInStudio(req.user.id, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/default-officials — 기본공개(무료) 공식 템플릿 */
router.get('/default-officials', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listDefaultOfficials(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

module.exports = { router };
