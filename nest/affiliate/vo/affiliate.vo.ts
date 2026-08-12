/** 추천 관련 DB 행(VO) — users.referral_code / referrals */
export interface ReferralUserVo {
  readonly id: string;
  readonly referral_code: string | null;
}
export interface ReferralVo {
  readonly id: string;
  readonly referrer_id: string;
}
