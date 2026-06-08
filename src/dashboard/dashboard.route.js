const { Router } = require('express');
const { query } = require('../db/client');

const router = Router();

/**
 * GET /api/dashboard/overview
 * 로그인 사용자의 모든 소셜 계정에 걸친 발행 집계 (실데이터)
 */
router.get('/overview', async (req, res, next) => {
  try {
    const counts = await query(
      `SELECT
         (SELECT count(*) FROM social_accounts WHERE user_id = $1 AND status != 'disabled') AS accounts,
         count(*) FILTER (WHERE pq.status = 'posted')                  AS published,
         count(*) FILTER (WHERE pq.status IN ('pending','confirmed'))  AS queued,
         count(*) FILTER (WHERE pq.scheduled_at IS NOT NULL AND pq.scheduled_at > now()
                            AND pq.status != 'posted')                 AS scheduled
       FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
       WHERE sa.user_id = $1`,
      [req.user.id]
    );

    // 최근 7일 일별 게시 수
    const daily = await query(
      `SELECT to_char(date_trunc('day', pq.posted_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS day,
              count(*) AS cnt
       FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
       WHERE sa.user_id = $1 AND pq.status = 'posted'
             AND pq.posted_at > now() - interval '7 days'
       GROUP BY 1 ORDER BY 1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        accounts: parseInt(counts.rows[0].accounts, 10),
        published: parseInt(counts.rows[0].published, 10),
        queued: parseInt(counts.rows[0].queued, 10),
        scheduled: parseInt(counts.rows[0].scheduled, 10),
        daily: daily.rows.map((r) => ({ day: r.day, count: parseInt(r.cnt, 10) })),
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/dashboard/calendar
 * 예약/게시 항목 목록 (캘린더 렌더용). 유효일자 = scheduled_at | posted_at | created_at
 */
router.get('/calendar', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT pq.id, pq.status,
              pq.scheduled_at, pq.posted_at, pq.created_at,
              (pq.reel_media_id IS NOT NULL)  AS has_reel,
              (pq.image_media_id IS NOT NULL) AS has_image,
              COALESCE(pq.scheduled_at, pq.posted_at, pq.created_at) AS effective_at,
              sa.username, sa.platform
       FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
       WHERE sa.user_id = $1
       ORDER BY effective_at DESC
       LIMIT 80`,
      [req.user.id]
    );
    res.json({
      success: true,
      data: rows.rows.map((r) => ({
        id: r.id,
        status: r.status,
        effectiveAt: r.effective_at,
        scheduledAt: r.scheduled_at,
        postedAt: r.posted_at,
        type: r.has_reel ? 'reel' : (r.has_image ? 'photo' : 'post'),
        username: r.username,
        platform: r.platform,
      })),
    });
  } catch (err) { next(err); }
});

module.exports = { router };
