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
          summary: { type: 'string' }, // 사람용 한 줄 장면 설명(유저 언어) — 검토 화면 노출, 프롬프트는 숨김
          subject: { type: 'string', enum: ['product', 'model'] }, // 렌더 레퍼런스 라우팅(모델씬=제품+모델)
        },
        required: ['n', 'type', 'durationSec', 'spoken', 'onScreenText', 'direction', 'brollPrompt', 'summary', 'subject'],
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
    summary: s.summary || '',
    ...(s.type === 'broll' ? {
      brollPrompt: s.brollPrompt || s.direction || '',
      subject: s.subject === 'model' ? 'model' : 'product', // 렌더 레퍼런스 라우팅용(기본=제품)
    } : {}),
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

// 씬 수정 라우팅 스키마: 유저 지시를 반영한 이미지/모션 프롬프트(영어) + 사람용 요약(유저 언어).
const REFINE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { brollPrompt: { type: 'string' }, direction: { type: 'string' }, summary: { type: 'string' } },
  required: ['brollPrompt', 'direction', 'summary'],
};

/**
 * "Edit scene" — 유저 자연어 수정 지시를 이미지(brollPrompt) vs 모션(direction)으로 분석·라우팅하고
 *   영어로 정제해 반환. 한 필드만 관련되면 나머지는 원본 유지. Claude 실패 시 이미지 프롬프트에 덧붙이는 안전 폴백.
 * @param {{ brollPrompt?:string, direction?:string, instruction:string, subject?:string }} p
 * @returns {Promise<{ brollPrompt:string, direction:string }>}
 */
async function refineScene({ brollPrompt = '', direction = '', summary = '', instruction, subject = 'product', language = 'ko' } = {}) {
  const ins = String(instruction || '').trim();
  if (!ins) return { brollPrompt, direction, summary };
  const lang = language === 'en' ? 'English' : 'Korean';
  const system = [
    'You refine ONE scene of a short product-ad video. A scene has two hidden prompts + a human summary:',
    '- IMAGE prompt: what the still frame shows (product, model, background, lighting, colors, any text).',
    '- MOTION prompt: how the camera/subject moves (push-in, rotate, reveal, pan, tilt, speed).',
    '- summary: a one-line plain-language description the USER reads (not a prompt).',
    'The user requests a change in natural language (ANY language, e.g. Korean). Decide whether it affects the IMAGE, the MOTION, or BOTH, and apply it there. Rewrite ONLY what the change touches; keep everything else identical.',
    'Return IMAGE and MOTION prompts in ENGLISH, fully self-contained (not a diff). If the change does not apply to a field, return that field UNCHANGED (translate to English if needed).',
    `Also return "summary": an updated ONE-LINE plain-language description in ${lang} of what the viewer now sees (human-readable, NO camera/render jargon).`,
    subject === 'model'
      ? 'This scene features a model using the product — image changes may involve the model.'
      : 'This scene shows the PRODUCT ONLY — no model or person; do not add people.',
    'Keep product identity (shape, color, label) intact unless the user explicitly asks to change it. Never invent unverifiable claims.',
  ].join('\n');
  const user = `CURRENT IMAGE prompt:\n${brollPrompt || '(none)'}\n\nCURRENT MOTION prompt:\n${direction || '(none)'}\n\nCURRENT summary:\n${summary || '(none)'}\n\nUSER CHANGE REQUEST:\n${ins}\n\nReturn updated IMAGE prompt, MOTION prompt (English), and summary (${lang}).`;
  try {
    const response = await client.messages.create({
      model: env.CLAUDE_MODEL, max_tokens: 800, system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: REFINE_SCHEMA } },
    });
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!m) throw new Error('no json');
    const raw = JSON.parse(m[1]);
    return {
      brollPrompt: String(raw.brollPrompt || brollPrompt).slice(0, 2000),
      direction: String(raw.direction || direction).slice(0, 600),
      summary: String(raw.summary || summary).slice(0, 200),
    };
  } catch (e) {
    // Claude 실패 → 안전 폴백: 지시를 이미지 프롬프트에 덧붙이고 요약에도 반영
    return { brollPrompt: `${brollPrompt}. ${ins}`.slice(0, 2000), direction, summary: (summary ? `${summary} · ${ins}` : ins).slice(0, 200) };
  }
}

