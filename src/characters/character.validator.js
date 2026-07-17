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

// ⛔ 프로필 금지어 워드리스트 제거 (2026-07-17 사용자 결정) — 근거는 ugcScript.service.js의 같은 주석 참조.
//   부분문자열이라 멀쩡한 페르소나를 막았다: 'student'→"graduate student" · 'teen'→"teenager"·"sixteen" ·
//   'minor'→"minority" · 'nude'→"nude tone". 실제 게이트는 이미지 생성 레벨이다(Gemini 자체 정책).
// ✅ 나이 하한(23)은 **남긴다** — 워드리스트가 아니라 **구조화된 필드 판정**이라 오탐이 원천적으로 없고,
//    가상 인물을 만드는 기능의 유일한 실질 통제다. 위 제거의 근거(오탐·중복)가 여기엔 닿지 않는다.

/**
 * Claude가 생성한 캐릭터 프로필의 안전성을 검증한다 — 나이 하한.
 * @param {object} profile
 * @returns {{ valid: boolean; violations: string[] }}
 */
function validateSafety(profile) {
  const violations = [];

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
