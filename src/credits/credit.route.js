const express = require('express');
const creditService = require('./credit.service');

const router = express.Router();

/**
 * GET /api/credits
 * 현재 작업 컨텍스트(개인/팀)의 잔액 + 가격표. admin은 unlimited=true (과금 면제)
 */
router.get('/', async (req, res, next) => {
  try {
    const teamCredit = require('../teams/team.credit');
    const ctx = await teamCredit.resolveContext(req.user.id);
    const isTeam = ctx.type === 'team';
    const balance = isTeam ? await teamCredit.getBalance(ctx.teamId) : await creditService.getBalance(req.user.id);
    res.json({
      success: true,
      data: {
        balance,
        points: await creditService.getPoints(req.user.id), // 크리에이터 로열티 포인트(토큰 교환 가능)
        // 팀 컨텍스트에선 admin이라도 팀 풀에서 차감 (개인 면제는 개인 컨텍스트에서만)
        unlimited: !isTeam && req.user.role === 'admin',
        costs: creditService.COSTS,
        context: isTeam
          ? { type: 'team', teamId: ctx.teamId, teamName: ctx.teamName, role: ctx.role }
          : { type: 'personal' },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/credits/checkin
 * 일일 출석 → 스트릭/데일리 보너스. (첫 생성 경험 있는 사용자만)
 */
router.post('/checkin', async (req, res, next) => {
  try {
    const streakService = require('./streak.service');
    const result = await streakService.checkin(req.user.id, req.user.role);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/credits/points/exchange  { amount }
 * 크리에이터 포인트 → 크레딧(토큰) 교환 (1:1). 현금 교환은 추후.
 */
router.post('/points/exchange', async (req, res, next) => {
  try {
    const out = await creditService.exchangePointsToCredits(req.user.id, req.body && req.body.amount);
    res.json({ success: true, data: out });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

/**
 * GET /api/credits/points/ledger?limit=50  — 포인트 내역
 */
router.get('/points/ledger', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    res.json({ success: true, data: await creditService.getPointLedger(req.user.id, limit) });
  } catch (err) { next(err); }
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
