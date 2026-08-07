import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

// NestJS 이관 루트 모듈 — 포팅한 도메인 모듈을 여기 imports에 하나씩 추가한다.
//   (예: 다음 단계에서 PricingModule → CreditsModule → ... 순으로 strangler 이관)
@Module({
  controllers: [HealthController],
})
export class AppModule {}
