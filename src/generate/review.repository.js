const { query } = require('../db/client');

async function insert({ resultIdx, promptIdx, naturalScore, sexualScore, postRate, posted, reviewer, memo }) {
  const result = await query(
    `INSERT INTO reviews (result_idx, prompt_idx, natural_score, sexual_score, post_rate, posted, reviewer, memo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [resultIdx, promptIdx, naturalScore || 0, sexualScore || 0, postRate || 0, posted || false, reviewer || 'system', memo || null]
  );
  return result.rows[0];
}

async function findByIdx(idx) {
  const result = await query('SELECT * FROM reviews WHERE idx = $1', [idx]);
  return result.rows[0] || null;
}

async function findByResultIdx(resultIdx) {
  const result = await query('SELECT * FROM reviews WHERE result_idx = $1 ORDER BY created_at DESC', [resultIdx]);
  return result.rows[0] || null;
}

async function update(idx, fields) {
  const sets = [];
  const params = [idx];
  let i = 2;

  if (fields.naturalScore !== undefined) { sets.push(`natural_score = $${i++}`); params.push(fields.naturalScore); }
  if (fields.sexualScore !== undefined) { sets.push(`sexual_score = $${i++}`); params.push(fields.sexualScore); }
  if (fields.postRate !== undefined) { sets.push(`post_rate = $${i++}`); params.push(fields.postRate); }
  if (fields.posted !== undefined) { sets.push(`posted = $${i++}`); params.push(fields.posted); }
  if (fields.hookLevel !== undefined) { sets.push(`hook_level = $${i++}`); params.push(fields.hookLevel); }
  if (fields.memo !== undefined) { sets.push(`memo = $${i++}`); params.push(fields.memo); }

  if (sets.length === 0) return findByIdx(idx);

  sets.push('updated_at = now()');

  const result = await query(
    `UPDATE reviews SET ${sets.join(', ')} WHERE idx = $1 RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function findAll({ posted, status, sort = 'newest', limit = 50, offset = 0 } = {}) {
  const conditions = ['r.active = true'];
  const params = [];
  let i = 1;

  if (posted !== undefined) {
    conditions.push(`r.posted = $${i++}`);
    params.push(posted);
  }
  if (status) {
    conditions.push(`gr.status = $${i++}`);
    params.push(status);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const sortMap = {
    newest: 'r.created_at DESC',
    oldest: 'r.created_at ASC',
    natural_high: 'r.natural_score DESC',
    natural_low: 'r.natural_score ASC',
    sexual_high: 'r.sexual_score DESC',
    sexual_low: 'r.sexual_score ASC',
    postrate_high: 'r.post_rate DESC',
    postrate_low: 'r.post_rate ASC',
    posted_first: 'r.posted DESC, r.created_at DESC',
    unposted_first: 'r.posted ASC, r.created_at DESC',
    hook_high: 'r.hook_level DESC',
    hook_low: 'r.hook_level ASC',
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  const result = await query(
    `SELECT r.*, gr.file_path, gr.model, gr.status as result_status, gr.error_message, p.prompt_text, p.style_preset, c.name as character_name
     FROM reviews r
     JOIN generation_results gr ON gr.idx = r.result_idx
     JOIN prompts p ON p.idx = r.prompt_idx
     LEFT JOIN characters c ON c.id = gr.character_id
     ${where}
     ORDER BY ${orderBy} LIMIT $${i++} OFFSET $${i}`,
    [...params, limit, offset]
  );
  return result.rows;
}

async function deactivate(idx) {
  const result = await query(
    'UPDATE reviews SET active = false, updated_at = now() WHERE idx = $1 RETURNING *',
    [idx]
  );
  return result.rows[0] || null;
}

module.exports = { insert, findByIdx, findByResultIdx, update, deactivate, findAll };
