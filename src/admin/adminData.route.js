/**
 * 관리자 데이터 조회 — 전체 크리에이션(비공개 포함) + 기본 통계.
 *  - GET /api/admin/creations : 모든 유저의 생성물(private 포함) 목록 + 필터
 *  - GET /api/admin/stats     : 유저·크리에이션·결제 기본 집계
 * (읽기 전용. 각 라우트 requireAdmin 가드. 로직은 adminData.service.js 단일소스 — 레거시·Nest 공용)
 */
const { Router } = require('express');
const { requireAdmin } = require('../middleware/auth');
const svc = require('./adminData.service');

const router = Router();

// GET /api/admin/creations?visibility=public|private&status=success|failed&q=&limit=&offset=
router.get('/admin/creations', requireAdmin, async (req, res, next) => {
  try {
    const { data, hasMore } = await svc.listCreations(req.query);
    res.json({ success: true, data, hasMore });
  } catch (err) { next(err); }
});

// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getStats() });
  } catch (err) { next(err); }
});

module.exports = router;
