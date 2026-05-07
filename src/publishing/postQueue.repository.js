const { query } = require('../db/client');

async function insert({ accountId, imageMediaId, reelMediaId, imageCaption, reelCaption, hashtags }) {
  const result = await query(
    `INSERT INTO post_queue (account_id, image_media_id, reel_media_id, image_caption, reel_caption, hashtags, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
    [accountId, imageMediaId || null, reelMediaId || null, imageCaption || null, reelCaption || null, hashtags || []]
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
       img.file_path as image_path,
       reel.file_path as reel_path
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
       img.file_path as image_path,
       reel.file_path as reel_path
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     WHERE pq.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * 확정(confirmed) 상태 중 가장 오래된 항목 조회 (FIFO)
 */
async function findNextConfirmed(accountId) {
  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path,
       reel.file_path as reel_path,
       sa.account_id as zernio_account_id
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     LEFT JOIN social_accounts sa ON sa.id = pq.account_id
     WHERE pq.account_id = $1 AND pq.status = 'confirmed'
     ORDER BY pq.created_at ASC LIMIT 1`,
    [accountId]
  );
  return result.rows[0] || null;
}

/**
 * 모든 계정에서 확정 항목이 있는 계정 ID 목록
 */
async function findAccountsWithConfirmed() {
  const result = await query(
    `SELECT DISTINCT pq.account_id, sa.account_id as zernio_account_id
     FROM post_queue pq
     JOIN social_accounts sa ON sa.id = pq.account_id AND sa.status = 'active'
     WHERE pq.status = 'confirmed'`
  );
  return result.rows;
}

async function update(id, fields) {
  const sets = [];
  const params = [id];
  let i = 2;

  if (fields.imageCaption !== undefined) { sets.push(`image_caption = $${i++}`); params.push(fields.imageCaption); }
  if (fields.reelCaption !== undefined) { sets.push(`reel_caption = $${i++}`); params.push(fields.reelCaption); }
  if (fields.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); params.push(fields.hashtags); }
  if (fields.status !== undefined) { sets.push(`status = $${i++}`); params.push(fields.status); }
  if (fields.postedAt !== undefined) { sets.push(`posted_at = $${i++}`); params.push(fields.postedAt); }
  if (fields.imagePostUrl !== undefined) { sets.push(`image_post_url = $${i++}`); params.push(fields.imagePostUrl); }
  if (fields.reelPostUrl !== undefined) { sets.push(`reel_post_url = $${i++}`); params.push(fields.reelPostUrl); }

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

module.exports = { insert, findByAccountId, findById, findNextConfirmed, findAccountsWithConfirmed, update, remove };
