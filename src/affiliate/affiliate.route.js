const { Router } = require('express');
const affiliateService = require('./affiliate.service');

const router = Router();

/** GET /api/affiliate — 내 추천 코드 + 통계 */
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await affiliateService.getStats(req.user.id) });
  } catch (err) { next(err); }
});

module.exports = { router };
