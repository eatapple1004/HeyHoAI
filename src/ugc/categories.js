/**
 * categories.js — Ad Video 제품군 "플레이북" (템플릿 존재 카테고리 4종만)
 * ============================================================================
 * 카테고리 라벨만으론 퀄이 안 오른다(빌더가 이미 추론). 레버는 카테고리별 큐레이션 —
 * 단, "고정 샷 순서"면 결과가 비슷비슷해지므로 플레이북은 **팔레트(고를 샷 후보)**로 쓴다.
 * AI가 컨셉·제품에 맞게 고르고 변주. 없거나 미지원 카테고리는 기존 이미지추론+컨셉 방식.
 *
 * 범위: 템플릿에 존재하는 apparel·cosmetics·nail·accessories 만(통제 가능 범위).
 *
 * playbook: { label, shots(샷 후보 팔레트), style(조명·프레이밍), format(추천 기본), music }
 */

const PLAYBOOKS = {
  cosmetics: {
    label: 'Cosmetics / Makeup',
    shots: ['product hero (bullet/compact) macro', 'color or texture swatch macro', 'application on a model (lips/face/skin)', 'finished result close-up', 'CTA card'],
    style: 'clean soft beauty lighting, high-key, subtle glossy reflections, shallow depth of field',
    format: 'model-editorial',
    music: 'chic modern, soft understated beat',
  },
  apparel: {
    label: 'Apparel / Fashion',
    shots: ['full look on a model', 'fabric & detail macro', 'movement/pose beat', 'a styling variation', 'CTA card'],
    style: 'editorial fashion lighting, neutral premium set or natural light, elegant',
    format: 'model-editorial',
    music: 'trendy, confident',
  },
  nail: {
    label: 'Nail',
    shots: ['nail design macro', 'hand pose on a model near the face', 'application / press-on moment', 'lifestyle hand shot', 'CTA card'],
    style: 'clean beauty light, glossy close macro, soft background',
    format: 'model-editorial',
    music: 'cute, chic, light',
  },
  accessories: {
    label: 'Accessories (jewelry, bags, watches, eyewear)',
    shots: ['light-catching detail/sparkle macro', 'worn or held on a model (hand/neck/ear/wrist)', 'hero product on an elegant styled surface', 'lifestyle or gifting moment', 'CTA card'],
    style: 'premium product lighting, tactile materials, directional light with sparkle highlights, editorial staging',
    format: 'model-editorial',
    music: 'elegant, sleek, refined',
  },
};

/** category → playbook (미지정/미지원이면 null → 빌더는 기존 이미지추론+컨셉 방식) */
function getPlaybook(category) {
  return (category && PLAYBOOKS[category]) || null;
}

/** UI용 카테고리 목록 [{value,label}] */
function categoryList() {
  return Object.entries(PLAYBOOKS).map(([value, p]) => ({ value, label: p.label }));
}

module.exports = { PLAYBOOKS, getPlaybook, categoryList };
