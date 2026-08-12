const { resolveRecipe } = require('./recipeResolver');
const recipeStore = require('./recipeStore');
const styleRepo = require('../generate/stylePreset.repository');
const visualRepo = require('../visuals/visualAttribute.repository');
const characterRepo = require('../characters/character.repository');
const { assertCharacterOwned } = require('../middleware/ownership');

// 레시피 조회/해석 로직 단일소스 — 레거시 라우트(recipe.route.js)와 Nest(nest/recipes)가 함께 사용한다.
//   (NestJS 이관 중 해석 로직이 두 벌로 갈라지지 않도록 라우트에서 분리했다.)

const PRODUCT_TAG = '[product]';

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

// presetMap/attributeMap 는 거의 안 바뀌므로 1회 로드 후 캐시 (resolver 입력)
let _maps = null;
async function getMaps() {
  if (_maps) return _maps;
  const [styles, attrs] = await Promise.all([styleRepo.findAll(), visualRepo.findAll()]);
  const presetMap = {};
  for (const s of styles) presetMap[s.name] = { prefix: s.prefix, suffix: s.suffix, negative: s.negative_prompt || '' };
  const attributeMap = {};
  for (const a of attrs) attributeMap[`${a.category_id}:${a.key}`] = a.prompt_fragment;
  _maps = { presetMap, attributeMap };
  return _maps;
}

/** 생성 가능한 레시피 카드 메타 목록 */
function list({ mode, vertical } = {}) {
  return recipeStore.list({ mode, vertical });
}

/**
 * 카드 id(slug) → 시드 config → resolveRecipe → 실제 생성 프롬프트(jobs)로 해석.
 * subjectId 주면 해당 캐릭터를 주어로(소유 검증), 없으면 미리보기용 일반 주어.
 *
 * @param {string} id       레시피 id(slug)
 * @param {string} userId   요청 사용자(캐릭터 소유 검증용)
 * @param {{subjectId?:string, userSlots?:object}} [body]
 */
async function resolve(id, userId, { subjectId, userSlots } = {}) {
  const recipe = recipeStore.getById(id);
  if (!recipe) throw httpError(404, '레시피를 찾을 수 없습니다.');

  // 중첩 템플릿: 자식(config.parent_id 보유)은 부모 config를 상속(resolver가 deepMerge(parent→child)).
  //   자식은 shots·look만 오버라이드하고 output/subject 등 공통은 부모에서 온다.
  //   (현재 1단 상속. 다단 중첩은 부모 체인을 root→leaf로 pre-merge해 parentConfig로 넘기면 확장.)
  let parentConfig;
  if (recipe.config.parent_id) {
    const parent = recipeStore.getById(recipe.config.parent_id);
    if (parent) parentConfig = parent.config;
  }

  // subject.type은 병합 결과 기준 — 자식이 생략하면 부모 값을 따른다.
  const cfgSubjectType = (recipe.config.subject && recipe.config.subject.type)
    || (parentConfig && parentConfig.subject && parentConfig.subject.type) || 'face';
  let subject = { type: cfgSubjectType, name: 'subject' };

  if (subjectId) {
    await assertCharacterOwned(subjectId, userId);
    const ch = await characterRepo.findById(subjectId);
    if (!ch) throw httpError(404, '대상을 찾을 수 없습니다.');
    subject = {
      type: cfgSubjectType,
      name: (ch.name || '').replace(PRODUCT_TAG, '').trim() || ch.name,
      reference_image_url: ch.reference_image_url || null,
    };
  }

  const { presetMap, attributeMap } = await getMaps();
  const resolved = resolveRecipe(recipe.config, { subject, presetMap, attributeMap, parentConfig, userSlots: userSlots || {} });

  const first = (resolved.jobs && resolved.jobs[0]) || {};
  return {
    id: recipe.id,
    name: recipe.name,
    mode: recipe.mode,
    type: resolved.output_type === 'reel' ? 'reel' : 'image',
    ...resolved,
    // 스튜디오가 /api/generate 로 바로 보낼 수 있는 편의 필드
    // (resolver가 스타일 프리셋을 프롬프트에 이미 반영하므로 style='none')
    generate: {
      prompt: first.prompt || '',
      negativePrompt: first.negativePrompt || '',
      style: 'none',
      count: resolved.jobs ? resolved.jobs.length : 1,
    },
  };
}

module.exports = { list, resolve };
