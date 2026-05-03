const { query } = require('../db/client');

async function insert({ accountId, filePath, mediaType, caption, hashtags, metadata }) {
  const result = await query(
    `INSERT INTO account_media (account_id, file_path, media_type, caption, hashtags, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [accountId, filePath, mediaType || 'image', caption || null, hashtags || [], JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}

async function findByAccountId(accountId, { status, limit = 50, offset = 0 } = {}) {
  const conditions = ['account_id = $1'];
  const params = [accountId];
  let i = 2;

  if (status) { conditions.push(`status = $${i++}`); params.push(status); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const result = await query(
    `SELECT * FROM account_media ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
    [...params, limit, offset]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM account_media WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function update(id, fields) {
  const sets = [];
  const params = [id];
  let i = 2;

  if (fields.caption !== undefined) { sets.push(`caption = $${i++}`); params.push(fields.caption); }
  if (fields.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); params.push(fields.hashtags); }
  if (fields.status !== undefined) { sets.push(`status = $${i++}`); params.push(fields.status); }
  if (fields.postUrl !== undefined) { sets.push(`post_url = $${i++}`); params.push(fields.postUrl); }
  if (fields.postedAt !== undefined) { sets.push(`posted_at = $${i++}`); params.push(fields.postedAt); }

  if (sets.length === 0) return findById(id);
  sets.push('updated_at = now()');

  const result = await query(
    `UPDATE account_media SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM account_media WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

async function countByAccountId(accountId) {
  const result = await query('SELECT COUNT(*) FROM account_media WHERE account_id = $1', [accountId]);
  return parseInt(result.rows[0].count, 10);
}

module.exports = { insert, findByAccountId, findById, update, remove, countByAccountId };
