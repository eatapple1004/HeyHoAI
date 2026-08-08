const { generateForCharacter, listVideos, getVideo } = require('./videoGeneration.service');
const { generateVideoRequestSchema } = require('./video.validator');
const videoJobRepo = require('./videoGenerationJob.repository');
const { assertCharacterOwned } = require('../middleware/ownership');

// 영상 요청 처리(ops) 단일소스 — 레거시 컨트롤러(video.controller.js)와 Nest(nest/media)가 함께 쓴다.

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/** POST /api/characters/:characterId/videos/generate (201) */
async function generate(userId, characterId, body) {
  await assertCharacterOwned(characterId, userId);
  const opts = generateVideoRequestSchema.parse(body || {});
  const result = await generateForCharacter(characterId, opts);
  return {
    job: {
      id: result.job.id,
      status: result.job.status,
      provider: result.job.provider,
      attempt: result.job.attempt,
    },
    video: {
      id: result.video.id,
      videoUrl: result.video.video_url,
      durationMs: result.video.duration_ms,
      videoStyle: result.video.video_style,
      sourceImageId: result.video.source_image_id,
      status: result.video.status,
    },
  };
}

/** GET /api/characters/:characterId/videos */
async function listByCharacter(userId, characterId, { status } = {}) {
  await assertCharacterOwned(characterId, userId);
  return listVideos(characterId, { status });
}

/** GET /api/videos/:id */
async function getById(userId, id) {
  const video = await getVideo(id);
  await assertCharacterOwned(video.character_id, userId);
  return video;
}

/** GET /api/characters/:characterId/videos/jobs */
async function listJobs(userId, characterId) {
  await assertCharacterOwned(characterId, userId);
  return videoJobRepo.findByCharacterId(characterId);
}

/** GET /api/videos/jobs/:jobId */
async function getJob(userId, jobId) {
  const job = await videoJobRepo.findById(jobId);
  if (!job) throw httpError(404, 'Job not found');
  await assertCharacterOwned(job.character_id, userId);
  return job;
}

module.exports = { generate, listByCharacter, getById, listJobs, getJob };
