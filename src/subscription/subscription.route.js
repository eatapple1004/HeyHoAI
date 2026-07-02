const { Router } = require('express');
const subscriptionService = require('./subscription.service');

const router = Router();

/** GET /api/subscription — 현재 플랜·권한·24h 오퍼 상태 */
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await subscriptionService.getSubscription(req.user, Date.now()) });
  } catch (err) { next(err); }
});

/** POST /api/subscription/offer/start — 24h 업그레이드 오퍼 시작(멱등) */
router.post('/offer/start', async (req, res, next) => {
  try {
    await subscriptionService.startOffer(req.user.id, Date.now());
    res.json({ success: true, data: await subscriptionService.getSubscription(req.user, Date.now()) });
  } catch (err) { next(err); }
});

/**
 * POST /api/subscription/upgrade { plan }
 * ⚠️ 구독 결제 미연동. 실제 과금 플로우는 Eximbay 구독상품 심사 통과 후
 *    eximbay 결제 성공 webhook에서 subscriptionService.activatePlan(...)을 호출하도록 연결 예정.
 * 현재는 운영/테스트(admin)만 결제 없이 플랜을 활성화할 수 있다.
 */
router.post('/upgrade', async (req, res, next) => {
  try {
    const { plan = 'pro', months = 3 } = req.body || {};
    if (req.user.role !== 'admin') {
      return res.status(501).json({
        success: false,
        error: '이용권 결제는 곧 오픈됩니다. (가맹점 심사 대기 중)',
        comingSoon: true,
      });
    }
    // 기간권(선불): months개월 부여 + 크레딧 일괄. eximbay 정기결제 오픈 전엔 admin 수동만.
    const result = await subscriptionService.activatePlan(req.user.id, plan, Date.now(), months);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = { router };
