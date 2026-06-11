const userRepo = require('./user.repository');
const { hashPassword, verifyPassword } = require('./password');

/** statusCode를 가진 에러를 던진다. (errorHandler가 그대로 응답) */
function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * 회원가입. 이메일 중복 시 409.
 * @param {{ email: string; password: string; displayName?: string }} input
 * @returns {Promise<object>} 공개 사용자 정보 (비밀번호 제외)
 */
async function signup({ email, password, displayName }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw httpError(400, '유효한 이메일을 입력하세요.');
  }
  if (!password || String(password).length < 8) {
    throw httpError(400, '비밀번호는 8자 이상이어야 합니다.');
  }

  const existing = await userRepo.findByEmail(normalized);
  if (existing) {
    throw httpError(409, '이미 가입된 이메일입니다.');
  }

  const user = await userRepo.insert({
    email: normalized,
    passwordHash: hashPassword(password),
    displayName: displayName ? String(displayName).trim() : null,
    role: 'user',
  });

  // 가입 보너스 크레딧 (실패해도 가입 자체는 성공 처리)
  const creditService = require('../credits/credit.service');
  await creditService.grantSignupBonus(user.id).catch(() => {});

  return user;
}

/**
 * 로그인. 자격 증명 불일치 시 401.
 * @param {{ email: string; password: string }} input
 * @returns {Promise<object>} 공개 사용자 정보 (비밀번호 제외)
 */
async function login({ email, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await userRepo.findByEmail(normalized);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw httpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  if (user.status !== 'active') {
    throw httpError(403, '비활성화된 계정입니다.');
  }

  // 비밀번호 해시 제거 후 반환
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * Google OAuth 로그인/가입. google_id → 이메일계정 연결 → 신규생성 순.
 * @param {{ googleId: string, email: string, displayName?: string, avatarUrl?: string }} g
 * @returns {Promise<{ user: object, isNew: boolean }>}
 */
async function loginWithGoogle({ googleId, email, displayName, avatarUrl }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!googleId || !normalized) throw httpError(400, 'Google 계정 정보가 올바르지 않습니다.');

  // 1) 이미 google_id로 연결된 계정
  let user = await userRepo.findByGoogleId(googleId);
  if (user) {
    if (user.status !== 'active') throw httpError(403, '비활성화된 계정입니다.');
    const { password_hash, ...safe } = user;
    return { user: safe, isNew: false };
  }

  // 2) 같은 이메일의 기존 계정이 있으면 google 연결
  const existing = await userRepo.findByEmail(normalized);
  if (existing) {
    if (existing.status !== 'active') throw httpError(403, '비활성화된 계정입니다.');
    await userRepo.linkGoogle(existing.id, googleId, avatarUrl || null);
    const { password_hash, ...safe } = existing;
    return { user: safe, isNew: false };
  }

  // 3) 신규 생성 + 가입 보너스
  user = await userRepo.insertGoogle({
    email: normalized,
    googleId,
    displayName: displayName ? String(displayName).trim() : null,
    avatarUrl: avatarUrl || null,
  });
  const creditService = require('../credits/credit.service');
  await creditService.grantSignupBonus(user.id).catch(() => {});
  return { user, isNew: true };
}

module.exports = { signup, login, loginWithGoogle };
