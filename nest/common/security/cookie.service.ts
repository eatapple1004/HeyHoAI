import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TokenService } from './token.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', '..', 'src', 'config'));

/** 쿠키 이름은 레거시와 **반드시 동일** — 바꾸면 배포 즉시 전원 로그아웃된다. */
const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

/**
 * 인증 쿠키 발급/제거.
 *   httpOnly = JS에서 못 읽음(XSS로 토큰 탈취 방지), sameSite=lax = CSRF 완화,
 *   secure = 운영에서만 true(로컬 http 개발을 막지 않도록 env로 분기).
 */
@Injectable()
export class CookieService {
  constructor(private readonly tokens: TokenService) {}

  setAuthCookie(res: any, user: { id: string; role: string }): void {
    const token = this.tokens.sign({ id: user.id, role: user.role });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.COOKIE_SECURE,
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }

  clearAuthCookie(res: any): void {
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }
}

export { COOKIE_NAME, COOKIE_MAX_AGE_MS };
