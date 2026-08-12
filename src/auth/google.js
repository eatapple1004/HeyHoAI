const crypto = require('crypto');
const { env } = require('../config');
const authService = require('./auth.service');
const { setAuthCookie } = require('./cookie'); // 순환 참조 회피 — 쿠키 로직은 cookie.js 단일소스
const log = require('../lib/logger')('GoogleOAuth');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const STATE_COOKIE = 'g_oauth_state';

/** OAuth 자격증명이 설정됐는지 */
function isConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** authorize/token 양쪽에서 동일해야 하는 redirect_uri (콘솔 등록값과 일치 필요) */
function redirectUri(req) {
  if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
  const base = env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

/** id_token(JWT) payload 디코드 (구글 토큰엔드포인트 직접 응답이라 서명 재검증 생략) */
function decodeIdToken(idToken) {
  const part = String(idToken).split('.')[1];
  if (!part) return null;
  try {
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

/** GET /api/auth/google — 구글 동의화면으로 리다이렉트 */
function googleStart(req, res) {
  if (!isConfigured()) return res.redirect('/saas-login?error=google_disabled');
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, maxAge: 10 * 60 * 1000, path: '/' });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect(`${AUTH_URL}?${params.toString()}`);
}

/** GET /api/auth/google/callback — 코드 교환 → 가입/로그인 → 쿠키 → /studio */
async function googleCallback(req, res, next) {
  try {
    if (!isConfigured()) return res.redirect('/saas-login?error=google_disabled');
    const { code, state, error } = req.query || {};
    if (error) return res.redirect('/saas-login?error=google_denied');
    // CSRF: state 쿠키 일치 검증
    const cookieState = req.cookies && req.cookies[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });
    if (!code || !state || !cookieState || state !== cookieState) {
      return res.redirect('/saas-login?error=google_state');
    }

    // 코드 → 토큰 교환
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(req),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.id_token) {
      log.error('token exchange failed:', tokenData.error || tokenRes.status);
      return res.redirect('/saas-login?error=google_token');
    }

    const profile = decodeIdToken(tokenData.id_token);
    if (!profile || !profile.sub || !profile.email) {
      return res.redirect('/saas-login?error=google_profile');
    }
    if (profile.email_verified === false) {
      return res.redirect('/saas-login?error=google_unverified');
    }

    const { user, isNew } = await authService.loginWithGoogle({
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name || profile.given_name || null,
      avatarUrl: profile.picture || null,
    });

    // 신규 가입이면 추천 쿠키 연결 (signup과 동일)
    if (isNew) {
      const refCode = req.cookies && req.cookies.ref;
      if (refCode) {
        await require('../affiliate/affiliate.service').linkReferral(refCode, user.id).catch(() => {});
        res.clearCookie('ref', { path: '/' });
      }
    }

    setAuthCookie(res, user);
    res.redirect('/studio');
  } catch (err) {
    log.error('callback error:', err.message);
    res.redirect('/saas-login?error=google');
  }
}

module.exports = { googleStart, googleCallback, isConfigured };
