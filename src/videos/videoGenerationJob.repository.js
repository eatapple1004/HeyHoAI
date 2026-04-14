const { query } = require('../db/client');

/**
 * 영상 생성 Job을 생성한다.
 *
 * @param {{
 *   characterId: string;
 *   sourceImageId: string;
 *   provider: string;
 *   videoStyle: string;
 *   motionPrompt: string;
 * }} data
 */
async function insert(data) {
  const result = await query(
    `INSERT INTO video_generation_jobs
       (character_id, source_image_id, provider, video_style, motion_prompt, status)
     VALUES ($1,$2,$3,$4,$5,'pending')
     RETURNING *`,
    [data.characterId, data.sourceImageId, data.provider, data.videoStyle, data.motionPrompt]
  );
  return result.rows[0];
}

/**
 * Job 상태를 업데이트한다.
 *
 * @param {string} id
 * @param {{
 *   status: string;
 *   providerJobId?: string;
 *   videoAssetId?: string;
 *   attempt?: number;
 *   error?: string;
 * }} update
 */
async function updateStatus(id, update) {
  const sets = ['status = $2', 'updated_at = now()'];
  const params = [id, update.status];
  let idx = 3;

  if (update.providerJobId) {
    sets.push(`provider_job_id = $${idx++}`);
    params.push(update.providerJobId);
  }
  if (update.videoAssetId) {
    sets.push(`video_asset_id = $${idx++}`);
    params.push(update.videoAssetId);
  }
  if (update.attempt != null) {
    sets.push(`attempt = $${idx++}`);
    params.push(update.attempt);
  }
  if (update.error) {
    sets.push(`error = $${idx++}`);
    params.push(update.error);
  }
  if (update.status === 'completed' || update.status === 'failed') {
    sets.push('finished_at = now()');
  }

  const result = await query(
    `UPDATE video_generation_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM video_generation_jobs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByCharacterId(characterId) {
  const result = await query(
    'SELECT * FROM video_generation_jobs WHERE character_id = $1 ORDER BY created_at DESC',
    [characterId]
  );
  return result.rows;
}

module.exports = { insert, updateStatus, findById, findByCharacterId };
