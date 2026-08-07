import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 기존 크레딧 로직 재사용(중복 금지) — DB 접근·계산은 레거시 credit.service.js / team.credit.js가 담당.
//   Nest는 이 로직을 @Injectable 서비스로 감싸 컨트롤러에 주입한다(점진 이관).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const creditService = require(path.join(__dirname, '..', '..', 'src', 'credits', 'credit.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const teamCredit = require(path.join(__dirname, '..', '..', 'src', 'teams', 'team.credit.js'));

@Injectable()
export class CreditsService {
  // GET /api/credits — 현재 컨텍스트(개인/팀) 잔액 + 포인트 + 가격표. admin(개인)만 unlimited.
  async overview(user: { id: string; role: string }) {
    const ctx = await teamCredit.resolveContext(user.id);
    const isTeam = ctx.type === 'team';
    const balance = isTeam
      ? await teamCredit.getBalance(ctx.teamId)
      : await creditService.getBalance(user.id);
    return {
      balance,
      points: await creditService.getPoints(user.id),
      unlimited: !isTeam && user.role === 'admin',
      costs: creditService.COSTS,
      context: isTeam
        ? { type: 'team', teamId: ctx.teamId, teamName: ctx.teamName, role: ctx.role }
        : { type: 'personal' },
    };
  }

  exchange(userId: string, amount: any) {
    return creditService.exchangePointsToCredits(userId, amount);
  }

  pointLedger(userId: string, limit: number) {
    return creditService.getPointLedger(userId, limit);
  }

  ledger(userId: string, limit: number) {
    return creditService.getLedger(userId, limit);
  }
}
