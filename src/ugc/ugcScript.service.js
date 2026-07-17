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
    // n은 항상 배열 순서로 유일화 — Claude가 중복 n을 주면 같은 클립 공유·동시삭제·VO 겹침 발생(신뢰 불가).
    n: i + 1,
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
  // 제품 사진들(동일 제품 다각도). images(배열) 우선, 없으면 image(단일, 하위호환).
  const imgs = (Array.isArray(input.images) && input.images.length ? input.images : (input.image ? [input.image] : []))
    .filter((im) => im && im.data);
  const { system, user } = buildUgcScriptPrompt({ ...input, hasImage: imgs.length > 0, imageCount: imgs.length });

  // 제품 사진이 있으면 비전 블록으로 첨부(여러 각도) → Claude가 실제 제품(색·형태·구조·가동부)에 근거해 카피·brollPrompt 작성.
  const content = imgs.length
    ? [
        ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/png', data: im.data } })),
        { type: 'text', text: user },
      ]
    : user;

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT,
    max_tokens: 3600, // summary(씬별 1-2문장) 추가로 토큰 여유 확보(5씬+긴 요약 잘림 방지)
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
/**
 * 컨셉 제안 — 제품 사진(동일 제품 다각도)을 보고 유저의 요청문 한 줄을 초안한다.
 *   images(배열) 우선, 없으면 image(단일, 하위호환) — generateUgcScript와 같은 규약.
 *   ⚠️ 전엔 라우트가 첫 장만 넘겨서, 대본은 다각도를 다 보는데 컨셉만 앞면 하나로 썼다.
 *      뒷면에만 있는 특징(예: 소드팩)이 컨셉에서 통째로 빠진다.
 */
async function suggestConcept({ image, images, details = '', language = 'ko', outputType = 'product-ad' } = {}) {
  const imgs = (Array.isArray(images) && images.length ? images : (image ? [image] : [])).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('product image is required'), { statusCode: 400 });
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
    // ⚠️ 문형·예시를 언어별로 갈라야 한다. 전엔 "Write it in English"라고 해놓고 뒤에 한국어 문형
    //    ("~하게 만들고 싶어")과 한국어 예시를 붙여서 지시가 자기모순이었다 — 그리고 **예시가 지시를 이겨서**
    //    영어 모드에서도 한국어 컨셉이 나왔다. 예시는 반드시 그 언어로 쓴 것이어야 한다.
    language === 'en'
      ? `Write it in English as the user's OWN request in first person — natural "I want to..." phrasing (e.g. "I want an ad that shows how the color stays fresh all day, aimed at people in their 20s, with a stylish feel").`
      : `Write it in Korean as the user's OWN request in first person — natural "~하게 만들고 싶어" phrasing (e.g. "촉촉한 발색이 데일리로 물리지 않는 걸 보여주면서 20대 타깃 감각적인 광고로 만들고 싶어").`,
    'It is a BRIEF (your intent/direction), NOT a finished tagline or ad slogan. One natural sentence, ~25 words max.',
    'No quotes, no preamble, no hashtags, no options — just the one request line.',
    'Do not invent unverifiable factual claims (exact wear time, ingredients, certifications, prices) unless given.',
  ].join('\n');
  // 여러 장이면 "같은 대상의 여러 모습"임을 밝힌다 — 안 그러면 제품이 여럿이라고 읽는다(refClauses와 같은 이유).
  //   각도로 못박지 않고(상태·클로즈업도 흔하다), 세트도 하나로 친다고 명시한다(3색 세트 컷은 세트가 그 하나다).
  const multi = imgs.length > 1 ? `The ${imgs.length} photos all show the SAME single product — different angles, states (e.g. cap on vs off) or close-ups, not several products to choose between. If it is a set or bundle, the whole set is that one product. ` : '';
  const userText = `${multi}${details ? `Product facts (may use): ${details}\n` : ''}Draft the request.`;

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL, // sonnet-5(비전) — 한 줄 제안엔 충분·저렴
    max_tokens: 120,
    system,
    messages: [{ role: 'user', content: [
      ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/png', data: im.data } })),
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
    `Also return "summary": an updated SPECIFIC 1-2 sentence description in ${lang} of what the viewer now sees and how it moves — concrete enough to picture it, plain human language (no jargon list), 1-2 sentences, not overloaded.`,
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
      summary: String(raw.summary || summary).slice(0, 300),
    };
  } catch (e) {
    // Claude 실패 → 안전 폴백: 지시를 이미지 프롬프트에 덧붙이고 요약에도 반영
    return { brollPrompt: `${brollPrompt}. ${ins}`.slice(0, 2000), direction, summary: (summary ? `${summary} · ${ins}` : ins).slice(0, 300) };
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
    `Also write "summary": a SPECIFIC 1-2 sentence description in ${lang} of what the viewer sees and how it moves — concrete enough to picture the shot, plain human language (NOT a prompt), 1-2 sentences, not overloaded.`,
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
    summary: String(raw.summary || '').slice(0, 300),
    subject: (!productOnly && raw.subject === 'model') ? 'model' : 'product',
    durationSec: Math.min(Math.max(Number(raw.durationSec) || 3, 2), 5),
  };
}

