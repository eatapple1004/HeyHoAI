import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { BusinessService } from './business.service';
import { ACCOUNT_UPLOAD_OPTIONS } from '../accounts/accounts.service';
import {
  CreateBusinessDto, EnqueueDto, GenerateCaptionDto, LinkAccountDto, LinkPackDto,
  RegisterMediaDto, UpdateBusinessDto, UpdateQueueDto,
} from './dto/business.dto';
import {
  BusinessAccountVo, BusinessListItemVo, BusinessMediaVo, BusinessPackVo,
  BusinessQueueVo, BusinessVo, CaptionDraftVo,
} from './vo/business.vo';

/**
 * 사업체 인스타그램 관리 — 관리자 전용.
 *
 * ⚠️ **선언 순서 = 매칭 순서.** 고정 세그먼트(`accounts/unlinked`)와 하위 리소스 경로
 *   (`media/:mediaId`, `queue/:queueId`, `packs/:packId`)를 `:id` 계열보다 **먼저** 둔다.
 *   `:id`를 위로 올리면 `/accounts/unlinked`를 그게 삼킨다.
 */
@Controller('api/admin/business')
@UseGuards(AdminGuard)
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  // ── 고정 경로(반드시 :id 계열보다 위) ──

  /** POST /api/admin/business/accounts/sync — Zernio 연결 계정을 DB로 끌어온다 */
  @Post('accounts/sync')
  @HttpCode(200)
  async syncAccounts(@Req() req: any): Promise<ApiResponse<BusinessAccountVo[]>> {
    return { success: true, data: await this.business.syncAccounts(req.user.id) };
  }

  /** GET /api/admin/business/accounts/unlinked — 아직 사업체에 안 붙은 계정 */
  @Get('accounts/unlinked')
  async unlinkedAccounts(): Promise<ApiResponse<BusinessAccountVo[]>> {
    return { success: true, data: await this.business.unlinkedAccounts() };
  }

  // ── 사업체 CRUD ──

  @Get()
  async list(): Promise<ApiResponse<BusinessListItemVo[]>> {
    return { success: true, data: await this.business.list() };
  }

  @Post()
  async create(@Body() body: CreateBusinessDto): Promise<ApiResponse<BusinessVo>> {
    return { success: true, data: await this.business.create(body) };
  }

  /** GET /api/admin/business/:id — 상세(계정·미디어·팩·큐 한 번에) */
  @Get(':id')
  async detail(@Param('id') id: string) {
    return { success: true, ...(await this.business.detail(id)) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateBusinessDto): Promise<ApiResponse<BusinessVo>> {
    return { success: true, data: await this.business.update(id, body) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.business.remove(id);
    return { success: true };
  }

  // ── 계정 연결 ──

  @Get(':id/accounts')
  async accounts(@Param('id') id: string): Promise<ApiResponse<BusinessAccountVo[]>> {
    await this.business.get(id);
    return { success: true, data: await this.business.accounts(id) };
  }

  @Post(':id/accounts')
  @HttpCode(200)
  async linkAccount(@Param('id') id: string, @Body() body: LinkAccountDto): Promise<ApiResponse<BusinessAccountVo>> {
    return { success: true, data: await this.business.linkAccount(id, body) };
  }

  @Delete(':id/accounts/:accountId')
  async unlinkAccount(@Param('id') id: string, @Param('accountId') accountId: string) {
    await this.business.unlinkAccount(id, accountId);
    return { success: true };
  }

  // ── 미디어(오리지널 이미지 · 생성 결과물) ──

  @Get(':id/media')
  async media(
    @Param('id') id: string,
    @Query('isBase') isBase?: string,
    @Query('mediaType') mediaType?: string,
  ): Promise<ApiResponse<BusinessMediaVo[]>> {
    await this.business.get(id);
    return { success: true, data: await this.business.media(id, { isBase, mediaType }) };
  }

  /** POST /api/admin/business/:id/media — 오리지널 이미지 업로드(multipart `file`) */
  @UseInterceptors(FileInterceptor('file', ACCOUNT_UPLOAD_OPTIONS))
  @Post(':id/media')
  async upload(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('isBase') isBase?: string,
  ): Promise<ApiResponse<BusinessMediaVo>> {
    return { success: true, data: await this.business.uploadMedia(id, file, isBase === 'true') };
  }

  /** POST /api/admin/business/:id/media/register — 팩 자산·기존 생성물을 미디어로 편입 */
  @Post(':id/media/register')
  @HttpCode(200)
  async register(@Param('id') id: string, @Body() body: RegisterMediaDto): Promise<ApiResponse<BusinessMediaVo>> {
    return { success: true, data: await this.business.registerMedia(id, body) };
  }

  /** PATCH /api/admin/business/:id/media/:mediaId/base — 오리지널(대표) 지정 */
  @Patch(':id/media/:mediaId/base')
  async setBase(@Param('id') id: string, @Param('mediaId') mediaId: string): Promise<ApiResponse<BusinessMediaVo>> {
    return { success: true, data: await this.business.setBase(id, mediaId) };
  }

  @Delete(':id/media/:mediaId')
  async removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    await this.business.removeMedia(id, mediaId);
    return { success: true };
  }

  // ── 콘텐츠팩 ──

  @Get(':id/packs')
  async packs(@Param('id') id: string): Promise<ApiResponse<BusinessPackVo[]>> {
    await this.business.get(id);
    return { success: true, data: await this.business.packs(id) };
  }

  @Post(':id/packs')
  @HttpCode(200)
  async linkPack(@Param('id') id: string, @Body() body: LinkPackDto): Promise<ApiResponse<BusinessPackVo[]>> {
    return { success: true, data: await this.business.linkPack(id, body) };
  }

  @Delete(':id/packs/:packId')
  async unlinkPack(@Param('id') id: string, @Param('packId') packId: string) {
    await this.business.unlinkPack(id, packId);
    return { success: true };
  }

  // ── AI 캡션 ──

  /** POST /api/admin/business/:id/caption — 선택한 이미지를 보고 캡션·해시태그 초안 작성 */
  @Post(':id/caption')
  @HttpCode(200)
  async caption(@Param('id') id: string, @Body() body: GenerateCaptionDto): Promise<ApiResponse<CaptionDraftVo>> {
    return { success: true, data: await this.business.caption(id, body) };
  }

  // ── 발행 큐 ──

  @Get(':id/queue')
  async queue(@Param('id') id: string, @Query('status') status?: string): Promise<ApiResponse<BusinessQueueVo[]>> {
    await this.business.get(id);
    return { success: true, data: await this.business.queue(id, status) };
  }

  /** POST /api/admin/business/:id/queue — 즉시(확정) 또는 예약 발행 등록 */
  @Post(':id/queue')
  async enqueue(@Param('id') id: string, @Body() body: EnqueueDto): Promise<ApiResponse<BusinessQueueVo>> {
    return { success: true, data: await this.business.enqueue(id, body) };
  }

  @Patch(':id/queue/:queueId')
  async updateQueue(
    @Param('id') id: string,
    @Param('queueId') queueId: string,
    @Body() body: UpdateQueueDto,
  ): Promise<ApiResponse<BusinessQueueVo>> {
    return { success: true, data: await this.business.updateQueue(id, queueId, body) };
  }

  /** POST /api/admin/business/:id/queue/:queueId/publish — 예약을 건너뛰고 지금 발행 */
  @Post(':id/queue/:queueId/publish')
  @HttpCode(200)
  async publishNow(@Param('id') id: string, @Param('queueId') queueId: string) {
    return { success: true, data: await this.business.publishNow(id, queueId) };
  }

  @Delete(':id/queue/:queueId')
  async removeQueue(@Param('id') id: string, @Param('queueId') queueId: string) {
    await this.business.removeQueue(id, queueId);
    return { success: true };
  }
}
