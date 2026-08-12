/** 구독/플랜 응답 계약 — src/subscription/subscription.service.js getSubscription() 반환 형태 */

/** 플랜별 권한 — lib/entitlements.js 의 entitlementsFor() 결과 중 노출분 */
export interface EntitlementsDto {
  monthlyCredits: number;
  watermarkFree: boolean;
  hd: boolean;
  commercial: boolean;
  privateMode: boolean;
}

/** 24시간 첫 업그레이드 오퍼 — 비활성이면 active=false 만 온다 */
export interface UpgradeOfferDto {
  active: boolean;
  discountPct: number;
  plan: string;
  /** active=true 일 때만 */
  listPrice?: number;
  offerPrice?: number;
  expiresAt?: string;
  secondsLeft?: number;
}

export interface SubscriptionDto {
  plan: string;
  planName: string;
  isPro: boolean;
  /** 플랜 키 → 월 USD (pricing.config 단일소스에서 파생) */
  prices: Record<string, number>;
  entitlements: EntitlementsDto;
  renewsAt: string | null;
  offer: UpgradeOfferDto;
}

/** 기간권(선불) 활성화 결과 — 현재 admin 수동만 */
export interface ActivatePlanResultDto {
  plan: string;
  expiresAt: string;
  months: number;
  creditsGranted: number;
  /** 기존 패스에 이어붙였는지 */
  extended: boolean;
  /** 상위 등급으로 올라갔는지 */
  upgraded: boolean;
}

/** POST /api/subscription/upgrade 요청 — 지금은 admin만 통과(비admin 501) */
export class UpgradePlanDto {
  plan: string = 'pro';
  months: number = 3;
}
