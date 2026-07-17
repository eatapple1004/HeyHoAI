const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ⛔ Enhance 결과 금지어 검사 제거 (2026-07-17 사용자 결정) — 근거는 ugcScript.service.js의 같은 주석 참조.
//   실제 게이트는 이미지 생성 레벨이고(Gemini 자체 정책), 부분문자열이라 'nude'→"rose-nude" ·
//   'child'→"children" · 'teen'→"teenager" 같은 멀쩡한 프롬프트를 "Try rephrasing"으로 되돌렸다.

const SYSTEM = `You expand a short idea into ONE vivid, concrete image-generation prompt.
Rules:
- Output ONLY the prompt text. No preamble, no quotes, no markdown, no explanation.
- 1-3 sentences. Photographic and specific: subject, setting, lighting, composition, lens/mood.
- Keep the user's intent and any named subject/product; do not invent a different scene.
- Never add sexual, explicit, violent, or minor-related content.`;

/**
 * 짧은 유저 프롬프트를 풍부한 이미지 생성 프롬프트로 확장한다.
 * caption.service 패턴 미러: @anthropic-ai/sdk. 결과 이미지 품질 직결이라 opus override(env.CLAUDE_MODEL_ENHANCE).
 *
 * @param {{ prompt: string; mode?: string }} input
 * @returns {Promise<{ prompt: string }>}
 */
async function enhancePrompt({ prompt, mode }) {
  const idea = String(prompt || '').trim().slice(0, 600);
  if (!idea) {
    throw Object.assign(new Error('prompt is required'), { statusCode: 400 });
  }

  const user = mode
    ? `Mode: ${mode}\nIdea: ${idea}`
    : `Idea: ${idea}`;

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL_ENHANCE,
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });

  let text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '') // 감싼 따옴표 제거
    .slice(0, 800);

  if (!text) {
    throw new Error('Claude returned an empty prompt');
  }

  return { prompt: text };
}

module.exports = { enhancePrompt };
