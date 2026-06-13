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
    // 구독 플랜 (price=월, priceY=연간 환산 월요금, cr=월 크레딧)
    plans: {
      free:    { name: 'Free',    price: 0,  priceY: 0,  cr: 10,   license: 'Personal' },
      creator: { name: 'Creator', price: 19, priceY: 15, cr: 250,  license: 'Personal',
                 line: 'No watermark · HD · ◈250/mo' },
      pro:     { name: 'Pro',     price: 39, priceY: 31, cr: 600,  license: 'Personal', featured: true,
                 line: 'Brand kit · 4K · multilingual captions always-on · ◈600/mo' },
      brand:   { name: 'Brand',   price: 79, priceY: 63, cr: 1400, license: 'Commercial',
                 line: 'Commercial license · premium AI models · team seats · ◈1,400/mo' }
    },
    // 일회성 크레딧 팩 (id=결제연동 키, cr=기본, bonus=보너스, price=$, ppc=크레딧당 단가 표기)
    packs: [
      { id: 'pack50',  cr: 50,  bonus: 0,   price: 5,  ppc: '0.100' },
      { id: 'pack120', cr: 100, bonus: 20,  price: 11, ppc: '0.092' },
      { id: 'pack300', cr: 250, bonus: 50,  price: 26, ppc: '0.087' },
      { id: 'pack700', cr: 600, bonus: 100, price: 56, ppc: '0.080', best: true }
    ],
    // 팀 플랜
    team: { price: 199, seats: 3, pool: 2000, extraSeat: 15 },
    // 신규 24h 첫 결제 할인율(%)
    firstMonthOff: 50,
    // 추정 placeholder 표식 — 서버(/api/pricing)가 실값으로 덮어쓸 때까지 true
    estimated: true,

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
