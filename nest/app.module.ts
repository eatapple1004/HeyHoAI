import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PricingModule } from './pricing/pricing.module';

// NestJS 이관 루트 모듈 — 포팅한 도메인 모듈을 여기 imports에 하나씩 추가한다.
//   (다음: CreditsModule → ... 순으로 strangler 이관)
@Module({
  imports: [PricingModule],
  controllers: [HealthController],
})
export class AppModule {}
