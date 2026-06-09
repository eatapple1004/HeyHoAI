const { Router } = require('express');
const eximbay = require('./eximbay.service');

const router = Router();

/** GET /api/billing/eximbay/config — 설정 여부 + SDK URL */
router.get('/config', (_req, res) => {
  res.json({ success: true, data: { configured: eximbay.configured(), sdkUrl: eximbay.SDK_URL() } });
});

/**
 * POST /api/billing/eximbay/ready { packId }
 * 결제 준비 → fgkey + 결제창 파라미터 반환
 */
router.post('/ready', async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const data = await eximbay.ready({ user: req.user, packId: (req.body || {}).packId, baseUrl });
    res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = { router };