// 새 씬 1개 스키마(완성 영상에 추가). broll 씬.
const ADD_SCENE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    onScreenText: { type: 'string' }, spoken: { type: 'string' },
    direction: { type: 'string' }, brollPrompt: { type: 'string' },
    summary: { type: 'string' }, // 사람용 한 줄 설명(유저 언어)
    subject: { type: 'string', enum: ['product', 'model'] }, durationSec: { type: 'number' },
  },
  required: ['onScreenText', 'spoken', 'direction', 'brollPrompt', 'summary', 'subject', 'durationSec'],
};

/**
 * 완성 영상에 붙일 새 씬 1개 생성. 기존 대본(톤·제품·씬들) 맥락 유지.
 *   instruction 있으면 그 방향으로, 없으면 AI가 다음으로 자연스러운 씬 제안.
 * @param {{ script:object, instruction?:string, outputType?:string }} p
 * @returns {Promise<{ type:'broll', onScreenText, spoken, direction, brollPrompt, subject, durationSec }>}
 */
async function generateAddScene({ script, instruction = '', outputType = 'product-ad' } = {}) {
  const s = script || {};
  const scenes = (s.scenes || []).filter((x) => x.type === 'broll');
  const voiceover = scenes.some((x) => x.spoken && x.spoken.trim()); // 기존에 내레이션 있으면 새 씬도 음성
  const lang = s.language === 'en' ? 'English' : 'Korean';
  const productOnly = outputType !== 'model-editorial';
  const system = [
    'You add ONE new scene to an EXISTING short product-ad video (TikTok / Instagram Reels). Match the tone, product identity, and visual style of the existing scenes.',
    'If a user direction is given, realize it. If not, propose the single most natural next scene (e.g. a satisfying result shot, a hero product beauty shot, or a moment that supports the call-to-action).',
    productOnly
      ? 'This ad shows the PRODUCT ONLY — no model or person. subject MUST be "product".'
      : 'This ad may feature a model. Use subject "model" only if the scene needs a person, otherwise "product".',
    voiceover
      ? `Write spoken narration in ${lang} — natural, understated, no hype.`
      : 'This ad has NO voiceover — leave spoken empty; put any on-screen words in onScreenText.',
    `onScreenText in ${lang}. direction and brollPrompt in ENGLISH. brollPrompt = a detailed still-image prompt (product, setting, lighting, composition). direction = Kling camera/subject motion.`,
    `Also write "summary": a one-line plain-language description in ${lang} of what the viewer sees (human-readable for the user, NOT a prompt).`,
    'durationSec between 2 and 5. Keep product identity (shape, color, label) intact. Do not invent unverifiable claims.',
  ].join('\n');
  const ctx = `Ad concept/title: ${s.title || '(none)'}\nExisting scenes:\n${scenes.map((x, i) => `${i + 1}. "${x.onScreenText || '(visual only)'}" — motion: ${x.direction || ''}`).join('\n') || '(none)'}`;
  const user = `${ctx}\n\n${String(instruction).trim() ? `USER DIRECTION for the new scene: ${String(instruction).trim()}` : 'Propose the single most natural next scene to add.'}\n\nReturn one new scene.`;
  const response = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT, max_tokens: 700, system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: ADD_SCENE_SCHEMA } },
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw Object.assign(new Error('Could not generate the new scene'), { statusCode: 502 });
  const raw = JSON.parse(m[1]);
  return {
    type: 'broll',
    onScreenText: String(raw.onScreenText || '').slice(0, 300),
    spoken: voiceover ? String(raw.spoken || '').slice(0, 600) : '',
    direction: String(raw.direction || '').slice(0, 600),
    brollPrompt: String(raw.brollPrompt || raw.direction || '').slice(0, 2000),
    summary: String(raw.summary || '').slice(0, 200),
    subject: (!productOnly && raw.subject === 'model') ? 'model' : 'product',
    durationSec: Math.min(Math.max(Number(raw.durationSec) || 3, 2), 5),
  };
}

module.exports = { generateUgcScript, validateScriptSafety, suggestConcept, refineScene, generateAddScene };
