const api = require('./video.api');

// 얇은 Express 어댑터 — 오케스트레이션은 video.api.js 단일소스(레거시·Nest 공용).

/** POST /api/characters/:characterId/videos/generate */
async function generate(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.generate(req.user.id, req.params.characterId, req.body) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/videos */
async function listByCharacter(req, res, next) {
  try {
    res.json({ success: true, data: await api.listByCharacter(req.user.id, req.params.characterId, req.query) });
  } catch (err) { next(err); }
}

/** GET /api/videos/:id */
async function getById(req, res, next) {
  try {
    res.json({ success: true, data: await api.getById(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/videos/jobs */
async function listJobs(req, res, next) {
  try {
    res.json({ success: true, data: await api.listJobs(req.user.id, req.params.characterId) });
  } catch (err) { next(err); }
}

/** GET /api/videos/jobs/:jobId */
async function getJob(req, res, next) {
  try {
    res.json({ success: true, data: await api.getJob(req.user.id, req.params.jobId) });
  } catch (err) { next(err); }
}

module.exports = { generate, listByCharacter, getById, listJobs, getJob };
