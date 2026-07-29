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

// 씬 길이 상한 = Kling 물리 한계(10s). Kling은 5s/10s 네이티브만 지원해 5초를 넘기면 10초를 뽑아 트림 = 크레딧 약 2배
//   (crediting: ugcGenCost가 durationSec>5면 10초 단가를 청구하므로 원가/과금은 어긋나지 않는다).
//   ⚠️ (2026-07-30) 상한을 5→10으로 올렸다. 전엔 "10초 단가 방지"를 이유로 5에 묶었는데,
//      그건 **비용을 이유로 연출을 제한**하는 가드였다. 사용자 결정: 낭비를 허용하고 컨셉에 맞는 배치를 우선한다.
//      대신 프롬프트가 트레이드오프를 알려준다(금지 → 판단). 10초는 벤더가 못 넘는 물리 한계라 유지.
//   ⚠️ 목표 길이 계산과 프롬프트 문장이 **같은 값**을 써야 한다 — 갈라지면 한 프롬프트가 두 말을 하게 된다.
const AUTO_MAX_SCENE_SEC = 10;

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
    model = null,     // 선택된 로스터 모델 메타 {isMinor, ageBand, ageBandLabel, gender} — usesModel 포맷에서만 의미
  } = input || {};

  const profile = getProfile(outputType);
  // 목표 길이 — 씬 개수·길이를 **둘 다** 지정했으면 그 곱(정확). 그 외엔 프로파일 기본(~20s).
  // ⚠️ 씬 개수만 지정 + 길이 Auto일 때 총 목표를 주지 않는다(전엔 min(20, 씬수×5)로 줬다가 되돌림).
  //    총 15초를 3씬에 주면 Claude가 15÷3=5초로 **균일하게** 나눠서, "Auto=대본이 씬마다 최적 길이"라는
  //    약속이 깨졌다(전부 5초). Auto의 핵심은 씬마다 3·4·5초를 리듬대로 정하는 것 —
  //    총량이 아니라 **씬당 상한(≤5, AUTO_MAX_SCENE_SEC)만** 프롬프트로 건다(144행). 상한은 10초 단가 방지가 목적.
  const baseDuration = input?.durationSec || profile.defaultDurationSec || 20;
  const durationSec = (sceneCount && sceneDuration) ? sceneCount * sceneDuration : baseDuration;
  const langName = language === 'en' ? 'English' : 'Korean';
  // (2026-07-30) 모델 등장 여부를 outputType(형식 토글)이 아니라 **브리프**가 정한다 → 토글 폐지.
  //   hasModelMeta = 유저가 로스터에서 모델을 고른 뒤의 2패스인가. 1패스는 모델 미정이라 인물 묘사를 금지한다.
  const hasModelMeta = !!model;
  const playbook = getPlaybook(category); // 제품군 플레이북(씬레시피·스타일·음악) — 없으면 기존 추론

  // 모델 외모 서술 — 로스터가 그 모델을 **생성할 때 쓴** age·descent·skin·hair·build로 짓는다(=이미지의 원본 소스).
  //   대본이 사진을 안 보므로, 이 텍스트가 곧 대본이 아는 모델의 전부다. 텍스트=레퍼런스라 렌더에서 안 싸운다.
  //   나이도 넣는다(사용자 결정) — 겉보기 나이가 ±3 어긋나지만 그 정도는 감수. "around N"으로 대략치임을 표시.
  let modelDesc = '', modelPron = '';
  if (model) {
    const genderWord = model.isMinor ? (model.gender === 'male' ? 'boy' : 'girl') : (model.gender === 'male' ? 'man' : 'woman');
    modelPron = model.gender === 'male' ? '"he"/"him"' : '"she"/"her"';
    const age = model.age ? `around ${model.age} years old` : ''; // 대략치(±3) — 렌더 겉보기와 완전히 같진 않다
    const look = [age, model.skin, model.hair, !model.isMinor && model.build].filter(Boolean).join(', '); // 아동은 build 생략(연출은 카탈로그 규칙이 맡음)
    modelDesc = `a ${model.descent ? model.descent + ' ' : ''}${genderWord}${look ? `, ${look}` : ''}`;
  }

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
    // ⚠️ 실사고 기록(유지할 근거): 전엔 "do NOT invent a specific face"까지만 말해서 **나이·정체는 마음껏 썼다.**
    //    브리프의 "confident young professionals"(타깃 관객)를 Claude가 화면 속 인물로 옮겨 "a confident young woman"을 썼고,
    //    아동 모델을 고른 경우 1번 씬은 그 아이, 2번 씬은 난데없는 성인 여성이 됐다(실사고).
    //    프롬프트(성인)와 레퍼런스(아이)가 싸우면 Gemini가 프롬프트를 따른다.
    //    → 근본 해법은 "묘사 금지"가 아니라 **레퍼런스와 일치**다. 그래서 모델이 확정된 2패스에서만 묘사한다.
    ...(hasModelMeta ? [
      // 2패스 — 모델 확정. 로스터 서술(=이미지 원본 소스)로 정확히 묘사해 레퍼런스와 안 싸우게 한다.
      `- SUBJECT per scene: intercut like a real editorial — some scenes are the product alone (subject:"product"), others show the model wearing/using/applying the product (subject:"model"). Aim for a natural mix (roughly half and half). THE MODEL IS: ${modelDesc}. In every subject:"model" scene, describe the model consistently as this exact person, use ${modelPron}, and match the attached reference image. The ONLY person on camera is this model — never introduce a second person (partner, friend, bystander, hands of another person), and never swap in a different age, gender, or look. The brief's target audience is who the ad is FOR, not who appears on camera. In "product" scenes brollPrompt is product-only.`,
      // 아동은 연출만 추가로 지시(정체성은 위 모델 서술이 맡는다). 성인 에디토리얼 포즈 금지.
      ...(model.isMinor ? [
        '- The model is a child: stage every subject:"model" scene the way a children\'s clothing catalogue would — natural age-appropriate posture, play and movement, fully clothed in the product; never adult-editorial posing, styling or framing.',
      ] : []),
    ] : [
      // 1패스 — 모델 미정. 필요 여부를 **판단**하고 needsModel로 알린다. 인물 묘사는 금지(누구인지 아직 모른다).
      '- DECIDE whether a human model should appear, from the brief and the attached photo:',
      '  · Use model scenes if the brief asks for it (model / worn / on-model / lookbook / editorial / 착용 / 화보 / 모델) OR the product is something a person wears, holds or applies (apparel, jewelry, bodywear, eyewear, bags, footwear, skincare or makeup on skin).',
      '  · Otherwise EVERY scene is product-only.',
      '- Set "subject" per scene accordingly ("model" or "product"), intercutting naturally (roughly half and half) when model scenes are used.',
      '- Return "needsModel": true if ANY scene is subject:"model", else false.',
      '- ⚠️ The model is NOT chosen yet — a reference image will be supplied later. In subject:"model" scenes do NOT describe the person at all (no age, gender, ethnicity, hair, body, face). Build the scene from styling, pose, framing, mood and setting, and refer to them only as "the model". Never introduce a second person. The brief\'s target audience is who the ad is FOR, not who appears on camera.',
    ]),
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
    // ⚠️ 예시는 반드시 그 언어로 쓴 것이어야 한다. 전엔 "in ${langName}"이라 해놓고 한국어 예시를 박아둬서
    //    영어 모드인데 씬 설명만 한국어로 나왔다 — spoken·cta·caption(89행)은 언어를 타서 영어였으니
    //    **한 화면에서 두 언어가 어긋났다**. 지시는 맞았는데 **예시가 지시를 이겼다**.
    //    같은 것을 suggestConcept에서 이미 한 번 고쳤다(18b216f) — 지시에 ${langName}을 쓰면 예시도 같이 갈라야 한다.
    `- For EACH scene also write "summary": a SPECIFIC 1-2 sentence description in ${langName} of what the viewer sees AND how it moves — concrete enough to picture the shot (subject, setting, key detail, the motion), but plain human language FOR THE USER, NOT a prompt (no camera/lens/render jargon list). e.g. ${language === 'en'
      ? '"A gold-cased lipstick turns slowly against a dark background as light grazes the gold detail. The matte red bullet comes into view."'
      : '"골드 케이스 립스틱이 어두운 배경에서 천천히 회전하며 골드 디테일에 빛이 스칩니다. 매트한 레드 심지가 드러나요."'} Keep it to 1-2 sentences — vivid but not overloaded. The actual prompts stay hidden.`,
    ...(language === 'ko' ? [
      '- KOREAN VOICE (critical — copy must NOT sound AI-generated or translated):',
      '  · Write like a real Korean creator/copywriter speaking to a friend — natural 구어체 rhythm, not a brochure or a machine.',
      '  · BAN these AI/translationese tells: 형용사 남발(완벽한·특별한·놀라운·최고의), 명사 나열형("촉촉함과 부드러움을 동시에"), 번역투("~를 경험해보세요","당신의"), 느낌표 남발, 상투적 CTA("지금 바로","놓치지 마세요","더 이상 고민하지 마세요"), 이모지 떡칠.',
      '  · Prefer 절제된 확신 — short, concrete, understated. One vivid specific beat beats three adjectives. Trust the product; do not oversell or sound desperate.',
      '  · Read each line aloud in your head: if a real person would never say it, rewrite it.',
    ] : [
      '- ENGLISH VOICE (critical — copy must NOT sound AI-generated or translated):',
      '  · Write like a real creator/copywriter talking to a friend — natural spoken rhythm, not a brochure or a machine.',
      '  · BAN these AI/ad-cliché tells: adjective stacking ("perfect, flawless, effortless"), noun-listing ("hydration and radiance in one"), tired CTAs ("Don\'t miss out", "Shop now before it\'s gone", "Elevate your routine", "Unlock", "Experience the difference", "Say goodbye to…"), exclamation spam, overusing "your", emoji spam.',
      '  · Prefer understated confidence — short, concrete, specific. One vivid detail beats three adjectives. Trust the product; do not oversell or sound desperate.',
      '  · Read each line aloud in your head: if a real person would never say it, rewrite it.',
    ]),
    '- Every scene is a DISTINCT moment — a different shot, angle, or action. Never repeat the same beat, visual idea, or spoken line across scenes (e.g. do NOT write two "light hits the case" scenes). Vary the visuals scene to scene.',
    // (2026-07-30) 잘림 내구성 — 렌더는 벤더 네이티브 길이(5s/10s)로 생성한 뒤 씬 길이로 트림한다. 즉 모든 클립이
    //   중간에서 끊긴다. 완결형 동작(뚜껑이 닫힌다·캔이 열린다)이 잘리면 "미완성"으로 보이므로 지속형 모션을 유도한다.
    '- MOTION must be CUT-SAFE: the clip will be trimmed, so design motion that looks natural cut at any moment — continuous or loopable movement (slow rotation, camera push-in or drift, light sweeping across, liquid or fabric flowing, steam rising). Avoid motion that needs to COMPLETE to read (a lid closing, a can popping open, a hand finishing a grab) unless that completion clearly finishes inside the scene.',
    // 음악은 컨셉이 정한다. 씬 컷은 이 BPM의 비트 그리드에 스냅되므로 템포가 편집 리듬을 결정한다.
    '- Choose "bpm" to fit THIS concept (60-160): slow/luxury/calm → 60-90, natural/lifestyle → 90-115, energetic/trendy → 115-160. Scene cuts will be aligned to this beat grid, so the tempo you pick sets the editing rhythm. Keep "musicVibe" consistent with it.',
    '- Keep total on-screen/spoken words realistic for the target duration (~2.5 words/sec).',
    ...(sceneCount ? [`- Create EXACTLY ${sceneCount} broll scenes — no more, no fewer.`] : []),
    // Auto(sceneDuration=0)일 땐 전엔 길이에 대해 아무 말도 안 해서 Claude가 자유롭게 정했다(근거=AUTO_MAX_SCENE_SEC).
    ...(sceneDuration ? [`- Set each broll scene's "durationSec" to ${sceneDuration}.`]
      // Auto = 대본이 씬 개수·길이를 **컨셉에 맞게** 정한다(사용자 결정 2026-07-30: 기계적으로 초를 맞추지 말고
      //   최상의 결과를 위해 배치 — 필요하면 적은 씬을 길게, 필요하면 많은 씬을 짧게. 낭비는 허용).
      //   5초 초과의 비용 트레이드오프는 **금지가 아니라 판단 근거**로 알려준다(상한=Kling 물리한계 10초).
      : [`- Decide the NUMBER of scenes and each scene's "durationSec" from what the concept needs — this is a creative call, not arithmetic. A punchy, energetic ad may want many short beats (2-3s each); a slow luxury reveal may want a few long ones (6-10s). Do NOT give every scene the same length unless the concept genuinely calls for a steady rhythm.`,
         `- Scene length limits: minimum 2s, maximum ${AUTO_MAX_SCENE_SEC}s. A scene over 5s costs roughly double to render — use it when the shot truly needs the time, not by default.`,
         `- Treat the target duration as a GUIDE, not a constraint: land near it, but let the content decide the exact total.`]),
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
    '  "musicVibe": string,                  // e.g. "upbeat lofi", "trendy pop"',
    '  "bpm": number,                        // tempo fitting THIS concept (60-160) — scene cuts get snapped to this beat grid',
    '  "needsModel": boolean                 // true if ANY scene is subject:"model"',
    '}',
    `Allowed scene types for this output type: ${profile.sceneTypes.map((t) => `"${t}"`).join(', ')}.`,
  ].join('\n');

  const user = [
    `Output type: ${outputType}`,
    // product는 선택 — 보통 유저가 brief(concept)에 제품을 녹여서 씀. 있으면 명시.
    product ? `Product: ${product}` : '',
    `Creative brief / request (a sentence or loose keywords — interpret intent, don't echo): ${concept}`,
    // ⚠️ "different angles"로만 말하면 안 된다 — 유저가 넣는 건 각도만이 아니다: 상태(립스틱 뚜껑 닫힘/열림,
    //    로봇 접힘/펼침), 스케일(전체/디테일 클로즈업)도 흔하고 **오히려 더 유용하다**(열린 립스틱이 발색을 보여준다).
    //    각도라고 못박으면 두 상태를 하나로 융합하려 하거나 어느 쪽을 그릴지 헷갈린다.
    //    → "같은 제품의 여러 모습"으로 넓히고, **어느 상태를 쓸지는 씬이 정한다**고 말한다.
    //    (여러 제품은 미지원 — scene에 제품을 지목할 필드가 없다.)
    hasImage ? (imageCount > 1
      ? `${imageCount} photos of the SAME single product are attached — the one being advertised, not several products to choose between. They may show different angles, different states (e.g. cap on vs off, folded vs opened) or close-up details; and if the product is a set or bundle of several items, the WHOLE set is that one product. Study them together to understand its full 3D structure, its moving/mechanical parts (e.g. a robot's joints, a lipstick's cap) and how it looks in each state. Ground the copy, spoken and every brollPrompt in its real appearance — color, form, structure, texture, finish. Each scene may use whichever view or state serves it best, and a scene may show a state change (e.g. the cap coming off) if the photos support it — say so explicitly in that scene's brollPrompt.`
      : 'A photo of the actual product is attached. Ground the copy, spoken and every brollPrompt in its real appearance — color, form, packaging, texture, finish. Describe the product accurately in brollPrompt so the rendered scenes match it.') : '',
    details ? `Product facts / claims — use ONLY these, do not invent additional claims:\n${details}` : '',
    audience ? `Target audience: ${audience}` : '',
    `Format: ${format}`,
    `Formats reference:\n${fmtLine(format)}`,
    `Platform: ${platform}`,
    // 씬 개수 고정 + 길이 Auto면 총 목표를 주지 않는다 — 총량을 주면 Claude가 그걸 씬수로 나눠 균일하게 맞춘다
    //   (총 15s ÷ 3씬 = 5초씩). Auto의 핵심은 씬마다 최적 길이라 총량은 씬 길이의 **결과**여야지 입력이 아니다.
    (sceneCount && !sceneDuration)
      ? 'Total length is whatever the scenes add up to — do NOT aim for a fixed total; choose each scene\'s length by its own content.'
      : `Target duration: ~${durationSec}s`,
    `Tone: ${tone}`,
    `Language: ${langName}`,
    '',
    'Write the video script now as the JSON object.',
  ].filter(Boolean).join('\n');

  return { system, user, profile };
}

module.exports = { buildUgcScriptPrompt, FORMAT_HINTS };
