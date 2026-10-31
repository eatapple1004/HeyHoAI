import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

/**
 * /house3d 는 dev 전용 시안이다(정적 페이지도 main.ts·src/index.js 가드가 dev 밖에서는 404).
 *   API도 같은 기준으로 막는다 — staging/prod에서는 경로가 없는 것처럼 404.
 */
@Injectable()
export class House3dDevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    if ((process.env.NODE_ENV || 'development') !== 'development') {
      throw new NotFoundException({ success: false, error: 'Not Found' });
    }
    return true;
  }
}
