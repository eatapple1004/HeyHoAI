const { z } = require('zod');

// ─── 요청 검증 스키마 ───

const createCharacterRequestSchema = z.object({
  concept: z.string().min(5).max(200),
  tone: z.string().min(2).max(100),
  topics: z.array(z.string().min(1)).min(1).max(10),
});

// ─── Claude 응답 검증 스키마 ───

const visualDescriptionSchema = z.object({
  bodyType: z.string(),
  hairStyle: z.string(),
  hairColor: z.string(),
  eyeColor: z.string(),
  skinTone: z.string(),
  distinctiveFeatures: z.string(),
  defaultOutfit: z.string(),
});

const instagramProfileSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_.]+$/),
  bio: z.string().max(150),
  postingStyle: z.string(),
  contentPillars: z.array(z.string()).min(1),
  hashtagGroups: z.array(z.string()).min(1),
});

const voiceGuidelinesSchema = z.object({
  tone: z.string(),
  vocabulary: z.string(),
  emojiStyle: z.string(),
  captionLength: z.string(),
});

const brandSafetySchema = z.object({
  approvedThemes: z.array(z.string()).min(1),
  bannedTopics: z.array(z.string()).min(1),
  targetAudience: z.string(),
});

const characterProfileSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(23).max(45),
  gender: z.string(),
  nationality: z.string(),
  occupation: z.string(),
  personality: z.array(z.string()).min(3).max(5),
  backstory: z.string().min(10),
  visualDescription: visualDescriptionSchema,
  instagramProfile: instagramProfileSchema,
  voiceGuidelines: voiceGuidelinesSchema,
  brandSafety: brandSafetySchema,
});

// ─── 안전성 검증 ───

const BLOCKED_TERMS = [
  'child', 'minor', 'underage', 'teen', 'loli', 'juvenile',
  'school uniform', 'student', 'young-looking', 'childlike', 'baby-faced',
  'nude', 'naked', 'nsfw', 'explicit', 'sexual', 'fetish',
  'lingerie', 'underwear', 'provocative', 'seductive',
];

/**
 * Claude가 생성한 캐릭터 프로필의 안전성을 검증한다.
 * @param {object} profile
 * @returns {{ valid: boolean; violations: string[] }}
 */
function validateSafety(profile) {
  const violations = [];
  const text = JSON.stringify(profile).toLowerCase();

  for (const term of BLOCKED_TERMS) {
    if (text.includes(term)) {
      violations.push(`Blocked term detected: "${term}"`);
    }
  }

  if (profile.age < 23) {
    violations.push(`Age ${profile.age} is below minimum (23)`);
  }

  return { valid: violations.length === 0, violations };
}

module.exports = {
  createCharacterRequestSchema,
  characterProfileSchema,
  validateSafety,
};
