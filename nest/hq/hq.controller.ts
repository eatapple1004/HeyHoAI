import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import * as path from 'path';
import { HqService } from './hq.service';
import { HqGuard, HqPageGuard } from './hq.guard';
import { PageExceptionFilter } from '../pages/page-exception.filter';
import { ApiOk, ApiResponse } from '../common/dto/api-response.dto';
import {
  HqDecisionCreateDto,
  HqDecisionDto,
  HqDecisionUpdateDto,
  HqFlowStepDto,
  HqFlowUpdateDto,
  HqImportDto,
  HqLeadCreateDto,
  HqLeadDto,
  HqLeadUpdateDto,
  HqLogCreateDto,
  HqNumbersDto,
  HqSnapshotDto,
} from './dto/hq.dto';

// /api/admin/hq — 운영 기록판 API. 허용 메일 목록에 있는 사람만(도피아 로그인 또는 Access 메일 인증, HqGuard).
@Controller('api/admin/hq')
@UseGuards(HqGuard)
export class AdminHqController {
  constructor(private readonly hq: HqService) {}

  // GET /api/admin/hq — 판·결정·고객·기록 한 번에
  @Get()
  async snapshot(@Req() req: any): Promise<ApiResponse<HqSnapshotDto>> {
    return { success: true, data: await this.hq.snapshot(req.hqActor) };
  }

  // GET /api/admin/hq/numbers — 운영 DB 읽기 전용 집계(진단 신청·사업체·리포트·마케팅 작업·결제)
  @Get('numbers')
  async numbers(): Promise<ApiResponse<HqNumbersDto>> {
    return { success: true, data: await this.hq.numbers() };
  }

  // POST /api/admin/hq/import — 비어 있을 때 한 번, 맥 독립 HQ의 hq.json 을 옮겨 온다
  @Post('import')
  @HttpCode(200)
  async importAll(@Body() body: HqImportDto, @Req() req: any): Promise<ApiOk> {
    await this.hq.importAll(body, req.hqActor);
    return { success: true };
  }

  // PUT /api/admin/hq/flow/:id — 흐름 단계 상태·메모
  @Put('flow/:id')
  async updateFlow(@Param('id') id: string, @Body() body: HqFlowUpdateDto, @Req() req: any): Promise<ApiResponse<HqFlowStepDto>> {
    return { success: true, data: await this.hq.updateFlow(id, body, req.hqActor) };
  }

  // POST /api/admin/hq/decisions — 결정할 것 추가(D번호 자동)
  @Post('decisions')
  @HttpCode(200)
  async createDecision(@Body() body: HqDecisionCreateDto, @Req() req: any): Promise<ApiResponse<HqDecisionDto>> {
    return { success: true, data: await this.hq.createDecision(body, req.hqActor) };
  }

  // PUT /api/admin/hq/decisions/:code — 대기·결정·보류 + 결론
  @Put('decisions/:code')
  async updateDecision(@Param('code') code: string, @Body() body: HqDecisionUpdateDto, @Req() req: any): Promise<ApiResponse<HqDecisionDto>> {
    return { success: true, data: await this.hq.updateDecision(code, body, req.hqActor) };
  }

  // POST /api/admin/hq/leads — 고객·후보 추가(첫 단계로 들어간다)
  @Post('leads')
  @HttpCode(200)
  async createLead(@Body() body: HqLeadCreateDto, @Req() req: any): Promise<ApiResponse<HqLeadDto>> {
    return { success: true, data: await this.hq.createLead(body, req.hqActor) };
  }

  // PUT /api/admin/hq/leads/:id — 단계 이동·정보 수정
  @Put('leads/:id')
  async updateLead(@Param('id') id: string, @Body() body: HqLeadUpdateDto, @Req() req: any): Promise<ApiResponse<HqLeadDto>> {
    return { success: true, data: await this.hq.updateLead(id, body, req.hqActor) };
  }

  // DELETE /api/admin/hq/leads/:id
  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string, @Req() req: any): Promise<ApiOk> {
    await this.hq.deleteLead(id, req.hqActor);
    return { success: true };
  }

  // POST /api/admin/hq/log — 손으로 남기는 기록 한 줄
  @Post('log')
  @HttpCode(200)
  async addLog(@Body() body: HqLogCreateDto, @Req() req: any): Promise<ApiOk> {
    await this.hq.addLog(body, req.hqActor);
    return { success: true };
  }
}

// /admin-hq 화면 — 관리자 화면들과 같은 페이지 응답(PageExceptionFilter). 입구는 HqPageGuard(허용 메일 목록).
//   HqModule 이 PagesModule 보다 먼저 등록돼 있어 클린 URL(:name)보다 이 라우트가 먼저 잡힌다.
const ADMIN_HQ_PAGE = path.join(__dirname, '..', '..', 'public', 'admin-hq.html');

@Controller()
@UseFilters(PageExceptionFilter)
export class HqPageController {
  @UseGuards(HqPageGuard)
  @Get('admin-hq')
  page(@Res() res: any) { return res.sendFile(ADMIN_HQ_PAGE); }
}
