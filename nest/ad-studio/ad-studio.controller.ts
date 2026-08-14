import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdStudioService } from './ad-studio.service';
import { AdJobService } from './ad-job.service';
import { WebProductService } from './web-product.service';
import { WebProductVo } from './vo/ad-studio.vo';
import { AdJobVo } from './ad-job.repository';
import { AdCostDto, CompileAdDto, CompileResultDto } from './dto/ad-studio.dto';
import { AdSetupItemVo } from './vo/ad-studio.vo';
import { ApiResponse } from '../common/dto/api-response.dto';

/** URL to Ad — 훅·장소 라이브러리 / 컴파일 / 비용. 생성(jobs)은 Phase 5. */
@Controller('api/ad-studio')
@UseGuards(JwtAuthGuard)
export class AdStudioController {
  constructor(
    private readonly ads: AdStudioService,
    private readonly jobs: AdJobService,
    private readonly products: WebProductService,
  ) {}

  @Get('hooks')
  async hooks(@Req() req: any): Promise<ApiResponse<AdSetupItemVo[]>> {
    return { success: true, data: await this.ads.listSetupItems('hook', req.user.id) };
  }

  @Get('settings')
  async settings(@Req() req: any): Promise<ApiResponse<AdSetupItemVo[]>> {
    return { success: true, data: await this.ads.listSetupItems('setting', req.user.id) };
  }

  // ── 제품 수집 ──

  /** URL → 제품. 수집 실패는 422 + 수동 입력 안내(요청이 아니라 대상 사이트의 문제다). */
  @Post('web-products')
  @HttpCode(200)
  async collect(@Req() req: any, @Body() body: { url: string }): Promise<ApiResponse<WebProductVo>> {
    return { success: true, data: await this.products.collect(req.user.id, (body || ({} as any)).url) };
  }

  /** 수집이 막힌 사이트(쿠팡 등)용 수동 입력 */
  @Post('web-products/manual')
  @HttpCode(200)
  async manual(@Req() req: any, @Body() body: any): Promise<ApiResponse<WebProductVo>> {
    return { success: true, data: await this.products.manual(req.user.id, body || {}) };
  }

  @Get('web-products')
  async listProducts(@Req() req: any): Promise<ApiResponse<WebProductVo[]>> {
    return { success: true, data: await this.products.list(req.user.id) };
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

  /**
   * 생성 시작 — 컴파일 → 과금 → 엔진 제출. 결과는 폴링으로 받는다.
   * ⚠️ 200으로 내린다(Nest 기본 201이 아니라) — 생성 "완료"가 아니라 "접수"이기 때문.
   */
  @Post('jobs')
  @HttpCode(200)
  async createJob(@Req() req: any, @Body() body: CompileAdDto): Promise<ApiResponse<AdJobVo>> {
    return { success: true, data: await this.jobs.create(req.user, body || {}) };
  }

  /** 잡 조회 — processing이면 여기서 provider를 확인해 상태를 전진시킨다(폴링 진입점). */
  @Get('jobs/:id')
  async getJob(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<AdJobVo>> {
    return { success: true, data: await this.jobs.get(req.user, id) };
  }

  @Get('jobs')
  async listJobs(@Req() req: any): Promise<ApiResponse<AdJobVo[]>> {
    return { success: true, data: await this.jobs.list(req.user) };
  }
}
