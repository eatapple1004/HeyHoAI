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
    // (2026-07-30) needsModel = 모델 씬 존재 여부. UI가 이 값으로 모델 픽커를 열고 렌더를 게이트한다.
    needsModel: { type: 'boolean' },
  },
  required: ['title', 'format', 'durationSec', 'aspect', 'language', 'hook', 'scenes', 'cta', 'caption', 'hashtags', 'musicVibe', 'needsModel'],
};

// ⛔ 대본 금지어 검사 제거 (2026-07-17 사용자 결정) — 부활시키기 전에 읽을 것.
//   무엇이었나: 생성된 대본(hook·cta·caption·spoken·onScreenText)을 금지어 목록으로 훑어 걸리면 422로 죽였다.
//   왜 없앴나:
//     ① 실제 게이트는 이미지·영상 생성 레벨이다(Gemini·Kling 자체 정책). 이 목록이 훑던 건
//        **우리가 방금 Claude로 만든 우리 자신의 출력**이고, 프롬프트가 이미 "no banned/adult content"를
//        지시한다 → 같은 것을 두 번 막으면서 값은 거의 없었다.
//     ② 부분문자열 매칭이라 멀쩡한 상거래 어휘를 막았다: 'nude'→"rose-nude"(립스틱 셰이드) ·
//        'child'→"children" · 'teen'→"teenager" · 'minor'→"minority".
//        실사고: 화장품 컨셉이 통째로 422로 죽었다 — Unsafe script: Blocked term: "nude".
//        단어경계로 바꿔도 "rose-**nude**"는 하이픈이 경계라 안 풀린다 = 목록에 두는 한 화장품을 못 판다.
//     ③ 워드리스트는 우회가 자명해서(막힌 'child' 옆에 'kid'는 통과) 실제 방어력이 아니라 연출에 가까웠다.
//   ⚠️ 되살릴 거면 부분문자열 목록이 아니라 **구조화된 판정**으로 할 것(같은 오탐이 그대로 재발한다).

// summary가 "placeholder"·빈값 등 쓸모없는 값일 때 걸러낸다.
//   summary는 화면 표시용(사람이 씬을 알아보는 한 줄)이라 렌더엔 안 쓰인다. Claude가 스키마 required를
//   채우느라 가끔(관측 ~4회 중 1회) 실제 설명 대신 literal "placeholder"를 뱉는다 — 프롬프트 지시는
//   명확한데도 나는 모델의 간헐적 실수라 프롬프트로는 0%가 안 된다. 그래서 코드에서 direction으로 폴백한다
//   (UI도 sc.summary||sc.direction로 폴백하지만, 여기서 잡아야 저장·이탈복원·재조회에도 안 샌다).
/**
 * (2026-07-30) 총 길이 보정 — 유저가 고른 초에 **정확히** 맞춘다.
 *   프롬프트가 "합 = 정확히 N초"를 요구하지만 모델은 산수를 가끔 틀린다(관측: 40초 요청 → 36초).
 *   유저가 직접 고른 값이라 어긋나면 약속 위반이므로 코드가 마지막 방어선이 된다.
 *   ⚠️ 씬 **개수·분배는 건드리지 않는다**(연출은 대본 몫) — 차이를 흡수할 씬만 골라 조정한다.
 *      늘릴 땐 여유가 가장 큰 씬, 줄일 땐 가장 긴 씬. 씬당 2~10초 범위는 항상 지킨다.
 *   범위(2~10 × 씬수) 밖이라 못 맞추면 최대한 근접시키고 만다(무한 루프 방지).
 */
function fitTotalDuration(scenes, targetSec) {
  const t = Number(targetSec);
  const broll = (scenes || []).filter((s) => s.type === 'broll');
  if (!Number.isFinite(t) || t <= 0 || !broll.length) return scenes;
  const MIN = 2, MAX = 10;
  let guard = 0;
  const sum = () => broll.reduce((a, s) => a + (Number(s.durationSec) || 0), 0);
  while (sum() !== t && guard++ < 200) {
    const diff = t - sum();
    if (diff > 0) { // 늘려야 함 — 여유(MAX까지)가 가장 큰 씬에
      const c = broll.filter((s) => s.durationSec < MAX).sort((a, b) => (MAX - b.durationSec) - (MAX - a.durationSec))[0];
      if (!c) break;
      c.durationSec = Math.min(MAX, c.durationSec + Math.min(diff, MAX - c.durationSec));
    } else {        // 줄여야 함 — 가장 긴 씬에서
      const c = broll.filter((s) => s.durationSec > MIN).sort((a, b) => b.durationSec - a.durationSec)[0];
      if (!c) break;
      c.durationSec = Math.max(MIN, c.durationSec + Math.max(diff, MIN - c.durationSec));
    }
  }
  return scenes;
}

