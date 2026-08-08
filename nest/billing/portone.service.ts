import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 레거시 portone.service를 위임(로직 재사용).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const portone = require(path.join(__dirname, '..', '..', 'src', 'billing', 'portone.service.js'));

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
}
