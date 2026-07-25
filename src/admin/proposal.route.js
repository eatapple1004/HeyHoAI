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

// 1개 레퍼런스 → n개 결과. 같은 레퍼런스(gkey)를 가진 결과들을 묶어서 그룹 단위로 페이지네이션.
//   gkey = pack이면 pack_share_id(한 팩의 모든 컷 = 한 레퍼런스), 아니면 prompts.reference_image_path.
router.get('/results', async (req, res, next) => {
  try {
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24)); // 그룹 수 기준
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const scope = req.query.scope === 'all' ? 'all' : 'mine';
    const MAX_PER_GROUP = 24;

    const params = [limit, offset];
    let scopeWhere = '';
    if (scope === 'mine' && req.user && req.user.id) {
      params.push(req.user.id);
      scopeWhere = ` AND pr.user_id = $${params.length}`;
    }
    const r = await query(
      `WITH base AS (
         SELECT gr.idx, gr.file_path, gr.model, gr.template_name, gr.template_source,
                pr.reference_image_path, refpack.url AS canonical_ref,
                COALESCE(gr.metadata->>'pack_share_id', pr.reference_image_path) AS gkey,
                (gr.template_source = 'pack') AS is_pack
           FROM generation_results gr
           JOIN prompts pr ON gr.prompt_idx = pr.idx
           LEFT JOIN LATERAL (
             SELECT pa.url FROM pack_assets pa
               JOIN content_packs cp ON cp.id = pa.pack_id
              WHERE cp.share_id = (gr.metadata->>'pack_share_id') AND pa.kind = 'ref'
              ORDER BY pa.id DESC LIMIT 1
           ) refpack ON true
          WHERE gr.file_path IS NOT NULL AND gr.taken_down = false
            AND COALESCE(gr.metadata->>'kind','') <> 'ref'
            AND (pr.reference_image_path IS NOT NULL OR refpack.url IS NOT NULL)${scopeWhere}
       ),
       g AS (
         SELECT gkey, MAX(idx) AS max_idx FROM base GROUP BY gkey ORDER BY MAX(idx) DESC LIMIT $1 OFFSET $2
       )
       SELECT b.*, g.max_idx FROM base b JOIN g ON b.gkey = g.gkey
        ORDER BY g.max_idx DESC, b.idx DESC`,
      params
    );

    // 그룹 조립
    const map = new Map();
    for (const row of r.rows) {
      let grp = map.get(row.gkey);
      if (!grp) {
        const orig = row.reference_image_path ? toUrl(row.reference_image_path) : '';
        const canon = row.canonical_ref ? toUrl(row.canonical_ref) : '';
        grp = {
          gkey: row.gkey,
          beforeUrl: orig || canon,                        // 원본 우선, 없으면 캐논 레퍼
          altBeforeUrl: (orig && canon) ? canon : '',      // 둘 다 있으면 캐논을 토글 대상으로
          beforeKind: orig ? 'original' : 'canonical',
          isPack: row.is_pack,
          label: row.template_name || row.template_source || row.model || '',
          results: [],
        };
        map.set(row.gkey, grp);
      }
      if (grp.results.length < MAX_PER_GROUP) {
        grp.results.push({ idx: row.idx, afterUrl: toUrl(row.file_path), label: row.template_name || '' });
      }
    }
    const groups = [...map.values()].filter((g) => g.beforeUrl && g.results.length);

    res.json({ success: true, groups, scope, hasMore: map.size === limit });
  } catch (e) { next(e); }
});

module.exports = { router };
