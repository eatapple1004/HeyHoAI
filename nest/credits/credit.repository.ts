import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { LedgerEntryVo } from '../common/vo/ledger.vo';

/**
 * 크레딧·포인트 데이터 접근 — users.credit_balance / point_balance + credit_ledger / point_ledger.
 *
 * ⚠️ 잔액 변경은 **전부 트랜잭션 + SELECT ... FOR UPDATE**로 행을 잠그고 처리한다.
 *    동시 생성 요청이 같은 잔액을 읽고 각자 차감하면 마이너스가 되거나 원장이 어긋난다.
 *    잔액과 원장은 **항상 같은 트랜잭션**에서 함께 쓴다(원장 = 잔액 변동의 유일한 근거).
 */
@Injectable()
export class CreditRepository {
  constructor(private readonly db: DbService) {}

  async getBalance(userId: string): Promise<number> {
    const r = await this.db.query<{ credit_balance: number }>(
      'SELECT credit_balance FROM users WHERE id = $1', [userId]);
    return r.rows[0] ? r.rows[0].credit_balance : 0;
  }

  async getPoints(userId: string): Promise<number> {
    const r = await this.db.query<{ point_balance: number }>(
      'SELECT point_balance FROM users WHERE id = $1', [userId]);
    return r.rows[0] ? r.rows[0].point_balance : 0;
  }

  async getLedger(userId: string, limit = 50): Promise<LedgerEntryVo[]> {
    const r = await this.db.query<LedgerEntryVo>(
      `SELECT id, amount, balance_after, type, description, ref_id, created_at
       FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    return r.rows;
  }

  async getPointLedger(userId: string, limit = 50): Promise<LedgerEntryVo[]> {
    const r = await this.db.query<LedgerEntryVo>(
      `SELECT id, amount, balance_after, type, description, ref_id, created_at
       FROM point_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    return r.rows;
  }

  /**
   * 크레딧 증감 — 잔액 잠금 → 검사 → 갱신 → 원장 기록을 한 트랜잭션으로.
   * 결과 잔액이 음수면 402를 던지고 롤백한다(부분 차감이 남지 않는다).
   */
  async applyDelta(
    userId: string, delta: number,
    o: { type: string; description?: string; refId?: string | null },
  ): Promise<number> {
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query(
        'SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (cur.rowCount === 0) throw new Error('User not found');
      const balance = cur.rows[0].credit_balance;
      const after = balance + delta;
      if (after < 0) {
        throw Object.assign(
          new Error(`크레딧이 부족합니다. (보유 ◈${balance} / 필요 ◈${-delta})`),
          { statusCode: 402 },
        );
      }
      await client.query('UPDATE users SET credit_balance = $1, updated_at = now() WHERE id = $2', [after, userId]);
      await client.query(
        `INSERT INTO credit_ledger (user_id, amount, balance_after, type, description, ref_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, delta, after, o.type, o.description || '', o.refId ?? null]);
      await client.query('COMMIT');
      return after;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /** 포인트(로열티) 증감 — 크레딧과 같은 잠금 규약 */
  async applyPointDelta(
    userId: string, delta: number,
    o: { type: string; description?: string; refId?: string | null },
  ): Promise<number> {
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query('SELECT point_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (cur.rowCount === 0) throw new Error('User not found');
      const after = cur.rows[0].point_balance + delta;
      if (after < 0) throw Object.assign(new Error('포인트가 부족합니다.'), { statusCode: 402 });
      await client.query('UPDATE users SET point_balance = $1, updated_at = now() WHERE id = $2', [after, userId]);
      await client.query(
        `INSERT INTO point_ledger (user_id, amount, balance_after, type, description, ref_id) VALUES ($1,$2,$3,$4,$5,$6)`,
        [userId, delta, after, o.type, o.description || '', o.refId ?? null]);
      await client.query('COMMIT');
      return after;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 포인트 → 크레딧 교환(1:1). 두 잔액을 **한 트랜잭션**에서 옮기고 원장 두 줄을 남긴다.
   * (따로 처리하면 한쪽만 반영되는 순간이 생긴다)
   */
  async exchangePointsToCredits(userId: string, amt: number) {
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query(
        'SELECT point_balance, credit_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (u.rowCount === 0) throw new Error('User not found');
      const { point_balance, credit_balance } = u.rows[0];
      if (point_balance < amt) {
        throw Object.assign(
          new Error(`포인트가 부족합니다. (보유 ${point_balance} / 요청 ${amt})`), { statusCode: 402 });
      }
      const pAfter = point_balance - amt;
      const cAfter = credit_balance + amt; // 1:1
      await client.query(
        'UPDATE users SET point_balance = $1, credit_balance = $2, updated_at = now() WHERE id = $3',
        [pAfter, cAfter, userId]);
      await client.query(
        `INSERT INTO point_ledger (user_id, amount, balance_after, type, description) VALUES ($1,$2,$3,'exchange','포인트→크레딧 교환')`,
        [userId, -amt, pAfter]);
      await client.query(
        `INSERT INTO credit_ledger (user_id, amount, balance_after, type, description) VALUES ($1,$2,$3,'point_exchange','포인트 교환 적립')`,
        [userId, amt, cAfter]);
      await client.query('COMMIT');
      return { pointBalance: pAfter, creditBalance: cAfter, exchanged: amt };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}
