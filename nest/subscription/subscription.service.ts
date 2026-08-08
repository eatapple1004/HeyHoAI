import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 기존 구독 로직 재사용(중복 금지) — DB 접근·플랜 계산·크레딧 지급은 레거시 subscription.service.js가 담당.
//   dist/subscription/subscription.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'subscription', 'subscription.service.js'));

@Injectable()
export class SubscriptionService {
  // 현재 플랜·권한·24h 오퍼 상태. nowMs는 컨트롤러가 주입(레거시 라우트와 동일 — 테스트 용이).
  getSubscription(user: { id: string; role: string }, nowMs: number) {
    return legacy.getSubscription(user, nowMs);
  }

  // 24h 업그레이드 오퍼 시작(멱등 — 이미 시작했으면 기존 시작 시각 유지).
  startOffer(userId: string, nowMs: number) {
    return legacy.startOffer(userId, nowMs);
  }

  // 기간권(선불) 활성화. ⚠️ 결제 미연동 — 현재는 admin 수동만(컨트롤러에서 role 검사).
  activatePlan(userId: string, plan: string, nowMs: number, months: number) {
    return legacy.activatePlan(userId, plan, nowMs, months);
  }
}
