import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DiagnoseService } from './diagnose.service';
import { AdminGuard } from '../auth/admin.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import {
  CreateRequestDto, CreateSessionDto, DiagnoseRequestRowDto, RequestCreatedDto, SessionCreatedDto,
} from './dto/diagnose.dto';

// /api/diagnose — 공개(무인증). 진단 페이지(public/diagnose.html)가 호출한다. 횟수 제한은 서비스에서.
@Controller('api/diagnose')
export class DiagnoseController {
  constructor(private readonly diagnose: DiagnoseService) {}

  // POST /api/diagnose/sessions { answers, track, lang } — 결과 화면을 본 사람의 답(익명)
  @Post('sessions')
  @HttpCode(200) // 레거시 res.json=200
  async createSession(@Body() body: CreateSessionDto, @Req() req: any): Promise<ApiResponse<SessionCreatedDto>> {
    return { success: true, data: await this.diagnose.createSession(body, req.ip) };
  }

  // POST /api/diagnose/requests { sessionId?, track, businessName, contactName?, contact, links?, message?, answers? }
  @Post('requests')
  @HttpCode(200)
  async createRequest(@Body() body: CreateRequestDto, @Req() req: any): Promise<ApiResponse<RequestCreatedDto>> {
    return { success: true, data: await this.diagnose.createRequest(body, req.ip) };
  }
}

// /api/admin/diagnose — 관리자 전용(= 레거시 requireAdmin). 진단서 써야 할 신청 목록.
@Controller('api/admin/diagnose')
@UseGuards(AdminGuard)
export class AdminDiagnoseController {
  constructor(private readonly diagnose: DiagnoseService) {}

  // GET /api/admin/diagnose/requests?limit=100
  @Get('requests')
  async list(@Query('limit') limit?: string): Promise<ApiResponse<DiagnoseRequestRowDto[]>> {
    return { success: true, data: await this.diagnose.listRequests(Number(limit)) };
  }
}
