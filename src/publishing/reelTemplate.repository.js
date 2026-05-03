const { query } = require('../db/client');

async function insert({ accountId, name, prompt, duration, mode, sourceMediaId }) {
  const result = await query(
    `INSERT INTO reel_templates (account_id, name, prompt, duration, mode, source_media_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [accountId, name, prompt, duration || '5', mode || 'std', sourceMediaId || null]
  );
  return result.rows[0];
}

async function findByAccountId(accountId) {
  const result = await query(
    'SELECT * FROM reel_templates WHERE account_id = $1 ORDER BY created_at DESC',
    [accountId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM reel_templates WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM reel_templates WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = { insert, findByAccountId, findById, remove };
