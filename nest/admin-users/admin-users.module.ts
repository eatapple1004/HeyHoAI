import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from '../auth/admin.guard';

/** 환경별 사용자·생성물 조회(관리자 전용) — /api/admin/users */
@Module({
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminGuard],
})
export class AdminUsersModule {}
