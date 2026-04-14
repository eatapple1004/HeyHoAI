const { z } = require('zod');

// ─── API 요청 스키마 ───

const generateImagesRequestSchema = z.object({
  provider: z.enum(['replicate', 'fal', 'nano-banana']).default('nano-banana'),
  count: z.number().int().min(1).max(8).default(4),
  width: z.number().int().min(512).max(2048).default(1080),
  height: z.number().int().min(512).max(2048).default(1350), // IG portrait 4:5
  customScenes: z
    .array(
      z.object({
        scene: z.string().min(5),
        pose: z.string().min(5),
      })
    )
    .optional(),
});

// ─── 프롬프트 안전성 검증 ───

const PROMPT_BLOCKED_TERMS = [
  'child', 'minor', 'underage', 'teen', 'loli', 'juvenile',
  'nude', 'naked', 'nsfw', 'explicit', 'sexual', 'fetish',
  'lingerie', 'underwear', 'see-through',
  'school uniform', 'young-looking', 'childlike',
];

/**
 * 최종 prompt 문자열에 금지어가 포함되어 있는지 검증한다.
 * (imagePrompt.builder가 생성한 결과도 한 번 더 확인)
 *
 * @param {string} prompt
 * @returns {{ safe: boolean; violations: string[] }}
 */
function validatePromptSafety(prompt) {
  const violations = [];
  const lower = prompt.toLowerCase();

  for (const term of PROMPT_BLOCKED_TERMS) {
    // negative prompt 영역은 검사에서 제외하기 위해, positive prompt만 받는다
    if (lower.includes(term)) {
      violations.push(`Prompt contains blocked term: "${term}"`);
    }
  }

  return { safe: violations.length === 0, violations };
}

module.exports = {
  generateImagesRequestSchema,
  validatePromptSafety,
};
