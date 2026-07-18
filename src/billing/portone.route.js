const { Router } = require('express');
const router = Router();
const portone = require('./portone.service');

// 프론트 공개 설정(configured/storeId/channelKey) — requestPayment에 사용
router.get('/config', (_req, res) => {
  res.json({ success: true, data: portone.publicConfig() });
});

// 팩 결제 준비 — pending 주문 생성 + requestPayment 파라미터 반환
router.post('/pack/begin', async (req, res, next) => {
  try {
    const data = await portone.beginPack({ user: req.user, packId: (req.body || {}).packId });
    res.json({ success: true, data });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    next(e);
  }
});

// 결제 완료 — 프론트가 requestPayment 성공 후 호출. 서버가 PortOne API로 재검증 후 충전.
router.post('/complete', async (req, res, next) => {
  try {
    const r = await portone.verifyAndComplete((req.body || {}).paymentId);
    if (!r.ok) {
      if (r.mismatch) return res.status(400).json({ success: false, error: '결제 금액이 일치하지 않습니다.' });
      return res.status(202).json({ success: false, status: r.status || null, error: '결제 확인 대기 중이거나 완료되지 않았습니다.' });
    }
    res.json({ success: true, credits: r.credits || null, already: !!r.already });
  } catch (e) { next(e); }
});

module.exports = { router };
