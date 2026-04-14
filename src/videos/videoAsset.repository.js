const { query } = require('../db/client');

/**
 * @param {{
 *   characterId: string;
 *   jobId: string;
 *   sourceImageId: string;
 *   motionPrompt: string;
 *   negativePrompt: string;
 *   provider: string;
 *   providerJobId: string;
 *   videoUrl: string;
 *   width: number;
 *   height: number;
 *   durationMs: number;
 *   videoStyle: string;
 *   metadata?: object;
 * }} data
 */
async function insert(data) {
  const result = await query(
    `INSERT INTO video_assets
       (character_id, job_id, source_image_id, motion_prompt, negative_prompt,
        provider, provider_job_id, video_url, width, height, duration_ms,
        video_style, metadata, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ready')
     RETURNING *`,
    [
      data.characterId,
      data.jobId,
      data.sourceImageId,
      data.motionPrompt,
      data.negativePrompt,
      data.provider,
      data.providerJobId,
      data.videoUrl,
      data.width,
      data.height,
      data.durationMs,
      data.videoStyle,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM video_assets WHERE id = $1', [id]);
  return result.rows[0] || null;
}

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
    `SELECT * FROM video_assets WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );
  return result.rows;
}

async function findByJobId(jobId) {
  const result = await query(
    'SELECT * FROM video_assets WHERE job_id = $1 ORDER BY created_at',
    [jobId]
  );
  return result.rows;
}

async function updateStatus(id, status) {
  const result = await query(
    'UPDATE video_assets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

module.exports = { insert, findById, findByCharacterId, findByJobId, updateStatus };
