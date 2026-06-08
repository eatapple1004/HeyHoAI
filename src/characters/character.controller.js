const { createCharacter, getCharacter, listCharacters } = require('./character.service');
const { createCharacterRequestSchema } = require('./character.validator');
const { assertCharacterOwned } = require('../middleware/ownership');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/** 활성 작업 컨텍스트의 팀 id (개인이면 null) */
async function activeTeamId(userId) {
  const ctx = await require('../teams/team.credit').resolveContext(userId);
  return ctx.type === 'team' ? ctx.teamId : null;
}

const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `ref_${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/characters
 */
async function create(req, res, next) {
  try {
    const input = createCharacterRequestSchema.parse(req.body);
    const character = await createCharacter(input, req.user.id, await activeTeamId(req.user.id));

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
    const character = await getCharacter(req.params.id, req.user.id);

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
    const teamId = await activeTeamId(req.user.id);
    const result = await listCharacters({
      userId: teamId ? undefined : req.user.id,
      teamId,
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
    await assertCharacterOwned(id, req.user.id);

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
    await assertCharacterOwned(req.params.id, req.user.id);
    const characterRepo = require('./character.repository');
    const character = await characterRepo.clearReferenceImage(req.params.id);
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/characters/register
 * 간단 캐릭터 등록 (이름 + 컨셉 + 대표 이미지)
 */
const registerUpload = upload.single('referenceImage');

async function register(req, res, next) {
  registerUpload(req, res, async (err) => {
    if (err) return next(err);
    try {
      const { name, concept } = req.body;
      if (!name || !concept) {
        return res.status(400).json({ success: false, error: 'Name and concept are required' });
      }

      const characterRepo = require('./character.repository');

      // 기본 persona 생성
      const persona = {
        name,
        age: 25,
        gender: 'Female',
        nationality: 'Korean',
        occupation: 'Content Creator',
        personality: ['natural', 'casual', 'friendly'],
        backstory: concept,
        visualDescription: {
          bodyType: 'slim',
          hairStyle: 'long',
          hairColor: 'dark',
          eyeColor: 'dark brown',
          skinTone: 'fair',
          distinctiveFeatures: '',
          defaultOutfit: 'casual everyday style',
        },
        instagramProfile: { username: name.toLowerCase().replace(/\s+/g, '_'), bio: concept },
        voiceGuidelines: { tone: 'casual', vocabulary: 'simple', emojiStyle: 'minimal', captionLength: 'short' },
        brandSafety: { approvedThemes: ['lifestyle'], bannedTopics: ['politics'], targetAudience: '18-35' },
      };

      const saved = await characterRepo.insert({ userId: req.user.id, name, concept, persona, teamId: await activeTeamId(req.user.id) });

      // 대표 이미지 설정
      if (req.file) {
        const refUrl = `file://${req.file.path}`;
        await characterRepo.setReferenceImage(saved.id, null, refUrl);
        saved.reference_image_url = refUrl;
      }

      res.status(201).json({ success: true, data: saved });
    } catch (e) {
      next(e);
    }
  });
}

/**
 * DELETE /api/characters/:id
 * 캐릭터 삭제 (소프트 삭제 - status → archived)
 */
async function deleteCharacter(req, res, next) {
  try {
    await assertCharacterOwned(req.params.id, req.user.id);
    const characterRepo = require('./character.repository');
    const character = await characterRepo.updateStatus(req.params.id, 'archived');
    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }
    res.json({ success: true, data: character });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/characters/register-with-image
 * 생성된 이미지 파일명으로 캐릭터 등록
 */
async function registerWithImage(req, res, next) {
  try {
    const { name, concept, imageFilename } = req.body;
    if (!name || !concept || !imageFilename) {
      return res.status(400).json({ success: false, error: 'Name, concept, and imageFilename are required' });
    }

    const characterRepo = require('./character.repository');

    const persona = {
      name,
      age: 25,
      gender: 'Female',
      nationality: 'Korean',
      occupation: 'Content Creator',
      personality: ['natural', 'casual', 'friendly'],
      backstory: concept,
      visualDescription: {
        bodyType: 'slim',
        hairStyle: 'long',
        hairColor: 'dark',
        eyeColor: 'dark brown',
        skinTone: 'fair',
        distinctiveFeatures: '',
        defaultOutfit: 'casual everyday style',
      },
      instagramProfile: { username: name.toLowerCase().replace(/\s+/g, '_'), bio: concept },
      voiceGuidelines: { tone: 'casual', vocabulary: 'simple', emojiStyle: 'minimal', captionLength: 'short' },
      brandSafety: { approvedThemes: ['lifestyle'], bannedTopics: ['politics'], targetAudience: '18-35' },
    };

    const saved = await characterRepo.insert({ userId: req.user.id, name, concept, persona, teamId: await activeTeamId(req.user.id) });

    // 선택한 이미지를 대표 이미지로 설정
    const imageUrl = `/images/${imageFilename}`;
    await characterRepo.setReferenceImage(saved.id, null, imageUrl);
    saved.reference_image_url = imageUrl;

    res.status(201).json({ success: true, data: saved });
  } catch (e) {
    next(e);
  }
}

module.exports = { create, getById, list, setReferenceImage, clearReferenceImage, register, registerWithImage, deleteCharacter };
