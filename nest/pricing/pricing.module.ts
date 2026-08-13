import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

// Spring의 도메인 패키지/설정에 대응 — 이 도메인의 Controller/Service를 묶는다.
@Module({
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
