const { Router } = require('express');
const dashboardService = require('./dashboard.service');

const router = Router();

/**
 * GET /api/dashboard/overview
 * 로그인 사용자의 모든 소셜 계정에 걸친 발행 집계 (실데이터)
 */
router.get('/overview', async (req, res, next) => {
  try {
    res.json({ success: true, data: await dashboardService.getOverview(req.user.id) });
  } catch (err) { next(err); }
});

/**
 * GET /api/dashboard/calendar
 * 예약/게시 항목 목록 (캘린더 렌더용). 유효일자 = scheduled_at | posted_at | created_at
 */
router.get('/calendar', async (req, res, next) => {
  try {
    res.json({ success: true, data: await dashboardService.getCalendar(req.user.id) });
  } catch (err) { next(err); }
});

module.exports = { router };
