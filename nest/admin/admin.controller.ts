import { Controller, Get, Post, Delete, Body, Param, Query, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { AdminService, refineHandler, refineApplyHandler } from './admin.service';
import { AdminGuard } from '../auth/admin.guard';

// /api/admin/creations · /api/admin/stats — 관리자 전용 읽기(= 레거시 requireAdmin).
@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminDataController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/creations?visibility=&status=&q=&limit=&offset=
  @Get('creations')
  async creations(@Query() q: any) {
    const { data, hasMore } = await this.admin.listCreations(q);
    return { success: true, data, hasMore };
  }

  // GET /api/admin/stats — 유저·생성물·기능별·매출·시계열 집계
  @Get('stats')
  async stats() {
    return { success: true, data: await this.admin.getStats() };
  }
}

// /api/admin/proposal — 회사 맞춤 제안서 빌더(관리자 전용)
@Controller('api/admin/proposal')
@UseGuards(AdminGuard)
export class AdminProposalController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/proposal/results?scope=mine|all&limit=&offset=
  @Get('results')
  async results(@Req() req: any, @Query() q: any) {
    const { groups, scope, hasMore } = await this.admin.listProposalResults(req.user.id, q);
    return { success: true, groups, scope, hasMore };
  }

  // POST /api/admin/proposal/save — id 있으면 update, 없으면 insert
  @Post('save')
  @HttpCode(200) // 레거시 res.json=200
  async save(@Req() req: any, @Body() body: any) {
    return { success: true, id: await this.admin.saveProposal(req.user.id, body) };
  }

  // GET /api/admin/proposal/list
  @Get('list')
  async list() {
    return { success: true, items: await this.admin.listProposals() };
  }

  // GET /api/admin/proposal/saved/:id — 편집용 전체 로드
  @Get('saved/:id')
  async saved(@Param('id') id: string) {
    return { success: true, proposal: await this.admin.getProposal(id) };
  }

  // DELETE /api/admin/proposal/saved/:id
  @Delete('saved/:id')
  async remove(@Param('id') id: string) {
    await this.admin.removeProposal(id);
    return { success: true };
  }
}

// /api/admin/refine — 프롬프트 자동 정밀화(author → generate → judge → revise 루프).
//   POST 2종은 NDJSON 스트리밍이라 @Res()로 레거시 핸들러에 그대로 위임한다(로직 이중화 금지).
@Controller('api/admin/refine')
@UseGuards(AdminGuard)
export class AdminRefineController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/refine/runs — 최신 100개
  @Get('runs')
  async runs() {
    return { success: true, data: await this.admin.listRefineRuns() };
  }

  // GET /api/admin/refine/runs/:id — 전체 iter 상세
  @Get('runs/:id')
  async run(@Param('id') id: string) {
    return { success: true, data: await this.admin.getRefineRun(id) };
  }

  // DELETE /api/admin/refine/runs/:id — 레코드 + 이미지 파일 삭제
  @Delete('runs/:id')
  async removeRun(@Param('id') id: string) {
    await this.admin.removeRefineRun(id);
    return { success: true };
  }

  // POST /api/admin/refine — 정밀화 루프(NDJSON 스트리밍)
  @Post()
  refine(@Req() req: any, @Res() res: any) {
    return refineHandler(req, res);
  }

  // POST /api/admin/refine/apply — 고정 프롬프트를 레퍼런스에 적용해 N장 생성(NDJSON 스트리밍)
  @Post('apply')
  apply(@Req() req: any, @Res() res: any) {
    return refineApplyHandler(req, res);
  }
}
