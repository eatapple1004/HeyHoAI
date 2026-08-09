/**
 * 가격표 — public/js/pricing.js 와 같은 단일소스(src/pricing/pricing.config.js)에서 파생.
 * ⚠️ 값은 아직 추정 placeholder(엔진 실원가 확정 전까지 확정 금지).
 */
export interface PricingPlanDto {
  price: number;
  [k: string]: unknown;
}
export interface PricingDto {
  plans: Record<string, PricingPlanDto>;
  /** 첫 달 할인율(%) */
  firstMonthOff?: number;
  [k: string]: unknown;
}
