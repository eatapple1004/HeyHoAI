const { query } = require('../db/client');

async function insert({ characterId, promptText, model, referenceImagePath, tags, stylePreset }) {
  const result = await query(
    `INSERT INTO prompts (character_id, prompt_text, model, reference_image_path, tags, style_preset)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [characterId || null, promptText, model || null, referenceImagePath || null, tags || [], stylePreset || null]
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

async function findAll({ limit = 50, offset = 0 } = {}) {
  const result = await query(
    'SELECT p.*, c.name as character_name FROM prompts p LEFT JOIN characters c ON c.id = p.character_id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

module.exports = { insert, findByIdx, findByCharacterId, findAll };
