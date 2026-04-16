const { query } = require('../db/client');

async function insert({ promptIdx, characterId, filePath, fileSizeKb, width, height, model, metadata }) {
  const result = await query(
    `INSERT INTO generation_results (prompt_idx, character_id, file_path, file_size_kb, width, height, model, metadata, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'success') RETURNING *`,
    [promptIdx, characterId || null, filePath, fileSizeKb || null, width || null, height || null, model || null, JSON.stringify(metadata || {})]
  );
  return result.rows[0];
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

async function findAll({ limit = 50, offset = 0 } = {}) {
  const result = await query(
    `SELECT gr.*, p.prompt_text, c.name as character_name
     FROM generation_results gr
     JOIN prompts p ON p.idx = gr.prompt_idx
     LEFT JOIN characters c ON c.id = gr.character_id
     ORDER BY gr.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

module.exports = { insert, insertFailed, findByIdx, findByPromptIdx, findAll };
