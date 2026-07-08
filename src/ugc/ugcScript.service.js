/**
 * ugcScript.service.js — UGC 광고 대본 생성 서비스 (Claude)
 * ============================================================================
 * caption.service.js 와 동일한 Anthropic 패턴. buildUgcScriptPrompt → messages.create → JSON 파싱.
 * 반환: 씬 단위(spoken/broll) 구조화 대본. broll 씬의 brollPrompt는 Doppia 제품 렌더용.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');
const { buildUgcScriptPrompt } = require('./prompts/ugcScript.builder');
const { DEFAULT_OUTPUT_TYPE } = require('./profiles');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// structured outputs 스키마(유효 JSON 보장). additionalProperties:false·전 필드 required(strict 규약).
//   min/maxLength·min/max·recursion 불가 → 미사용. spoken 씬도 brollPrompt 포함(""), normalizeScenes가 정리.
const SCRIPT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string' }, format: { type: 'string' },
    durationSec: { type: 'number' }, aspect: { type: 'string' }, language: { type: 'string' },
    hook: { type: 'string' },
    scenes: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          n: { type: 'integer' }, type: { type: 'string', enum: ['spoken', 'broll'] },
          durationSec: { type: 'number' }, spoken: { type: 'string' },
          onScreenText: { type: 'string' }, direction: { type: 'string' }, brollPrompt: { type: 'string' },
        },
        required: ['n', 'type', 'durationSec', 'spoken', 'onScreenText', 'direction', 'brollPrompt'],
      },
    },
    cta: { type: 'string' }, caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } }, musicVibe: { type: 'string' },
  },
  required: ['title', 'format', 'durationSec', 'aspect', 'language', 'hook', 'scenes', 'cta', 'caption', 'hashtags', 'musicVibe'],
};

const BLOCKED_TERMS = [
  'nude', 'naked', 'nsfw', 'sexual', 'fetish', 'erotic',
  'underage', 'minor', 'child', 'teen',
  'guaranteed cure', 'cures cancer', 'lose 10kg', 'get rich quick',
];

/** 생성 대본의 안전성 검증(대사·자막·CTA·캡션 전체 스캔). */
function validateScriptSafety(script) {
  const violations = [];
  const blob = [
    script.hook, script.cta, script.caption,
    ...(script.scenes || []).flatMap((s) => [s.spoken, s.onScreenText]),
  ].filter(Boolean).join(' \n ').toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (blob.includes(term)) violations.push(`Blocked term: "${term}"`);
  }
  return { safe: violations.length === 0, violations };
}

/** 씬 배열 정규화(번호·타입·broll 프롬프트 보장). */
function normalizeScenes(scenes) {
  return (Array.isArray(scenes) ? scenes : []).map((s, i) => ({
    n: typeof s.n === 'number' ? s.n : i + 1,
    type: s.type === 'broll' ? 'broll' : 'spoken',
    durationSec: Number(s.durationSec) || 3,
    spoken: s.spoken || '',
    onScreenText: s.onScreenText || '',
    direction: s.direction || '',
    ...(s.type === 'broll' ? { brollPrompt: s.brollPrompt || s.direction || '' } : {}),
  }));
}

/**
 * @param {object} input  buildUgcScriptPrompt 입력({product, concept, format, ...})
 * @returns {Promise<object>} 구조화 UGC 대본
 */
