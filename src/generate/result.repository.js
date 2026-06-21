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

/** 커뮤니티 피드: 모든 유저의 공개·성공·미테이크다운 결과 (최신순). 작성자 핸들·출처 템플릿 포함. */
async function findCommunity({ limit = 60, offset = 0 } = {}) {
  const r = await query(
    `SELECT gr.idx, gr.file_path, gr.model, gr.metadata, gr.created_at,
            gr.template_id, gr.template_source, gr.template_name,
            split_part(u.email, '@', 1) AS creator_handle
     FROM generation_results gr
     JOIN prompts p ON p.idx = gr.prompt_idx
     JOIN users u   ON u.id = p.user_id
     WHERE gr.visibility = 'public' AND gr.status = 'success'
       AND gr.taken_down = false AND gr.file_path IS NOT NULL
     ORDER BY gr.created_at DESC LIMIT $1 OFFSET $2`,
    [Math.min(limit, 100), offset]
  );
  return r.rows;
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

async function findAll({ userId, teamId, limit = 50, offset = 0 } = {}) {
  // 팀 컨텍스트면 팀 소유 프롬프트의 결과물, 개인이면 본인 & 비팀
  const where = teamId ? 'p.team_id = $1' : 'p.user_id = $1 AND p.team_id IS NULL';
  const owner = teamId || userId;
  const result = await query(
    `SELECT gr.*, p.prompt_text, p.tags, c.name as character_name
     FROM generation_results gr
     JOIN prompts p ON p.idx = gr.prompt_idx
     LEFT JOIN characters c ON c.id = gr.character_id
     WHERE ${where}
     ORDER BY gr.created_at DESC LIMIT $2 OFFSET $3`,
    [owner, limit, offset]
  );
  return result.rows;
}

module.exports = { insert, insertFailed, findByIdx, findByPromptIdx, findAll, findCommunity, report, setVisibility };
