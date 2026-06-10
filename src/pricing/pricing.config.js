/**
 * Doppia — 서버측 가격 단일 소스 (canonical pricing config, server-authoritative)
 *
 * ⚠️ 모든 가격 숫자 = 추정 placeholder. 엔진 실원가(COGS)가 확정되기 전까지의 잠정값이다.
 *    실제 운영가는 src/studio/costMeter.js 추정 단가 → BACKEND_HANDOFF.md §6 실원가 로깅으로
 *    확정한 뒤, "여기만" 수정하면 GET /api/pricing 을 통해 landing/billing/studio 전 페이지가
 *    자동으로 일관 반영된다.
 *
 * 값은 public/js/pricing.js 의 임베드 PRICING(동기 폴백)과 정확히 일치해야 한다.
 * 프론트는 로드시 GET /api/pricing 으로 이 객체를 받아 폴백 값을 덮어쓴다.
 */

const PRICING = {
  // --- 메타 (추정 표식) ---
  estimated: true,
  source: 'placeholder',
  basis: 'costMeter(src/studio/costMeter.js) 추정 단가 기반 — 실프로바이더 청구 확정 전',
  confirmTrigger: 'BACKEND_HANDOFF.md §6 실원가 로깅 후 운영가 확정',

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
};

/** 가격 단일 소스(메타 포함)를 반환. GET /api/pricing 의 응답 본문. */
function getPricing() {
  return PRICING;
}

module.exports = { PRICING, getPricing };
