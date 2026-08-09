import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { TeamLedgerEntryVo } from '../common/vo/ledger.vo';
import { WorkContextVo } from './vo/work-context.vo';
import { TeamRole } from './vo/team.vo';

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * 팀 크레딧 풀 데이터 접근 — teams.credit_balance · team_credit_ledger.
 *
 * ⚠️ 잔액 변경은 **반드시** `SELECT ... FOR UPDATE` 로 행을 잠근 뒤 같은 트랜잭션에서
 *   UPDATE + ledger INSERT 까지 끝낸다. 잠금 없이 읽고 쓰면 동시 생성 2건이 같은 잔액을 읽어
 *   한 번만 차감되고(크레딧 증발), ledger만 남아 정산이 어긋난다.
 */
@Injectable()
export class TeamCreditRepository {
  constructor(private readonly db: DbService) {}

  async getBalance(teamId: string): Promise<number> {
    const r = await this.db.query<{ credit_balance: number }>(
      'SELECT credit_balance FROM teams WHERE id = $1', [teamId]);
    return r.rows[0] ? r.rows[0].credit_balance : 0;
  }

  async getLedger(teamId: string, limit = 50): Promise<TeamLedgerEntryVo[]> {
    const r = await this.db.query<TeamLedgerEntryVo>(
      `SELECT id, actor_id, amount, balance_after, type, description, ref_id, created_at
         FROM team_credit_ledger WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [teamId, limit]);
    return r.rows;
  }

  /** 트랜잭션 내 잔액 증감 — 차감 후 음수면 402로 막는다(외상 금지) */
  private async applyDeltaTx(
    client: any, teamId: string, delta: number,
    o: { actorId?: string | null; type: string; description?: string; refId?: string | null },
  ): Promise<number> {
    const { actorId = null, type, description = '', refId = null } = o;
    const cur = await client.query('SELECT credit_balance FROM teams WHERE id = $1 FOR UPDATE', [teamId]);
    if (cur.rowCount === 0) throw httpError(404, '팀을 찾을 수 없습니다.');
    const after = cur.rows[0].credit_balance + delta;
    if (after < 0) {
      throw httpError(402, `팀 크레딧이 부족합니다. (보유 ◈${cur.rows[0].credit_balance} / 필요 ◈${-delta})`);
    }
    await client.query('UPDATE teams SET credit_balance = $1 WHERE id = $2', [after, teamId]);
    await client.query(
      `INSERT INTO team_credit_ledger (team_id, actor_id, amount, balance_after, type, description, ref_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [teamId, actorId, delta, after, type, description, refId]);
    return after;
  }

  /** 단독 트랜잭션 증감(적립은 +, 차감은 -) */
  async applyDelta(
    teamId: string, delta: number,
    o: { actorId?: string | null; type: string; description?: string; refId?: string | null },
  ): Promise<number> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const after = await this.applyDeltaTx(client, teamId, delta, o);
      await client.query('COMMIT');
      return after;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * 개인 → 팀 이체. users·teams 두 테이블을 **한 트랜잭션**으로 묶어야 하므로
   * (중간에 끊기면 개인만 차감되고 팀엔 안 들어가는 크레딧 증발) 여기 함께 둔다.
   */
  async transferFromUser(userId: string, teamId: string, amount: number) {
    if (!(amount > 0)) throw httpError(400, '이체 금액은 1 이상이어야 합니다.');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query('SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (u.rowCount === 0) throw httpError(404, 'User not found');
      const uAfter = u.rows[0].credit_balance - amount;
      if (uAfter < 0) throw httpError(402, `개인 크레딧이 부족합니다. (보유 ◈${u.rows[0].credit_balance})`);
      await client.query('UPDATE users SET credit_balance = $1, updated_at = now() WHERE id = $2', [uAfter, userId]);
      await client.query(
        `INSERT INTO credit_ledger (user_id, amount, balance_after, type, description, ref_id)
         VALUES ($1, $2, $3, 'team_transfer', $4, $5)`,
        [userId, -amount, uAfter, `팀으로 이체 ◈${amount}`, teamId]);
      const tAfter = await this.applyDeltaTx(client, teamId, amount, {
        actorId: userId, type: 'transfer_in', description: `개인 크레딧 이체 ◈${amount}`, refId: userId,
      });
      await client.query('COMMIT');
      return { userBalance: uAfter, teamBalance: tAfter };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * 활성 작업 컨텍스트 — 활성 팀이 있어도 **여전히 멤버일 때만** team.
   * (탈퇴/추방된 뒤 active_team_id가 남아 있어도 남의 팀 지갑을 쓰지 못하게 한다.)
   */
  async resolveContext(userId: string): Promise<WorkContextVo> {
    const r = await this.db.query<{ active_team_id: string | null; team_name: string | null; role: TeamRole | null }>(
      `SELECT u.active_team_id, t.name AS team_name, tm.role
         FROM users u
         LEFT JOIN teams t ON t.id = u.active_team_id
         LEFT JOIN team_members tm ON tm.team_id = u.active_team_id AND tm.user_id = u.id
        WHERE u.id = $1`, [userId]);
    const row = r.rows[0];
    if (row && row.active_team_id && row.role) {
      return { type: 'team', teamId: row.active_team_id, teamName: row.team_name || '', role: row.role };
    }
    return { type: 'personal' };
  }
}
