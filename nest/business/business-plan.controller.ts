import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ACCOUNT_UPLOAD_OPTIONS } from '../accounts/accounts.service';
import { AdminGuard } from '../auth/admin.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { BusinessPlanService } from './business-plan.service';
import { BusinessPlanPackService } from './business-plan-pack.service';

/**
 * 월간 운영 플랜 — `/api/admin/business/:id/plans/...` (관리자 전용).
 * 사업체 컨트롤러와 접두사는 같지만 하위 세그먼트(`plans`)가 달라 충돌하지 않는다.
 * 고객 승인 화면이 생기기 전까지는 관리자가 고객 승인도 대신 기록한다.
 */
@Controller('api/admin/business')
@UseGuards(AdminGuard)
export class BusinessPlanController {
  constructor(private readonly plans: BusinessPlanService, private readonly packs: BusinessPlanPackService) {}

  @Get(':id/plans')
  async list(@Param('id') id: string): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.list(id) };
  }

  @Post(':id/plans')
  @HttpCode(200)
  async create(@Param('id') id: string, @Body() body: any): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.create(id, body || {}) };
  }

  @Get(':id/plans/:planId')
  async detail(@Param('id') id: string, @Param('planId') planId: string): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.detail(id, planId) };
  }

  @Patch(':id/plans/:planId')
  async settings(@Param('id') id: string, @Param('planId') planId: string, @Body() body: any): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.updateSettings(id, planId, body || {}) };
  }

  @Delete(':id/plans/:planId')
  async remove(@Param('id') id: string, @Param('planId') planId: string): Promise<ApiResponse<null>> {
    await this.plans.remove(id, planId);
    return { success: true, data: null };
  }

  /** AI가 한 달 초안을 짠다(기존 초안은 갈아엎음) */
  @Post(':id/plans/:planId/draft')
  @HttpCode(200)
  async draft(@Param('id') id: string, @Param('planId') planId: string): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.draft(id, planId) };
  }

  @Post(':id/plans/:planId/items')
  @HttpCode(200)
  async addItem(@Param('id') id: string, @Param('planId') planId: string, @Body() body: any): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.addItem(id, planId, body || {}) };
  }

  @Patch(':id/plans/:planId/items/:itemId')
  async updateItem(
    @Param('id') id: string, @Param('planId') planId: string, @Param('itemId') itemId: string, @Body() body: any,
  ): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.updateItem(id, planId, itemId, body || {}) };
  }

  @Delete(':id/plans/:planId/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('planId') planId: string, @Param('itemId') itemId: string): Promise<ApiResponse<null>> {
    await this.plans.removeItem(id, planId, itemId);
    return { success: true, data: null };
  }

  /** 게시물 전용 원본 올리기(multipart `files`, 최대 10장) */
  @UseInterceptors(FilesInterceptor('files', 10, ACCOUNT_UPLOAD_OPTIONS))
  @Post(':id/plans/:planId/items/:itemId/sources')
  @HttpCode(200)
  async addSources(
    @Param('id') id: string, @Param('planId') planId: string, @Param('itemId') itemId: string, @UploadedFiles() files: any[],
  ): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.addItemSources(id, planId, itemId, files) };
  }

  /** 게시물 원본에서 한 장 빼기(사업체 미디어는 남김) */
  @Delete(':id/plans/:planId/items/:itemId/sources/:mediaId')
  async removeSource(
    @Param('id') id: string, @Param('planId') planId: string, @Param('itemId') itemId: string, @Param('mediaId') mediaId: string,
  ): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.removeItemSource(id, planId, itemId, mediaId) };
  }

  /** 칸 하나를 콘텐츠 팩으로 만든다(백그라운드). body.sourceMediaIds 없으면 사업체 기본 원본 */
  @Post(':id/plans/:planId/items/:itemId/pack')
  @HttpCode(200)
  async packItem(
    @Param('id') id: string, @Param('planId') planId: string, @Param('itemId') itemId: string, @Body() body: any, @Req() req: any,
  ): Promise<ApiResponse<any>> {
    return { success: true, data: await this.packs.start(req.user, id, planId, itemId) };
  }

  /** 콘텐츠가 없는 칸 전부를 한 칸씩 순서대로 팩으로 만든다 */
  @Post(':id/plans/:planId/pack-all')
  @HttpCode(200)
  async packAll(@Param('id') id: string, @Param('planId') planId: string, @Body() body: any, @Req() req: any): Promise<ApiResponse<any>> {
    return { success: true, data: await this.packs.startAll(req.user, id, planId) };
  }

  /** 컨펌 단계 이동 — body.action = doppia_approve | send | customer_approve | request_changes */
  @Post(':id/plans/:planId/status')
  @HttpCode(200)
  async transition(@Param('id') id: string, @Param('planId') planId: string, @Body() body: any, @Req() req: any): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.transition(id, planId, body || {}, req.user?.id || null) };
  }

  /** 고객 승인된 플랜을 발행 큐에 날짜별 예약으로 일괄 등록 */
  @Post(':id/plans/:planId/schedule')
  @HttpCode(200)
  async schedule(@Param('id') id: string, @Param('planId') planId: string): Promise<ApiResponse<any>> {
    return { success: true, data: await this.plans.schedule(id, planId) };
  }
}
