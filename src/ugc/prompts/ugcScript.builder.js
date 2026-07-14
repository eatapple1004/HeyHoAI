/**
 * ugcScript.builder.js — 영상 "대본" 생성 프롬프트 빌더 (포맷 무관)
 * ============================================================================
 * 옵션1(컨셉→대본→완성 영상)의 두뇌. 사용자 제품 + 한 줄 컨셉 → 구조화된 대본.
 *   - outputType 프로파일(profiles/)이 연출 방향(발화 유무·씬 타입·렌더 매핑)을 결정.
 *     product-ad(무출연)·model-editorial(모델 화보)·ugc-talking(발화) 등.
 *   - 대본을 씬 단위로 쪼개고 spoken/broll 태그. broll의 brollPrompt는 Doppia 제품/모델 렌더용.
 *   - caption.service.js 와 동일한 Claude(messages.create) 패턴. 모델은 서비스에서 주입.
 * 산출물: 엄격한 JSON(스키마는 ugcScript.service.SCRIPT_SCHEMA 와 정합).
 */
const { getProfile, DEFAULT_OUTPUT_TYPE } = require('../profiles');
const { getPlaybook, playbookMenu } = require('../categories');

// 포맷별 골격 힌트(Claude가 구조를 잡도록).
const FORMAT_HINTS = {
  'hook-cta':          'Punchy hook in the first 2s, one clear benefit, hard CTA. ~15s.',
  'problem-solution':  'Open on a relatable pain point, agitate briefly, reveal the product as the fix, proof, CTA. ~25s.',
  'testimonial':       'First-person authentic review from a happy customer; specific results, not salesy. ~20s.',
  'unboxing':          'Excited unboxing/first-impression energy; reveal, texture/detail beats, reaction, CTA. ~20s.',
  'demo':              'Show the product in use step by step; before/after or how-to; clear payoff. ~25s.',
  'pov':               'POV/day-in-the-life framing that folds the product in naturally; trend-native. ~18s.',
};

function fmtLine(v) { return FORMAT_HINTS[v] ? `- ${v}: ${FORMAT_HINTS[v]}` : `- ${v}`; }

/**
 * @param {{
 *   product: string,        // 제품명/설명 (필수)
 *   concept: string,        // 한 줄 컨셉/앵글 (필수)
 *   outputType?: string,    // profiles 키 (기본 product-ad)
 *   format?: string,        // FORMAT_HINTS 키 (기본 hook-cta)
 *   platform?: string,      // 'reels'|'tiktok'|'shorts' (기본 reels)
 *   durationSec?: number,   // 목표 길이(기본=프로파일 defaultDurationSec)
 *   tone?: string,          // 톤(기본 'authentic, upbeat, friendly')
 *   language?: string,      // 'ko'|'en' (기본 ko)
 *   audience?: string,      // 타깃(선택)
 * }} input
 * @returns {{ system: string, user: string, profile: object }}
 */
