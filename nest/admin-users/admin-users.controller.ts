import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { AdminUsersService, EnvKey } from './admin-users.service';

/** 사용자·생성물 조회 — 관리자 전용. dev·staging·prod를 한 화면에서 골라 본다. */
@Controller('api/admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly svc: AdminUsersService) {}

  /** GET /api/admin/users?env=development|staging|production — 기본은 이 서버의 환경 */
  @Get()
  async list(@Query('env') envKey?: string): Promise<ApiResponse<any>> {
    const key = (envKey as EnvKey) || this.svc.current();
    return { success: true, data: await this.svc.users(key) };
  }

  /** GET /api/admin/users/:id?env=… — 한 사용자의 계정·생성물·크레딧 내역 */
  @Get(':id')
  async detail(@Param('id') id: string, @Query('env') envKey?: string): Promise<ApiResponse<any>> {
    const key = (envKey as EnvKey) || this.svc.current();
    return { success: true, data: await this.svc.detail(key, id) };
  }
}
