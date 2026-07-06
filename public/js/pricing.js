/* Doppia — 단일 가격 소스 (canonical pricing config)
 * ⚠️ 실제 운영 원가(프로바이더 청구 → costMeter.js)가 확정되면 "여기만" 수정하면
 *    landing / billing / studio 전 페이지가 자동으로 일관 반영됩니다.
 * 백엔드 연동 시: 이 객체를 서버 응답(/api/pricing)으로 대체하면 됨.
 *
 * 사용법:
 *  - DOM에 number를 박지 말고 <span data-dp="creator.cr" data-fmt="1"></span> 처럼 표기 → applyDP()가 채움
 *  - JS 로직(studio PLANS 등)은 window.PRICING.plans 를 직접 참조
 */
(function () {
  var PRICING = {
    // 개인 구독 (price=월$, priceY=연간 환산 월요금$, cr=월 크레딧). (2026-07-06) 티어 다양화 + 30배. 작은 플랜=비쌈→큰 플랜=쌈.
    plans: {
      free:     { name: 'Free',     price: 0,   priceY: 0,   cr: 1500,  license: 'Personal' },
      starter:  { name: 'Starter',  price: 19,  priceY: 16,  cr: 7300,  license: 'Personal',
                  line: 'No watermark · group lookbook · ◈7,300/mo' },
      standard: { name: 'Standard', price: 49,  priceY: 41,  cr: 20300, license: 'Personal', featured: true,
                  line: 'Edit · 2K · 4 slots · ◈20,300/mo' },
      pro:      { name: 'Pro',      price: 99,  priceY: 82,  cr: 44000, license: 'Personal',
                  line: 'Concept cut · 5 slots · ◈44,000/mo' },
      premium:  { name: 'Premium',  price: 199, priceY: 165, cr: 95000, license: 'Commercial',
                  line: 'Video · 6 slots · commercial · ◈95,000/mo' }
    },
    // 기업 (연간 결제, price=월환산$, cr=월 크레딧). 볼륨 최저가.
    enterprise: {
      team:  { name: 'Enterprise Team', price: 599,  cr: 362000, slots: 10, line: 'Team roles · shared pool · 10 slots' },
      pro:   { name: 'Enterprise Pro',  price: 899,  cr: 575000, slots: 15, featured: true, line: 'Everything · 15 slots · priority' },
      elite: { name: 'Elite',           price: 1199, cr: 813000, slots: 20, line: 'Max scale · 20 slots · dedicated support' }
    },
    // 일회성 크레딧 팩 (id=결제연동 키, cr=기본, bonus=보너스, price=$). 충동성=최고가.
    packs: [
      { id: 'pack9',   cr: 3000,   bonus: 400,   price: 9,   ppc: '0.0026' },
      { id: 'pack49',  cr: 17000,  bonus: 2200,  price: 49,  ppc: '0.0026' },
      { id: 'pack199', cr: 72000,  bonus: 7500,  price: 199, ppc: '0.0025' },
      { id: 'pack349', cr: 128000, bonus: 14000, price: 349, ppc: '0.0025', best: true }
    ],
    // 신규 24h 첫 결제 할인율(%)
    firstMonthOff: 50,
    // 확정가 — 실원가 재검증(2026-07-06, docs/생성원가_마진_분석). 커스텀 2~3배/템플릿 4~6배 + 크레딧 30배. 서버(/api/pricing)가 동일값으로 덮어씀.
    estimated: false,

    // path 조회: PRICING.get('creator.cr') → 250
    get: function (path) {
      return path.split('.').reduce(function (o, k) { return o && o[k]; }, PRICING);
    },
    fmt: function (n) {
      var v = (typeof n === 'number') ? n : (parseInt(n, 10) || 0);
      return v.toLocaleString();
    }
  };

  // [data-dp="creator.cr"] 요소를 PRICING 값으로 채움 (data-fmt="1"이면 천단위 콤마)
  function applyDP() {
    document.querySelectorAll('[data-dp]').forEach(function (el) {
      var v = PRICING.get(el.getAttribute('data-dp'));
      if (v != null) el.textContent = (el.dataset.fmt === '1') ? PRICING.fmt(v) : v;
    });
  }

  // 서버 주도 단일 소스: /api/pricing 성공 시 임베드 값을 서버 값으로 덮어쓰고 재적용.
  // 실패(정적 호스팅·오프라인 등) 시 위 임베드 PRICING을 그대로 동기 폴백으로 사용.
  function hydrateFromServer() {
    if (typeof fetch !== 'function') return;
    fetch('/api/pricing', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (s) {
        if (!s || typeof s !== 'object') return;
        if (s.plans) PRICING.plans = s.plans;
        if (s.enterprise) PRICING.enterprise = s.enterprise;
        if (s.packs) PRICING.packs = s.packs;
        if (s.team) PRICING.team = s.team;
        if (typeof s.firstMonthOff === 'number') PRICING.firstMonthOff = s.firstMonthOff;
        if (typeof s.estimated === 'boolean') PRICING.estimated = s.estimated;
        applyDP();
      })
      .catch(function () { /* 조용히 폴백 */ });
  }

  window.PRICING = PRICING;
  window.applyDP = applyDP;
  if (document.readyState !== 'loading') applyDP();
  else document.addEventListener('DOMContentLoaded', applyDP);
  hydrateFromServer();
})();
