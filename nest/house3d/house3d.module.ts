import { Module } from '@nestjs/common';
import { AdminHouse3dController, House3dController } from './house3d.controller';
import { House3dService } from './house3d.service';
import { House3dRepository } from './house3d.repository';
import { House3dDevOnlyGuard } from './dev-only.guard';
import { AdminGuard } from '../auth/admin.guard';

/**
 * 고급 주택 3D 마감 체험 시안(/house3d)의 서버 접수 — **dev 전용**.
 *   공개: POST /api/house3d/requests · GET /api/house3d/settings · GET /api/house3d/plans(/:id) (요청은 IP 기준 횟수 제한)
 *   관리자: GET·PATCH·DELETE /api/admin/house3d/requests · PUT /api/admin/house3d/settings · GET·PUT·DELETE /api/admin/house3d/plans/:id
 *   NEST_PREFIXES에 '/api/house3d'·'/api/admin/house3d' 등록 — 레거시에 같은 접두사 없음(확인 2026-10-31).
 */
@Module({
  controllers: [House3dController, AdminHouse3dController],
  providers: [House3dService, House3dRepository, House3dDevOnlyGuard, AdminGuard],
})
export class House3dModule {}
