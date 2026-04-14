const repo = require('./visualAttribute.repository');

/** GET /api/visuals/categories */
async function listCategories(req, res, next) {
  try {
    const categories = await repo.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
}

/** GET /api/visuals/attributes?category=geometry&tags=face */
async function listAttributes(req, res, next) {
  try {
    const { category, tags } = req.query;
    let data;
    if (category) {
      data = await repo.findByCategory(category);
    } else if (tags) {
      data = await repo.findByTags(tags.split(','));
    } else {
      data = await repo.findAll();
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/** POST /api/visuals/attributes */
async function createAttribute(req, res, next) {
  try {
    const attr = await repo.insertAttribute(req.body);
    res.status(201).json({ success: true, data: attr });
  } catch (err) { next(err); }
}

/** POST /api/visuals/compile — attribute_ids → 조합된 프롬프트 반환 */
async function compilePrompt(req, res, next) {
  try {
    const { attributeIds } = req.body;
    const prompt = await repo.compilePrompt(attributeIds);
    const attrs = await repo.findByIds(attributeIds);
    res.json({ success: true, data: { prompt, attributes: attrs } });
  } catch (err) { next(err); }
}

/** POST /api/characters/:characterId/visual-presets */
async function createPreset(req, res, next) {
  try {
    const { characterId } = req.params;
    const compiledPrompt = await repo.compilePrompt(req.body.attributeIds);
    const preset = await repo.insertPreset({
      characterId,
      ...req.body,
      compiledPrompt,
    });
    res.status(201).json({ success: true, data: preset });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/visual-presets */
async function listPresets(req, res, next) {
  try {
    const presets = await repo.findPresetsByCharacter(req.params.characterId);
    res.json({ success: true, data: presets });
  } catch (err) { next(err); }
}

module.exports = { listCategories, listAttributes, createAttribute, compilePrompt, createPreset, listPresets };
