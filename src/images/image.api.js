const { generateForCharacter, setMasterImage } = require('./imageGeneration.service');
const { generateImagesRequestSchema } = require('./image.validator');
const imageAssetRepo = require('./imageAsset.repository');
const jobRepo = require('./generationJob.repository');
const { assertCharacterOwned } = require('../middleware/ownership');

// 이미지 요청 처리(ops) 단일소스 — 레거시 컨트롤러(image.controller.js)와 Nest(nest/media)가 함께 쓴다.

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/** POST /api/characters/:characterId/images/generate — 후보 생성(201) */
async function generate(userId, characterId, body) {
  await assertCharacterOwned(characterId, userId);
  const opts = generateImagesRequestSchema.parse(body || {});
  const result = await generateForCharacter(characterId, opts);
  return {
    job: {
      id: result.job.id,
      status: result.job.status,
      candidateCount: result.candidates.length,
    },
    master: result.master
      ? { id: result.master.id, url: result.master.image_url, variation: result.master.variation_label }
      : null,
    candidates: result.candidates.map((c) => ({
      id: c.id,
      url: c.image_url,
      variation: c.variation_label,
      status: c.status,
    })),
  };
}

/** GET /api/characters/:characterId/images */
async function listByCharacter(userId, characterId, { status } = {}) {
  await assertCharacterOwned(characterId, userId);
  return imageAssetRepo.findByCharacterId(characterId, { status });
}

/** GET /api/images/:id — 이미지 상세(소유 검증) */
async function getById(userId, id) {
  const image = await imageAssetRepo.findById(id);
  if (!image) throw httpError(404, 'Image not found');
  await assertCharacterOwned(image.character_id, userId);
  return image;
}

/** PUT /api/characters/:characterId/images/:imageId/master — 대표 이미지 수동 지정 */
async function setMaster(userId, characterId, imageId) {
  await assertCharacterOwned(characterId, userId);
  return setMasterImage(characterId, imageId);
}

/** GET /api/characters/:characterId/images/jobs — 생성 Job 이력 */
async function listJobs(userId, characterId) {
  await assertCharacterOwned(characterId, userId);
  return jobRepo.findByCharacterId(characterId);
}

module.exports = { generate, listByCharacter, getById, setMaster, listJobs };
