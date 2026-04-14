const { generateCharacter } = require('./providers/claudeCharacter.provider');
const { characterProfileSchema, validateSafety } = require('./character.validator');
const characterRepo = require('./character.repository');

const MAX_RETRIES = 2;

/**
 * 캐릭터를 생성한다.
 *
 * 1. Claude API 호출 → 캐릭터 프로필 JSON 수신
 * 2. 스키마 검증 (zod)
 * 3. 안전성 검증 (blocked terms, age gate)
 * 4. 검증 통과 시 DB 저장
 * 5. 실패 시 최대 MAX_RETRIES 재시도
 *
 * @param {{ concept: string; tone: string; topics: string[] }} input
 * @returns {Promise<object>} 저장된 캐릭터 row
 */
async function createCharacter(input) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1) Claude로 캐릭터 생성
      const raw = await generateCharacter(input);

      // 2) 스키마 검증
      const profile = characterProfileSchema.parse(raw);

      // 3) 안전성 검증
      const safety = validateSafety(profile);
      if (!safety.valid) {
        throw new SafetyViolationError(safety.violations);
      }

      // 4) DB 저장
      const saved = await characterRepo.insert({
        name: profile.name,
        concept: input.concept,
        persona: profile,
      });

      return { ...saved, persona: profile };
    } catch (err) {
      lastError = err;

      // 안전성 위반은 재시도해도 같은 결과일 가능성 높지만, 프롬프트 기반이라 재시도 허용
      if (err instanceof SafetyViolationError && attempt < MAX_RETRIES) {
        console.warn(`[CharacterService] Safety violation on attempt ${attempt + 1}, retrying...`, err.violations);
        continue;
      }

      // 스키마 에러도 재시도
      if (err.name === 'ZodError' && attempt < MAX_RETRIES) {
        console.warn(`[CharacterService] Schema validation failed on attempt ${attempt + 1}, retrying...`);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

/**
 * ID로 캐릭터 조회
 * @param {string} id
 */
async function getCharacter(id) {
  const character = await characterRepo.findById(id);
  if (!character) {
    throw new NotFoundError(`Character ${id} not found`);
  }
  return character;
}

/**
 * 캐릭터 목록 조회
 * @param {{ status?: string; limit?: number; offset?: number }} opts
 */
async function listCharacters(opts) {
  return characterRepo.findAll(opts);
}

// ─── Custom Errors ───

class SafetyViolationError extends Error {
  constructor(violations) {
    super(`Safety violations: ${violations.join('; ')}`);
    this.name = 'SafetyViolationError';
    this.violations = violations;
    this.statusCode = 422;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

module.exports = { createCharacter, getCharacter, listCharacters, SafetyViolationError, NotFoundError };
