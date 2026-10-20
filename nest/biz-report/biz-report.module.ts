import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPageGuard } from '../pages/page-auth.guard';
import { TokenService } from '../common/security/token.service';
import { BizReportAdminController, BizReportPagesController } from './biz-report.controller';
import { BizReportService } from './biz-report.service';
import { BizReportRepository } from './biz-report.repository';
import { BizReportWriterService } from './biz-report-writer.service';

/**
 * (2026-10-20) 사업체 마케팅 진단 리포트 — 공식 API 수치 + 계산 점수 + AI 해석, 화면은 Bklit UI 차트(React).
 *   관리자: /admin-business/:id/report · API /api/admin/business/:id/report
 */
@Module({
  controllers: [BizReportAdminController, BizReportPagesController],
  providers: [BizReportService, BizReportRepository, BizReportWriterService, AdminGuard, AdminPageGuard, TokenService],
})
export class BizReportModule {}
