import { Global, Module } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { CreditRepository } from './credit.repository';
import { TeamCreditRepository } from '../teams/team-credit.repository';
import { TeamCreditService } from '../teams/team-credit.service';

/**
 * 지갑(개인 크레딧 + 팀 풀) 전역 모듈.
 *
 * 크레딧 차감은 생성·팩·마켓 등 거의 모든 도메인이 쓰기 때문에, 모듈마다 프로바이더를 복사하면
 * 하나 빠뜨렸을 때 **부팅 시점 DI 에러**로만 드러난다(실제로 겪음). DbModule과 같이 전역으로 둔다.
 */
@Global()
@Module({
  providers: [CreditsService, CreditRepository, TeamCreditService, TeamCreditRepository],
  exports: [CreditsService, CreditRepository, TeamCreditService, TeamCreditRepository],
})
export class WalletModule {}
