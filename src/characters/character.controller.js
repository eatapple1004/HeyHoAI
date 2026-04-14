const { createCharacter, getCharacter, listCharacters } = require('./character.service');
const { createCharacterRequestSchema } = require('./character.validator');

/**
 * POST /api/characters
 */
async function create(req, res, next) {
  try {
    const input = createCharacterRequestSchema.parse(req.body);
    const character = await createCharacter(input);

    res.status(201).json({
      success: true,
      data: character,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/characters/:id
 */
async function getById(req, res, next) {
  try {
    const character = await getCharacter(req.params.id);

    res.json({
      success: true,
      data: character,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/characters
 */
async function list(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const result = await listCharacters({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/characters/:id/reference-image
 * 캐릭터 대표 이미지 지정
 */
async function setReferenceImage(req, res, next) {
  try {
    const { id } = req.params;
    const { imageId } = req.body;

    const characterRepo = require('./character.repository');
    const imageAssetRepo = require('../images/imageAsset.repository');

    const image = await imageAssetRepo.findById(imageId);
    if (!image || image.character_id !== id) {
      return res.status(404).json({ success: false, error: 'Image not found for this character' });
    }

    const character = await characterRepo.setReferenceImage(id, imageId, image.image_url);
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/characters/:id/reference-image
 * 캐릭터 대표 이미지 해제
 */
async function clearReferenceImage(req, res, next) {
  try {
    const characterRepo = require('./character.repository');
    const character = await characterRepo.clearReferenceImage(req.params.id);
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getById, list, setReferenceImage, clearReferenceImage };
