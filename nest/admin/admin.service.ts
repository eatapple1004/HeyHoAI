import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 관리자 조회·제안서 로직 재사용(중복 금지) — 레거시 adminData.service.js / proposal.service.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const adminData = require(path.join(__dirname, '..', '..', 'src', 'admin', 'adminData.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const proposal = require(path.join(__dirname, '..', '..', 'src', 'admin', 'proposal.service.js'));
// refine: 스트리밍(NDJSON) 핸들러는 Express 응답을 직접 다루므로 레거시 핸들러를 그대로 재사용한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const refineRoute = require(path.join(__dirname, '..', '..', 'src', 'admin', 'adminRefine.route.js'));
export const refineHandler = refineRoute.handler;
export const refineApplyHandler = refineRoute.applyHandler;

@Injectable()
export class AdminService {
  // { data, hasMore } — hasMore는 응답 최상위 필드
  listCreations(q: any) {
    return adminData.listCreations(q || {});
  }

  getStats() {
    return adminData.getStats();
  }

  // { groups, scope, hasMore } — 전부 응답 최상위 필드
  listProposalResults(userId: string, q: any) {
    return proposal.listResults(userId, q || {});
  }

  saveProposal(userId: string, body: any) {
    return proposal.save(userId, body || {});
  }

  listProposals() {
    return proposal.list();
  }

  getProposal(id: string) {
    return proposal.getSaved(id);
  }

  removeProposal(id: string) {
    return proposal.removeSaved(id);
  }

  // ── refine 기록(refine_runs) ──
  listRefineRuns() {
    return refineRoute.runsApi.listRuns();
  }

  getRefineRun(id: string) {
    return refineRoute.runsApi.getRun(id);
  }

  removeRefineRun(id: string) {
    return refineRoute.runsApi.removeRun(id);
  }
}
