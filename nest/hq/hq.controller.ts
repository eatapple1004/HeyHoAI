import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { HqService } from './hq.service';
import { AdminGuard } from '../auth/admin.guard';
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

// /api/admin/hq — 관리자 전용 운영 기록판(= 레거시 requireAdmin). 화면은 /admin-hq.
@Controller('api/admin/hq')
@UseGuards(AdminGuard)
export class AdminHqController {
  constructor(private readonly hq: HqService) {}

  // GET /api/admin/hq — 판·결정·고객·기록 한 번에
  @Get()
  async snapshot(@Req() req: any): Promise<ApiResponse<HqSnapshotDto>> {
    return { success: true, data: await this.hq.snapshot(req.user.id) };
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
    await this.hq.importAll(body, req.user.id);
    return { success: true };
  }

  // PUT /api/admin/hq/flow/:id — 흐름 단계 상태·메모
  @Put('flow/:id')
  async updateFlow(@Param('id') id: string, @Body() body: HqFlowUpdateDto, @Req() req: any): Promise<ApiResponse<HqFlowStepDto>> {
    return { success: true, data: await this.hq.updateFlow(id, body, req.user.id) };
  }

  // POST /api/admin/hq/decisions — 결정할 것 추가(D번호 자동)
  @Post('decisions')
  @HttpCode(200)
  async createDecision(@Body() body: HqDecisionCreateDto, @Req() req: any): Promise<ApiResponse<HqDecisionDto>> {
    return { success: true, data: await this.hq.createDecision(body, req.user.id) };
  }

  // PUT /api/admin/hq/decisions/:code — 대기·결정·보류 + 결론
  @Put('decisions/:code')
  async updateDecision(@Param('code') code: string, @Body() body: HqDecisionUpdateDto, @Req() req: any): Promise<ApiResponse<HqDecisionDto>> {
    return { success: true, data: await this.hq.updateDecision(code, body, req.user.id) };
  }

  // POST /api/admin/hq/leads — 고객·후보 추가(첫 단계로 들어간다)
  @Post('leads')
  @HttpCode(200)
  async createLead(@Body() body: HqLeadCreateDto, @Req() req: any): Promise<ApiResponse<HqLeadDto>> {
    return { success: true, data: await this.hq.createLead(body, req.user.id) };
  }

  // PUT /api/admin/hq/leads/:id — 단계 이동·정보 수정
  @Put('leads/:id')
  async updateLead(@Param('id') id: string, @Body() body: HqLeadUpdateDto, @Req() req: any): Promise<ApiResponse<HqLeadDto>> {
    return { success: true, data: await this.hq.updateLead(id, body, req.user.id) };
  }

  // DELETE /api/admin/hq/leads/:id
  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string, @Req() req: any): Promise<ApiOk> {
    await this.hq.deleteLead(id, req.user.id);
    return { success: true };
  }

  // POST /api/admin/hq/log — 손으로 남기는 기록 한 줄
  @Post('log')
  @HttpCode(200)
  async addLog(@Body() body: HqLogCreateDto, @Req() req: any): Promise<ApiOk> {
    await this.hq.addLog(body, req.user.id);
    return { success: true };
  }
}
