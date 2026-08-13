const { query } = require('../db/client');

// 대시보드 조회 로직 단일소스 — 레거시 라우트(dashboard.route.js)와 Nest(nest/dashboard)가 함께 사용한다.
//   (NestJS 이관 중 로직이 두 벌로 갈라지지 않도록 SQL을 라우트에서 서비스로 뺐다.)

/**
 * 로그인 사용자의 모든 소셜 계정에 걸친 발행 집계 (실데이터)
 * @param {string} userId
 */
async function getOverview(userId) {
  const counts = await query(
    `SELECT
       (SELECT count(*) FROM social_accounts WHERE user_id = $1 AND status != 'disabled') AS accounts,
       count(*) FILTER (WHERE pq.status = 'posted')                  AS published,
       count(*) FILTER (WHERE pq.status IN ('pending','confirmed'))  AS queued,
       count(*) FILTER (WHERE pq.scheduled_at IS NOT NULL AND pq.scheduled_at > now()
                          AND pq.status != 'posted')                 AS scheduled
     FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
     WHERE sa.user_id = $1`,
    [userId]
  );

  // 최근 7일 일별 게시 수
  const daily = await query(
    `SELECT to_char(date_trunc('day', pq.posted_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS day,
            count(*) AS cnt
     FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
     WHERE sa.user_id = $1 AND pq.status = 'posted'
           AND pq.posted_at > now() - interval '7 days'
     GROUP BY 1 ORDER BY 1`,
    [userId]
  );

  return {
    accounts: parseInt(counts.rows[0].accounts, 10),
    published: parseInt(counts.rows[0].published, 10),
    queued: parseInt(counts.rows[0].queued, 10),
    scheduled: parseInt(counts.rows[0].scheduled, 10),
    daily: daily.rows.map((r) => ({ day: r.day, count: parseInt(r.cnt, 10) })),
  };
}

/**
 * 예약/게시 항목 목록 (캘린더 렌더용). 유효일자 = scheduled_at | posted_at | created_at
 * @param {string} userId
 */
async function getCalendar(userId) {
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
    [userId]
  );
  return rows.rows.map((r) => ({
    id: r.id,
    status: r.status,
    effectiveAt: r.effective_at,
    scheduledAt: r.scheduled_at,
    postedAt: r.posted_at,
    type: r.has_reel ? 'reel' : (r.has_image ? 'photo' : 'post'),
    username: r.username,
    platform: r.platform,
  }));
}

module.exports = { getOverview, getCalendar };
