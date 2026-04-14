const { generateForCharacter, listVideos, getVideo } = require('./videoGeneration.service');
const { generateVideoRequestSchema } = require('./video.validator');
const videoJobRepo = require('./videoGenerationJob.repository');

/**
 * POST /api/characters/:characterId/videos/generate
 */
async function generate(req, res, next) {
  try {
    const { characterId } = req.params;
    const opts = generateVideoRequestSchema.parse(req.body || {});

    const result = await generateForCharacter(characterId, opts);

    res.status(201).json({
      success: true,
      data: {
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
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/characters/:characterId/videos
 */
async function listByCharacter(req, res, next) {
  try {
    const { characterId } = req.params;
    const { status } = req.query;
    const videos = await listVideos(characterId, { status });

    res.json({ success: true, data: videos });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/videos/:id
 */
async function getById(req, res, next) {
  try {
    const video = await getVideo(req.params.id);
    res.json({ success: true, data: video });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/characters/:characterId/videos/jobs
 */
async function listJobs(req, res, next) {
  try {
    const jobs = await videoJobRepo.findByCharacterId(req.params.characterId);
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/videos/jobs/:jobId
 */
async function getJob(req, res, next) {
  try {
    const job = await videoJobRepo.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, listByCharacter, getById, listJobs, getJob };
