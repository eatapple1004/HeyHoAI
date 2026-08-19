import { Module } from '@nestjs/common';
import { BusinessMetaController } from './business-meta.controller';
import { BusinessMetaService } from './business-meta.service';
import { BusinessMetaRepository } from './business-meta.repository';
import { AdminGuard } from '../auth/admin.guard';

/** Meta 직결 인스타 연동(관리자 전용) — /api/admin/business-meta
 *  Zernio 경로(/api/admin/business)와 완전히 분리해 나란히 비교한다. */
@Module({
  controllers: [BusinessMetaController],
  providers: [BusinessMetaService, BusinessMetaRepository, AdminGuard],
})
export class BusinessMetaModule {}
