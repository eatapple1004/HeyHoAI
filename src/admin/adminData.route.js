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

// ── 기본 통계 ──
// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, async (_req, res, next) => {
  try {
    const one = async (sql) => (await query(sql)).rows[0] || {};

    const users = await one(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int  AS new1d,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7d,
        COUNT(*) FILTER (WHERE is_trial = true)::int AS trials,
        COALESCE(SUM(credit_balance),0)::bigint AS credit_outstanding
      FROM users`);

    const creations = await one(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE visibility='public' AND NOT taken_down)::int AS public,
        COUNT(*) FILTER (WHERE visibility='private')::int AS private,
        COUNT(*) FILTER (WHERE status <> 'success')::int AS failed,
        COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int  AS last1d,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7d
      FROM generation_results`);

    const payments = await one(`SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(amount_usd),0)::numeric(12,2) AS revenue_usd,
        COALESCE(SUM(credits),0)::bigint AS credits_sold
      FROM payments`);

    const byProvider = (await query(
      `SELECT provider, COUNT(*)::int AS orders, COALESCE(SUM(amount_usd),0)::numeric(12,2) AS revenue
         FROM payments GROUP BY provider ORDER BY revenue DESC`)).rows;

    const topTemplates = (await query(
      `SELECT COALESCE(NULLIF(template_name,''),'(Custom / 프롬프트)') AS name, COUNT(*)::int AS n
         FROM generation_results
        WHERE created_at > now() - interval '30 days'
        GROUP BY 1 ORDER BY n DESC LIMIT 8`)).rows;

    const recentPayments = (await query(
      `SELECT p.provider, p.product, p.amount_usd, p.credits, p.created_at, u.email
         FROM payments p LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC LIMIT 8`)).rows;

    res.json({ success: true, data: { users, creations, payments, byProvider, topTemplates, recentPayments } });
  } catch (err) { next(err); }
});

module.exports = router;