const JUNK_SUMMARY = /^(placeholder|n\/a|none|tbd|\.*|-*)$/i;
const cleanSummary = (s) => { const v = (s.summary || '').trim(); return (!v || JUNK_SUMMARY.test(v)) ? (s.direction || '') : v; };

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
    summary: cleanSummary(s),
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
    // 총 길이 보정: 유저가 총 길이를 고른 경우에만(input.durationSec) 합을 정확히 맞춘다.
    //   미지정(하위호환 경로)이면 대본이 낸 길이를 그대로 둔다.
    scenes: fitTotalDuration(normalizeScenes(raw.scenes), input.durationSec),
    cta: raw.cta || '',
    caption: raw.caption || '',
    hashtags: (Array.isArray(raw.hashtags) ? raw.hashtags : [])
      .map((t) => String(t).replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean).slice(0, 12),
    musicVibe: raw.musicVibe || '',
    // Claude가 빠뜨려도 씬의 subject로 복원 — 렌더 게이트가 이 값에 의존하므로 비어 있으면 안 된다.
    needsModel: (typeof raw.needsModel === 'boolean')
      ? raw.needsModel
      : (Array.isArray(raw.scenes) && raw.scenes.some((x) => x && x.subject === 'model')),
  };

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
// model = 선택된 로스터 모델 메타({isMinor, ageBand, ...}) — 있으면 컨셉의 타깃/톤을 그 모델에 맞춘다.
//   대본(generateScript)엔 b32b9f4로 배선했는데 컨셉엔 빠져 있어, 아이 모델을 골라도 컨셉이 "for women"으로
//   나왔다(모델을 몰라 제품만 보고 성인 타깃으로 씀). 같은 배선을 여기도 한다.
async function suggestConcept({ image, images, details = '', language = 'ko', outputType = 'product-ad', model = null, product = '' } = {}) {
  const imgs = (Array.isArray(images) && images.length ? images : (image ? [image] : [])).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('product image is required'), { statusCode: 400 });
  // (2026-07-30) 형식 토글 폐지 → outputType으로 모델 앵글을 금지하지 않는다. **사진을 보고 판단**하게 한다.
  //   전엔 noModel = outputType !== 'model-editorial' 이라, 형식을 안 보내는 새 폼에서는 항상 '제품만'이 강제돼
  //   착용물(의류·주얼리)인데도 모델 앵글 제안이 원천 차단됐다(브리프를 비운 경로에서 특히 치명적).
  const system = [
    'You are a short-form ad strategist. Look at the product photo, infer the product CATEGORY, and draft the user\'s CREATIVE BRIEF for a TikTok / Instagram Reels ad — phrased as their own request.',
    'Adapt the angle to the category you see:',
    '- Cosmetics/beauty → shade, finish, texture, before→after result.',
    '- Jewelry/accessories → emotion, craftsmanship, how it catches the light, gifting/occasion, timelessness.',
    '- Apparel → styling, fit, fabric feel, versatility (one piece, many looks).',
    '- Food/beverage → appetite, sensory detail, freshness, the moment.',
    '- Tech/gadgets/home → the key benefit or the problem it solves.',
    'Capture a STRATEGIC PROMISE (why stop scrolling / the payoff) + a vibe or target if it fits — NOT a specific shot or camera move (the script decides staging).',
    model
      ? 'This ad features a model wearing/using the product — the angle may involve the model.'
      : 'Decide from the photo: if the product is worn, held or applied by a person (apparel, jewelry, bodywear, eyewear, bags, footwear, skincare or makeup on skin), the angle MAY involve a model. Otherwise keep it product-only — do not suggest angles that require someone on camera.',
    // 선택된 모델이 아이면 타깃/톤을 그에 맞춘다 — 안 그러면 아동복인데 컨셉이 "for young women"으로 나온다.
    //   아이의 정확한 나이는 쓰지 않는다(밴드만) — 겉보기 나이가 라벨과 어긋난다(roster.kids 주석).
    ...(model && model.isMinor
      ? ['The model in this ad is a CHILD. Frame the request for a KIDS product — audience is parents/gift-buyers or the kids themselves, tone playful and wholesome. Do NOT aim it at "women" or adult self-purchase, and do not state the child\'s exact age.']
      // 성인 모델은 성별을 알려준다 — 안 그러면 컨셉이 기본값으로 "aimed at women"을 써서, 남성 레퍼런스와 어긋난다.
      //   (모델 성별 = 화면에 나오는 사람. 타깃 관객은 별개지만, 성별을 모르면 그쪽으로 기본 편향된다.)
      : (model && model.gender === 'male'
        ? ['The on-camera model is MALE — do not default the ad to a female audience/framing; fit it to a male model wearing the product.']
        : [])),
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
  // 제품명(선택) — details와 한 곳에 모아 userText로만 넣는다(system·details와 두 곳에서 제품을 말하지 않게).
  //   사진에 안 보이는 것(브랜드·셰이드명·재질)을 컨셉이 집어낼 수 있게. 비면 아무것도 안 붙는다(대본과 동일 규약).
  const prodLine = product && product.trim() ? `Product name: ${product.trim()}\n` : '';
  const userText = `${multi}${prodLine}${details ? `Product facts (may use): ${details}\n` : ''}Draft the request.`;

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
    // (2026-07-30) 상한 5→10(Kling 물리한계). >5s는 크레딧 약 2배라 필요할 때만.
    'durationSec between 2 and 10 (over 5s costs roughly double — use only when the shot needs it). Keep product identity (shape, color, label) intact. Do not invent unverifiable claims.',
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
    // ⚠️ 코드 클램프 — 프롬프트 상한만 올리고 여기를 놓치면 8초 씬이 조용히 5초로 깎인다(2026-07-30 5→10).
    durationSec: Math.min(Math.max(Number(raw.durationSec) || 3, 2), 10),
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
    `onScreenText in ${lang}. direction and brollPrompt in ENGLISH. summary = a SPECIFIC 1-2 sentence ${lang} description of what the viewer sees and how it moves (concrete but plain human language, not a prompt; not overloaded). durationSec 2-10.`,
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

module.exports = { generateUgcScript, suggestConcept, refineScene, generateAddScene, suggestScenes, normalizeAddSceneObj };
