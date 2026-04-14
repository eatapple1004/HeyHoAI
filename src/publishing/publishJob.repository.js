const { query } = require('../db/client');

/**
 * Publish Job을 생성한다.
 *
 * @param {{
 *   contentId: string;
 *   characterId: string;
 *   scheduledAt?: string;
 * }} data
 */
async function insert(data) {
  const result = await query(
    `INSERT INTO publish_jobs
       (content_id, character_id, scheduled_at, status)
     VALUES ($1,$2,$3,'pending')
     RETURNING *`,
    [data.contentId, data.characterId, data.scheduledAt || null]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM publish_jobs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByContentId(contentId) {
  const result = await query(
    'SELECT * FROM publish_jobs WHERE content_id = $1 ORDER BY created_at DESC',
    [contentId]
  );
  return result.rows;
}

async function findByCharacterId(characterId, { status, limit = 20, offset = 0 } = {}) {
  const conditions = ['character_id = $1'];
  const params = [characterId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');
  const result = await query(
    `SELECT * FROM publish_jobs WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );
  return result.rows;
}

/**
 * @param {string} id
 * @param {{
 *   status: string;
 *   igMediaId?: string;
 *   igPermalink?: string;
 *   attempt?: number;
 *   error?: string;
 * }} update
 */
async function updateStatus(id, update) {
  const sets = ['status = $2', 'updated_at = now()'];
  const params = [id, update.status];
  let idx = 3;

  if (update.igMediaId) {
    sets.push(`ig_media_id = $${idx++}`);
    params.push(update.igMediaId);
  }
  if (update.igPermalink) {
    sets.push(`ig_permalink = $${idx++}`);
    params.push(update.igPermalink);
  }
  if (update.attempt != null) {
    sets.push(`attempt = $${idx++}`);
    params.push(update.attempt);
  }
  if (update.error) {
    sets.push(`error = $${idx++}`);
    params.push(update.error);
  }
  if (update.status === 'published' || update.status === 'failed') {
    sets.push('finished_at = now()');
  }
  if (update.status === 'published') {
    sets.push('published_at = now()');
  }

  const result = await query(
    `UPDATE publish_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0];
}

/**
 * 게시 대기 중인 Job을 조회한다 (스케줄러용).
 */
async function findPendingDue() {
  const result = await query(
    `SELECT pj.*, c.caption, c.hashtags, c.media_type, c.media_asset_ids, c.alt_text
     FROM publish_jobs pj
     JOIN contents c ON c.id = pj.content_id
     WHERE pj.status = 'pending'
       AND (pj.scheduled_at IS NULL OR pj.scheduled_at <= now())
     ORDER BY pj.scheduled_at ASC NULLS FIRST
     LIMIT 25`
  );
  return result.rows;
}

module.exports = { insert, findById, findByContentId, findByCharacterId, updateStatus, findPendingDue };
