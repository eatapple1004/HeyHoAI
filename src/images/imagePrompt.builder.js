/**
 * 캐릭터 프로필 JSON의 visualDescription을 받아
 * 이미지 생성용 prompt + negative prompt를 조립한다.
 *
 * ── Prompt 생성 규칙 ──
 * 1. 주어(subject)부터 시작: "A [age]-year-old [nationality] [gender]"
 * 2. 신체 묘사 → 얼굴 특징 → 헤어 → 의상 순서
 * 3. 배경/장면은 마지막에 배치
 * 4. 각 후보마다 다른 scene + pose variation 적용
 * 5. SAFETY_NEGATIVE_PROMPT는 무조건 포함
 * 6. 품질 태그는 항상 접미어로 추가
 */

// ─── 안전 가드 (모든 prompt에 자동 주입) ───

const SAFETY_NEGATIVE_PROMPT = [
  // 미성년 관련
  'child', 'minor', 'underage', 'teen', 'teenager', 'loli', 'young girl', 'young boy',
  'school uniform', 'childlike', 'baby face',
  // 성적/노출 관련
  'nude', 'naked', 'nsfw', 'explicit', 'sexual', 'erotic', 'fetish',
  'lingerie', 'underwear', 'see-through', 'cleavage', 'bikini top only',
  'provocative pose', 'seductive', 'suggestive',
  // 폭력/유해
  'violence', 'blood', 'gore', 'weapon', 'drug', 'cigarette', 'alcohol',
  // 품질 방어
  'deformed', 'blurry', 'low quality', 'watermark', 'text', 'logo',
  'extra limbs', 'extra fingers', 'mutated hands', 'bad anatomy',
].join(', ');

const QUALITY_SUFFIX = 'professional photography, 8k uhd, sharp focus, natural lighting, Instagram aesthetic';

const SAFETY_POSITIVE_ENFORCEMENT = 'clearly adult, age 25+, mature face, fully clothed, brand-safe, SFW';

// ─── Scene/Pose 변형 (후보 다양성 확보용) ───

const SCENE_VARIATIONS = [
  { scene: 'cozy indoor cafe with warm lighting',        pose: 'sitting at a table, looking at camera with a natural smile' },
  { scene: 'modern city street at golden hour',           pose: 'walking casually, candid shot' },
  { scene: 'minimalist studio with soft white background', pose: 'professional headshot, confident expression' },
  { scene: 'rooftop terrace with city skyline at sunset',  pose: 'leaning on railing, relaxed and thoughtful' },
];

/**
 * 캐릭터 프로필로부터 후보 이미지 프롬프트 배열을 생성한다.
 *
 * @param {object} persona - characters.persona JSONB (characterProfileSchema)
 * @param {{ count?: number; customScenes?: Array<{scene:string; pose:string}> }} [opts]
 * @returns {Array<{ prompt: string; negativePrompt: string; variationLabel: string }>}
 */
function buildImagePrompts(persona, opts = {}) {
  const { count = 4, customScenes } = opts;
  const v = persona.visualDescription;
  const scenes = customScenes || SCENE_VARIATIONS;

  // 주요 인물 묘사 (모든 변형에 공통)
  const subject = [
    `A ${persona.age}-year-old ${persona.nationality} ${persona.gender}`,
    `${v.bodyType} build`,
    `${v.hairStyle} ${v.hairColor} hair`,
    `${v.eyeColor} eyes`,
    `${v.skinTone} skin`,
    v.distinctiveFeatures,
    `wearing ${v.defaultOutfit}`,
  ].join(', ');

  const prompts = [];

  for (let i = 0; i < Math.min(count, scenes.length); i++) {
    const { scene, pose } = scenes[i];

    const prompt = [
      subject,
      pose,
      scene,
      SAFETY_POSITIVE_ENFORCEMENT,
      QUALITY_SUFFIX,
    ].join(', ');

    prompts.push({
      prompt,
      negativePrompt: SAFETY_NEGATIVE_PROMPT,
      variationLabel: `scene_${i}`,
    });
  }

  return prompts;
}

/**
 * 단일 커스텀 프롬프트를 안전하게 감싸준다.
 * (사용자가 직접 scene을 지정하는 경우)
 *
 * @param {object} persona
 * @param {string} customPrompt
 * @returns {{ prompt: string; negativePrompt: string; variationLabel: string }}
 */
function buildSinglePrompt(persona, customPrompt) {
  const v = persona.visualDescription;

  const subject = [
    `A ${persona.age}-year-old ${persona.nationality} ${persona.gender}`,
    `${v.bodyType} build`,
    `${v.hairStyle} ${v.hairColor} hair`,
    `${v.eyeColor} eyes`,
    `wearing ${v.defaultOutfit}`,
  ].join(', ');

  const prompt = [
    subject,
    customPrompt,
    SAFETY_POSITIVE_ENFORCEMENT,
    QUALITY_SUFFIX,
  ].join(', ');

  return {
    prompt,
    negativePrompt: SAFETY_NEGATIVE_PROMPT,
    variationLabel: 'custom',
  };
}

module.exports = {
  buildImagePrompts,
  buildSinglePrompt,
  SAFETY_NEGATIVE_PROMPT,
  SAFETY_POSITIVE_ENFORCEMENT,
  SCENE_VARIATIONS,
};
