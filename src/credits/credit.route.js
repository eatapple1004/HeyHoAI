const express = require('express');
const creditService = require('./credit.service');

const router = express.Router();

/**
 * GET /api/credits
 * 현재 잔액 + 가격표. admin은 unlimited=true (과금 면제)
 */
router.get('/', async (req, res, next) => {
  try {
    const balance = await creditService.getBalance(req.user.id);
    res.json({
      success: true,
      data: {
        balance,
        unlimited: req.user.role === 'admin',
        costs: creditService.COSTS,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/credits/ledger?limit=50
 * 크레딧 거래 내역
 */
router.get('/ledger', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const data = await creditService.getLedger(req.user.id, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
