import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 인증 오케스트레이션·쿠키 재사용(중복 금지) — 레거시 auth.api.js / cookie.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'auth', 'auth.api.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookie = require(path.join(__dirname, '..', '..', 'src', 'auth', 'cookie.js'));
// Google OAuth 핸들러는 리다이렉트 전용 Express 핸들러라 그대로 재사용한다(로직 이중화 금지).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const google = require(path.join(__dirname, '..', '..', 'src', 'auth', 'google.js'));

export const setAuthCookie = cookie.setAuthCookie;
export const clearAuthCookie = cookie.clearAuthCookie;
export const googleHandlers = google;

@Injectable()
export class AuthApiService {
  // { user, refLinked } — refLinked면 컨트롤러가 ref 쿠키를 지운다.
  signup(body: any, refCode?: string) {
    return legacy.signup(body || {}, refCode);
  }
  login(body: any) {
    return legacy.login(body || {});
  }
  me(userId: string) {
    return legacy.me(userId);
  }
  updateProfile(userId: string, body: any) {
    return legacy.updateProfile(userId, body || {});
  }
  deleteAccount(userId: string) {
    return legacy.deleteAccount(userId);
  }
}
