import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPageGuard } from '../pages/page-auth.guard';
import { TokenService } from '../common/security/token.service';
import { BusinessModule } from '../business/business.module';
import { MarketingAdminController, MarketingPagesController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingRepository } from './marketing.repository';
import { MarketingWriterService } from './marketing-writer.service';

/**
 * (2026-10-20) AI 마케팅 팀 — 사업체별 에이전트(인스타·동향·리뷰) + 작업 피드(승인하면 실행).
 *   관리자: /admin-business/:id/marketing · API /api/admin/business/:id/marketing/*
 */
@Module({
  imports: [BusinessModule],
  controllers: [MarketingAdminController, MarketingPagesController],
  providers: [MarketingService, MarketingRepository, MarketingWriterService, AdminGuard, AdminPageGuard, TokenService],
})
export class MarketingModule {}
