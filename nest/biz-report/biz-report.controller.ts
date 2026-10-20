import { Controller, Get, Param, Post, Res, UseFilters, UseGuards } from '@nestjs/common';
import * as path from 'path';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPageGuard } from '../pages/page-auth.guard';
import { PageExceptionFilter } from '../pages/page-exception.filter';
import { BizReportService } from './biz-report.service';

/** 사업체 마케팅 진단 — 관리자 API. `/api/admin/business` 접두사는 이미 Nest 소유 */
@Controller('api/admin/business/:id/report')
@UseGuards(AdminGuard)
export class BizReportAdminController {
  constructor(private readonly reports: BizReportService) {}

  @Get()
  async get(@Param('id') id: string) { return { success: true, data: await this.reports.get(id) }; }

  @Post()
  async create(@Param('id') id: string) { return { success: true, data: await this.reports.create(id) }; }
}

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

/** 화면 — React 빌드(report-ui → public/report-app). 데이터는 위 API로 */
@Controller()
@UseFilters(PageExceptionFilter)
export class BizReportPagesController {
  @UseGuards(AdminPageGuard)
  @Get('admin-business/:id/report')
  page(@Res() res: any) {
    res.set('Cache-Control', 'no-store');
    return res.sendFile(path.join(PUBLIC_DIR, 'report-app', 'index.html'));
  }
}
