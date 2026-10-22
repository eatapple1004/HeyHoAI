import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Res, UseFilters, UseGuards } from '@nestjs/common';
import * as path from 'path';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPageGuard } from '../pages/page-auth.guard';
import { PageExceptionFilter } from '../pages/page-exception.filter';
import { MarketingService } from './marketing.service';

/** AI 마케팅 팀 — 관리자 API. `/api/admin/business` 접두사는 이미 Nest 소유 */
@Controller('api/admin/business/:id/marketing')
@UseGuards(AdminGuard)
export class MarketingAdminController {
  constructor(private readonly mk: MarketingService) {}

  @Get()
  async get(@Param('id') id: string) { return { success: true, data: await this.mk.get(id) }; }

  @Patch()
  async team(@Param('id') id: string, @Body() body: any) { return { success: true, data: await this.mk.updateTeam(id, body || {}) }; }

  @Post('run')
  async run(@Param('id') id: string, @Body() body: any) { return { success: true, data: await this.mk.run(id, body?.agent || undefined) }; }

  @Post('from-report')
  async fromReport(@Param('id') id: string) { return { success: true, data: await this.mk.fromReport(id) }; }

  @Post('direct')
  async direct(@Param('id') id: string, @Body() body: any) { return { success: true, data: await this.mk.direct(id, body?.text) }; }

  @Post('tasks/:taskId/actions/:n')
  async act(@Param('id') id: string, @Param('taskId') taskId: string, @Param('n', ParseIntPipe) n: number) { return { success: true, data: await this.mk.act(id, taskId, n) }; }

  @Patch('tasks/:taskId')
  async edit(@Param('id') id: string, @Param('taskId') taskId: string, @Body() body: any) { return { success: true, data: await this.mk.edit(id, taskId, body || {}) }; }

  @Post('tasks/:taskId/approve')
  async approve(@Param('id') id: string, @Param('taskId') taskId: string) { return { success: true, data: await this.mk.approve(id, taskId) }; }

  @Post('tasks/:taskId/reject')
  async reject(@Param('id') id: string, @Param('taskId') taskId: string, @Body() body: any) { return { success: true, data: await this.mk.reject(id, taskId, body?.reason) }; }
}

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

@Controller()
@UseFilters(PageExceptionFilter)
export class MarketingPagesController {
  @UseGuards(AdminPageGuard)
  @Get('admin-business/:id/marketing')
  page(@Res() res: any) {
    return res.sendFile(path.join(PUBLIC_DIR, 'admin-business-marketing.html'));
  }
}
