import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * 대시보드 집계 데이터 접근 — src/dashboard/dashboard.service.js 의 SQL을 이식.
 * 소셜 계정에 걸린 발행 현황만 다룬다(계정이 없으면 전부 0).
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly db: DbService) {}

  /** 계정 수 + 상태별 발행 건수(한 번의 쿼리로 집계) */
  async countsByUser(userId: string) {
    const r = await this.db.query<{
      accounts: string; published: string; queued: string; scheduled: string;
    }>(
      `SELECT
         (SELECT count(*) FROM social_accounts WHERE user_id = $1 AND status != 'disabled') AS accounts,
         count(*) FILTER (WHERE pq.status = 'posted')                  AS published,
         count(*) FILTER (WHERE pq.status IN ('pending','confirmed'))  AS queued,
         count(*) FILTER (WHERE pq.scheduled_at IS NOT NULL AND pq.scheduled_at > now()
                            AND pq.status != 'posted')                 AS scheduled
       FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
       WHERE sa.user_id = $1`,
      [userId],
    );
    return r.rows[0];
  }

  /** 최근 7일 일별 게시 수 (Asia/Seoul 기준 날짜로 묶는다) */
  async dailyPosts(userId: string) {
    const r = await this.db.query<{ day: string; cnt: string }>(
      `SELECT to_char(date_trunc('day', pq.posted_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS day,
              count(*) AS cnt
       FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
       WHERE sa.user_id = $1 AND pq.status = 'posted'
             AND pq.posted_at > now() - interval '7 days'
       GROUP BY 1 ORDER BY 1`,
      [userId],
    );
    return r.rows;
  }

  /** 캘린더 항목 — 유효일자 = scheduled_at | posted_at | created_at, 최근 80건 */
  async calendarItems(userId: string) {
    const r = await this.db.query<any>(
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
      [userId],
    );
    return r.rows;
  }
}
