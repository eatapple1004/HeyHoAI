/* (2026-07-02) 테마 taxonomy 공용 단일소스 — Studio(studio.html) + Library(gallery.html) 공유.
 * P2(카테고리 상수 2벌)·isThemeVisible·OFFICIAL_THEME_MAP 중복 제거. 여기만 고치면 양쪽 자동 반영.
 * ⚠️ 인라인 스크립트보다 먼저 로드돼야 함(non-defer, THEME_GROUP_OF 등 top-level에서 즉시 사용). */
(function () {
  // 노출 카테고리(테마) — Shopping이 활성 모드. jewelry·pet·food·coffee·home·tech 숨김. Influencer/UGC는 flag로 숨김·재활성 대비 매핑 보존.
  window.CAT_THEMES = {
    Influencer: ['people'],
    Shopping:   ['beauty', 'fashion', 'general'],
    UGC:        ['people', 'beauty', 'fashion', 'food', 'pet', 'ugc', 'general'],
  };
  // Library 필터 그룹(비겹침) — CAT_THEMES에서 파생(단일소스).
  window.CAT_GROUPS = [['Influencer', window.CAT_THEMES.Influencer], ['Shopping', window.CAT_THEMES.Shopping]];
  // 공식 recipe→theme 매핑(migrate.js OFFICIAL_THEME 미러). 공식은 recipe 카드라 themes 필드가 없어 studio가 이걸로 주입.
  window.OFFICIAL_THEME_MAP = {
    'stone-plinth-luxe': 'beauty', 'noir-gold-hero': 'beauty', 'dewy-glass-hero': 'beauty',
    'ring-editorial-campaign': 'jewelry', 'bracelet-editorial-campaign': 'jewelry',
    'top-down-hero': 'food', 'void-hero-cut': 'tech', 'pet-product-hero': 'pet',
  };
  // 보이는 테마 = 노출 매크로그룹(Shopping, Influencer는 flag) 안의 slug만. 숨긴 테마면 false → 그 테마에만 속한 콘텐츠는 Studio·Library 어디서도 안 보임. 커스텀 테마는 id라 여기 안 옴(항상 visible).
  window.isThemeVisible = function (slug) {
    if (window.CAT_THEMES.Shopping.indexOf(slug) >= 0) return true;
    if (typeof featureOn === 'function' && featureOn('influencer') && window.CAT_THEMES.Influencer.indexOf(slug) >= 0) return true;
    return false;
  };
})();
