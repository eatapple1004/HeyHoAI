const api = require('./publishing.api');

// 얇은 Express 어댑터 — 오케스트레이션은 publishing.api.js 단일소스(레거시·Nest 공용).

// ─── Content Endpoints ───

/** POST /api/contents */
async function createContent(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.createContent(req.user.id, req.body) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/contents */
async function listContents(req, res, next) {
  try {
    const { data, total } = await api.listContents(req.user.id, req.params.characterId, req.query);
    res.json({ success: true, data, pagination: { total } });
  } catch (err) { next(err); }
}

/** GET /api/contents/:id */
async function getContent(req, res, next) {
  try {
    res.json({ success: true, data: await api.getContent(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** PATCH /api/contents/:id */
async function updateContent(req, res, next) {
  try {
    res.json({ success: true, data: await api.updateContent(req.user.id, req.params.id, req.body) });
  } catch (err) { next(err); }
}

/** POST /api/contents/:id/regenerate-caption */
async function regenerateCaption(req, res, next) {
  try {
    res.json({ success: true, data: await api.regenerateCaption(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/contents/:id/approve */
async function approveContent(req, res, next) {
  try {
    res.json({ success: true, data: await api.approveContent(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/contents/:id/reject */
async function rejectContent(req, res, next) {
  try {
    res.json({ success: true, data: await api.rejectContent(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

// ─── Publish Job Endpoints ───

/** POST /api/contents/:id/schedule */
async function schedulePublish(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.schedulePublish(req.user.id, req.params.id, req.body || {}) });
  } catch (err) { next(err); }
}

/** POST /api/contents/:id/publish-now */
async function publishNow(req, res, next) {
  try {
    res.json({ success: true, data: await api.publishNow(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/publish-jobs/:id/retry */
async function retryPublish(req, res, next) {
  try {
    res.json({ success: true, data: await api.retryPublish(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/publish-jobs/:id/cancel */
async function cancelPublish(req, res, next) {
  try {
    res.json({ success: true, data: await api.cancelPublish(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:characterId/publish-jobs */
async function listPublishJobs(req, res, next) {
  try {
    res.json({ success: true, data: await api.listPublishJobs(req.user.id, req.params.characterId, req.query) });
  } catch (err) { next(err); }
}

module.exports = {
  createContent, listContents, getContent, updateContent, regenerateCaption,
  approveContent, rejectContent, schedulePublish, publishNow, retryPublish,
  cancelPublish, listPublishJobs,
};
