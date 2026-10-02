import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminGuard } from '../auth/admin.guard';
import { EnvDbService, EnvKey } from '../common/env-db.service';

/** /api/admin/payments — 환경별 결제 조회(관리자 전용, 읽기 전용). */
@Controller('api/admin/payments')
@UseGuards(AdminGuard)
export class AdminPaymentsController {
  constructor(
    private readonly svc: AdminPaymentsService,
    private readonly envDb: EnvDbService,
  ) {}

  /** GET /api/admin/payments?env=&limit= — 안 주면 이 서버의 환경. */
  @Get()
  async list(@Query('env') envKey?: string, @Query('limit') limit?: string) {
    const key: EnvKey = envKey ? this.envDb.assertEnv(envKey) : this.envDb.current();
    return { success: true, data: await this.svc.payments(key, Number(limit) || 500) };
  }
}
