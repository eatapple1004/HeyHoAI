import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PricingModule } from './pricing/pricing.module';
import { CreditsModule } from './credits/credits.module';
import { BillingModule } from './billing/billing.module';

// NestJS 이관 루트 모듈 — 포팅한 도메인 모듈을 여기 imports에 하나씩 추가한다.
@Module({
  imports: [PricingModule, CreditsModule, BillingModule],
  controllers: [HealthController],
})
export class AppModule {}
