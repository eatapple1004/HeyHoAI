import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * Meta 직결 기능 스위치.
 *
 * 꺼져 있으면 **404**를 낸다 — 403(권한 없음)이면 "권한만 주면 되는 기능"으로 오해되고,
 * 503이면 장애처럼 보인다. 지금은 그 경로가 존재하지 않는 것으로 취급하는 게 정확하다.
 *
 * 모듈 자체를 app.module에서 빼지 않는 이유: 라우트 등록을 조건부로 만들면 켜고 끌 때마다
 * 코드를 고쳐야 한다. 플래그 하나로 되돌릴 수 있어야 한다.
 */
@Injectable()
export class MetaDirectGuard implements CanActivate {
  canActivate(): boolean {
    if (!env.META_DIRECT_ENABLED) {
      throw new NotFoundException({ success: false, error: 'Meta 직결 기능이 꺼져 있습니다.' });
    }
    return true;
  }
}
