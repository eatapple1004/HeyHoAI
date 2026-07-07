/* ============================================================================
 * Doppia 택소노미 단일 소스 (SINGLE SOURCE OF TRUTH)
 * 설계: docs/테마_택소노미_재편_설계결정_2026-07-05.md
 *
 * 구조: 카테고리(제품군) → 콘텐츠타입(그 카테고리 전용 메뉴) → 변형(레시피 parent_id)
 *   ① 카테고리  = 상단 워크스페이스 스위처 (의류 ▾ → 주얼리 …)
 *   ② 콘텐츠타입 = 그 카테고리의 테마칩 (카테고리마다 다름)
 *   ③ 변형      = 콘텐츠타입 안 세부 (레시피 중첩, 여기 아님)
 *
 * ⚠️ 편집은 여기 한 곳에서만. 카테고리/콘텐츠타입 추가·삭제 = 이 배열만 고치면
 *    스위처·칩·필터가 자동 반영(Studio가 이걸 읽음). 하드코딩 금지.
 *
 * 추가 방법:
 *   - 새 카테고리: categories[]에 { slug, label, verticals, contentTypes:[…] } 추가.
 *   - 새 콘텐츠타입: 해당 카테고리 contentTypes[]에 { slug, label, match } 추가.
 *   - active:false 로 두면 스위처에 "예정"으로 비활성 노출(제거 아님).
 *
 * match = 기존 템플릿(레시피)을 이 콘텐츠타입에 매핑하는 규칙(재태깅 전 호환):
 *   { vertical:['productcut'] }  → recipe.vertical 이 그 값이면 이 타입.
 *   { category:['OnModel'] }     → recipe.category(콘텐츠타입 원천) 가 그 값이면 이 타입.
 *   Phase 3에서 recipe.category를 콘텐츠타입 slug로 정규화하면 match는 단순화됨.
 * ==========================================================================*/