function buildUgcScriptPrompt(input) {
  const {
    product, concept,
    outputType = DEFAULT_OUTPUT_TYPE,
    format = 'hook-cta',
    platform = 'reels',
    tone = 'natural, confident, understated — like a real person, never an ad',
    language = 'ko',
    audience = '',
    hasImage = false,
    imageCount = 0, // 첨부된 제품 사진 장수(다각도면 >1)
    details = '',
    voiceover = true, // false면 내레이션·자막 없는 비주얼 전용 대본(onScreenText/spoken 비움)
    category = '',    // 제품군 지정 시 카테고리 플레이북 주입(씬레시피·스타일)
    sceneCount = 0,   // 유저 지정 broll 씬 개수(0=AI 자동)
    sceneDuration = 0, // 유저 지정 씬당 길이(초, 0=AI 자동)
  } = input || {};

  const profile = getProfile(outputType);
  const durationSec = (sceneCount && sceneDuration) ? sceneCount * sceneDuration
    : (input?.durationSec || profile.defaultDurationSec || 20);
  const langName = language === 'en' ? 'English' : 'Korean';
  const usesModel = outputType === 'model-editorial' || outputType === 'ugc-talking'; // 모델 등장 포맷
  const playbook = getPlaybook(category); // 제품군 플레이북(씬레시피·스타일·음악) — 없으면 기존 추론

  const system = [
    'You are a top-tier short-form creative director for TikTok / Instagram Reels / YouTube Shorts.',
    'You turn a product + a one-line concept into a scroll-stopping, native-feeling video script.',
    '',
    profile.systemGuide,
    '',
    'Golden rules:',
    '- The Brief is the user\'s creative REQUEST/DIRECTION — it may be a full sentence ("...감각적인 광고로 만들고 싶어") OR loose keywords ("빨강 배경, 고급스러운 컬러"). Interpret their INTENT; accept any format. NEVER echo the brief text verbatim (especially not as the hook) — write fresh copy toward the intent.',
    '- Parse the brief for: target audience, mood/tone, and any VISUAL cues — background, color, lighting, color grade, texture, setting, styling. Route every visual cue into the scene "direction" and "brollPrompt" so the rendered images actually reflect it (e.g. "빨강 배경" → red background in every brollPrompt). Route mood → copy tone; target → audience.',
    '- Hook must land in the first 2 seconds (a scroll-stopper: bold claim, question, or pattern interrupt).',
    '- One core benefit, not a feature dump. Conversational, native — never corporate.',
    usesModel
      ? '- SUBJECT per scene: intercut like a real editorial — some scenes are the product alone (subject:"product"), others show the model wearing/using/applying the product (subject:"model"). Aim for a natural mix (roughly half and half). In "model" scenes brollPrompt describes the model + product together (styling, pose); the model identity comes from a reference image, so do NOT invent a specific face. In "product" scenes brollPrompt is product-only.'
      : '- SUBJECT: every scene is product-only — set subject:"product" for all scenes (no model/person).',
    '- Infer the product CATEGORY (from the brief and the attached photo, if any) and use category-fitting persuasion: cosmetics → shade/finish/result; jewelry → emotion/craft/light/occasion; apparel → styling/fit/versatility; food → appetite/sensory; tech/home → key benefit. Match hook, spoken and every brollPrompt to that category.',
    ...(playbook ? [
      `- CATEGORY PALETTE — ${playbook.label}: draw from these shot TYPES as a menu (pick, reorder, skip, or vary freely to fit THIS brief — it is not a fixed sequence, and two ads should not look identical): ${playbook.shots.join(', ')}.`,
      `  · Apply this visual style to every brollPrompt: ${playbook.style}.`,
      `  · Lean toward musicVibe: ${playbook.music} — unless the brief implies another mood.`,
    ] : [
      // Auto: 카테고리 UI 없이 사진으로 판별 → 해당 플레이북 팔레트 적용. 메뉴로 주고 Claude가 고름.
      '- CATEGORY PLAYBOOKS — detect the product category from the attached photo (and brief), then draw from the MATCHING palette below as a menu (pick/reorder/skip/vary to fit THIS brief; not a fixed sequence; two ads should not look identical). If none fits, use your own judgment:',
      ...playbookMenu(),
    ]),
    `- Write all spoken, cta, caption in ${langName}. brollPrompt stays in English.`,
    `- For EACH scene also write "summary": a SPECIFIC 1-2 sentence description in ${langName} of what the viewer sees AND how it moves — concrete enough to picture the shot (subject, setting, key detail, the motion), but plain human language FOR THE USER, NOT a prompt (no camera/lens/render jargon list). e.g. "골드 케이스 립스틱이 어두운 배경에서 천천히 회전하며 골드 디테일에 빛이 스칩니다. 매트한 레드 심지가 드러나요." Keep it to 1-2 sentences — vivid but not overloaded. The actual prompts stay hidden.`,
    ...(language === 'ko' ? [
      '- KOREAN VOICE (critical — copy must NOT sound AI-generated or translated):',
      '  · Write like a real Korean creator/copywriter speaking to a friend — natural 구어체 rhythm, not a brochure or a machine.',
      '  · BAN these AI/translationese tells: 형용사 남발(완벽한·특별한·놀라운·최고의), 명사 나열형("촉촉함과 부드러움을 동시에"), 번역투("~를 경험해보세요","당신의"), 느낌표 남발, 상투적 CTA("지금 바로","놓치지 마세요","더 이상 고민하지 마세요"), 이모지 떡칠.',
      '  · Prefer 절제된 확신 — short, concrete, understated. One vivid specific beat beats three adjectives. Trust the product; do not oversell or sound desperate.',
      '  · Read each line aloud in your head: if a real person would never say it, rewrite it.',
    ] : []),
    '- Every scene is a DISTINCT moment — a different shot, angle, or action. Never repeat the same beat, visual idea, or spoken line across scenes (e.g. do NOT write two "light hits the case" scenes). Vary the visuals scene to scene.',
    '- Keep total on-screen/spoken words realistic for the target duration (~2.5 words/sec).',
    ...(sceneCount ? [`- Create EXACTLY ${sceneCount} broll scenes — no more, no fewer.`] : []),
    ...(sceneDuration ? [`- Set each broll scene's "durationSec" to ${sceneDuration}.`] : []),
    ...(voiceover ? [
      '- VOICE IS THE CAPTION — they are the SAME layer. "spoken" is BOTH what the voice says AND the on-screen subtitle (shown in sync as the voice speaks it).',
      '  · "spoken" = one natural, conversational sentence the voice says in this scene, which also appears on screen as the subtitle. Keep it concise and subtitle-friendly (about 4-12 words), ONE sentence per scene. Fill "spoken" for EVERY scene.',
      '  · Set "onScreenText" to "" (empty). Do NOT write a separate headline/keyword caption — the subtitle IS the spoken line. Any extra graphic captions are added by the user later, never by you.',
    ] : [
      '- NO VOICEOVER MODE: this ad has no narration and no on-screen captions — it is a silent, visual-only ad carried by the product visuals and background music.',
      '  · Set "onScreenText" to "" (empty) and "spoken" to "" for EVERY scene. Do NOT write any narration or caption lines.',
      '  · Put all your craft into "direction" and "brollPrompt" (the visuals & motion). Still fill title, hook, cta, caption, hashtags, musicVibe normally (used off-screen for the post, not shown in the video).',
    ]),
    '- Safe, honest, no medical/financial guarantees, no banned/adult content.',
    '- Do NOT invent specific factual claims (exact wear time, SPF, ingredients, certifications, prices). Use only claims given in the brief or product facts; otherwise keep copy benefit-led and non-specific.',
    'Return ONLY a single JSON object (no prose, no markdown fences), matching exactly this schema:',
    '{',
    '  "title": string,',
    '  "format": string,',
    `  "durationSec": number,`,
    `  "aspect": "${profile.aspect}",`,
    '  "language": "ko"|"en",',
    '  "hook": string,                       // the opening line / first on-screen text',
    '  "scenes": [',
    '    { "n": number, "type": "spoken"|"broll", "durationSec": number,',
    '      "spoken": string,                 // what the voice SAYS = the on-screen subtitle (same text, concise 4-12 words); EMPTY for no-voiceover',
    '      "onScreenText": string,           // leave "" — the caption is the spoken line; users add extra graphic captions themselves',
    '      "direction": string,              // what is shown / camera & motion',
    '      "subject": "product"|"model",     // "model"=model wears/uses the product in this shot; "product"=product-only shot',
    '      "brollPrompt": string             // for type "broll": product/model image prompt (English)',
    '    }',
    '  ],',
    '  "cta": string,',
    '  "caption": string,                    // ready-to-post caption',
    '  "hashtags": string[],                 // 5-12, no # prefix',
    '  "musicVibe": string                   // e.g. "upbeat lofi", "trendy pop"',
    '}',
    `Allowed scene types for this output type: ${profile.sceneTypes.map((t) => `"${t}"`).join(', ')}.`,
  ].join('\n');

  const user = [
    `Output type: ${outputType}`,
    // product는 선택 — 보통 유저가 brief(concept)에 제품을 녹여서 씀. 있으면 명시.
    product ? `Product: ${product}` : '',
    `Creative brief / request (a sentence or loose keywords — interpret intent, don't echo): ${concept}`,
    hasImage ? (imageCount > 1
      ? `${imageCount} photos of the SAME product from different angles are attached. Study them together to understand its full 3D structure and any moving/mechanical parts (e.g. a robot's joints, a truck's container). Ground the copy, spoken and every brollPrompt in its real appearance — color, form, structure, texture, finish — and use the angle that best shows the motion each scene needs.`
      : 'A photo of the actual product is attached. Ground the copy, spoken and every brollPrompt in its real appearance — color, form, packaging, texture, finish. Describe the product accurately in brollPrompt so the rendered scenes match it.') : '',
    details ? `Product facts / claims — use ONLY these, do not invent additional claims:\n${details}` : '',
    audience ? `Target audience: ${audience}` : '',
    `Format: ${format}`,
    `Formats reference:\n${fmtLine(format)}`,
    `Platform: ${platform}`,
    `Target duration: ~${durationSec}s`,
    `Tone: ${tone}`,
    `Language: ${langName}`,
    '',
    'Write the video script now as the JSON object.',
  ].filter(Boolean).join('\n');

  return { system, user, profile };
}

module.exports = { buildUgcScriptPrompt, FORMAT_HINTS };
