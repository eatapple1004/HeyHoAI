import { Module } from '@nestjs/common';
import { AdminHqController } from './hq.controller';
import { HqService } from './hq.service';
import { HqRepository } from './hq.repository';
import { AdminGuard } from '../auth/admin.guard';

/**
 * HQ — 관리자 전용 운영 기록판(/admin-hq 화면의 API).
 *   방향·흐름·결정·고객·기록을 남기고, 흐름 옆에는 운영 DB 숫자를 읽기 전용으로 붙인다(EnvDbService, 전역 모듈).
 *   테이블은 리포지토리가 지연 생성(hq_state·hq_decisions·hq_leads·hq_log) — migrate.js 무변경.
 *   NEST_PREFIXES에 '/api/admin/hq' 등록 — 레거시에 같은 접두사 없음(확인 2026-11-15).
 */
@Module({
  controllers: [AdminHqController],
  providers: [HqService, HqRepository, AdminGuard],
})
export class HqModule {}
