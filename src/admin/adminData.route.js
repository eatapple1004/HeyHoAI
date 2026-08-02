/**
 * 관리자 데이터 조회 — 전체 크리에이션(비공개 포함) + 기본 통계.
 *  - GET /api/admin/creations : 모든 유저의 생성물(private 포함) 목록 + 필터
 *  - GET /api/admin/stats     : 유저·크리에이션·결제 기본 집계
 * (읽기 전용. 각 라우트 requireAdmin 가드)
 */
const { Router } = require('express');
const { requireAdmin } = require('../middleware/auth');
const { query } = require('../db/client');

const router = Router();

/** 저장 경로 → 서빙 URL (R2/외부 URL·/img 에셋은 그대로, tmp 경로는 /images/<basename>). */
function toUrl(p) {
  const s = String(p || '');
  if (!s) return '';
  if (s.startsWith('/img/') || /^https?:\/\//i.test(s)) return s;
  return '/images/' + s.split('/').pop();
}
const isReel = (p) => /\.(mp4|webm|mov)$/i.test(String(p || ''));

// ── 전체 크리에이션(비공개 포함) ──
// GET /api/admin/creations?visibility=public|private&status=success|failed&q=&limit=&offset=
router.get('/admin/creations', requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const where = [];
    const params = [];
    if (req.query.visibility === 'public' || req.query.visibility === 'private') {
      params.push(req.query.visibility); where.push(`gr.visibility = $${params.length}`);
    }
    if (['success', 'failed', 'pending'].includes(req.query.status)) {
      if (req.query.status === 'failed') where.push(`gr.status <> 'success'`);
      else { params.push(req.query.status); where.push(`gr.status = $${params.length}`); }
    }
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q) {
      params.push('%' + q + '%');
      where.push(`(LOWER(COALESCE(u.email,'')) LIKE $${params.length} OR LOWER(COALESCE(gr.template_name,'')) LIKE $${params.length})`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(limit); const li = params.length;
    params.push(offset); const oi = params.length;

    const r = await query(
      `SELECT gr.idx, gr.file_path, gr.visibility, gr.status, gr.taken_down, gr.template_name,
              gr.template_source, gr.model, gr.width, gr.height, gr.likes_count, gr.created_at,
              p.user_id, u.email, u.display_name
         FROM generation_results gr
         JOIN prompts p ON p.idx = gr.prompt_idx
         LEFT JOIN users u ON u.id = p.user_id
         ${whereSql}
         ORDER BY gr.created_at DESC
         LIMIT $${li} OFFSET $${oi}`, params);

    const rows = r.rows.map((x) => ({
      idx: x.idx,
      url: toUrl(x.file_path),
      isReel: isReel(x.file_path),
      visibility: x.visibility,
      status: x.status,
      takenDown: x.taken_down,
      templateName: x.template_name,
      templateSource: x.template_source,
      model: x.model,
      width: x.width,
      height: x.height,
      likes: x.likes_count,
      createdAt: x.created_at,
      userEmail: x.email,
      userName: x.display_name,
    }));
    res.json({ success: true, data: rows, hasMore: rows.length === limit });
  } catch (err) { next(err); }
});

