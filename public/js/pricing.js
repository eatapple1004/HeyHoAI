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
    // 일회성 크레딧 팩 (cr=기본, bonus=보너스, price=$, ppc=크레딧당 단가 표기)
    packs: [
      { cr: 50,   bonus: 0,   price: 5,   ppc: '0.10' },
      { cr: 200,  bonus: 20,  price: 18,  ppc: '0.082' },
      { cr: 500,  bonus: 80,  price: 40,  ppc: '0.069' },
      { cr: 1500, bonus: 250, price: 110, ppc: '0.063', best: true }
    ],
    // 팀 플랜
    team: { price: 199, seats: 3, pool: 2000, extraSeat: 15 },
    // 신규 24h 첫 결제 할인율(%)
    firstMonthOff: 50,

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

  window.PRICING = PRICING;
  window.applyDP = applyDP;
  if (document.readyState !== 'loading') applyDP();
  else document.addEventListener('DOMContentLoaded', applyDP);
})();
