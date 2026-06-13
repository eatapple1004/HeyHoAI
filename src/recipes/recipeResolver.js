/**
 * Recipe Resolver
 * ────────────────
 * recipes.config(JSONB) + subject + (옵션)유저 슬롯 → 실제 생성 작업 목록으로 해석한다.
 *
 * 설계: docs/TEMPLATE_STRUCTURE.md 의 "A2 레이어 + A5 샷리스트" 통합 스키마.
 *
 * 해석 순서:
 *   1. parent_id deep-merge (A4)        — parent config가 주어지면
 *   2. editable_slots 유저 override (A3) — userSlots가 주어지면
 *   3. shot_strategy 로 shots 확정 (A5)  — list | sample_pool | claude_dynamic
 *   4. shot 마다 프롬프트 조립 (A2)
 *   5. output.type 별 작업/크레딧 산출
 *
 * 순수 함수: DB/네트워크 의존 없음. presetMap/attributeMap을 인자로 받는다.
 */

const {
  SAFETY_NEGATIVE_PROMPT,
  SAFETY_POSITIVE_ENFORCEMENT,
} = require('../images/imagePrompt.builder');

const QUALITY_SUFFIX = 'professional photography, 8k uhd, sharp focus, natural lighting';

// composition 키 → 프롬프트 조각 (visual_attributes의 composition 카테고리와 정합)
const COMPOSITION_FRAGMENT = {
  closeup: 'close-up shot, face fills frame',
  medium_shot: 'medium shot, waist up',
  full_body: 'full body shot, head to toe visible',
  mirror_selfie: 'mirror selfie composition, phone visible',
};

/** subject.type / reference_strategy → 주어 구절 */
function subjectPhrase(subject, strategy) {
  if (subject.type === 'product') {
    if (strategy === 'on_model_tryon') return 'a model wearing the provided product';
    return 'the provided product, prominently featured';
  }
  // face: identity는 레퍼런스 이미지가 잠금 → 주어는 가볍게
  return 'the same person from the reference photo';
}

/** 깊은 병합 (A4 parent + child) */
function deepMerge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over && typeof over === 'object') {
    const out = { ...(base || {}) };
    for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

/** "a.b.c" 경로에 값 set (A3 슬롯 override) */
function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

/** 시드 고정 의사난수 (sample_pool 재현성) */
function seededPick(arr, count, seed) {
  const out = [];
  const pool = arr.slice();
  let s = seed || 1;
  while (out.length < count && pool.length) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(pool.splice(s % pool.length, 1)[0]);
  }
  return out;
}

/**
 * @param {object} config            recipes.config
 * @param {object} ctx
 * @param {object} ctx.subject       { type:'face'|'product', name, reference_image_url? }
 * @param {object} ctx.presetMap     { [presetName]: { prefix, suffix, negative } }
 * @param {object} ctx.attributeMap  { ["category:key"]: prompt_fragment }
 * @param {object} [ctx.parentConfig]  부모 config (A4)
 * @param {object} [ctx.userSlots]     { [slotKey]: value } (A3)
 * @param {number} [ctx.seed]
 * @returns {{ output_type, aspect_ratio, jobs:Array, credit_cost, reel? }}
 */