// ── 통계 (대시보드) ──
// GET /api/admin/stats
// 유저 / 생성물(이미지·영상 구분) / 기능별 사용량(영상·광고UGC·온모델·팩) / 매출 / 템플릿·모델 / 헤비유저 / 인게이지먼트 / 14일 시계열.
// 각 블록은 개별 try/catch로 격리 → 테이블·컬럼 누락 환경에서도 부분 렌더(전체 500 방지).
router.get('/admin/stats', requireAdmin, async (_req, res, next) => {
  // generation_results에서 영상 판별: metadata.type='video' 또는 파일 확장자.
  //   ⚠️ COALESCE 필수 — 이미지 행은 metadata->>'type'이 NULL이라, 미적용 시 (NULL OR FALSE)=NULL → NOT NULL=NULL로
  //   FILTER에서 통째로 누락되어 이미지 집계가 0이 됨(실측 버그). NULL을 FALSE로 접어 정상 분류.
  const VIDEO = `(COALESCE(gr.metadata->>'type','') = 'video' OR COALESCE(gr.file_path,'') ~* '\\.(mp4|webm|mov)$')`;
  const HAS_FILE = `gr.file_path IS NOT NULL`; // 성공 산출물(실패행 제외)
  const one = async (sql, p) => { try { return (await query(sql, p)).rows[0] || {}; } catch (e) { return { _err: e.message }; } };
  const many = async (sql, p) => { try { return (await query(sql, p)).rows; } catch (e) { return []; } };
  try {
    const users = await one(`SELECT
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

    const creations = await one(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${VIDEO})::int                   AS videos,
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

    // 기능별 사용량 — 영상 생성(Kling), 광고(UGC 파이프라인), 온모델 faceswap, 콘텐츠 팩
    const jobAgg = (t, extra = '') => `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='succeeded')::int AS succeeded,
        COUNT(*) FILTER (WHERE status='failed')::int    AS failed,
        COUNT(*) FILTER (WHERE status NOT IN ('succeeded','failed'))::int AS processing,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7d,
        COUNT(DISTINCT user_id)::int AS users${extra}
      FROM ${t}`;
    const videoJobs = await one(jobAgg('video_jobs'));
    const ugcJobs   = await one(jobAgg('ugc_jobs', `, COALESCE(SUM(n_clips),0)::bigint AS clips, COALESCE(SUM(duration_sec),0)::bigint AS seconds`));
    const faceswap  = await one(jobAgg('faceswap_jobs'));
    const packs     = await one(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7d,
        COUNT(DISTINCT user_id)::int AS users FROM content_packs`);

    const payments = await one(`SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(amount_usd),0)::numeric(12,2) AS revenue_usd,
        COALESCE(SUM(credits),0)::bigint AS credits_sold,
        COUNT(DISTINCT user_id)::int AS paying_users,
        COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS orders30d,
        COALESCE(SUM(amount_usd) FILTER (WHERE created_at > now() - interval '30 days'),0)::numeric(12,2) AS revenue30d
      FROM payments`);

    const byProvider = await many(
      `SELECT provider, COUNT(*)::int AS orders, COALESCE(SUM(amount_usd),0)::numeric(12,2) AS revenue
         FROM payments GROUP BY provider ORDER BY revenue DESC`);

    // 템플릿 사용 횟수 (누적) — 이름+출처 기준 상위
    const topTemplates = await many(
      `SELECT COALESCE(NULLIF(template_name,''),'(Custom / 프롬프트)') AS name,
              COALESCE(template_source,'custom') AS source, COUNT(*)::int AS n
         FROM generation_results GROUP BY 1,2 ORDER BY n DESC LIMIT 12`);

    const templateSources = await many(
      `SELECT COALESCE(template_source,'custom') AS source, COUNT(*)::int AS n
         FROM generation_results GROUP BY 1 ORDER BY n DESC`);

    // 이미지 생성 모델별
    const topModels = await many(
      `SELECT COALESCE(NULLIF(model,''),'(unknown)') AS model, COUNT(*)::int AS n
         FROM generation_results gr WHERE NOT ${VIDEO} AND ${HAS_FILE} GROUP BY 1 ORDER BY n DESC LIMIT 10`);

    // 광고(UGC) 유형별
    const ugcByType = await many(
      `SELECT COALESCE(NULLIF(output_type,''),'(unknown)') AS type, COUNT(*)::int AS n
         FROM ugc_jobs GROUP BY 1 ORDER BY n DESC`);

    // 헤비 유저 (생성물 수 기준)
    const topUsers = await many(
      `SELECT u.email, u.display_name,
              COUNT(*)::int AS creations,
              COUNT(*) FILTER (WHERE ${VIDEO})::int                    AS videos,
              COUNT(*) FILTER (WHERE NOT ${VIDEO} AND ${HAS_FILE})::int AS images
         FROM generation_results gr
         JOIN prompts p ON p.idx = gr.prompt_idx
         LEFT JOIN users u ON u.id = p.user_id
        GROUP BY u.email, u.display_name ORDER BY creations DESC LIMIT 12`);

    // 커뮤니티 인게이지먼트
    const engagement = await one(`SELECT
        (SELECT COUNT(*) FROM result_likes)::bigint   AS likes,
        (SELECT COUNT(*) FROM follows)::bigint         AS follows,
        (SELECT COUNT(*) FROM result_reports)::bigint  AS reports,
        (SELECT COUNT(*) FROM marketplace_templates)::bigint AS listed_templates`);

    // 14일 일별 시계열 (이미지·영상·광고·가입)
    const timeseries = await many(`
      WITH days AS (
        SELECT generate_series((now()::date - interval '13 days'), now()::date, interval '1 day')::date AS d
      )
      SELECT to_char(d,'MM-DD') AS label,
        COALESCE((SELECT COUNT(*) FROM generation_results gr WHERE gr.created_at::date = d AND NOT ${VIDEO} AND ${HAS_FILE}),0)::int AS images,
        COALESCE((SELECT COUNT(*) FROM generation_results gr WHERE gr.created_at::date = d AND ${VIDEO}),0)::int AS videos,
        COALESCE((SELECT COUNT(*) FROM ugc_jobs uj WHERE uj.created_at::date = d),0)::int AS ugc,
        COALESCE((SELECT COUNT(*) FROM users us WHERE us.created_at::date = d),0)::int AS signups
      FROM days ORDER BY d`);

    const recentPayments = await many(
      `SELECT p.provider, p.product, p.amount_usd, p.credits, p.created_at, u.email
         FROM payments p LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC LIMIT 8`);

    res.json({ success: true, data: {
      users, creations, videoJobs, ugcJobs, faceswap, packs, payments,
      byProvider, topTemplates, templateSources, topModels, ugcByType, topUsers,
      engagement, timeseries, recentPayments,
    } });
  } catch (err) { next(err); }
});

module.exports = router;
