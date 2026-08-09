import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** 체험 상태 계산에 필요한 행 — 만료 판정은 **DB의 now()** 로 한다(서버 시계 어긋남 방지) */
export interface TrialRowVo {
  readonly is_trial: boolean;
  readonly company_name: string | null;
  readonly trial_started_at: string | null;
  readonly trial_days: number;
  readonly trial_image_quota: number;
  readonly credit_balance: number;
  readonly expires_at: string | null;
  readonly now: string;
}

/** 관리자 목록용 — 위에 계정 식별 정보가 더 붙는다 */
export interface TrialListRowVo extends TrialRowVo {
  readonly id: string;
  readonly email: string;
  readonly status: string;
  readonly created_at: string;
}

const STATUS_SELECT = `
  SELECT is_trial, company_name, trial_started_at, trial_days, trial_image_quota, credit_balance,
         (trial_started_at + (trial_days || ' days')::interval) AS expires_at, now() AS now
    FROM users WHERE id = $1`;

@Injectable()
export class TrialRepository {
  constructor(private readonly db: DbService) {}

  async emailExists(email: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    return r.rowCount > 0;
  }

  /** 체험 계정 생성 — trial_image_quota는 **발급 토큰 표시용**(옛 '장수 한도'에서 용도 변경) */
  async insertTrialUser(d: {
    email: string; passwordHash: string; company: string; days: number; credits: number;
  }): Promise<{ id: string; email: string; company_name: string }> {
    const r = await this.db.query<{ id: string; email: string; company_name: string }>(
      `INSERT INTO users (email, password_hash, display_name, company_name, role, status,
          is_trial, trial_days, trial_image_quota, trial_image_used, credit_balance)
       VALUES ($1,$2,$3,$3,'user','active', true,$4,$5,0,0)
       RETURNING id, email, company_name`,
      [d.email, d.passwordHash, d.company, d.days, d.credits]);
    return r.rows[0];
  }

  /** 첫 로그인에만 찍힌다 — `trial_started_at IS NULL` 조건이 카운트 재시작을 막는다 */
  async startTrialIfNeeded(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET trial_started_at = now(), updated_at = now()
        WHERE id = $1 AND is_trial = true AND trial_started_at IS NULL`, [userId]).catch(() => {});
  }

  async findStatusRow(userId: string): Promise<TrialRowVo | null> {
    const r = await this.db.query<TrialRowVo>(STATUS_SELECT, [userId]);
    return r.rows[0] || null;
  }

  async listTrialRows(): Promise<TrialListRowVo[]> {
    const r = await this.db.query<TrialListRowVo>(
      `SELECT id, email, company_name, status, created_at, trial_started_at, trial_days,
              trial_image_quota, credit_balance,
              (trial_started_at + (trial_days || ' days')::interval) AS expires_at, now() AS now
         FROM users WHERE is_trial = true ORDER BY created_at DESC`);
    return r.rows;
  }

  async isTrial(userId: string): Promise<boolean> {
    const r = await this.db.query<{ is_trial: boolean }>('SELECT is_trial FROM users WHERE id = $1', [userId]);
    return !!(r.rows[0] && r.rows[0].is_trial);
  }

  /** 발급액 표시(trial_image_quota)도 함께 올려야 관리자 목록의 사용량 바가 맞는다 */
  async addGrantedQuota(userId: string, amount: number): Promise<{ credit_balance: number; trial_image_quota: number }> {
    const r = await this.db.query<{ credit_balance: number; trial_image_quota: number }>(
      `UPDATE users SET trial_image_quota = trial_image_quota + $2, updated_at = now()
        WHERE id = $1 RETURNING credit_balance, trial_image_quota`, [userId, amount]);
    return r.rows[0];
  }

  async setStatus(userId: string, status: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET status = $2, updated_at = now() WHERE id = $1 AND is_trial = true`, [userId, status]);
  }

  async setDays(userId: string, days: number): Promise<void> {
    await this.db.query(
      'UPDATE users SET trial_days = $2, updated_at = now() WHERE id = $1 AND is_trial = true', [userId, days]);
  }
}
