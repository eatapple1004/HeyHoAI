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

/**
 * 관리자 전용 API 보호. 인증 + role==='admin' 검사. 실패 시 401/403 JSON.
 */
function requireAdmin(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (payload.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden — admin only' });
  req.user = payload;
  next();
}

/**
 * 관리자 전용 페이지 보호. 미로그인 → /login 리다이렉트, 로그인·비관리자 → 403 안내 페이지.
 */
function requireAdminPage(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token);
  if (!payload) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  if (payload.role !== 'admin') {
    return res.status(403).type('html').send('<!doctype html><meta charset="utf-8"><title>관리자 전용</title><body style="font-family:system-ui;background:#0c0c14;color:#ececf4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>🔒 관리자 전용 페이지</h2><p style="color:#9a9ab0">이 페이지는 관리자 계정만 접근할 수 있습니다.</p><a href="/" style="color:#7c6cff">← 홈으로</a></div></body>');
  }
  req.user = payload;
  next();
}

module.exports = { requireAuth, requirePage, requireAdmin, requireAdminPage, extractToken };
