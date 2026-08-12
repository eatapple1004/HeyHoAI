import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 레거시 portone.service를 위임(로직 재사용).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const portone = require(path.join(__dirname, '..', '..', 'src', 'billing', 'portone.service.js'));
// 빌링키(정기결제) — 카드 등록·삭제·청구. 결제 검증·충전은 위 단건 서비스를 재사용한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const billing = require(path.join(__dirname, '..', '..', 'src', 'billing', 'portoneBilling.service.js'));

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
}
