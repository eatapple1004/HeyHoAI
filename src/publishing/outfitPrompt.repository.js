const { query } = require('../db/client');

async function insert({ accountId, name, prompt }) {
  const result = await query(
    'INSERT INTO outfit_prompts (account_id, name, prompt) VALUES ($1,$2,$3) RETURNING *',
    [accountId, name, prompt]
  );
  return result.rows[0];
}

async function findByAccountId(accountId) {
  const result = await query(
    'SELECT * FROM outfit_prompts WHERE account_id = $1 ORDER BY created_at DESC',
    [accountId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM outfit_prompts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function update(id, { name, prompt }) {
  const sets = [];
  const params = [id];
  let i = 2;
  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (prompt !== undefined) { sets.push(`prompt = $${i++}`); params.push(prompt); }
  if (sets.length === 0) return findById(id);
  const result = await query(`UPDATE outfit_prompts SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM outfit_prompts WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = { insert, findByAccountId, findById, update, remove };
