const repo = require('./visualAttribute.repository');
const { assertCharacterOwned } = require('../middleware/ownership');

// 비주얼 속성/프리셋 요청 처리(ops) 단일소스 — 레거시 컨트롤러(visual.controller.js)와 Nest(nest/media) 공용.

/** GET /api/visuals/categories */
function listCategories() {
  return repo.listCategories();
}

/** GET /api/visuals/attributes?category=&tags= */
function listAttributes({ category, tags } = {}) {
  if (category) return repo.findByCategory(category);
  if (tags) return repo.findByTags(String(tags).split(','));
  return repo.findAll();
}

/** POST /api/visuals/attributes (201) */
function createAttribute(body) {
  return repo.insertAttribute(body);
}

/** POST /api/visuals/compile — attribute_ids → 조합된 프롬프트 */
async function compilePrompt(body = {}) {
  const { attributeIds } = body;
  const prompt = await repo.compilePrompt(attributeIds);
  const attributes = await repo.findByIds(attributeIds);
  return { prompt, attributes };
}

/** POST /api/characters/:characterId/visual-presets (201) */
async function createPreset(userId, characterId, body = {}) {
  await assertCharacterOwned(characterId, userId);
  const compiledPrompt = await repo.compilePrompt(body.attributeIds);
  return repo.insertPreset({ characterId, ...body, compiledPrompt });
}

/** GET /api/characters/:characterId/visual-presets */
async function listPresets(userId, characterId) {
  await assertCharacterOwned(characterId, userId);
  return repo.findPresetsByCharacter(characterId);
}

module.exports = { listCategories, listAttributes, createAttribute, compilePrompt, createPreset, listPresets };
