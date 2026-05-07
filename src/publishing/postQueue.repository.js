const { query } = require('../db/client');

async function insert({ accountId, imageMediaId, reelMediaId, caption, hashtags }) {
  const result = await query(
    `INSERT INTO post_queue (account_id, image_media_id, reel_media_id, caption, hashtags)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [accountId, imageMediaId || null, reelMediaId || null, caption || null, hashtags || []]
  );
  return result.rows[0];
}

async function findByAccountId(accountId, { status, limit = 50, offset = 0 } = {}) {
  const conditions = ['pq.account_id = $1'];
  const params = [accountId];
  let i = 2;

  if (status) { conditions.push(`pq.status = $${i++}`); params.push(status); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path, img.media_type as image_type,
       reel.file_path as reel_path, reel.media_type as reel_type
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     ${where}
     ORDER BY pq.created_at DESC LIMIT $${i++} OFFSET $${i}`,
    [...params, limit, offset]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path, img.media_type as image_type,
       reel.file_path as reel_path, reel.media_type as reel_type
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     WHERE pq.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function update(id, fields) {
  const sets = [];
  const params = [id];
  let i = 2;

  if (fields.caption !== undefined) { sets.push(`caption = $${i++}`); params.push(fields.caption); }
  if (fields.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); params.push(fields.hashtags); }
  if (fields.status !== undefined) { sets.push(`status = $${i++}`); params.push(fields.status); }
  if (fields.postedAt !== undefined) { sets.push(`posted_at = $${i++}`); params.push(fields.postedAt); }
  if (fields.postUrl !== undefined) { sets.push(`post_url = $${i++}`); params.push(fields.postUrl); }

  if (sets.length === 0) return findById(id);
  sets.push('updated_at = now()');

  const result = await query(
    `UPDATE post_queue SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM post_queue WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = { insert, findByAccountId, findById, update, remove };