(function () {
  window.TAXONOMY = {
    categories: [
      {
        slug: 'apparel', label: 'Apparel', active: true, // 의류
        verticals: ['fashion', 'productcut', 'studiomodel'], // 이 카테고리에 속한 기존 recipe.vertical
        contentTypes: [
          // (2026-07-08 사용자 지시: lookbook·fabric·editorial·video 콘텐츠타입 삭제. product-cut·on-model만 유지.)
          { slug: 'product-cut', label: 'Product Cut', match: { vertical: ['productcut'] } }, // 제품컷
          { slug: 'on-model',    label: 'On-model',    match: { category: ['OnModel'] } },     // 착용컷
        ],
      },
      // 화장품(Cosmetics). slug은 매핑·딥링크 위해 'beauty' 유지(Beauty→Cosmetics 라벨 변경, General 삭제 2026-07-08).
      //   (2026-07-08 사용자 지시: texture·onmodel·reel·lifestyle·infocard·shade 테마 삭제 → Hero만 큐레이션. auto 제거.)
      {
        slug: 'beauty', label: 'Cosmetics', active: true, verticals: ['beauty', 'producthero'],
        contentTypes: [
          { slug: 'hero', label: 'Hero', match: { category: ['Hero'] } }, // 제품 히어로컷 (Texture/OnModel/Reel/Lifestyle/InfoCard/Shade는 삭제됨)
        ],
      },

      // 네일 — 공식(프롬프트 기반) 템플릿 전용 카테고리. 콘텐츠타입은 테마 slug(nail-base/nail-template)와 1:1로,
      //   studio가 /owned label_themes로부터 카드에 vertical:'nail'+category:'NailBase'|'NailTemplate'를 스탬프 → 스위처가 매칭.
      {
        slug: 'nail', label: 'Nail', active: true,
        verticals: ['nail'],
        contentTypes: [
          { slug: 'nail-base',     label: 'Nail Base',     match: { category: ['NailBase'] } },
          { slug: 'nail-template', label: 'Nail Template', match: { category: ['NailTemplate'] } },
        ],
      },

      // 악세서리(Accessories) — 2026-07-08 신설, 주얼리 v1 큐레이션(공식 파라미터-중첩 vertical).
      //   콘텐츠타입 3개 = 시드 3패밀리 부모 category와 1:1(Product Cut/Worn Cut/Hero). 각 부모는 파라미터형 자식(컷) 보유.
      //   match=category(레시피 category 원값). 확장(가방·시계 등)은 같은 카테고리에 부모 카드만 추가.
      {
        slug: 'accessories', label: 'Accessories', active: true,
        verticals: ['accessories'],
        contentTypes: [
          { slug: 'product-cut', label: 'Product Cut', match: { category: ['Product Cut'] } }, // 제품컷(모델없음)
          { slug: 'worn-cut',    label: 'Worn Cut',    match: { category: ['Worn Cut'] } },     // 착용컷(부위 파라미터)
          { slug: 'hero',        label: 'Hero',        match: { category: ['Hero'] } },          // 프리미엄 히어로
        ],
      },

      // 향후 추가 예정(예시 — 지금은 비활성):
      // { slug:'jewelry', label:'주얼리', active:false, verticals:['jewelry'],
      //   contentTypes:[ {slug:'product-cut',label:'제품컷',match:{category:['Studio','Macro']}},
      //                  {slug:'on-model',label:'착용컷',match:{category:['OnModel','Sizing']}},
      //                  {slug:'editorial',label:'화보',match:{category:['OnModelEditorial']}}, … ] },
    ],
  };

  // ── 헬퍼 (Studio가 사용) ─────────────────────────────────────────────────
  var TX = window.TAXONOMY;
  TX.activeCategories = function () { return TX.categories.filter(function (c) { return c.active !== false; }); };
  TX.categoryBySlug = function (s) { return TX.categories.find(function (c) { return c.slug === String(s); }); };
  TX.defaultCategory = function () { return TX.activeCategories()[0] || TX.categories[0]; };
  // 레시피(vertical, category) → 이 카테고리에서 어떤 콘텐츠타입인지 slug 반환(없으면 null).
  //   큐레이션(contentTypes+match) 우선. auto 카테고리는 recipe.category 원값을 콘텐츠타입으로.
  TX.contentTypeOf = function (categorySlug, recipe) {
    var cat = TX.categoryBySlug(categorySlug); if (!cat || !recipe) return null;
    var cts = cat.contentTypes || [];
    for (var i = 0; i < cts.length; i++) {
      var ct = cts[i], m = ct.match || {};
      if (m.vertical && m.vertical.indexOf(recipe.vertical) >= 0) return ct.slug;
      if (m.category && recipe.category && m.category.indexOf(recipe.category) >= 0) return ct.slug;
    }
    if (cat.auto) return recipe.category || 'other'; // 미큐레이션 → 원 category 값
    return null;
  };
  // 이 카테고리의 콘텐츠타입 칩 목록 [{slug,label}] 반환.
  //   큐레이션이면 그대로. auto면 recipes에서 이 카테고리 소속 레시피의 distinct category 도출.
  TX.contentTypesFor = function (categorySlug, recipes) {
    var cat = TX.categoryBySlug(categorySlug); if (!cat) return [];
    if (cat.contentTypes && cat.contentTypes.length) return cat.contentTypes.map(function (c) { return { slug: c.slug, label: c.label }; });
    var seen = {}, out = [];
    (recipes || []).forEach(function (r) {
      if (!TX.recipeInCategory(categorySlug, r)) return;
      if (r.config && r.config.parent_id) return; // 자식(변형) 제외
      var s = r.category || 'other';
      if (!seen[s]) { seen[s] = 1; out.push({ slug: s, label: s }); }
    });
    return out;
  };
  // 레시피가 이 카테고리에 속하나(vertical 기준).
  TX.recipeInCategory = function (categorySlug, recipe) {
    var cat = TX.categoryBySlug(categorySlug); if (!cat || !recipe) return false;
    return (cat.verticals || []).indexOf(recipe.vertical) >= 0;
  };
})();
