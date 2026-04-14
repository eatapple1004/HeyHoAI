const contentService = require('./content.service');
const publishJobService = require('./publishJob.service');
const {
  createContentRequestSchema,
  updateContentRequestSchema,
  scheduleContentRequestSchema,
} = require('./content.validator');

// ─── Content Endpoints ───

/** POST /api/contents */
async function createContent(req, res, next) {
  try {
    const input = createContentRequestSchema.parse(req.body);
    const content = await contentService.createContent(input);
    res.status(201).json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

/** GET /api/characters/:characterId/contents */
async function listContents(req, res, next) {
  try {
    const { characterId } = req.params;
    const { status, limit, offset } = req.query;
    const result = await contentService.listContents(characterId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/contents/:id */
async function getContent(req, res, next) {
  try {
    const content = await contentService.getContent(req.params.id);
    res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/contents/:id */
async function updateContent(req, res, next) {
  try {
    const fields = updateContentRequestSchema.parse(req.body);
    const content = await contentService.updateContent(req.params.id, fields);
    res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

/** POST /api/contents/:id/regenerate-caption */
async function regenerateCaption(req, res, next) {
  try {
    const content = await contentService.regenerateCaption(req.params.id);
    res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

/** POST /api/contents/:id/approve */
async function approveContent(req, res, next) {
  try {
    const content = await contentService.approveContent(req.params.id);
    res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

/** POST /api/contents/:id/reject */
async function rejectContent(req, res, next) {
  try {
    const content = await contentService.rejectContent(req.params.id);
    res.json({ success: true, data: content });
  } catch (err) {
    next(err);
  }
}

// ─── Publish Job Endpoints ───

/** POST /api/contents/:id/schedule */
async function schedulePublish(req, res, next) {
  try {
    const opts = req.body.scheduledAt
      ? scheduleContentRequestSchema.parse(req.body)
      : {};
    const result = await publishJobService.schedulePublish(req.params.id, opts);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/contents/:id/publish-now */
async function publishNow(req, res, next) {
  try {
    // approve → schedule → execute 를 한 번에
    const content = await contentService.getContent(req.params.id);

    if (content.status === 'draft') {
      await contentService.approveContent(req.params.id);
    }

    const { publishJob } = await publishJobService.schedulePublish(req.params.id);
    const result = await publishJobService.executePublish(publishJob.id);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/publish-jobs/:id/retry */
async function retryPublish(req, res, next) {
  try {
    const result = await publishJobService.retryPublish(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/publish-jobs/:id/cancel */
async function cancelPublish(req, res, next) {
  try {
    const result = await publishJobService.cancelPublish(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/characters/:characterId/publish-jobs */
async function listPublishJobs(req, res, next) {
  try {
    const { characterId } = req.params;
    const { status } = req.query;
    const jobs = await publishJobService.listPublishJobs(characterId, { status });
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createContent,
  listContents,
  getContent,
  updateContent,
  regenerateCaption,
  approveContent,
  rejectContent,
  schedulePublish,
  publishNow,
  retryPublish,
  cancelPublish,
  listPublishJobs,
};
