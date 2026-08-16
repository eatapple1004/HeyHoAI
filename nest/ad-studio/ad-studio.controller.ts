import { Body, Controller, Patch, Get, HttpCode, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdStudioService } from './ad-studio.service';
import { AdJobService } from './ad-job.service';
import { AD_UPLOAD_OPTIONS, WebProductService } from './web-product.service';
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

  @Get('styles')
  async styles(@Req() req: any): Promise<ApiResponse<AdSetupItemVo[]>> {
    return { success: true, data: await this.ads.listSetupItems('style', req.user.id) };
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

  /**
   * 제품 이미지 업로드 — URL이 없는 사용자를 위한 경로.
   * 대부분의 사람은 이미지를 **파일로** 갖고 있지 URL로 갖고 있지 않다.
   */
  @Post('upload')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', AD_UPLOAD_OPTIONS))
  upload(@UploadedFile() file: any): ApiResponse<{ url: string }> {
    if (!file) throw Object.assign(new Error('이미지 파일이 필요합니다.'), { statusCode: 400 });
    return { success: true, data: { url: `/images/${file.filename}` } };
  }

  /** 예전에 올린 이미지들 — 매번 새로 올리지 않게(Shots와 같은 방식) */
  @Get('recent-images')
  async recentImages(@Req() req: any): Promise<ApiResponse<Array<{ url: string; label: string; productId: string | null }>>> {
    return { success: true, data: await this.ads.listRecentImages(req.user.id) };
  }

  @Get('web-products')
  async listProducts(@Req() req: any): Promise<ApiResponse<WebProductVo[]>> {
    return { success: true, data: await this.products.list(req.user.id) };
  }

  @Get('web-products/:id')
  async getProduct(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<WebProductVo>> {
    return { success: true, data: await this.products.find(req.user.id, id) };
  }

  /** 비용 산정 — 무료. 길이·화질을 바꿔가며 확인하는 용도라 과금하면 안 된다. */
  /** PATCH /web-products/:id — 상품명·설명 수정(자동 추출값을 사람이 고친다) */
  @Patch('web-products/:id')
  async renameWebProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.products.rename(req.user.id, id, body || {}) };
  }

  /** POST /web-products/:id/autofill — 비어 있는 이름·설명을 사진으로 채운다(force=true면 재생성) */
  @Post('web-products/:id/autofill')
  @HttpCode(200)
  async autofillWebProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.products.autofill(req.user.id, id, body?.force === true) };
  }

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