async function generateUgcScript(input) {
  if (!input || !input.concept) {
    throw Object.assign(new Error('concept is required'), { statusCode: 400 });
  }
  const { system, user } = buildUgcScriptPrompt({ ...input, hasImage: !!(input.image && input.image.data) });

  // 제품 사진이 있으면 비전 블록으로 첨부 → Claude가 실제 제품(색·형태·패키지)에 근거해 카피·brollPrompt 작성.
  const content = (input.image && input.image.data)
    ? [
        { type: 'image', source: { type: 'base64', media_type: input.image.mediaType || 'image/png', data: input.image.data } },
        { type: 'text', text: user },
      ]
    : user;

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: SCRIPT_SCHEMA } }, // 유효 JSON 보장
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // output_config로 순수 JSON이 오지만, 혹시 펜스/여백 있어도 견고하게 추출.
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for the UGC script');
  const raw = JSON.parse(jsonMatch[1]);

  const script = {
    outputType: input.outputType || DEFAULT_OUTPUT_TYPE, // downstream 파이프라인이 프로파일 라우팅에 사용
    title: raw.title || '',
    format: raw.format || input.format || 'hook-cta',
    durationSec: Number(raw.durationSec) || input.durationSec || 20,
    aspect: raw.aspect || '9:16',
    language: raw.language || input.language || 'ko',
    hook: raw.hook || '',
    scenes: normalizeScenes(raw.scenes),
    cta: raw.cta || '',
    caption: raw.caption || '',
    hashtags: (Array.isArray(raw.hashtags) ? raw.hashtags : [])
      .map((t) => String(t).replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean).slice(0, 12),
    musicVibe: raw.musicVibe || '',
  };

  const safety = validateScriptSafety(script);
  if (!safety.safe) {
    throw Object.assign(new Error(`Unsafe script: ${safety.violations.join('; ')}`), { statusCode: 422 });
  }
  return script;
}

/**
 * 제품 사진 → 한 줄 컨셉/앵글 제안(비전). 컨셉 쓰기 귀찮은 유저용(선택).
 * @param {{ image:{data:string,mediaType?:string}, details?:string, language?:string }} input
 * @returns {Promise<string>} 컨셉 한 줄
 */
async function suggestConcept({ image, details = '', language = 'ko', outputType = 'product-ad' } = {}) {
  if (!image || !image.data) throw Object.assign(new Error('product image is required'), { statusCode: 400 });
  const langName = language === 'en' ? 'English' : 'Korean';
  const noModel = outputType !== 'model-editorial'; // product-ad 등 = 무출연(제품컷만)
  const system = [
    'You are a short-form ad strategist. Look at the product photo, infer the product CATEGORY, and draft the user\'s CREATIVE BRIEF for a TikTok / Instagram Reels ad — phrased as their own request.',
    'Adapt the angle to the category you see:',
    '- Cosmetics/beauty → shade, finish, texture, before→after result.',
    '- Jewelry/accessories → emotion, craftsmanship, how it catches the light, gifting/occasion, timelessness.',
    '- Apparel → styling, fit, fabric feel, versatility (one piece, many looks).',
    '- Food/beverage → appetite, sensory detail, freshness, the moment.',
    '- Tech/gadgets/home → the key benefit or the problem it solves.',
    'Capture a STRATEGIC PROMISE (why stop scrolling / the payoff) + a vibe or target if it fits — NOT a specific shot or camera move (the script decides staging).',
    noModel
      ? 'This ad shows the PRODUCT ONLY — no model or person. Do not suggest angles that require someone to wear, apply, or hold it on camera.'
      : 'This ad features a model wearing/using the product — the angle may involve the model.',
    // ★핵심: 완성된 슬로건이 아니라, 유저가 스스로 말하는 "요청" 문장.
    `Write it in ${langName} as the user's OWN request in first person — natural "~하게 만들고 싶어" phrasing (e.g. "촉촉한 발색이 데일리로 물리지 않는 걸 보여주면서 20대 타깃 감각적인 광고로 만들고 싶어").`,
    'It is a BRIEF (your intent/direction), NOT a finished tagline or ad slogan. One natural sentence, ~25 words max.',
    'No quotes, no preamble, no hashtags, no options — just the one request line.',
    'Do not invent unverifiable factual claims (exact wear time, ingredients, certifications, prices) unless given.',
  ].join('\n');
  const userText = details ? `Product facts (may use): ${details}\nDraft the request.` : 'Draft the request.';

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL, // sonnet-5(비전) — 한 줄 제안엔 충분·저렴
    max_tokens: 120,
    system,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: image.mediaType || 'image/png', data: image.data } },
      { type: 'text', text: userText },
    ] }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return text.replace(/^["'“”](.*)["'“”]$/s, '$1').trim(); // 감싼 따옴표 제거
}

module.exports = { generateUgcScript, validateScriptSafety, suggestConcept };
