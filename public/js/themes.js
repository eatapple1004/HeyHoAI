/* (2026-07-02) 테마 taxonomy 공용 단일소스 — Studio(studio.html) + Library(gallery.html) 공유.
 * P2(카테고리 상수 2벌)·isThemeVisible·OFFICIAL_THEME_MAP 중복 제거. 여기만 고치면 양쪽 자동 반영.
 * ⚠️ 인라인 스크립트보다 먼저 로드돼야 함(non-defer, THEME_GROUP_OF 등 top-level에서 즉시 사용). */
(function () {
  // 노출 카테고리(테마) — Shopping이 활성 모드. jewelry·pet·food·coffee·home·tech 숨김. Influencer/UGC는 flag로 숨김·재활성 대비 매핑 보존.
  window.CAT_THEMES = {
    Influencer: ['people'],
    Shopping:   ['beauty', 'fashion', 'general', 'productcut', 'nail-base', 'nail-template'],
    UGC:        ['people', 'beauty', 'fashion', 'food', 'pet', 'ugc', 'general'],
  };
  // 오피셜 전용 테마 — 유저가 자기 템플릿을 넣을 수 없는 공식 제품 테마. My templates 서브탭 필터에서 제외(Official에만 노출).
  //   (productcut = 제품컷 중첩 템플릿 전용 공식 테마. 유저 테마 카테고리 아님.)
  window.OFFICIAL_ONLY_THEMES = ['productcut', 'nail-base', 'nail-template'];
  // 기본 제공 공식 recipe — Store 구매/담기 없이 항상 Studio에 노출(◈8 프리미엄 공식과 구분).
  //   백엔드도 price_credits=0이라 생성 구매게이트(402) 없음. Studio는 소유 무관 OFFICIAL_RECIPES에 포함시켜 노출.
  window.DEFAULT_OFFICIAL_RECIPES = ['product-cut', 'model-cut', 'product-hero'];
  // Library 필터 그룹(비겹침) — CAT_THEMES에서 파생(단일소스).
  window.CAT_GROUPS = [['Influencer', window.CAT_THEMES.Influencer], ['Shopping', window.CAT_THEMES.Shopping]];
  // 공식 recipe→theme 매핑(migrate.js OFFICIAL_THEME 미러). 공식은 recipe 카드라 themes 필드가 없어 studio가 이걸로 주입.
  window.OFFICIAL_THEME_MAP = {
    'stone-plinth-luxe': 'beauty', 'noir-gold-hero': 'beauty', 'dewy-glass-hero': 'beauty',
    'ring-editorial-campaign': 'jewelry', 'bracelet-editorial-campaign': 'jewelry',
    'top-down-hero': 'food', 'void-hero-cut': 'tech', 'pet-product-hero': 'pet',
    'product-cut': 'productcut',
  };
  // 보이는 테마 = 노출 매크로그룹(Shopping, Influencer는 flag) 안의 slug만. 숨긴 테마면 false → 그 테마에만 속한 콘텐츠는 Studio·Library 어디서도 안 보임. 커스텀 테마는 id라 여기 안 옴(항상 visible).
  window.isThemeVisible = function (slug) {
    if (window.CAT_THEMES.Shopping.indexOf(slug) >= 0) return true;
    if (typeof featureOn === 'function' && featureOn('influencer') && window.CAT_THEMES.Influencer.indexOf(slug) >= 0) return true;
    return false;
  };
})();
