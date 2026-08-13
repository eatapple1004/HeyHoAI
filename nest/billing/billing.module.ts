import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { EximbayController } from './eximbay.controller';
import { PortoneController } from './portone.controller';
import { BillingService } from './billing.service';
import { EximbayService } from './eximbay.service';
import { PortoneService } from './portone.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// billing 도메인 = 3개 결제 서브영역(자체팩/Eximbay/PortOne). 웹훅은 레거시 유지.
@Module({
  controllers: [BillingController, EximbayController, PortoneController],
  providers: [BillingService, EximbayService, PortoneService, JwtAuthGuard],
})
export class BillingModule {}
