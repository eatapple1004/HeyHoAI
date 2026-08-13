const api = require('./visual.api');

// 얇은 Express 어댑터 — 오케스트레이션은 visual.api.js 단일소스(레거시·Nest 공용).

/** GET /api/visuals/categories */
async function listCategories(req, res, next) {
  try { res.json({ success: true, data: await api.listCategories() }); } catch (err) { next(err); }
}

/** GET /api/visuals/attributes?category=geometry&tags=face */
async function listAttributes(req, res, next) {
  try { res.json({ success: true, data: await api.listAttributes(req.query) }); } catch (err) { next(err); }
}

/** POST /api/visuals/attributes */
async function createAttribute(req, res, next) {
  try { res.status(201).json({ success: true, data: await api.createAttribute(req.body) }); } catch (err) { next(err); }
}

/** POST /api/visuals/compile */
async function compilePrompt(req, res, next) {
  try { res.json({ success: true, data: await api.compilePrompt(req.body) }); } catch (err) { next(err); }
}

/** POST /api/characters/:characterId/visual-presets */
async function createPreset(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.createPreset(req.user.id, req.params.characterId, req.body) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/visual-presets */
async function listPresets(req, res, next) {
  try {
    res.json({ success: true, data: await api.listPresets(req.user.id, req.params.characterId) });
  } catch (err) { next(err); }
}

module.exports = { listCategories, listAttributes, createAttribute, compilePrompt, createPreset, listPresets };
