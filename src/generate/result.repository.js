const { query } = require('../db/client');

async function insert({ promptIdx, characterId, filePath, fileSizeKb, width, height, model, metadata,
  visibility, templateId, templateSource, templateName }) {
  const vis = visibility === 'public' ? 'public' : 'private';
  const result = await query(
    `INSERT INTO generation_results
       (prompt_idx, character_id, file_path, file_size_kb, width, height, model, metadata, status,
        visibility, template_id, template_source, template_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'success',$9,$10,$11,$12) RETURNING *`,
    [promptIdx, characterId || null, filePath, fileSizeKb || null, width || null, height || null, model || null,
     JSON.stringify(metadata || {}), vis,
     templateId || null, templateSource || null, templateName ? String(templateName).slice(0, 120) : null]
  );
  return result.rows[0];
}

const REPORT_THRESHOLD = 3; // 서로 다른 신고자 N명 → 자동 테이크다운

/** 커뮤니티 피드: 모든 유저의 공개·성공·미테이크다운 결과 (최신순). 작성자 핸들·출처 템플릿·좋아요 포함.
 *  viewerId: 현재 보는 유저(좋아요 여부 표시용). */
async function findCommunity({ limit = 60, offset = 0, viewerId = null } = {}) {
  const r = await query(
    `SELECT gr.idx, gr.file_path, gr.model, gr.metadata, gr.created_at,
            gr.template_id, gr.template_source, gr.template_name, gr.likes_count,
            split_part(u.email, '@', 1) AS creator_handle,
            (p.user_id = $3) AS is_own,
            EXISTS(SELECT 1 FROM result_likes rl WHERE rl.result_idx = gr.idx AND rl.user_id = $3) AS liked,
            mt.id AS ownable_template_id,
            EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = mt.id AND o.user_id = $3) AS owns_template
     FROM generation_results gr
     JOIN prompts p ON p.idx = gr.prompt_idx
     JOIN users u   ON u.id = p.user_id
     LEFT JOIN marketplace_templates mt ON mt.from_creation_idx = gr.idx AND mt.creator_id = p.user_id AND mt.origin = 'auto'
     WHERE gr.visibility = 'public' AND gr.status = 'success'
       AND gr.taken_down = false AND gr.file_path IS NOT NULL
     ORDER BY gr.created_at DESC LIMIT $1 OFFSET $2`,
    [Math.min(limit, 100), offset, viewerId]
  );
  return r.rows;
}

/**
 * creation 좋아요 토글. on=true 좋아요 / false 취소. 멱등(중복 좋아요·중복 취소 무해).
 * 단일 CTE로 result_likes 변경과 generation_results.likes_count 갱신을 원자적으로 처리.
 * 반환: { liked, likes } (갱신 후 카운트).
 */
async function toggleLike(idx, userId, on) {
  // 좋아요(쓰기)는 읽기 경로(findCommunity)와 동일 술어로 게이트 — 공개·성공·미테이크다운 결과만.
  // INSERT ... SELECT WHERE EXISTS: 비공개/없는 idx는 0행 삽입(FK 위반·500 없음). UPDATE도 게이트 → 비공개 카운트 누출·쓰기 차단.
  // 취소(DELETE)는 게이트 안 함: 결과가 사후 비공개로 바뀌어도 내 좋아요 제거 + 카운트 정합 유지(드리프트 방지). found=false면 무해한 no-op.
  const sql = on
    ? `WITH ins AS (
         INSERT INTO result_likes (result_idx, user_id)
         SELECT $1, $2
          WHERE EXISTS (SELECT 1 FROM generation_results g
                        WHERE g.idx = $1 AND g.visibility = 'public'
                          AND g.status = 'success' AND g.taken_down = false)
         ON CONFLICT DO NOTHING RETURNING 1)
       UPDATE generation_results gr
          SET likes_count = likes_count + (SELECT count(*) FROM ins)
        WHERE gr.idx = $1 AND gr.visibility = 'public'
          AND gr.status = 'success' AND gr.taken_down = false
        RETURNING gr.likes_count, gr.template_id, gr.template_source, (SELECT count(*) FROM ins)::int AS delta`
    : `WITH del AS (
         DELETE FROM result_likes WHERE result_idx = $1 AND user_id = $2 RETURNING 1)
       UPDATE generation_results gr
          SET likes_count = GREATEST(likes_count - (SELECT count(*) FROM del), 0)
        WHERE gr.idx = $1
        RETURNING gr.likes_count, gr.template_id, gr.template_source, (SELECT count(*) FROM del)::int AS delta`;
  const r = await query(sql, [idx, userId]);
  const row = r.rows[0];
  // 롤업: 출처가 마켓 템플릿인 creation의 좋아요는 그 템플릿 인기로 집계(피드 좋아요 → 마켓 랭킹).
  // 비정규화 소프트 집계(별도 문장 — found 시맨틱 보존). 실제 변동(delta)이 있을 때만.
  if (row && row.delta && row.template_source === 'marketplace' && row.template_id) {
    const signed = on ? row.delta : -row.delta;
    await query(
      `UPDATE marketplace_templates SET likes_count = GREATEST(likes_count + $2, 0) WHERE id::text = $1`,
      [row.template_id, signed]
    );
  }
  return { found: !!row, liked: !!on, likes: row ? row.likes_count : 0 };
}

