const api = require('./image.api');

// 얇은 Express 어댑터 — 오케스트레이션은 image.api.js 단일소스(레거시·Nest 공용).

/** POST /api/characters/:characterId/images/generate */
async function generate(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.generate(req.user.id, req.params.characterId, req.body) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/images */
async function listByCharacter(req, res, next) {
  try {
    res.json({ success: true, data: await api.listByCharacter(req.user.id, req.params.characterId, req.query) });
  } catch (err) { next(err); }
}

/** GET /api/images/:id */
async function getById(req, res, next) {
  try {
    res.json({ success: true, data: await api.getById(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** PUT /api/characters/:characterId/images/:imageId/master */
async function setMaster(req, res, next) {
  try {
    res.json({ success: true, data: await api.setMaster(req.user.id, req.params.characterId, req.params.imageId) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/images/jobs */
async function listJobs(req, res, next) {
  try {
    res.json({ success: true, data: await api.listJobs(req.user.id, req.params.characterId) });
  } catch (err) { next(err); }
}

module.exports = { generate, listByCharacter, getById, setMaster, listJobs };
