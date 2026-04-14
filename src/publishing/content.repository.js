const { query } = require('../db/client');
const { pool } = require('../db/client');

/**
 * 콘텐츠를 생성한다.
 *
 * @param {{
 *   characterId: string;
 *   mediaType: string;
 *   mediaAssetIds: string[];
 *   caption: string;
 *   hashtags: string[];
 *   callToAction: string;
 *   altText: string;
 *   mediaContext: string;
 * }} data
 */
async function insert(data) {
  const result = await query(
    `INSERT INTO contents
       (character_id, media_type, media_asset_ids, caption, hashtags,
        call_to_action, alt_text, media_context, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
     RETURNING *`,
    [
      data.characterId,
      data.mediaType,
      data.mediaAssetIds,
      data.caption,
      data.hashtags,
      data.callToAction,
      data.altText,
      data.mediaContext,
    ]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM contents WHERE id = $1', [id]);
  return result.rows[0] || null;
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

  const countResult = await query(`SELECT COUNT(*) FROM contents WHERE ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT * FROM contents WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  return { rows: dataResult.rows, total };
}

/**
 * 콘텐츠 필드를 업데이트한다.
 * @param {string} id
 * @param {object} fields - 업데이트할 컬럼:값 맵
 */
async function update(id, fields) {
  const sets = [];
  const params = [id];
  let idx = 2;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return findById(id);

  sets.push('updated_at = now()');

  const result = await query(
    `UPDATE contents SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

/**
 * 콘텐츠 상태를 업데이트한다.
 * status: draft | approved | scheduled | publishing | published | failed | rejected
 */
async function updateStatus(id, status) {
  return update(id, { status });
}

/**
 * 예약 게시 대상 콘텐츠를 조회한다.
 * scheduled_at이 현재 시각 이전이고 status가 scheduled인 것만.
 */
async function findDueForPublish() {
  const result = await query(
    `SELECT c.*, pj.id as publish_job_id
     FROM contents c
     LEFT JOIN publish_jobs pj ON pj.content_id = c.id AND pj.status = 'pending'
     WHERE c.status = 'scheduled'
       AND c.scheduled_at <= now()
     ORDER BY c.scheduled_at ASC
     LIMIT 50`
  );
  return result.rows;
}

module.exports = { insert, findById, findByCharacterId, update, updateStatus, findDueForPublish };