/** 단일 creation 상세(creation.html) — 공개(성공·미테이크다운) 또는 본인 소유만 노출. viewerId 기준 liked·isOwn. 그 외 null. */
async function findDetailForViewer(idx, viewerId) {
  const r = await query(
    `SELECT gr.idx, gr.file_path, gr.model, gr.metadata, gr.created_at, gr.visibility, gr.status, gr.taken_down,
            gr.template_id, gr.template_source, gr.template_name, gr.likes_count,
            p.prompt_text,
            split_part(u.email, '@', 1) AS creator_handle,
            (p.user_id = $2) AS is_own,
            EXISTS(SELECT 1 FROM result_likes rl WHERE rl.result_idx = gr.idx AND rl.user_id = $2) AS liked,
            (SELECT count(*) FROM follows f WHERE f.creator_id = u.id)::int AS followers,
            EXISTS(SELECT 1 FROM follows f WHERE f.creator_id = u.id AND f.follower_id = $2) AS following,
            mt.id AS minted_template_id,
            EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = mt.id AND o.user_id = $2) AS owns_template,
            EXISTS(SELECT 1 FROM template_owns o2 WHERE o2.template_id = mt.id AND o2.user_id = p.user_id) AS owner_added
       FROM generation_results gr
       JOIN prompts p ON p.idx = gr.prompt_idx
       JOIN users u   ON u.id = p.user_id
       LEFT JOIN marketplace_templates mt ON mt.from_creation_idx = gr.idx AND mt.creator_id = p.user_id AND mt.origin = 'auto'
      WHERE gr.idx = $1`,
    [idx, viewerId]
  );
  const row = r.rows[0];
  if (!row) return null;
  const visible = row.is_own || (row.visibility === 'public' && row.status === 'success' && !row.taken_down && !!row.file_path);
  return visible ? row : null;
}

/** 크리에이터 Overview(γ 넛지): 내 공개 creation 총 좋아요 + 아직 템플릿화 안 한(미귀속) 인기 creation Top.
 *  template_source IS NULL = Custom·미등록 → 등록 후보. 좋아요순. */
async function creatorLikeOverview(userId) {
  const top = await query(
    `SELECT gr.idx, gr.file_path, gr.likes_count, gr.created_at
       FROM generation_results gr
       JOIN prompts p ON p.idx = gr.prompt_idx
      WHERE p.user_id = $1 AND gr.visibility = 'public' AND gr.status = 'success'
        AND gr.taken_down = false AND gr.file_path IS NOT NULL
        AND gr.template_source IS NULL AND gr.likes_count > 0
      ORDER BY gr.likes_count DESC, gr.created_at DESC
      LIMIT 12`,
    [userId]
  );
  const tot = await query(
    `SELECT COALESCE(SUM(gr.likes_count), 0)::int AS total
       FROM generation_results gr
       JOIN prompts p ON p.idx = gr.prompt_idx
      WHERE p.user_id = $1 AND gr.visibility = 'public' AND gr.status = 'success' AND gr.taken_down = false`,
    [userId]
  );
  return { totalLikes: tot.rows[0].total, topLikable: top.rows };
}

