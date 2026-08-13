import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * 관리자 조회(읽기 전용).
 *
 * ⚠️ 통계 쿼리는 **블록마다 개별 try/catch로 격리**한다. 테이블·컬럼이 아직 없는 환경(신규 dev DB 등)에서
 *   한 블록이 실패해도 대시보드 전체가 500이 되지 않고 나머지가 렌더되도록.
 */

/** 영상 판별 — metadata.type 또는 파일 확장자.
 *  ⚠️ COALESCE 필수: 이미지 행은 metadata->>'type'이 NULL이라 미적용 시 (NULL OR FALSE)=NULL →
 *  NOT NULL=NULL이 되어 FILTER에서 통째로 빠진다(이미지 집계가 0이 되는 실측 버그). */
const VIDEO = `(COALESCE(gr.metadata->>'type','') = 'video' OR COALESCE(gr.file_path,'') ~* '\\.(mp4|webm|mov)$')`;
/** 성공 산출물만(실패 행 제외) */
const HAS_FILE = `gr.file_path IS NOT NULL`;

/** 잡 테이블 공통 집계 — video_jobs·ugc_jobs·faceswap_jobs가 같은 상태 모델을 쓴다 */
const jobAgg = (table: string, extra = '') => `SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status='succeeded')::int AS succeeded,
    COUNT(*) FILTER (WHERE status='failed')::int    AS failed,
    COUNT(*) FILTER (WHERE status NOT IN ('succeeded','failed'))::int AS processing,
    COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7d,
    COUNT(DISTINCT user_id)::int AS users${extra}
  FROM ${table}`;

@Injectable()
export class AdminRepository {
  constructor(private readonly db: DbService) {}

  /** 한 행 — 실패하면 `{_err}`로 표시하고 넘어간다(대시보드 부분 렌더) */
  private async one(sql: string, params: unknown[] = []): Promise<any> {
    try {
      return (await this.db.query(sql, params)).rows[0] || {};
    } catch (e: any) {
      return { _err: e.message };
    }
  }

  /** 여러 행 — 실패하면 빈 배열 */
  private async many(sql: string, params: unknown[] = []): Promise<any[]> {
    try {
      return (await this.db.query(sql, params)).rows;
    } catch {
      return [];
    }
  }

