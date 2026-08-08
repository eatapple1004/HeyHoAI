import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 레거시 eximbay.service를 그대로 위임(로직 재사용). Nest는 얇은 래퍼 Service.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const eximbay = require(path.join(__dirname, '..', '..', 'src', 'billing', 'eximbay.service.js'));

@Injectable()
export class EximbayService {
  config() {
    return { configured: eximbay.configured(), sdkUrl: eximbay.SDK_URL() };
  }
  ready(user: any, packId: any, baseUrl: string) {
    return eximbay.ready({ user, packId, baseUrl });
  }
}
