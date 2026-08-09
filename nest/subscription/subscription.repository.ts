import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** 구독/플랜 데이터 접근 — users.plan · plan_renews_at · pro_offer_started_at */
@Injectable()
export class SubscriptionRepository {
  constructor(private readonly db: DbService) {}

  async findPlan(userId: string) {
    const r = await this.db.query<{ plan: string; pro_offer_started_at: string | null; plan_renews_at: string | null }>(
      'SELECT plan, pro_offer_started_at, plan_renews_at FROM users WHERE id = $1', [userId]);
    return r.rows[0] || ({} as any);
  }

  async findPlanForActivation(userId: string) {
    const r = await this.db.query<{ plan: string; plan_renews_at: string | null }>(
      'SELECT plan, plan_renews_at FROM users WHERE id = $1', [userId]);
    return r.rows[0] || null;
  }

  /** 24h 오퍼 시작 — 멱등(이미 시작했으면 기존 시각 유지), free 사용자만 대상 */
  async startOffer(userId: string, startedAtIso: string): Promise<string | null> {
    await this.db.query(
      `UPDATE users SET pro_offer_started_at = COALESCE(pro_offer_started_at, $2)
       WHERE id = $1 AND plan = 'free'`, [userId, startedAtIso]);
    const r = await this.db.query<{ pro_offer_started_at: string | null }>(
      'SELECT pro_offer_started_at FROM users WHERE id = $1', [userId]);
    return r.rows[0]?.pro_offer_started_at || null;
  }

  /** 기간권 활성화 — plan_renews_at = 만료일(자동 재청구 없음) */
  async activatePlan(userId: string, plan: string, expiresAtIso: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET plan = $2, plan_renews_at = $3, updated_at = now() WHERE id = $1',
      [userId, plan, expiresAtIso]);
  }
}