  /** 전체 크리에이션(비공개 포함) — visibility·status·검색어 필터 */
  async listCreationRows(f: { visibility?: string; status?: string; q?: string; limit: number; offset: number }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.visibility === 'public' || f.visibility === 'private') {
      params.push(f.visibility);
      where.push(`gr.visibility = $${params.length}`);
    }
    if (['success', 'failed', 'pending'].includes(f.status as string)) {
      if (f.status === 'failed') where.push(`gr.status <> 'success'`);   // failed = 성공이 아닌 전부
      else { params.push(f.status); where.push(`gr.status = $${params.length}`); }
    }
    const term = String(f.q || '').trim().toLowerCase();
    if (term) {
      params.push('%' + term + '%');
      where.push(`(LOWER(COALESCE(u.email,'')) LIKE $${params.length} OR LOWER(COALESCE(gr.template_name,'')) LIKE $${params.length})`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(f.limit); const li = params.length;
    params.push(f.offset); const oi = params.length;

    const r = await this.db.query(
      `SELECT gr.idx, gr.file_path, gr.visibility, gr.status, gr.taken_down, gr.template_name,
              gr.template_source, gr.model, gr.width, gr.height, gr.likes_count, gr.created_at,
              p.user_id, u.email, u.display_name
         FROM generation_results gr
         JOIN prompts p ON p.idx = gr.prompt_idx
         LEFT JOIN users u ON u.id = p.user_id
         ${whereSql}
        ORDER BY gr.created_at DESC
        LIMIT $${li} OFFSET $${oi}`, params);
    return r.rows;
  }

  // ── 대시보드 통계 블록 ──

  usersStats() {
    return this.one(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int   AS new1d,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int  AS new7d,
        COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS new30d,
        COUNT(*) FILTER (WHERE is_trial = true)::int    AS trials,
        COUNT(*) FILTER (WHERE is_creator = true)::int  AS creators,
        COUNT(*) FILTER (WHERE plan IS NOT NULL AND plan <> 'free')::int AS paid_plan,
        COALESCE(SUM(credit_balance),0)::bigint AS credit_outstanding,
        COALESCE(SUM(point_balance),0)::bigint  AS point_outstanding
      FROM users`);
  }

  creationsStats() {
    return this.one(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${VIDEO})::int                     AS videos,
        COUNT(*) FILTER (WHERE NOT ${VIDEO} AND ${HAS_FILE})::int AS images,
        COUNT(*) FILTER (WHERE visibility='public' AND NOT taken_down)::int AS public,
        COUNT(*) FILTER (WHERE visibility='private')::int AS private,
        COUNT(*) FILTER (WHERE status <> 'success')::int  AS failed,
        COUNT(*) FILTER (WHERE taken_down)::int            AS taken_down,
        COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int   AS last1d,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int  AS last7d,
        COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS last30d,
        COALESCE(SUM(likes_count),0)::bigint AS likes
      FROM generation_results gr`);
  }

  videoJobStats() { return this.one(jobAgg('video_jobs')); }
  ugcJobStats() {
    return this.one(jobAgg('ugc_jobs',
      `, COALESCE(SUM(n_clips),0)::bigint AS clips, COALESCE(SUM(duration_sec),0)::bigint AS seconds`));
  }
  faceswapStats() { return this.one(jobAgg('faceswap_jobs')); }

  packStats() {
    return this.one(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7d,
        COUNT(DISTINCT user_id)::int AS users FROM content_packs`);
  }

  paymentStats() {
    return this.one(`SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(amount_usd),0)::numeric(12,2) AS revenue_usd,
        COALESCE(SUM(credits),0)::bigint AS credits_sold,
        COUNT(DISTINCT user_id)::int AS paying_users,
        COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS orders30d,
        COALESCE(SUM(amount_usd) FILTER (WHERE created_at > now() - interval '30 days'),0)::numeric(12,2) AS revenue30d
      FROM payments`);
  }

  revenueByProvider() {
    return this.many(`SELECT provider, COUNT(*)::int AS orders, COALESCE(SUM(amount_usd),0)::numeric(12,2) AS revenue
        FROM payments GROUP BY provider ORDER BY revenue DESC`);
  }

  topTemplates() {
    return this.many(`SELECT COALESCE(NULLIF(template_name,''),'(Custom / 프롬프트)') AS name,
              COALESCE(template_source,'custom') AS source, COUNT(*)::int AS n
         FROM generation_results GROUP BY 1,2 ORDER BY n DESC LIMIT 12`);
  }

  templateSources() {
    return this.many(`SELECT COALESCE(template_source,'custom') AS source, COUNT(*)::int AS n
         FROM generation_results GROUP BY 1 ORDER BY n DESC`);
  }

  topModels() {
    return this.many(`SELECT COALESCE(NULLIF(model,''),'(unknown)') AS model, COUNT(*)::int AS n
         FROM generation_results gr WHERE NOT ${VIDEO} AND ${HAS_FILE} GROUP BY 1 ORDER BY n DESC LIMIT 10`);
  }

  ugcByType() {
    return this.many(`SELECT COALESCE(NULLIF(output_type,''),'(unknown)') AS type, COUNT(*)::int AS n
         FROM ugc_jobs GROUP BY 1 ORDER BY n DESC`);
  }

  topUsers() {
    return this.many(`SELECT u.email, u.display_name,
              COUNT(*)::int AS creations,
              COUNT(*) FILTER (WHERE ${VIDEO})::int                     AS videos,
              COUNT(*) FILTER (WHERE NOT ${VIDEO} AND ${HAS_FILE})::int AS images
         FROM generation_results gr
         JOIN prompts p ON p.idx = gr.prompt_idx
         LEFT JOIN users u ON u.id = p.user_id
        GROUP BY u.email, u.display_name ORDER BY creations DESC LIMIT 12`);
  }

  engagement() {
    return this.one(`SELECT
        (SELECT COUNT(*) FROM result_likes)::bigint          AS likes,
        (SELECT COUNT(*) FROM follows)::bigint               AS follows,
        (SELECT COUNT(*) FROM result_reports)::bigint        AS reports,
        (SELECT COUNT(*) FROM marketplace_templates)::bigint AS listed_templates`);
  }

  /** 14일 일별 시계열 — 데이터가 없는 날도 0으로 채워야 그래프가 끊기지 않는다(generate_series) */
  timeseries() {
    return this.many(`
      WITH days AS (
        SELECT generate_series((now()::date - interval '13 days'), now()::date, interval '1 day')::date AS d
      )
      SELECT to_char(d,'MM-DD') AS label,
        COALESCE((SELECT COUNT(*) FROM generation_results gr WHERE gr.created_at::date = d AND NOT ${VIDEO} AND ${HAS_FILE}),0)::int AS images,
        COALESCE((SELECT COUNT(*) FROM generation_results gr WHERE gr.created_at::date = d AND ${VIDEO}),0)::int AS videos,
        COALESCE((SELECT COUNT(*) FROM ugc_jobs uj WHERE uj.created_at::date = d),0)::int AS ugc,
        COALESCE((SELECT COUNT(*) FROM users us WHERE us.created_at::date = d),0)::int AS signups
      FROM days ORDER BY d`);
  }

  recentPayments() {
    return this.many(`SELECT p.provider, p.product, p.amount_usd, p.credits, p.created_at, u.email
         FROM payments p LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC LIMIT 8`);
  }
}
