const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const trial = require('./trial.service');

const router = Router();

// ── 관리자: 체험 계정 발급 ──
// POST /api/admin/trials  { companyName, email?, password?, credits?, days? }
router.post('/admin/trials', requireAdmin, async (req, res, next) => {
  try {
    const { companyName, email, password, credits, quota, days } = req.body || {};
    const acct = await trial.createTrialAccount({
      companyName, email, password, days,
      credits: credits != null ? credits : quota, // quota=구버전 클라 호환
    });
    res.json({ success: true, data: acct }); // password는 이 응답에서만 1회 노출
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

// 관리자: 체험 계정 목록 + 사용 현황
router.get('/admin/trials', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await trial.listTrials() });
  } catch (err) { next(err); }
});

// 관리자: 기존 계정 수정 — 토큰 추가 지급 / 기간 변경 / 활성·비활성 토글
// PATCH /api/admin/trials/:id  { addCredits?, days?, status? }
router.patch('/admin/trials/:id', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const out = { id: req.params.id };
    if (body.addCredits != null) out.credits = await trial.grantCredits(req.params.id, body.addCredits);
    if (body.days != null) out.days = await trial.setDays(req.params.id, body.days);
    if (body.status != null) out.status = await trial.setStatus(req.params.id, body.status);
    res.json({ success: true, data: out });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

// 본인 체험 상태(스튜디오 배너용). 비-체험이면 data=null.
router.get('/trial/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await trial.getStatus(req.user.id) });
  } catch (err) { next(err); }
});

module.exports = router;