function resolveRecipe(config, ctx) {
  const { subject, presetMap = {}, attributeMap = {}, parentConfig, userSlots = {}, seed = 7 } = ctx;

  // 1. parent merge
  let cfg = parentConfig ? deepMerge(parentConfig, config) : { ...config };

  // 2. editable_slots override
  for (const slot of cfg.editable_slots || []) {
    if (userSlots[slot.key] !== undefined) setPath(cfg, slot.key, userSlots[slot.key]);
  }

  // 2.5 전체 프롬프트 오버라이드: 템플릿이 완성 프롬프트를 직접 지정하면 구조 조립을 건너뛴다.
  if (cfg.prompt_override) {
    const outO = (cfg.output && cfg.output.type) || 'image_set';
    const aspectO = (cfg.output && cfg.output.aspect_ratio) || '4:5';
    const countO = (cfg.output && cfg.output.count) || 1;
    const negO = [(cfg.look && cfg.look.extra_negative) || '', SAFETY_NEGATIVE_PROMPT].filter(Boolean).join(', ');
    const jobsO = Array.from({ length: countO }, (_, i) => ({
      variationLabel: `shot_${i}`, prompt: cfg.prompt_override, negativePrompt: negO,
    }));
    if (outO === 'reel') return { output_type: 'reel', aspect_ratio: aspectO, jobs: jobsO, credit_cost: jobsO.length * 2 };
    return { output_type: outO, aspect_ratio: aspectO, jobs: jobsO, credit_cost: Math.ceil(jobsO.length * 0.5) };
  }

  const look = cfg.look || {};
  const preset = presetMap[look.style_preset] || { prefix: '', suffix: '', negative: '' };
  const attrFrags = (look.attributes || [])
    .map((a) => attributeMap[a])
    .filter(Boolean);

  // 3. shots 확정
  let shots = cfg.shots || [];
  const count = (cfg.output && cfg.output.count) || shots.length || 1;
  if (cfg.shot_strategy === 'sample_pool') shots = seededPick(shots, count, seed);
  else if (cfg.shot_strategy === 'claude_dynamic') {
    // 실제로는 Claude 호출. 여기선 자리표시(있는 shots 또는 빈 1개).
    shots = shots.length ? shots : [{ scene: '[claude-generated scene]', pose: '[claude pose]' }];
  } else {
    shots = shots.slice(0, count);
  }

  const strategy = (cfg.subject && cfg.subject.reference_strategy) || 'identity_lock';
  const subj = subjectPhrase(subject, strategy);
  // 사람이 프레임에 등장하는가 → 사람 안전문구는 이때만 주입 (제품 단독 컷엔 부적절)
  const personInFrame = subject.type === 'face' || strategy === 'on_model_tryon';

  // 조각들을 콤마로 잇되, 조각 자체의 끝 콤마/중복 콤마/공백을 정리한다.
  const joinClean = (parts) =>
    parts
      .filter(Boolean)
      .map((s) => String(s).trim().replace(/,\s*$/, '')) // 조각 끝 콤마 제거
      .join(', ')
      .replace(/\s*,\s*(,\s*)+/g, ', ') // 연속 콤마 축약
      .replace(/\s{2,}/g, ' ')
      .trim();

  // 4. shot별 프롬프트 조립
  const buildPrompt = (shot, i) => {
    const compFrag = COMPOSITION_FRAGMENT[shot.composition] || '';
    const positive = joinClean([
      subj,
      preset.prefix,
      attrFrags.join(', '),
      look.wardrobe ? `wearing ${look.wardrobe}` : '',
      shot.pose,
      shot.scene,
      compFrag,
      look.extra_positive,
      personInFrame ? SAFETY_POSITIVE_ENFORCEMENT : 'brand-safe, SFW',
      preset.suffix,
      QUALITY_SUFFIX,
    ]);

    const negative = joinClean([preset.negative, look.extra_negative, SAFETY_NEGATIVE_PROMPT]);

    return { variationLabel: `shot_${i}`, prompt: positive, negativePrompt: negative };
  };

  const out = (cfg.output && cfg.output.type) || 'image_set';
  const aspect = (cfg.output && cfg.output.aspect_ratio) || '4:5';

  // 5. output 별 작업/크레딧
  if (out === 'reel') {
    const reel = cfg.reel || {};
    const jobs = shots.map((shot, i) => ({
      ...buildPrompt(shot, i),
      motion: (reel.per_shot_motion && reel.per_shot_motion[i]) || (reel.per_shot_motion && reel.per_shot_motion[0]) || 'subtle motion',
      duration: reel.duration_per_shot || 3,
    }));
    return {
      output_type: 'reel',
      aspect_ratio: aspect,
      jobs,
      credit_cost: jobs.length * 2,
      reel: { transition: reel.transition || 'cut', music_mood: reel.music_mood || 'neutral', captions: reel.captions || 'auto' },
    };
  }

  // image_set | carousel
  const jobs = shots.map(buildPrompt);
  let cost = Math.ceil(jobs.length * 0.5);
  if (subject.type === 'product' && cfg.subject && cfg.subject.reference_strategy === 'on_model_tryon') cost += 1;
  return { output_type: out, aspect_ratio: aspect, jobs, credit_cost: cost };
}

module.exports = { resolveRecipe, QUALITY_SUFFIX, COMPOSITION_FRAGMENT };
