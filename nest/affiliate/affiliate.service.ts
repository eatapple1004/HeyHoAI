import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { AffiliateRepository } from './affiliate.repository';
import { AffiliateStatsDto } from './dto/affiliate.dto';

// 크레딧 적립은 아직 이식 전 — credits 도메인 이식 시 함께 정리한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const creditService = require(path.join(__dirname, '..', '..', 'src', 'credits', 'credit.service.js'));

/** 추천인은 피추천인 구매 크레딧의 30%를 크레딧으로 받는다 */
export const COMMISSION_RATE = 0.3;

@Injectable()
export class AffiliateService {
  constructor(private readonly repo: AffiliateRepository) {}

  /** 추천 링크 클릭 기록 — 유효한 코드일 때만 */
  async recordClick(code: string): Promise<boolean> {
    const u = await this.repo.findUserByCode(code);
    if (!u) return false;
    await this.repo.insertClick(code);
    return true;
  }

  /** 가입 시 추천 관계 연결 — 자기 자신은 제외 */
  async linkReferral(code: string, newUserId: string): Promise<void> {
    const referrer = await this.repo.findUserByCode(code);
    if (!referrer || referrer.id === newUserId) return;
    await this.repo.linkReferral(referrer.id, newUserId, code);
  }

  /** 구매 발생 시 커미션 지급(크레딧) */
  async payCommission(buyerUserId: string, purchasedCredits: number, refId?: string): Promise<void> {
    const ref = await this.repo.findReferralByReferred(buyerUserId);
    if (!ref) return;
    const commission = Math.round(purchasedCredits * COMMISSION_RATE);
    if (commission <= 0) return;
    await creditService.addCredits(ref.referrer_id, commission, {
      type: 'referral_commission',
      description: `추천 커미션 (구매 ◈${purchasedCredits}의 30%)`,
      refId,
    });
    await this.repo.addCommission(ref.id, commission);
  }

  /** 내 추천 코드 + 통계 */
  async getStats(userId: string): Promise<AffiliateStatsDto> {
    const code = await this.repo.ensureReferralCode(userId);
    const clicks = await this.repo.countClicks(code as string);
    const refs = await this.repo.signupStats(userId);
    return {
      code: code as string,
      clicks,
      signups: parseInt(refs.signups, 10),
      earnedCredits: parseInt(refs.earned, 10),
      commissionRate: COMMISSION_RATE,
    };
  }
}
