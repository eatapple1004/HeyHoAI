import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdStudioService } from './ad-studio.service';
import { AdCostDto, CompileAdDto, CompileResultDto } from './dto/ad-studio.dto';
import { AdSetupItemVo } from './vo/ad-studio.vo';
import { ApiResponse } from '../common/dto/api-response.dto';

/** URL to Ad — 훅·장소 라이브러리 / 컴파일 / 비용. 생성(jobs)은 Phase 5. */
@Controller('api/ad-studio')
@UseGuards(JwtAuthGuard)
export class AdStudioController {
  constructor(private readonly ads: AdStudioService) {}

  @Get('hooks')
  async hooks(@Req() req: any): Promise<ApiResponse<AdSetupItemVo[]>> {
    return { success: true, data: await this.ads.listSetupItems('hook', req.user.id) };
  }

  @Get('settings')
  async settings(@Req() req: any): Promise<ApiResponse<AdSetupItemVo[]>> {
    return { success: true, data: await this.ads.listSetupItems('setting', req.user.id) };
  }

  /** 비용 산정 — 무료. 길이·화질을 바꿔가며 확인하는 용도라 과금하면 안 된다. */
  @Post('cost')
  @HttpCode(200)
  cost(@Body() body: CompileAdDto): ApiResponse<AdCostDto> {
    return { success: true, data: this.ads.cost(body || {}) };
  }

  /** 프롬프트 컴파일만 — **크레딧 0**. 영상은 만들지 않는다. */
  @Post('compile')
  @HttpCode(200)
  async compile(@Req() req: any, @Body() body: CompileAdDto): Promise<ApiResponse<CompileResultDto>> {
    return { success: true, data: await this.ads.compile(req.user.id, body || {}) };
  }
}
