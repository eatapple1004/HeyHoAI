const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createCharacter, getCharacter, listCharacters } = require('./character.service');
const { createCharacterRequestSchema } = require('./character.validator');
const { assertCharacterOwned } = require('../middleware/ownership');
const characterRepo = require('./character.repository');
const imageAssetRepo = require('../images/imageAsset.repository');
const mediaStore = require('../storage/mediaStore'); // 레퍼런스 이미지 R2 영속화(cleanup cron 삭제 대비)
const { makeRefThumb } = require('./refThumb.service'); // 목록 그리드용 썸네일(원본 비파괴)

// 캐릭터 요청 처리(ops) 단일소스 — 레거시 컨트롤러(character.controller.js)와 Nest(nest/characters)가 함께 쓴다.
//   순수 도메인 로직은 character.service.js / character.repository.js에 그대로 있고,
//   여기는 "요청 → 도메인 호출 → 응답 데이터" 사이의 오케스트레이션만 담는다.

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/** 활성 작업 컨텍스트의 팀 id (개인이면 null) */
async function activeTeamId(userId) {
  const ctx = await require('../teams/team.credit').resolveContext(userId);
  return ctx.type === 'team' ? ctx.teamId : null;
}

// 레퍼런스 이미지 업로드(multer) 설정 — 레거시 라우트/Nest FileInterceptor 공용.
const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
function refUploadOptions(multer) {
  return {
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `ref_${crypto.randomUUID()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  };
}

// 간단 등록(register/register-with-image)이 쓰는 기본 persona.
function defaultPersona(name, concept) {
  return {
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
}

/** POST /api/characters — Claude 기반 캐릭터 생성(201) */
async function create(userId, body) {
  const input = createCharacterRequestSchema.parse(body);
  return createCharacter(input, userId, await activeTeamId(userId));
}

/** GET /api/characters/:id */
function getById(userId, id) {
  return getCharacter(id, userId);
}

/** GET /api/characters — 목록 + pagination(응답 최상위 필드) */
async function list(userId, { status, limit, offset } = {}) {
  const teamId = await activeTeamId(userId);
  const result = await listCharacters({
    userId: teamId ? undefined : userId,
    teamId,
    status,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  return {
    data: result.rows,
    pagination: {
      total: result.total,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    },
  };
}

/** PUT /api/characters/:id/reference-image — 대표 이미지 지정 */
async function setReferenceImage(userId, id, imageId) {
  await assertCharacterOwned(id, userId);
  const image = await imageAssetRepo.findById(imageId);
  if (!image || image.character_id !== id) {
    throw httpError(404, 'Image not found for this character');
  }
  const character = await characterRepo.setReferenceImage(id, imageId, image.image_url);
  makeRefThumb(image.image_url); // 목록 썸네일(비동기 best-effort)
  return character;
}

/** DELETE /api/characters/:id/reference-image — 대표 이미지 해제 */
async function clearReferenceImage(userId, id) {
  await assertCharacterOwned(id, userId);
  return characterRepo.clearReferenceImage(id);
}

/**
 * POST /api/characters/register — 간단 등록(이름 + 컨셉 + 업로드 대표 이미지, 201)
 * @param {{filename:string, path:string}} [file] multer가 저장한 파일
 */
async function register(userId, body = {}, file) {
  const { name, concept } = body;
  if (!name || !concept) throw httpError(400, 'Name and concept are required');

  const saved = await characterRepo.insert({
    userId, name, concept, persona: defaultPersona(name, concept), teamId: await activeTeamId(userId),
  });

  // 대표 이미지 설정 — /images/ 웹 경로로 저장 (file:// 절대경로는 브라우저 로드 불가)
  if (file) {
    const refUrl = `/images/${file.filename}`;
    await characterRepo.setReferenceImage(saved.id, null, refUrl);
    saved.reference_image_url = refUrl;
    try { await mediaStore.putFile(file.path); } catch (e) {} // R2 영속화(cleanup cron이 tmp/images 삭제해도 생성 시 R2 폴백으로 복원)
    makeRefThumb(refUrl); // 목록 썸네일(비동기 best-effort — 실패해도 원본 폴백)
  }
  return saved;
}

/** POST /api/characters/register-with-image — 생성된 이미지 파일명으로 등록(201) */
async function registerWithImage(userId, body = {}) {
  const { name, concept, imageFilename } = body;
  if (!name || !concept || !imageFilename) {
    throw httpError(400, 'Name, concept, and imageFilename are required');
  }
  const saved = await characterRepo.insert({
    userId, name, concept, persona: defaultPersona(name, concept), teamId: await activeTeamId(userId),
  });

  // 선택한 이미지를 대표 이미지로 설정
  const imageUrl = `/images/${imageFilename}`;
  await characterRepo.setReferenceImage(saved.id, null, imageUrl);
  saved.reference_image_url = imageUrl;
  try {
    const lp = path.join(process.cwd(), 'tmp', 'images', imageFilename);
    if (fs.existsSync(lp)) await mediaStore.putFile(lp);
  } catch (e) {} // R2 영속화(생성물이 R2에 없을 경우 대비)
  makeRefThumb(imageUrl); // 목록 썸네일(비동기 best-effort)
  return saved;
}

/** DELETE /api/characters/:id — 소프트 삭제(status → archived) */
async function remove(userId, id) {
  await assertCharacterOwned(id, userId);
  const character = await characterRepo.updateStatus(id, 'archived');
  if (!character) throw httpError(404, 'Character not found');
  return character;
}

module.exports = {
  activeTeamId,
  refUploadOptions,
  create,
  getById,
  list,
  setReferenceImage,
  clearReferenceImage,
  register,
  registerWithImage,
  remove,
};
