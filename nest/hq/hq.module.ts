import { Module } from '@nestjs/common';
import { AdminHqController, HqClientPageController, HqPageController } from './hq.controller';
import { HqService } from './hq.service';
import { HqLedgerService } from './hq-ledger.service';
import { HqClientsService } from './hq-clients.service';
import { HqRepository } from './hq.repository';
import { HqAccessService } from './hq-access.service';
import { HqGuard, HqPageGuard } from './hq.guard';

/**
 * HQ — 운영 기록판(/admin-hq 화면 + /api/admin/hq API).
 *   입구 = 허용 메일 목록(HQ_ACCESS_EMAILS)에 있는 사람만 — 도피아 로그인 또는 Cloudflare Access 메일 인증. HqGuard·HqPageGuard.
 *   방향·흐름·결정·고객·기록을 남기고, 흐름 옆에는 운영 DB 숫자를 읽기 전용으로 붙인다(EnvDbService, 전역 모듈).
 *   레퍼런스 원장(hq_ledger)은 수확기가 기계 열쇠(Access 서비스 토큰, HQ_ACCESS_SERVICES)로 넣는다 — 기계는 정해진 길만(HqGuard).
 *   민감 카드는 금고(주인 비밀 문구, HQ_VAULT_OWNER)로 잠겨 서버에서 읽을 수 없다(HqLedgerService).
 *   테이블은 리포지토리가 지연 생성(hq_state·hq_decisions·hq_leads·hq_log·hq_refs·hq_ledger) — migrate.js 무변경.
 *   NEST_PREFIXES에 '/api/admin/hq' 등록 — 레거시에 같은 접두사 없음(확인 2026-11-15).
 */
@Module({
  controllers: [AdminHqController, HqPageController, HqClientPageController],
  providers: [HqService, HqLedgerService, HqClientsService, HqRepository, HqAccessService, HqGuard, HqPageGuard],
})
export class HqModule {}
