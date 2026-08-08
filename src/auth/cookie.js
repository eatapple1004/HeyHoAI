const { signToken } = require('./token');
const { env } = require('../config');

// 인증 쿠키 단일소스 — 레거시 컨트롤러·google OAuth·Nest 컨트롤러가 모두 이걸 쓴다.
//   (auth.controller에 있던 것을 분리 — google.js ↔ auth.controller 순환 참조도 해소)

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

/** JWT를 httpOnly 쿠키로 내려준다. res = Express Response(Nest도 동일 객체). */
function setAuthCookie(res, user) {
  const token = signToken({ id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

/** 로그아웃·탈퇴 시 인증 쿠키 제거 */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

module.exports = { COOKIE_NAME, COOKIE_MAX_AGE_MS, setAuthCookie, clearAuthCookie };
