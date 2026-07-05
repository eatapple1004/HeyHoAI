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
        verticals: ['fashion', 'productcut'], // 이 카테고리에 속한 기존 recipe.vertical
        contentTypes: [
          { slug: 'product-cut', label: 'Product Cut', match: { vertical: ['productcut'] } }, // 제품컷
          { slug: 'on-model',    label: 'On-model',    match: { category: ['OnModel'] } },     // 착용컷
          { slug: 'lookbook',    label: 'Lookbook',    match: { category: ['Lifestyle'] } },   // 룩북(잠정)
          { slug: 'fabric-cut',  label: 'Fabric',      match: { category: ['Detail'] } },       // 원단컷(잠정)
          { slug: 'editorial',   label: 'Editorial',   match: { category: ['Editorial'] } },    // 화보
          { slug: 'video',       label: 'Video',       match: { category: ['Reel'] } },         // 영상
        ],
      },
      // 뷰티·기타(General) — 비파괴용(파일럿). 콘텐츠타입 미큐레이션 → auto:true 로 데이터에서 자동 도출.
      //   나중에 여기 contentTypes:[…] 로 큐레이션하면 자동 도출 대체됨.
      { slug: 'beauty',  label: 'Beauty',  active: true, verticals: ['beauty'],  auto: true }, // 뷰티
      { slug: 'general', label: 'General', active: true, verticals: ['general'], auto: true },  // 기타

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
