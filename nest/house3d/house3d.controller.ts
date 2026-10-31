import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ApiOk, ApiResponse } from '../common/dto/api-response.dto';
import { House3dDevOnlyGuard } from './dev-only.guard';
import { House3dService, House3dSettings } from './house3d.service';
import { House3dRequestRow } from './house3d.repository';

// /api/house3d — 공개(무인증). 3D 마감 체험 시안(public/house3d)이 호출한다. 횟수 제한은 서비스에서.
@Controller('api/house3d')
@UseGuards(House3dDevOnlyGuard)
export class House3dController {
  constructor(private readonly svc: House3dService) {}

  // POST /api/house3d/requests — 홈페이지 상담 양식·체험 화면 "이 마감으로 상담 요청"
  @Post('requests')
  @HttpCode(200) // 레거시 res.json=200
  async createRequest(@Body() body: any, @Req() req: any): Promise<ApiResponse<{ id: string; createdAt: string }>> {
    return { success: true, data: await this.svc.createRequest(body, req.ip) };
  }

  // GET /api/house3d/settings — 업체가 정한 단가·자재 사진·숨김(체험 화면이 처음 열릴 때)
  @Get('settings')
  async settings(): Promise<ApiResponse<{ value: House3dSettings | null; updatedAt: string | null }>> {
    return { success: true, data: await this.svc.getSettings() };
  }
}

// /api/admin/house3d — 관리자 전용. public/house3d/admin.html(업체 관리자 시안)이 호출한다.
@Controller('api/admin/house3d')
@UseGuards(House3dDevOnlyGuard, AdminGuard)
export class AdminHouse3dController {
  constructor(private readonly svc: House3dService) {}

  // GET /api/admin/house3d/requests?limit=200
  @Get('requests')
  async list(@Query('limit') limit?: string): Promise<ApiResponse<House3dRequestRow[]>> {
    return { success: true, data: await this.svc.listRequests(Number(limit)) };
  }

  // PATCH /api/admin/house3d/requests/:id { status }
  @Patch('requests/:id')
  async setStatus(@Param('id') id: string, @Body() body: any): Promise<ApiOk> {
    await this.svc.setStatus(id, body?.status);
    return { success: true };
  }

  // DELETE /api/admin/house3d/requests/:id
  @Delete('requests/:id')
  async remove(@Param('id') id: string): Promise<ApiOk> {
    await this.svc.deleteRequest(id);
    return { success: true };
  }

  // PUT /api/admin/house3d/settings { prices, edits, hidden }
  @Put('settings')
  async putSettings(@Body() body: any, @Req() req: any): Promise<ApiResponse<{ updatedAt: string }>> {
    return { success: true, data: await this.svc.putSettings(body, req.user.id) };
  }
}
