const { query } = require('../db/client');
const { ensureSchema } = require('../db/ensureSchema');

// 제안서(회사 맞춤 소개 페이지) 빌더 로직 단일소스 — 레거시 라우트(proposal.route.js)와 Nest(nest/admin) 공용.

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

// reference_image_path/file_path → 서빙 가능한 URL. 로스터(/img/…)·절대 URL은 그대로, 그 외엔 /images/<basename>.
function toUrl(p) {
  const s = String(p || '');
  if (!s) return '';
  if (s.startsWith('/img/') || /^https?:\/\//i.test(s)) return s;
  return '/images/' + s.split('/').pop();
}

/**
 * 1개 레퍼런스 → n개 결과. 같은 레퍼런스(gkey)를 가진 결과들을 묶어서 그룹 단위로 페이지네이션.
 *   gkey = pack이면 pack_share_id(한 팩의 모든 컷 = 한 레퍼런스), 아니면 prompts.reference_image_path.
 * @returns {{groups:object[], scope:string, hasMore:boolean}}
 */
async function listResults(userId, q = {}) {
  const limit = Math.min(60, Math.max(1, parseInt(q.limit, 10) || 24)); // 그룹 수 기준
  const offset = Math.max(0, parseInt(q.offset, 10) || 0);
  const scope = q.scope === 'all' ? 'all' : 'mine';
  const MAX_PER_GROUP = 24;

  const params = [limit, offset];
  let scopeWhere = '';
  if (scope === 'mine' && userId) {
    params.push(userId);
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
  return { groups, scope, hasMore: map.size === limit };
}

// ─── 저장(초안) — 작성한 제안서를 저장/수정/불러오기/삭제. ───
//   selection = URL·dataURL만 저장(작음). 빌드 시 프론트가 base64 임베드. self-ensure 스키마.
// 동시 요청/다중 프로세스 경쟁에 안전하도록 공용 ensureSchema 사용(중복 생성 에러는 성공으로 간주).
const PROPOSALS_SQL = `
  CREATE TABLE IF NOT EXISTS proposals (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID,
    company    TEXT NOT NULL,
    title      TEXT,
    meta       JSONB NOT NULL DEFAULT '{}'::jsonb,      -- {about,intro,svc,ctaLabel,ctaUrl}
    selection  JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{gkey,beforeUrl,altBeforeUrl,beforeKind,caption,results:[{afterUrl}]}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id, updated_at DESC);
`;
function ensureSchemaProposals() {
  return ensureSchema('proposals', PROPOSALS_SQL);
}

/** 저장/수정 — id 있으면 update, 없으면 insert. 반환 {id}. */
async function save(userId, b = {}) {
  await ensureSchemaProposals();
  const company = String(b.company || '').trim();
  if (!company) throw httpError(400, '회사명이 필요합니다.');
  const meta = {
    about: b.about || '', intro: b.intro || '', svc: b.svc || '',
    ctaLabel: b.ctaLabel || '', ctaUrl: b.ctaUrl || '', title: b.title || '',
  };
  const selection = Array.isArray(b.selection) ? b.selection : [];
  if (b.id) {
    const r = await query(
      `UPDATE proposals SET company=$2, title=$3, meta=$4, selection=$5, updated_at=now()
        WHERE id=$1 RETURNING id`,
      [b.id, company, b.title || '', JSON.stringify(meta), JSON.stringify(selection)]
    );
    if (!r.rows[0]) throw httpError(404, 'not found');
    return r.rows[0].id;
  }
  const r = await query(
    `INSERT INTO proposals (user_id, company, title, meta, selection)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [userId || null, company, b.title || '', JSON.stringify(meta), JSON.stringify(selection)]
  );
  return r.rows[0].id;
}

/** 목록 — 최신순(관리자 공유). */
async function list() {
  await ensureSchemaProposals();
  const r = await query(
    `SELECT id, company, title, updated_at, jsonb_array_length(selection) AS groups
       FROM proposals ORDER BY updated_at DESC LIMIT 100`
  );
  return r.rows;
}

/** 단건 — 편집용 전체 로드. */
async function getSaved(id) {
  await ensureSchemaProposals();
  const r = await query(`SELECT id, company, title, meta, selection FROM proposals WHERE id=$1`, [id]);
  if (!r.rows[0]) throw httpError(404, 'not found');
  return r.rows[0];
}

/** 삭제 */
async function removeSaved(id) {
  await ensureSchemaProposals();
  await query(`DELETE FROM proposals WHERE id=$1`, [id]);
}

module.exports = { toUrl, listResults, save, list, getSaved, removeSaved };
