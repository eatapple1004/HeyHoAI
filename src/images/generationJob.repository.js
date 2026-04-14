const { query } = require('../db/client');

/**
 * 이미지 생성 Job을 생성한다.
 *
 * @param {{
 *   characterId: string;
 *   provider: string;
 *   candidateCount: number;
 * }} data
 * @returns {Promise<object>}
 */
async function insert({ characterId, provider, candidateCount }) {
  const result = await query(
    `INSERT INTO generation_jobs (character_id, provider, candidate_count, status)
     VALUES ($1, $2, $3, 'running')
     RETURNING *`,
    [characterId, provider, candidateCount]
  );
  return result.rows[0];
}

/**
 * Job 상태를 업데이트한다.
 *
 * @param {string} id
 * @param {{ status: string; masterImageId?: string; error?: string }} update
 * @returns {Promise<object>}
 */
async function updateStatus(id, { status, masterImageId, error }) {
  const sets = ['status = $2', 'updated_at = now()'];
  const params = [id, status];
  let idx = 3;

  if (masterImageId) {
    sets.push(`master_image_id = $${idx++}`);
    params.push(masterImageId);
  }
  if (error) {
    sets.push(`error = $${idx++}`);
    params.push(error);
  }
  if (status === 'completed' || status === 'failed') {
    sets.push('finished_at = now()');
  }

  const result = await query(
    `UPDATE generation_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0];
}

/**
 * ID로 Job을 조회한다.
 */
async function findById(id) {
  const result = await query('SELECT * FROM generation_jobs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * 캐릭터별 Job 목록을 조회한다.
 */
async function findByCharacterId(characterId) {
  const result = await query(
    'SELECT * FROM generation_jobs WHERE character_id = $1 ORDER BY created_at DESC',
    [characterId]
  );
  return result.rows;
}

module.exports = { insert, updateStatus, findById, findByCharacterId };
