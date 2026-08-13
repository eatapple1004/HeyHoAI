const contentService = require('./content.service');
const publishJobService = require('./publishJob.service');
const {
  createContentRequestSchema,
  updateContentRequestSchema,
  scheduleContentRequestSchema,
} = require('./content.validator');
const {
  assertCharacterOwned,
  assertContentOwned,
  assertPublishJobOwned,
} = require('../middleware/ownership');

// 콘텐츠·발행 요청 처리(ops) 단일소스 — 레거시 컨트롤러(publishing.controller.js)와 Nest(nest/publishing) 공용.
//   도메인 로직은 content.service / publishJob.service 그대로.

// ─── Content ───

/** POST /api/contents (201) */
async function createContent(userId, body) {
  const input = createContentRequestSchema.parse(body);
  await assertCharacterOwned(input.characterId, userId);
  return contentService.createContent(input);
}

/** GET /api/characters/:characterId/contents — { data, total }(응답 pagination) */
async function listContents(userId, characterId, { status, limit, offset } = {}) {
  await assertCharacterOwned(characterId, userId);
  const result = await contentService.listContents(characterId, {
    status,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  return { data: result.rows, total: result.total };
}

/** GET /api/contents/:id */
async function getContent(userId, id) {
  await assertContentOwned(id, userId);
  return contentService.getContent(id);
}

/** PATCH /api/contents/:id */
async function updateContent(userId, id, body) {
  await assertContentOwned(id, userId);
  const fields = updateContentRequestSchema.parse(body);
  return contentService.updateContent(id, fields);
}

/** POST /api/contents/:id/regenerate-caption */
async function regenerateCaption(userId, id) {
  await assertContentOwned(id, userId);
  return contentService.regenerateCaption(id);
}

/** POST /api/contents/:id/approve */
async function approveContent(userId, id) {
  await assertContentOwned(id, userId);
  return contentService.approveContent(id);
}

/** POST /api/contents/:id/reject */
async function rejectContent(userId, id) {
  await assertContentOwned(id, userId);
  return contentService.rejectContent(id);
}

// ─── Publish Job ───

/** POST /api/contents/:id/schedule (201) */
async function schedulePublish(userId, id, body = {}) {
  await assertContentOwned(id, userId);
  const opts = body.scheduledAt ? scheduleContentRequestSchema.parse(body) : {};
  return publishJobService.schedulePublish(id, opts);
}

/** POST /api/contents/:id/publish-now — approve → schedule → execute 를 한 번에 */
async function publishNow(userId, id) {
  await assertContentOwned(id, userId);
  const content = await contentService.getContent(id);
  if (content.status === 'draft') {
    await contentService.approveContent(id);
  }
  const { publishJob } = await publishJobService.schedulePublish(id);
  return publishJobService.executePublish(publishJob.id);
}

/** POST /api/publish-jobs/:id/retry */
async function retryPublish(userId, id) {
  await assertPublishJobOwned(id, userId);
  return publishJobService.retryPublish(id);
}

/** POST /api/publish-jobs/:id/cancel */
async function cancelPublish(userId, id) {
  await assertPublishJobOwned(id, userId);
  return publishJobService.cancelPublish(id);
}

/** GET /api/characters/:characterId/publish-jobs */
async function listPublishJobs(userId, characterId, { status } = {}) {
  await assertCharacterOwned(characterId, userId);
  return publishJobService.listPublishJobs(characterId, { status });
}

module.exports = {
  createContent, listContents, getContent, updateContent, regenerateCaption,
  approveContent, rejectContent, schedulePublish, publishNow, retryPublish,
  cancelPublish, listPublishJobs,
};
