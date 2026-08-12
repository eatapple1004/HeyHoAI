const api = require('./auth.api');
const { setAuthCookie, clearAuthCookie, COOKIE_NAME } = require('./cookie');

// 얇은 Express 어댑터 — 오케스트레이션은 auth.api.js, 쿠키는 cookie.js 단일소스(레거시·Nest 공용).

/** POST /api/auth/signup */
async function signup(req, res, next) {
  try {
    const refCode = req.cookies && req.cookies.ref;
    const { user, refLinked } = await api.signup(req.body || {}, refCode);
    if (refLinked) res.clearCookie('ref', { path: '/' });
    setAuthCookie(res, user);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

/** POST /api/auth/login */
async function login(req, res, next) {
  try {
    const user = await api.login(req.body || {});
    setAuthCookie(res, user);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

/** POST /api/auth/logout */
async function logout(_req, res, next) {
  try {
    clearAuthCookie(res);
    res.json({ success: true });
  } catch (err) { next(err); }
}

/** GET /api/auth/me (requireAuth) */
async function me(req, res, next) {
  try {
    res.json({ success: true, data: await api.me(req.user.id) });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

/** PATCH /api/auth/me (requireAuth) — 표시 이름 변경 */
async function updateProfile(req, res, next) {
  try {
    res.json({ success: true, data: await api.updateProfile(req.user.id, req.body || {}) });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

/** DELETE /api/auth/me (requireAuth) — 계정 소프트 삭제 + 로그아웃 */
async function deleteAccount(req, res, next) {
  try {
    await api.deleteAccount(req.user.id);
    clearAuthCookie(res);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { signup, login, logout, me, updateProfile, deleteAccount, setAuthCookie, COOKIE_NAME };
