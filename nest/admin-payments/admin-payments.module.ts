import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminGuard } from '../auth/admin.guard';

/** 환경별 결제 조회(관리자 전용) — /api/admin/payments */
@Module({
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService, AdminGuard],
})
export class AdminPaymentsModule {}
