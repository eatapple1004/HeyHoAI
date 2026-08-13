/** 추천(어필리에이트) 통계 — src/affiliate/affiliate.service.js getStats() */
export interface AffiliateStatsDto {
  code: string;
  clicks: number;
  signups: number;
  earnedCredits: number;
  /** 커미션 비율(0.3) */
  commissionRate: number;
}
