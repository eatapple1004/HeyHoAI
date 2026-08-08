const multer = require('multer');
const api = require('./character.api');

// 얇은 Express 어댑터 — 실제 오케스트레이션은 character.api.js 단일소스(레거시·Nest 공용).

const upload = multer(api.refUploadOptions(multer));
const registerUpload = upload.single('referenceImage');

/** POST /api/characters */
async function create(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.create(req.user.id, req.body) });
  } catch (err) { next(err); }
}

/** GET /api/characters/:id */
async function getById(req, res, next) {
  try {
    res.json({ success: true, data: await api.getById(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** GET /api/characters */
async function list(req, res, next) {
  try {
    const { data, pagination } = await api.list(req.user.id, req.query);
    res.json({ success: true, data, pagination });
  } catch (err) { next(err); }
}

/** PUT /api/characters/:id/reference-image — 대표 이미지 지정 */
async function setReferenceImage(req, res, next) {
  try {
    const data = await api.setReferenceImage(req.user.id, req.params.id, (req.body || {}).imageId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/** DELETE /api/characters/:id/reference-image — 대표 이미지 해제 */
async function clearReferenceImage(req, res, next) {
  try {
    res.json({ success: true, data: await api.clearReferenceImage(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/characters/register — 간단 등록(멀티파트 referenceImage) */
async function register(req, res, next) {
  registerUpload(req, res, async (err) => {
    if (err) return next(err);
    try {
      res.status(201).json({ success: true, data: await api.register(req.user.id, req.body, req.file) });
    } catch (e) { next(e); }
  });
}

/** DELETE /api/characters/:id — 소프트 삭제 */
async function deleteCharacter(req, res, next) {
  try {
    res.json({ success: true, data: await api.remove(req.user.id, req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/characters/register-with-image */
async function registerWithImage(req, res, next) {
  try {
    res.status(201).json({ success: true, data: await api.registerWithImage(req.user.id, req.body) });
  } catch (err) { next(err); }
}

module.exports = { create, getById, list, setReferenceImage, clearReferenceImage, register, registerWithImage, deleteCharacter };
