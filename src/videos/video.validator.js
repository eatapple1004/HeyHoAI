const { z } = require('zod');

const generateVideoRequestSchema = z.object({
  provider: z.enum(['runway', 'kling', 'minimax']).default('runway'),
  videoStyle: z.enum(['slow_motion', 'natural', 'dynamic', 'cinematic', 'loop']).default('natural'),
  prompt: z.string().max(500).optional(),
  durationSec: z.number().int().min(3).max(10).optional(), // provider 지원 범위 내에서
  sourceImageId: z.string().uuid().optional(),              // 지정 안 하면 master image 사용
});

// ─── Motion Prompt 안전성 검증 ───

const MOTION_BLOCKED_TERMS = [
  'undress', 'strip', 'remove clothes', 'take off',
  'nude', 'naked', 'nsfw', 'sexual', 'erotic', 'fetish',
  'seduc', 'provocat', 'twerk', 'grinding', 'intimate',
  'lingerie', 'underwear', 'bikini remov',
  'child', 'minor', 'teen', 'school',
  'violen', 'fight', 'weapon', 'blood', 'kill',
];

/**
 * motion prompt에 금지 패턴이 포함되어 있는지 검증한다.
 * @param {string} prompt
 * @returns {{ safe: boolean; violations: string[] }}
 */
function validateMotionPromptSafety(prompt) {
  const violations = [];
  const lower = prompt.toLowerCase();

  for (const term of MOTION_BLOCKED_TERMS) {
    if (lower.includes(term)) {
      violations.push(`Motion prompt contains blocked term: "${term}"`);
    }
  }

  return { safe: violations.length === 0, violations };
}

module.exports = {
  generateVideoRequestSchema,
  validateMotionPromptSafety,
};
