import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessRepository } from './business.repository';
import { BusinessCaptionService } from './business-caption.service';
import { AdminGuard } from '../auth/admin.guard';

/** 사업체 인스타그램 관리(관리자 전용) — /api/admin/business */
@Module({
  controllers: [BusinessController],
  providers: [BusinessService, BusinessRepository, BusinessCaptionService, AdminGuard],
})
export class BusinessModule {}
