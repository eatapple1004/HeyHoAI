const { query } = require('../db/client');

// ─── Categories ───

async function listCategories() {
  const result = await query(
    'SELECT * FROM visual_attribute_categories ORDER BY sort_order'
  );
  return result.rows;
}

// ─── Attributes ───

async function findByCategory(categoryId) {
  const result = await query(
    'SELECT * FROM visual_attributes WHERE category_id = $1 ORDER BY key',
    [categoryId]
  );
  return result.rows;
}

async function findByIds(ids) {
  if (ids.length === 0) return [];
  const result = await query(
    'SELECT * FROM visual_attributes WHERE id = ANY($1) ORDER BY category_id, key',
    [ids]
  );
  return result.rows;
}

async function findByTags(tags) {
  const result = await query(
    'SELECT * FROM visual_attributes WHERE tags && $1 ORDER BY category_id, key',
    [tags]
  );
  return result.rows;
}

async function findAll() {
  const result = await query(
    `SELECT va.*, vac.name_ko as category_name_ko, vac.name_en as category_name_en
     FROM visual_attributes va
     JOIN visual_attribute_categories vac ON vac.id = va.category_id
     ORDER BY vac.sort_order, va.key`
  );
  return result.rows;
}

async function insertAttribute({ categoryId, key, value, promptFragment, tags, metadata }) {
  const result = await query(
    `INSERT INTO visual_attributes (category_id, key, value, prompt_fragment, tags, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [categoryId, key, value, promptFragment, tags || [], JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}

// ─── Presets (캐릭터별 비주얼 조합) ───

async function insertPreset({ characterId, name, description, attributeIds, compiledPrompt, isDefault }) {
  const result = await query(
    `INSERT INTO character_visual_presets
       (character_id, name, description, attribute_ids, compiled_prompt, is_default)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [characterId, name, description || '', attributeIds, compiledPrompt, isDefault || false]
  );
  return result.rows[0];
}

async function findPresetsByCharacter(characterId) {
  const result = await query(
    'SELECT * FROM character_visual_presets WHERE character_id = $1 ORDER BY is_default DESC, created_at',
    [characterId]
  );
  return result.rows;
}

async function findPresetById(id) {
  const result = await query('SELECT * FROM character_visual_presets WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findDefaultPreset(characterId) {
  const result = await query(
    'SELECT * FROM character_visual_presets WHERE character_id = $1 AND is_default = true LIMIT 1',
    [characterId]
  );
  return result.rows[0] || null;
}

/**
 * attribute_ids로부터 prompt_fragment들을 조합해 하나의 프롬프트를 만든다.
 * @param {string[]} attributeIds
 * @returns {Promise<string>}
 */
async function compilePrompt(attributeIds) {
  const attrs = await findByIds(attributeIds);
  // 카테고리 순서대로 정렬하여 조합
  const categoryOrder = ['geometry', 'lighting', 'color', 'composition', 'psychology', 'texture', 'context'];
  attrs.sort((a, b) => categoryOrder.indexOf(a.category_id) - categoryOrder.indexOf(b.category_id));
  return attrs.map((a) => a.prompt_fragment).join(', ');
}

module.exports = {
  listCategories,
  findByCategory,
  findByIds,
  findByTags,
  findAll,
  insertAttribute,
  insertPreset,
  findPresetsByCharacter,
  findPresetById,
  findDefaultPreset,
  compilePrompt,
};
