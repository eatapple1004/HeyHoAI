import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { TrialService } from './trial.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { TrialAccountDto, TrialStatusDto, TrialPatchResultDto, CreateTrialDto, PatchTrialDto } from './dto/trial.dto';

// /api/admin/trials — 관리자 전용(= 레거시 requireAdmin). 401/403 형식도 레거시와 동일.
@Controller('api/admin/trials')
@UseGuards(AdminGuard)
export class AdminTrialsController {
  constructor(private readonly trial: TrialService) {}

  // POST /api/admin/trials { companyName, email?, password?, credits?, days? }
  @Post()
  @HttpCode(200) // 레거시 res.json=200
  async create(@Body() body: CreateTrialDto): Promise<ApiResponse<TrialAccountDto>> {
    return { success: true, data: await this.trial.createTrialAccount(body) };
  }

  // GET /api/admin/trials — 체험 계정 목록 + 사용 현황
  @Get()
  async list(): Promise<ApiResponse<unknown[]>> {
    return { success: true, data: await this.trial.listTrials() };
  }

  // PATCH /api/admin/trials/:id { addCredits?, days?, status? }
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: PatchTrialDto): Promise<ApiResponse<TrialPatchResultDto>> {
    return { success: true, data: await this.trial.patchTrial(id, body) };
  }
}

// /api/trial/me — 본인 체험 상태(일반 사용자)
@Controller('api/trial')
@UseGuards(JwtAuthGuard)
export class TrialController {
  constructor(private readonly trial: TrialService) {}

  // GET /api/trial/me
  @Get('me')
  async me(@Req() req: any): Promise<ApiResponse<TrialStatusDto>> {
    return { success: true, data: await this.trial.getStatus(req.user.id) };
  }
}
