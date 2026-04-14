const { generateForCharacter, setMasterImage } = require('./imageGeneration.service');
const { generateImagesRequestSchema } = require('./image.validator');
const imageAssetRepo = require('./imageAsset.repository');
const jobRepo = require('./generationJob.repository');

/**
 * POST /api/characters/:characterId/images/generate
 * 캐릭터 이미지 후보를 생성한다.
 */
async function generate(req, res, next) {
  try {
    const { characterId } = req.params;
    const opts = generateImagesRequestSchema.parse(req.body || {});

    const result = await generateForCharacter(characterId, opts);

    res.status(201).json({
      success: true,
      data: {
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
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/characters/:characterId/images
 * 캐릭터의 이미지 목록을 조회한다.
 */
async function listByCharacter(req, res, next) {
  try {
    const { characterId } = req.params;
    const { status } = req.query;
    const images = await imageAssetRepo.findByCharacterId(characterId, { status });

    res.json({
      success: true,
      data: images,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/images/:id
 * 이미지 상세 조회
 */
async function getById(req, res, next) {
  try {
    const image = await imageAssetRepo.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    res.json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/characters/:characterId/images/:imageId/master
 * 수동으로 대표 이미지를 지정한다.
 */
async function setMaster(req, res, next) {
  try {
    const { characterId, imageId } = req.params;
    const image = await setMasterImage(characterId, imageId);

    res.json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/characters/:characterId/images/jobs
 * 해당 캐릭터의 이미지 생성 Job 이력을 조회한다.
 */
async function listJobs(req, res, next) {
  try {
    const jobs = await jobRepo.findByCharacterId(req.params.characterId);
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, listByCharacter, getById, setMaster, listJobs };
