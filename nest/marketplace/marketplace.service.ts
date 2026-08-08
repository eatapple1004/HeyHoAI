import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 마켓플레이스 로직 재사용(중복 금지) — SQL·과금/로열티는 레거시 marketplace.service.js 단일소스.
//   dist/marketplace/marketplace.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'marketplace', 'marketplace.service.js'));

// 402(구매 필요)처럼 부가 data를 실어보내는 도메인 에러 → 응답 바디(레거시와 공용 변환).
export const toErrorBody = legacy.toErrorBody;

@Injectable()
export class MarketplaceService {
  // ── /templates 서브트리 (이관 11단계) ──
  listTemplates(userId: string, q: any) {
    return legacy.listTemplates(userId, q || {});
  }

  getTemplate(userId: string, id: string) {
    return legacy.getTemplate(userId, id);
  }

  getTemplateCreations(id: string) {
    return legacy.getTemplateCreations(id);
  }

  createTemplate(user: any, body: any) {
    return legacy.createTemplate(user, body || {});
  }

  updateTemplate(userId: string, id: string, body: any) {
    return legacy.updateTemplate(userId, id, body || {});
  }

  deleteTemplate(userId: string, id: string) {
    return legacy.deleteTemplate(userId, id);
  }

  // { data, charged } 봉투를 그대로 돌려준다(레거시 응답이 top-level charged를 포함).
  useTemplate(userId: string, id: string) {
    return legacy.useTemplate(userId, id);
  }

  acquireTemplate(user: any, id: string) {
    return legacy.acquireTemplate(user, id);
  }

  addToMyTemplates(userId: string, id: string) {
    return legacy.addToMyTemplates(userId, id);
  }

  reportTemplate(userId: string, id: string, reason: any) {
    return legacy.reportTemplate(userId, id, reason);
  }

  bookmarkTemplate(userId: string, id: string) {
    return legacy.bookmarkTemplate(userId, id);
  }

  unbookmarkTemplate(userId: string, id: string) {
    return legacy.unbookmarkTemplate(userId, id);
  }
}
