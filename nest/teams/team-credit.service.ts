import { Injectable } from '@nestjs/common';
import { TeamCreditRepository } from './team-credit.repository';
import { CreditsService, ChargeHandle } from '../credits/credits.service';

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * 팀 지갑 + **컨텍스트 인지 과금**.
 * 호출부(생성 라우트)는 개인인지 팀인지 몰라도 되게, 여기서 활성 컨텍스트를 보고 지갑을 고른다.
 */
@Injectable()
export class TeamCreditService {
  constructor(
    private readonly repo: TeamCreditRepository,
    private readonly credits: CreditsService,
  ) {}

  getBalance(teamId: string) { return this.repo.getBalance(teamId); }
  getLedger(teamId: string, limit = 50) { return this.repo.getLedger(teamId, limit); }
  resolveContext(userId: string) { return this.repo.resolveContext(userId); }
  transferFromUser(userId: string, teamId: string, amount: number) {
    return this.repo.transferFromUser(userId, teamId, amount);
  }

  addCredits(teamId: string, amount: number, o: { actorId?: string | null; type: string; description?: string; refId?: string | null }) {
    return this.repo.applyDelta(teamId, Math.abs(amount), o);
  }

  /** 팀 풀 차감 + 환불 핸들(멱등) */
  async charge(teamId: string, amount: number, o: { actorId?: string | null; description?: string; refId?: string | null }): Promise<ChargeHandle> {
    const { actorId = null, description = '', refId = null } = o;
    const balanceAfter = await this.repo.applyDelta(teamId, -amount, {
      actorId, type: 'generation', description, refId,
    });
    let refunded = false;
    return {
      amount, balanceAfter,
      refund: async () => {
        if (refunded) return;
        refunded = true;
        await this.addCredits(teamId, amount, {
          actorId, type: 'refund', description: `환불: ${description}`, refId,
        }).catch(() => {});
      },
    };
  }

  /**
   * 활성 컨텍스트로 생성비 차감.
   *  · 팀 → 팀 풀에서. **viewer는 403**(읽기 전용 멤버가 팀 돈을 쓰지 못하게)
   *  · 개인 → 개인 잔액(admin은 무과금이라 null)
   * @returns null = 개인 + admin 면제
   */
  async chargeGeneration(user: { id: string; role?: string }, amount: number, description: string, refId: string | null = null): Promise<ChargeHandle | null> {
    const ctx = await this.repo.resolveContext(user.id);
    if (ctx.type === 'team') {
      if (ctx.role === 'viewer') {
        throw httpError(403, 'Viewer는 콘텐츠를 생성할 수 없어요. Editor 이상 권한이 필요합니다.');
      }
      return this.charge(ctx.teamId, amount, { actorId: user.id, description, refId });
    }
    return this.credits.charge(user, amount, { type: 'generation', description, refId });
  }

  /**
   * 부분 환불 — charge().refund()는 전액 전용이라 별도 경로.
   * (일부 컷만 실패했을 때 성공분만 청구하기 위함. 실패해도 생성 결과는 되돌리지 않으므로 조용히 넘긴다.)
   */
  async refundGeneration(user: { id: string }, amount: number, description: string, refId: string | null = null): Promise<void> {
    if (!(amount > 0)) return;
    const ctx = await this.repo.resolveContext(user.id);
    if (ctx.type === 'team') {
      await this.addCredits(ctx.teamId, amount, { actorId: user.id, type: 'refund', description, refId }).catch(() => {});
    } else {
      await this.credits.addCredits(user.id, amount, { type: 'refund', description, refId }).catch(() => {});
    }
  }

  /** 활성 컨텍스트의 현재 잔액 */
  async contextBalance(userId: string): Promise<number> {
    const ctx = await this.repo.resolveContext(userId);
    return ctx.type === 'team' ? this.repo.getBalance(ctx.teamId) : this.credits.getBalance(userId);
  }

  /** 활성 팀 id(개인이면 null) — 생성물 태깅용 */
  async activeTeamId(userId: string): Promise<string | null> {
    const ctx = await this.repo.resolveContext(userId);
    return ctx.type === 'team' ? ctx.teamId : null;
  }
}
