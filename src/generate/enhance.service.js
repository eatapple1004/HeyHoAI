const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Enhance 결과에 섞이면 안 되는 항목 — 유저가 검토 후 생성하므로 라이트 체크만.
const BLOCKED_TERMS = [
  'nude', 'naked', 'nsfw', 'sexual', 'explicit', 'fetish', 'erotic',
  'underage', 'minor', 'child', 'teen', 'loli', 'gore',
];

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

  const lower = text.toLowerCase();
  if (BLOCKED_TERMS.some((t) => lower.includes(t))) {
    throw Object.assign(new Error('Enhanced prompt was blocked by safety policy. Try rephrasing.'), { statusCode: 422 });
  }

  if (!text) {
    throw new Error('Claude returned an empty prompt');
  }

  return { prompt: text };
}

module.exports = { enhancePrompt };
