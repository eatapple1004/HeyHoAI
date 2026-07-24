/**
 * Admin — 회사 맞춤 제안서(소개 페이지) 빌더 API.
 *   특정 회사 계약 과정에서 우리 서비스를 보여줄 before/after 제안 HTML을 만들기 위해,
 *   우리 생성물(원본↔결과 페어)을 나열해 관리자가 고르게 한다.
 *
 *   GET /api/admin/proposal/results?scope=mine|all&limit=&offset=
 *     원본(reference)이 연결된 생성물을 최신순 나열. before=원본, after=결과.
 *
 *   최종 제안 HTML은 프론트가 선택분 이미지를 base64로 임베드해 자체포함 파일로 생성한다(서버 저장 없음).
 *   프라이버시: 기본 scope='mine'(관리자 본인 계정 생성물)만. 전체는 scope=all(관리자 판단).
 */
const { Router } = require('express');
const { query } = require('../db/client');

const router = Router();

// reference_image_path/file_path → 서빙 가능한 URL. 로스터(/img/…)·절대 URL은 그대로, 그 외엔 /images/<basename>.
function toUrl(p) {
  const s = String(p || '');
  if (!s) return '';
  if (s.startsWith('/img/') || /^https?:\/\//i.test(s)) return s;
  return '/images/' + s.split('/').pop();
}

router.get('/results', async (req, res, next) => {
  try {
    const limit = Math.min(120, Math.max(1, parseInt(req.query.limit, 10) || 60));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const scope = req.query.scope === 'all' ? 'all' : 'mine';

    const params = [limit, offset];
    let where = `pr.reference_image_path IS NOT NULL AND gr.file_path IS NOT NULL AND gr.taken_down = false`;
    if (scope === 'mine' && req.user && req.user.id) {
      params.push(req.user.id);
      where += ` AND pr.user_id = $${params.length}`;
    }
    const r = await query(
      `SELECT gr.idx, gr.file_path, gr.model, gr.template_name, gr.template_source, gr.created_at,
              pr.reference_image_path, pr.prompt_text
         FROM generation_results gr
         JOIN prompts pr ON gr.prompt_idx = pr.idx
        WHERE ${where}
        ORDER BY gr.idx DESC
        LIMIT $1 OFFSET $2`,
      params
    );
    const items = r.rows.map((row) => ({
      idx: row.idx,
      afterUrl: toUrl(row.file_path),
      beforeUrl: toUrl(row.reference_image_path),
      label: row.template_name || row.template_source || row.model || '',
      model: row.model || '',
      createdAt: row.created_at,
    })).filter((it) => it.afterUrl && it.beforeUrl);

    res.json({ success: true, items, scope, hasMore: r.rows.length === limit });
  } catch (e) { next(e); }
});

module.exports = { router };
