const { verifyToken } = require('../auth/token');

const COOKIE_NAME = 'token';

/** 요청에서 JWT를 추출한다. (쿠키 우선, Authorization Bearer 폴백) */
function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * API 보호 미들웨어. 인증 실패 시 401 JSON.
 * 성공 시 req.user = { id, role } 설정.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = payload;
  next();
}

/**
 * 페이지 라우트 보호 미들웨어. 인증 실패 시 /login 으로 리다이렉트.
 */
function requirePage(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token);
  if (!payload) {
    const next_ = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?next=${next_}`);
  }
  req.user = payload;
  next();
}

module.exports = { requireAuth, requirePage, extractToken };
