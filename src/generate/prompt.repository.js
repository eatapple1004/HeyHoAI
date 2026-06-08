const { query } = require('../db/client');

async function insert({ userId, characterId, promptText, model, referenceImagePath, tags, stylePreset, teamId = null }) {
  const result = await query(
    `INSERT INTO prompts (user_id, character_id, prompt_text, model, reference_image_path, tags, style_preset, team_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, characterId || null, promptText, model || null, referenceImagePath || null, tags || [], stylePreset || null, teamId]
  );
  return result.rows[0];
}

async function findByIdx(idx) {
  const result = await query('SELECT * FROM prompts WHERE idx = $1', [idx]);
  return result.rows[0] || null;
}

async function findByCharacterId(characterId, { limit = 50, offset = 0 } = {}) {
  const result = await query(
    'SELECT * FROM prompts WHERE character_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [characterId, limit, offset]
  );
  return result.rows;
}

async function findAll({ userId, teamId, limit = 50, offset = 0 } = {}) {
  // 팀 컨텍스트면 팀 소유, 개인이면 본인 & 팀에 속하지 않은 프롬프트
  const where = teamId ? 'p.team_id = $1' : 'p.user_id = $1 AND p.team_id IS NULL';
  const owner = teamId || userId;
  const result = await query(
    `SELECT p.*, c.name as character_name FROM prompts p
     LEFT JOIN characters c ON c.id = p.character_id
     WHERE ${where} ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
    [owner, limit, offset]
  );
  return result.rows;
}

module.exports = { insert, findByIdx, findByCharacterId, findAll };
