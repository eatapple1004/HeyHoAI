import { Module } from '@nestjs/common';
import { AdminDiagnoseController, DiagnoseController } from './diagnose.controller';
import { DiagnoseService } from './diagnose.service';
import { DiagnoseRepository } from './diagnose.repository';
import { AdminGuard } from '../auth/admin.guard';

/**
 * 진단 퍼널(/diagnose 페이지의 저장 API).
 *   공개: POST /api/diagnose/sessions · POST /api/diagnose/requests (무인증, IP 기준 횟수 제한)
 *   관리자: GET /api/admin/diagnose/requests
 *   NEST_PREFIXES에 '/api/diagnose'·'/api/admin/diagnose' 등록 — 레거시에 같은 접두사 없음(확인 2026-10-07).
 */
@Module({
  controllers: [DiagnoseController, AdminDiagnoseController],
  providers: [DiagnoseService, DiagnoseRepository, AdminGuard],
})
export class DiagnoseModule {}
