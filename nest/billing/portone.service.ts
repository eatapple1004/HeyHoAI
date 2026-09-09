import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 레거시 portone.service를 위임(로직 재사용).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const portone = require(path.join(__dirname, '..', '..', 'src', 'billing', 'portone.service.js'));
// 빌링키(정기결제) — 카드 등록·삭제·청구. 결제 검증·충전은 위 단건 서비스를 재사용한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const billing = require(path.join(__dirname, '..', '..', 'src', 'billing', 'portoneBilling.service.js'));
// 결제 취소(환불) — 단건결제·빌링키 청구 공통. 정책 판정과 실행이 같은 모듈에 있다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const refunds = require(path.join(__dirname, '..', '..', 'src', 'billing', 'portoneRefund.service.js'));

@Injectable()
export class PortoneService {
  publicConfig() {
    return portone.publicConfig();
  }
  beginPack(user: any, packId: any) {
    return portone.beginPack({ user, packId });
  }
  verifyAndComplete(paymentId: any) {
    return portone.verifyAndComplete(paymentId);
  }

  // ── 빌링키(정기결제용 카드) ──

  /** 카드 등록창을 띄우는 데 필요한 공개 파라미터 */
  issueParams(user: any) {
    return billing.issueParams(user);
  }
  /** 등록된 카드(브랜드·last4). 토큰은 내보내지 않는다 */
  card(userId: string) {
    return billing.getCard(userId);
  }
  registerCard(user: any, billingKey: any) {
    return billing.registerCard(user, billingKey);
  }
  deleteCard(user: any) {
    return billing.deleteCard(user);
  }
  chargePack(user: any, packId: any) {
    return billing.chargePack(user, packId);
  }

  // ── 결제 취소(환불) ──

  /** 환불 가능 여부·금액 판정(부작용 없음). 화면 안내와 실제 취소가 같은 판정을 쓴다.
   *  userId를 넘기면 소유자만 조회할 수 있다(관리자 호출은 생략). */
  assessRefund(paymentId: string, userId?: string) {
    return refunds.assess(paymentId, userId ? { userId } : {});
  }
  /** 사용자 셀프 환불 — 미사용·7일 이내 전액만 열린다(정책 위반은 서비스가 400으로 막는다). */
  refundSelf(userId: string, paymentId: string, reason?: string) {
    return refunds.refund(paymentId, { userId, requester: 'CUSTOMER', reason });
  }
  /** 관리자 취소 — 부분취소·회수 크레딧 지정 가능. */
  refundAsAdmin(paymentId: string, opts: any) {
    return refunds.refund(paymentId, { ...opts, requester: 'ADMIN' });
  }
  /** 사용자의 최근 결제(환불 이력 포함) */
  myOrders(userId: string, limit?: number) {
    return refunds.listRefundable(userId, limit);
  }
  /** 취소 이력(관리자) */
  refundHistory(orderId?: string, limit?: number) {
    return refunds.listRefunds({ orderId: orderId || null, limit });
  }
  /** PG에서 이미 일어난 취소를 우리 쪽에 반영(콘솔 취소 복구용) */
  reconcileRefund(paymentId: string) {
    return refunds.reconcileFromPg(paymentId);
  }
}
