import { Module } from '@nestjs/common';
import { AdminHqController, HqPageController } from './hq.controller';
import { HqService } from './hq.service';
import { HqRepository } from './hq.repository';
import { HqAccessService } from './hq-access.service';
import { HqGuard, HqPageGuard } from './hq.guard';

/**
 * HQ — 운영 기록판(/admin-hq 화면 + /api/admin/hq API).
 *   입구 = 허용 메일 목록(HQ_ACCESS_EMAILS)에 있는 사람만 — 도피아 로그인 또는 Cloudflare Access 메일 인증. HqGuard·HqPageGuard.
 *   방향·흐름·결정·고객·기록을 남기고, 흐름 옆에는 운영 DB 숫자를 읽기 전용으로 붙인다(EnvDbService, 전역 모듈).
 *   테이블은 리포지토리가 지연 생성(hq_state·hq_decisions·hq_leads·hq_log) — migrate.js 무변경.
 *   NEST_PREFIXES에 '/api/admin/hq' 등록 — 레거시에 같은 접두사 없음(확인 2026-11-15).
 */
@Module({
  controllers: [AdminHqController, HqPageController],
  providers: [HqService, HqRepository, HqAccessService, HqGuard, HqPageGuard],
})
export class HqModule {}
