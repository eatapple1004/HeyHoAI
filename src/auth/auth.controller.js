const authService = require('./auth.service');
const userRepo = require('./user.repository');
const { signToken } = require('./token');
const { env } = require('../config');

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

/** JWT를 httpOnly 쿠키로 내려준다. */
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

/**
 * POST /api/auth/signup
 */
async function signup(req, res, next) {
  try {
    const { email, password, displayName } = req.body || {};
    const user = await authService.signup({ email, password, displayName });

    // 추천 쿠키가 있으면 추천 관계 연결 (실패해도 가입은 성공)
    const refCode = req.cookies && req.cookies.ref;
    if (refCode) {
      const affiliateService = require('../affiliate/affiliate.service');
      await affiliateService.linkReferral(refCode, user.id).catch(() => {});
      res.clearCookie('ref', { path: '/' });
    }

    setAuthCookie(res, user);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const user = await authService.login({ email, password });
    // 체험 계정: 첫 로그인 시점부터 카운트 시작 (이미 시작했으면 무변경)
    await require('../trial/trial.service').startTrialIfNeeded(user.id);
    setAuthCookie(res, user);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(_req, res, next) {
  try {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me (requireAuth)
 */
async function me(req, res, next) {
  try {
    const user = await userRepo.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, me, setAuthCookie, COOKIE_NAME };
