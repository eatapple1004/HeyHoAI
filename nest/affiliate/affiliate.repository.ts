import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ReferralUserVo, ReferralVo } from './vo/affiliate.vo';

/** 추천(어필리에이트) 데이터 접근 — users.referral_code · referral_clicks · referrals */
@Injectable()
export class AffiliateRepository {
  constructor(private readonly db: DbService) {}

  async findUserByCode(code: string): Promise<ReferralUserVo | null> {
    if (!code) return null;
    const r = await this.db.query<ReferralUserVo>(
      'SELECT id, referral_code FROM users WHERE referral_code = $1', [code],
    );
    return r.rows[0] || null;
  }

  async insertClick(code: string): Promise<void> {
    await this.db.query('INSERT INTO referral_clicks (code) VALUES ($1)', [code]);
  }

  /** 추천 관계 연결 — 한 사람은 한 번만 추천될 수 있다(ON CONFLICT DO NOTHING) */
  async linkReferral(referrerId: string, newUserId: string, code: string): Promise<void> {
    await this.db.query(
      `INSERT INTO referrals (referrer_id, referred_user_id, code)
       VALUES ($1, $2, $3) ON CONFLICT (referred_user_id) DO NOTHING`,
      [referrerId, newUserId, code],
    ).catch(() => {});
  }

  async findReferralByReferred(userId: string): Promise<ReferralVo | null> {
    const r = await this.db.query<ReferralVo>(
      'SELECT id, referrer_id FROM referrals WHERE referred_user_id = $1', [userId],
    );
    return r.rows[0] || null;
  }

  async addCommission(referralId: string, amount: number): Promise<void> {
    await this.db.query(
      'UPDATE referrals SET commission_earned = commission_earned + $1 WHERE id = $2', [amount, referralId],
    );
  }

  /** 추천 코드 조회 — 없으면 즉석 발급(구버전 가입자 안전망) */
  async ensureReferralCode(userId: string): Promise<string | undefined> {
    let u = await this.db.query<{ referral_code: string | null }>(
      'SELECT referral_code FROM users WHERE id = $1', [userId],
    );
    if (u.rows[0] && !u.rows[0].referral_code) {
      u = await this.db.query<{ referral_code: string }>(
        `UPDATE users SET referral_code = substr(md5(gen_random_uuid()::text), 1, 8)
         WHERE id = $1 RETURNING referral_code`,
        [userId],
      );
    }
    return u.rows[0]?.referral_code ?? undefined;
  }

  async countClicks(code: string): Promise<number> {
    const r = await this.db.query<{ count: string }>(
      'SELECT count(*) FROM referral_clicks WHERE code = $1', [code],
    );
    return parseInt(r.rows[0].count, 10);
  }

  async signupStats(userId: string): Promise<{ signups: string; earned: string }> {
    const r = await this.db.query<{ signups: string; earned: string }>(
      'SELECT count(*) AS signups, COALESCE(sum(commission_earned),0) AS earned FROM referrals WHERE referrer_id = $1',
      [userId],
    );
    return r.rows[0];
  }
}
