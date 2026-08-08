/**
 * Admin — 회사 맞춤 제안서(소개 페이지) 빌더 API.
 *   특정 회사 계약 과정에서 우리 서비스를 보여줄 before/after 제안 HTML을 만들기 위해,
 *   우리 생성물(원본↔결과 페어)을 나열해 관리자가 고르게 한다.
 *   최종 제안 HTML은 프론트가 선택분 이미지를 base64로 임베드해 자체포함 파일로 생성한다(서버 저장 없음).
 *   프라이버시: 기본 scope='mine'(관리자 본인 계정 생성물)만. 전체는 scope=all(관리자 판단).
 *
 * 로직은 proposal.service.js 단일소스(레거시·Nest 공용) — 여기는 얇은 라우트.
 */
const { Router } = require('express');
const svc = require('./proposal.service');

const router = Router();

function handle(err, res, next) {
  if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
  next(err);
}

// GET /api/admin/proposal/results?scope=mine|all&limit=&offset=
router.get('/results', async (req, res, next) => {
  try {
    const { groups, scope, hasMore } = await svc.listResults(req.user && req.user.id, req.query);
    res.json({ success: true, groups, scope, hasMore });
  } catch (e) { handle(e, res, next); }
});

// POST /api/admin/proposal/save — id 있으면 update, 없으면 insert
router.post('/save', async (req, res, next) => {
  try {
    res.json({ success: true, id: await svc.save(req.user && req.user.id, req.body || {}) });
  } catch (e) { handle(e, res, next); }
});

// GET /api/admin/proposal/list
router.get('/list', async (_req, res, next) => {
  try {
    res.json({ success: true, items: await svc.list() });
  } catch (e) { handle(e, res, next); }
});

// GET /api/admin/proposal/saved/:id — 편집용 전체 로드
router.get('/saved/:id', async (req, res, next) => {
  try {
    res.json({ success: true, proposal: await svc.getSaved(req.params.id) });
  } catch (e) { handle(e, res, next); }
});

// DELETE /api/admin/proposal/saved/:id
router.delete('/saved/:id', async (req, res, next) => {
  try {
    await svc.removeSaved(req.params.id);
    res.json({ success: true });
  } catch (e) { handle(e, res, next); }
});

module.exports = { router };
