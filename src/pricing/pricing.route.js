const { Router } = require('express');
const { getPricing } = require('./pricing.config');

const router = Router();

// GET /api/pricing — 가격 단일 소스(추정 placeholder, 메타 포함). 공개(인증 불필요).
router.get('/', (_req, res) => {
  res.json(getPricing());
});

module.exports = router;
