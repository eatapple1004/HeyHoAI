/**
 * Product Pack — 스위트 템플릿("무엇을 만들지"의 뇌).
 *
 * 카테고리(vertical)별로 "사진 1장에서 뽑을 콘텐츠 목록"을 미리 큐레이션한다.
 * 유저는 업로드 + 카테고리 확인만 하면, 이 config가 스틸·합성 컷을 결정한다.
 *
 * P0: 프롬프트를 인라인 빌더로(검증된 오아플 스크립트 프롬프트 이식). 컷 = 단품 nano-banana.
 *   P1에서 recipe 리졸버(src/recipes)로 연결해 템플릿 재사용.
 *
 * 컷 종류:
 *   - kind:'still'     → 단품 캐논 레퍼 1장으로 nano-banana 생성 (AI가 안정적)
 *   - kind:'composite' → 다개체(세트) 합성 — compositor.composeRow (생성 아님)
 *
 * prompt(ctx) 는 { product } 를 받아 채운다(제품 서술은 잡 입력에서 옴 → 재사용 가능).
 */

const NEG_STILL = 'garbled lettering, two or more bottles, duplicate bottle, extra caps, warped bottle, distorted label, people, hands, fingers, blown highlights';

const beverage = {
  vertical: 'beverage',
  label: '음료 · 액상',
  // 레퍼 베이크 스펙: 단품·클린 스튜디오·라벨 보존
  refBake: { style: 'clean_studio_single', preserveLabel: true, aspect: '4:5' },
  // 단품 스틸 컷 (캐논 레퍼 1장 기반)
  stills: [
    { key: 'hero_sunlit', label: 'Sunlit Pop', w: 768, h: 960,
      prompt: (c) => `Premium beauty hero product photography, ONE single ${c.product} only — label identical to the reference, no fabricated lettering — standing on a smooth warm colored paper sweep in bright directional sunlight, one fresh relevant fruit/ingredient beside it, long soft natural shadows, vivid but true color, product-only no people no hands.`,
      neg: NEG_STILL },
    { key: 'hero_colorblock', label: 'Bold Color Block', w: 768, h: 960,
      prompt: (c) => `Premium beauty hero product photography, ONE single ${c.product} only, label identical to the reference — standing LARGE and centered against a bold flat solid color-block studio background, crisp editorial lighting with a clean specular rim, minimal contact shadow, confident premium, product-only no people no hands.`,
      neg: NEG_STILL },
    { key: 'hero_noir', label: 'Noir 럭셔리', w: 768, h: 960,
      prompt: (c) => `Premium luxury hero product photography, ONE single ${c.product} only, label identical to the reference — on a stone plinth in a moody dark editorial scene, a single soft key light with a crisp specular rim, deep shadows, subtle warm gold accent, product-only no people no hands.`,
      neg: NEG_STILL },
    { key: 'pdp_front', label: '제품컷 정면', w: 768, h: 960,
      prompt: (c) => `Clean e-commerce PDP photo, ONE single ${c.product} only, label identical to the reference — standing straight front-facing, centered on a light grey seamless studio background, soft even softbox light, faint contact shadow, tack-sharp label, catalog-grade, product-only.`,
      neg: NEG_STILL },
    { key: 'ingredient', label: '성분 스토리', w: 768, h: 960,
      prompt: (c) => `Premium ingredient-story photo, ONE single ${c.product} only, label identical to the reference — on a clean warm surface with its fresh source ingredient (whole and cut) beside it, soft natural daylight, shallow depth of field, appetizing and honest, product-only no people.`,
      neg: NEG_STILL },
    { key: 'lifestyle_morning', label: '라이프스타일 · 아침', w: 768, h: 960,
      prompt: (c) => `Lifestyle scene, ONE single ${c.product} only, label identical to the reference — on a bright breakfast table beside a clear glass and a small plate, soft morning window light, linen and light wood, cozy healthy morning-routine mood, product sharp, no people, no hands.`,
      neg: NEG_STILL },
  ],
  // 다개체 합성 컷 (세트/변형일 때만 — 캐논 레퍼 전부 사용)
  composites: [
    { key: 'lineup', label: '세트 로우', method: 'row', needs: 'all' },
  ],
};

const SUITES = { beverage };

/** vertical → suite (없으면 beverage 폴백). */
function suiteFor(vertical) {
  return SUITES[vertical] || SUITES.beverage;
}

module.exports = { SUITES, suiteFor };
