const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const trial = require('./trial.service');

const router = Router();

// ── 관리자: 체험 계정 발급 ──
// POST /api/admin/trials  { companyName, email?, password?, quota?, days? }
router.post('/admin/trials', requireAdmin, async (req, res, next) => {
  try {
    const { companyName, email, password, quota, days } = req.body || {};
    const acct = await trial.createTrialAccount({ companyName, email, password, quota, days });
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

// 관리자: 활성/비활성 토글
router.patch('/admin/trials/:id', requireAdmin, async (req, res, next) => {
  try {
    const status = await trial.setStatus(req.params.id, (req.body || {}).status);
    res.json({ success: true, data: { id: req.params.id, status } });
  } catch (err) { next(err); }
});

// 본인 체험 상태(스튜디오 배너용). 비-체험이면 data=null.
router.get('/trial/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await trial.getStatus(req.user.id) });
  } catch (err) { next(err); }
});

module.exports = router;
