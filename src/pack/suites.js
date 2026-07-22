/**
 * Product Pack — 스위트 템플릿("무엇을 만들지"의 뇌).
 *
 * 카테고리(vertical)별로 "사진 1장에서 뽑을 콘텐츠 목록"을 미리 큐레이션한다.
 * 유저는 업로드 + 카테고리 확인만 하면, 이 config가 스틸·합성 컷을 결정한다.
 *
 * 프롬프트는 검증된 오아플 실증(히어로·제품컷·성분·라이프·컨셉12)에서 이식하되
 *   ${c.product} 로 일반화 — 어떤 제품에도 동작. (P1: ugc 비전분석으로 제품서술 자동주입.)
 *
 * 컷 종류:
 *   - kind 'still'     → 단품 캐논 레퍼 1장으로 nano-banana 생성 (AI 안정)
 *   - kind 'composite' → 다개체(세트) 합성 — compositor (생성 아님)
 */

const NEG_STILL = 'garbled lettering, two or more products, duplicate product, extra caps, warped product, distorted label, people, hands, fingers, blown highlights';
const S = (label, w, h, fn) => ({ key: label.k, label: label.l, w, h, prompt: fn, neg: NEG_STILL });

const beverage = {
  vertical: 'beverage',
  label: '음료 · 액상 / 제품 일반',
  refBake: { style: 'clean_studio_single', preserveLabel: true, aspect: '4:5' },
  stills: [
    // ── 히어로 (프리미엄 캠페인) ──
    S({ k: 'hero_sunlit', l: '히어로 · Sunlit Pop' }, 768, 960, (c) =>
      `Premium beauty hero product photography, ONE single ${c.product} only — label identical to the reference, no fabricated lettering — standing on a smooth warm colored paper sweep in bright directional sunlight, a fresh relevant ingredient beside it, long soft natural shadows, vivid but true color, product-only no people no hands.`),
    S({ k: 'hero_colorblock', l: '히어로 · Bold Color Block' }, 768, 960, (c) =>
      `Premium beauty hero product photography, ONE single ${c.product} only, label identical to the reference — standing LARGE and centered against a bold flat solid color-block studio background, crisp editorial lighting with a clean specular rim, minimal contact shadow, confident premium, product-only no people no hands.`),
    S({ k: 'hero_noir', l: '히어로 · Noir 럭셔리' }, 768, 960, (c) =>
      `Premium luxury hero product photography, ONE single ${c.product} only, label identical to the reference — on a stone plinth in a moody dark editorial scene, a single soft key light with a crisp specular rim, deep shadows, subtle warm gold accent, product-only no people no hands.`),
    // ── 제품컷 / PDP ──
    S({ k: 'pdp_front', l: '제품컷 · 정면' }, 768, 960, (c) =>
      `Clean e-commerce PDP photo, ONE single ${c.product} only, label identical to the reference — standing straight front-facing, centered on a light grey seamless studio background, soft even softbox light, faint contact shadow, tack-sharp label, catalog-grade, product-only.`),
    S({ k: 'pdp_threequarter', l: '제품컷 · 3/4' }, 768, 960, (c) =>
      `Clean e-commerce PDP photo, ONE single ${c.product} only, label identical to the reference — at a gentle three-quarter angle showing depth and cap profile, light grey seamless background, soft studio light, subtle reflection, product-only.`),
    // ── 성분 스토리 ──
    S({ k: 'ingredient_cut', l: '성분 · 원물' }, 768, 960, (c) =>
      `Premium ingredient-story photo, ONE single ${c.product} only, label identical to the reference — on a clean warm surface with its fresh source ingredient (whole and cut) beside it, soft natural daylight, shallow depth of field, appetizing and honest, product-only no people.`),
    S({ k: 'ingredient_nature', l: '성분 · 자연' }, 960, 960, (c) =>
      `Ingredient-story hero, ONE single ${c.product} only, label identical to the reference — resting among its fresh natural source ingredients on a rustic light wood surface, warm soft daylight, wholesome and natural, product sharp and in focus, no people no hands.`),
    // ── 라이프스타일 ──
    S({ k: 'lifestyle_morning', l: '라이프 · 아침' }, 768, 960, (c) =>
      `Lifestyle scene, ONE single ${c.product} only, label identical to the reference — on a bright breakfast table beside a clear glass and a small plate, soft morning window light, linen and light wood, cozy healthy morning-routine mood, product sharp, no people, no hands.`),
    S({ k: 'lifestyle_desk', l: '라이프 · 데스크' }, 768, 960, (c) =>
      `Lifestyle scene, ONE single ${c.product} only, label identical to the reference — on a clean minimal desk beside a notebook and a small plant, soft daytime light, calm daily-wellness office mood, product sharp, no people, no hands.`),
    // ── 컨셉샷 (다양한 포맷) ──
    S({ k: 'concept_splash', l: '컨셉 · 스플래시' }, 960, 960, (c) =>
      `Dynamic advertising hero, ONE single ${c.product} only. A vivid splash of liquid and fresh ingredient pieces frozen mid-air around the product, energetic motion, bright studio light on a warm gradient background, high-speed capture feel, product tack-sharp, no hands.`),
    S({ k: 'concept_flatlay', l: '컨셉 · 플랫레이' }, 960, 960, (c) =>
      `Aesthetic top-down flat-lay, ONE single ${c.product} only. Laid on a warm neutral surface arranged with its sliced ingredients, leaves and a linen napkin, styled editorial knolling, soft even overhead light, appetizing, no hands.`),
    S({ k: 'concept_editorial', l: '컨셉 · 에디토리얼' }, 768, 960, (c) =>
      `Fashion-editorial product art, ONE single ${c.product} only. Standing on a bold two-tone color-block set with a hard geometric shadow, playful minimalist high-fashion campaign look, product sharp, no hands.`),
    S({ k: 'concept_iced', l: '컨셉 · 아이스' }, 960, 960, (c) =>
      `Refreshing summer scene, ONE single ${c.product} only. Beside a tall glass of iced drink with a mint sprig and fresh fruit, heavy condensation and water droplets, bright cool daylight, thirst-quenching, no hands.`),
    S({ k: 'concept_float', l: '컨셉 · 플로팅' }, 768, 960, (c) =>
      `Levitation hero, ONE single ${c.product} only. Floating in mid-air with thin ingredient slices and small droplets suspended around it, soft gradient backdrop, clean modern beauty-ad look, product tack-sharp, no hands.`),
    S({ k: 'concept_infocard', l: '컨셉 · 인포카드' }, 768, 960, (c) =>
      `Clean claim-card base with copy space, ONE single ${c.product} only. Standing to one side on a soft solid pastel background with large empty negative space on the other side for text, simple even light, minimal, product sharp, no hands.`),
    S({ k: 'concept_duo', l: '컨셉 · 듀오' }, 960, 960, (c) =>
      `Minimal editorial still, ONE single ${c.product} only. Beside a simple clear glass on a clean monochrome surface, lots of negative space, calm premium magazine look, no hands.`),
  ],
  composites: [
    { key: 'lineup', label: '세트 · 로우', method: 'row', needs: 'all' },
  ],
};

const SUITES = { beverage };

/** vertical → suite (없으면 beverage 폴백). */
function suiteFor(vertical) {
  return SUITES[vertical] || SUITES.beverage;
}

module.exports = { SUITES, suiteFor };
