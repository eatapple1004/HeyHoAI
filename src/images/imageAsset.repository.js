const { query } = require('../db/client');

/**
 * 이미지 에셋을 저장한다.
 *
 * @param {{
 *   characterId: string;
 *   jobId: string;
 *   prompt: string;
 *   negativePrompt: string;
 *   provider: string;
 *   providerJobId: string;
 *   imageUrl: string;
 *   width: number;
 *   height: number;
 *   seed?: number;
 *   variationLabel: string;
 *   metadata?: object;
 * }} data
 * @returns {Promise<object>}
 */
async function insert(data) {
  const result = await query(
    `INSERT INTO image_assets
       (character_id, job_id, prompt, negative_prompt, provider, provider_job_id,
        image_url, width, height, seed, variation_label, metadata, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'candidate')
     RETURNING *`,
    [
      data.characterId,
      data.jobId,
      data.prompt,
      data.negativePrompt,
      data.provider,
      data.providerJobId,
      data.imageUrl,
      data.width,
      data.height,
      data.seed ?? null,
      data.variationLabel,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return result.rows[0];
}

/**
 * 특정 Job의 모든 이미지 에셋을 조회한다.
 */
async function findByJobId(jobId) {
  const result = await query(
    'SELECT * FROM image_assets WHERE job_id = $1 ORDER BY created_at',
    [jobId]
  );
  return result.rows;
}

/**
 * 특정 캐릭터의 모든 이미지를 조회한다.
 */
async function findByCharacterId(characterId, { status, limit = 50, offset = 0 } = {}) {
  const conditions = ['character_id = $1'];
  const params = [characterId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');
  const result = await query(
    `SELECT * FROM image_assets WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );
  return result.rows;
}

/**
 * 이미지 상태를 업데이트한다.
 * @param {string} id
 * @param {string} status - 'candidate' | 'master' | 'rejected' | 'archived'
 */
async function updateStatus(id, status) {
  const result = await query(
    'UPDATE image_assets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

/**
 * ID로 조회
 */
async function findById(id) {
  const result = await query('SELECT * FROM image_assets WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * 기존 master를 해제하고 새 master를 지정한다 (트랜잭션).
 * @param {string} characterId
 * @param {string} newMasterId
 */
async function setMaster(characterId, newMasterId) {
  const { pool } = require('../db/client');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 기존 master → candidate로 강등
    await client.query(
      `UPDATE image_assets SET status = 'candidate', updated_at = now()
       WHERE character_id = $1 AND status = 'master'`,
      [characterId]
    );

    // 새 master 지정
    await client.query(
      `UPDATE image_assets SET status = 'master', updated_at = now()
       WHERE id = $1`,
      [newMasterId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { insert, findByJobId, findByCharacterId, updateStatus, findById, setMaster };
