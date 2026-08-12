import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { CreditRepository } from './credit.repository';
import { CreditOverviewDto, PointExchangeResultDto } from './dto/credits.dto';
import { LedgerEntryVo } from '../common/vo/ledger.vo';
import { TeamCreditRepository } from '../teams/team-credit.repository';

/**
 * ⚠️ **가격표(COSTS·imageCost·videoCost 등)는 이식하지 않고 단일소스를 그대로 쓴다.**
 *    값을 복제하면 한쪽만 바뀌었을 때 청구액이 갈린다(매출 사고). 가격 변경은 언제나 한 곳에서.
 *    docs/생성원가_마진_분석_2026-07-06.md 근거로 산정된 표라 코드 이식 대상이 아니다.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pricing = require(path.join(__dirname, '..', '..', 'src', 'credits', 'credit.service.js'));

/** 차감 결과 — refund()로 되돌릴 수 있다(멱등: 두 번 불러도 한 번만 환불) */
export interface ChargeHandle {
  amount: number;
  balanceAfter: number;
  refund: () => Promise<void>;
}

@Injectable()
export class CreditsService {
  constructor(
    private readonly repo: CreditRepository,
    // 서비스가 아니라 **리포지토리**를 주입한다 — TeamCreditService가 CreditsService를 쓰므로
    // 서비스끼리 주입하면 순환 의존이 된다(forwardRef 없이 푸는 방향).
    private readonly teamCredit: TeamCreditRepository,
  ) {}

  /** 현재 컨텍스트(개인/팀) 잔액 + 포인트 + 가격표. admin(개인)만 unlimited */
  async overview(user: { id: string; role: string }): Promise<CreditOverviewDto> {
    const ctx = await this.teamCredit.resolveContext(user.id);
    const isTeam = ctx.type === 'team';
    const balance = isTeam ? await this.teamCredit.getBalance(ctx.teamId) : await this.repo.getBalance(user.id);
    return {
      balance,
      points: await this.repo.getPoints(user.id),
      unlimited: !isTeam && user.role === 'admin',
      costs: pricing.COSTS,
      context: isTeam
        ? { type: 'team', teamId: ctx.teamId, teamName: ctx.teamName, role: ctx.role }
        : { type: 'personal' },
    };
  }

  /** 개인 잔액 */
  getBalance(userId: string): Promise<number> {
    return this.repo.getBalance(userId);
  }

  ledger(userId: string, limit: number): Promise<LedgerEntryVo[]> {
    return this.repo.getLedger(userId, limit);
  }

  pointLedger(userId: string, limit: number): Promise<LedgerEntryVo[]> {
    return this.repo.getPointLedger(userId, limit);
  }

  /** 포인트 → 크레딧 교환(1:1) */
  exchange(userId: string, amount: unknown): Promise<PointExchangeResultDto> {
    const amt = Math.floor(Math.abs(parseInt(String(amount), 10) || 0));
    if (amt <= 0) throw Object.assign(new Error('교환할 포인트 수량을 입력하세요.'), { statusCode: 400 });
    return this.repo.exchangePointsToCredits(userId, amt);
  }

  addCredits(userId: string, amount: number, o: { type: string; description?: string; refId?: string | null }) {
    return this.repo.applyDelta(userId, Math.abs(amount), o);
  }

  addPoints(userId: string, amount: number, o: { type: string; description?: string; refId?: string | null }) {
    return this.repo.applyPointDelta(userId, Math.abs(amount), o);
  }

  /**
   * 차감 — **admin은 무과금**(운영 계정), 0 이하도 무시.
   * 반환된 handle.refund()로 되돌릴 수 있다(생성 실패 시 환불 경로).
   */
  async charge(
    user: { id: string; role?: string } | null,
    amount: number,
    o: { type?: string; description?: string; refId?: string | null } = {},
  ): Promise<ChargeHandle | null> {
    if (!user || user.role === 'admin') return null;
    if (amount <= 0) return null;
    const { type = 'generation', description = '', refId = null } = o;
    const balanceAfter = await this.repo.applyDelta(user.id, -amount, { type, description, refId });
    let refunded = false;
    return {
      amount,
      balanceAfter,
      refund: async () => {
        if (refunded) return;   // 멱등 — 중복 환불 방지
        refunded = true;
        await this.addCredits(user.id, amount, {
          type: 'refund', description: `환불: ${description}`, refId,
        }).catch(() => {});
      },
    };
  }

  /** 가입 보너스 — 금액은 단일소스(SIGNUP_BONUS) */
  grantSignupBonus(userId: string) {
    return this.addCredits(userId, pricing.SIGNUP_BONUS, {
      type: 'signup_bonus', description: `가입 보너스 ◈${pricing.SIGNUP_BONUS}`,
    });
  }

  // ── 가격 계산(단일소스 위임) ──
  imageCost(model: string, count?: number, isTemplate?: boolean): number {
    return pricing.imageCost(model, count, isTemplate);
  }
  videoCost(duration: number | string, mode?: string, isTemplate?: boolean): number {
    return pricing.videoCost(duration, mode, isTemplate);
  }
}