const SUGGEST_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { scenes: { type: 'array', items: ADD_SCENE_SCHEMA } },
  required: ['scenes'],
};

/** 완성 영상에 추가할 씬 후보 N개(기본 4)를 서로 다른 앵글로 제안. 유저는 summary만 보고 고름(프롬프트는 뒤에). */
async function suggestScenes({ script, outputType = 'product-ad', count = 4 } = {}) {
  const s = script || {};
  const scenes = (s.scenes || []).filter((x) => x.type === 'broll');
  const voiceover = scenes.some((x) => x.spoken && x.spoken.trim());
  const lang = s.language === 'en' ? 'English' : 'Korean';
  const productOnly = outputType !== 'model-editorial';
  const n = Math.min(Math.max(count, 2), 6);
  const system = [
    `You propose ${n} DIFFERENT candidate scenes the user could ADD to an existing short product-ad video. Each must be a DISTINCT natural next scene with a different angle/beat (e.g. a result shot, a hero product beauty shot, a detail macro, a lifestyle/gifting moment). Match the existing tone and product.`,
    productOnly ? 'PRODUCT ONLY — subject MUST be "product", no people.' : 'May use subject "model" when a scene needs a person, otherwise "product".',
    voiceover ? `Write spoken narration in ${lang} — natural, understated.` : 'NO voiceover — leave spoken empty.',
    `onScreenText in ${lang}. direction and brollPrompt in ENGLISH. summary = a SPECIFIC 1-2 sentence ${lang} description of what the viewer sees and how it moves (concrete but plain human language, not a prompt; not overloaded). durationSec 2-5.`,
    'Keep product identity (shape, color, label) intact. Do not invent unverifiable claims.',
  ].join('\n');
  const ctx = `Ad concept/title: ${s.title || '(none)'}\nExisting scenes:\n${scenes.map((x, i) => `${i + 1}. ${x.summary || x.onScreenText || x.direction || ''}`).join('\n') || '(none)'}`;
  const user = `${ctx}\n\nPropose ${n} distinct candidate scenes to add.`;
  const response = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT, max_tokens: 1800, system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: SUGGEST_SCHEMA } },
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw Object.assign(new Error('Could not suggest scenes'), { statusCode: 502 });
  const raw = JSON.parse(m[1]);
  return (Array.isArray(raw.scenes) ? raw.scenes : []).slice(0, n).map((sc) => normalizeAddSceneObj(sc, outputType, voiceover));
}

/** 씬 객체(제안 선택 or 프론트 전송) 정규화. 프롬프트/요약/subject/길이 클램프. */
function normalizeAddSceneObj(sc, outputType = 'product-ad', voiceover = true) {
  const productOnly = outputType !== 'model-editorial';
  return {
    type: 'broll',
    onScreenText: String(sc.onScreenText || '').slice(0, 300),
    spoken: voiceover ? String(sc.spoken || '').slice(0, 600) : '',
    direction: String(sc.direction || '').slice(0, 600),
    brollPrompt: String(sc.brollPrompt || sc.direction || '').slice(0, 2000),
    summary: String(sc.summary || '').slice(0, 300),
    subject: (!productOnly && sc.subject === 'model') ? 'model' : 'product',
    durationSec: Math.min(Math.max(Number(sc.durationSec) || 3, 2), 5),
  };
}

module.exports = { generateUgcScript, validateScriptSafety, suggestConcept, refineScene, generateAddScene, suggestScenes, normalizeAddSceneObj };