/** 결과물 신고 → 임계 누적 시 자동 테이크다운. 반환: { reported, takenDown } */
async function report(resultIdx, reporterId, reason) {
  await query(
    `INSERT INTO result_reports (result_idx, reporter_id, reason) VALUES ($1,$2,$3)
     ON CONFLICT (result_idx, reporter_id) DO NOTHING`,
    [resultIdx, reporterId, String(reason || 'other').slice(0, 40)]
  );
  const cnt = await query(`SELECT COUNT(DISTINCT reporter_id)::int AS n FROM result_reports WHERE result_idx = $1`, [resultIdx]);
  let takenDown = false;
  if (cnt.rows[0].n >= REPORT_THRESHOLD) {
    const up = await query(`UPDATE generation_results SET taken_down = true WHERE idx = $1 AND taken_down = false RETURNING idx`, [resultIdx]);
    takenDown = up.rowCount > 0;
  }
  return { reported: true, takenDown };
}

/**
 * 결과물 공개/비공개 토글(My creations). 소유 검증을 조인으로(개인=prompts.user_id 본인&비팀 / 팀=prompts.team_id).
 * taken_down(모더레이션)된 결과는 재공개 불가 — private 전환은 항상 허용. 반환: {idx, visibility} 또는 null(미소유/없음/공개차단).
 */
async function setVisibility(idx, { userId, teamId }, visibility) {
  const vis = visibility === 'public' ? 'public' : 'private';
  const ownWhere = teamId ? 'p.team_id = $3' : 'p.user_id = $3 AND p.team_id IS NULL';
  const owner = teamId || userId;
  const r = await query(
    `UPDATE generation_results gr
        SET visibility = $1
       FROM prompts p
      WHERE p.idx = gr.prompt_idx AND gr.idx = $2 AND ${ownWhere}
        AND ($1 = 'private' OR gr.taken_down = false)
      RETURNING gr.idx, gr.visibility`,
    [vis, idx, owner]
  );
  return r.rows[0] || null;
}

async function insertFailed({ promptIdx, characterId, model, errorMessage, metadata }) {
  const result = await query(
    `INSERT INTO generation_results (prompt_idx, character_id, file_path, model, metadata, status, error_message)
     VALUES ($1,$2,NULL,$3,$4,'failed',$5) RETURNING *`,
    [promptIdx, characterId || null, model || null, JSON.stringify(metadata || {}), errorMessage]
  );
  return result.rows[0];
}

async function findByIdx(idx) {
  const result = await query('SELECT * FROM generation_results WHERE idx = $1', [idx]);
  return result.rows[0] || null;
}

async function findByPromptIdx(promptIdx) {
  const result = await query(
    'SELECT * FROM generation_results WHERE prompt_idx = $1 ORDER BY created_at',
    [promptIdx]
  );
  return result.rows;
}

async function findAll({ userId, teamId, limit = 50, offset = 0, type } = {}) {
  // 팀 컨텍스트면 팀 소유 프롬프트의 결과물, 개인이면 본인 & 비팀
  const where = teamId ? 'p.team_id = $1' : 'p.user_id = $1 AND p.team_id IS NULL';
  // type 필터: reel=영상 확장자만 / photo=영상 아닌 것만 (라이브러리 탭이 서버측으로 걸러 페이지네이션).
  let typeClause = '';
  if (type === 'reel') typeClause = " AND gr.file_path ~* '\\.(mp4|webm|mov)$'";
  else if (type === 'photo') typeClause = " AND (gr.file_path IS NULL OR gr.file_path !~* '\\.(mp4|webm|mov)$')";
  const owner = teamId || userId;
  const result = await query(
    `SELECT gr.*, p.prompt_text, p.tags, c.name as character_name,
            -- 크리에이션 카드에 "무엇으로 만들었는지" 표시: 유저가 넣은 제품 사진(썸네일).
            --   모델 이름은 gr.metadata->>'model_name' (gr.* 에 포함돼 이미 온다).
            c.reference_image_url AS product_image,
            split_part(u.email, '@', 1) AS creator_handle,
            mt.id AS minted_template_id,
            EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = mt.id AND o.user_id = p.user_id) AS added_to_library
     FROM generation_results gr
     JOIN prompts p ON p.idx = gr.prompt_idx
     LEFT JOIN characters c ON c.id = gr.character_id
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN marketplace_templates mt ON mt.from_creation_idx = gr.idx AND mt.creator_id = p.user_id AND mt.origin = 'auto'
     WHERE ${where}${typeClause}
     ORDER BY gr.created_at DESC LIMIT $2 OFFSET $3`,
    [owner, limit, offset]
  );
  return result.rows;
}

module.exports = { insert, insertFailed, findByIdx, findByPromptIdx, findAll, findCommunity, findDetailForViewer, creatorLikeOverview, report, setVisibility, toggleLike };
