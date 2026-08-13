const authService = require('./auth.service');
const userRepo = require('./user.repository');

// 인증 요청 처리(ops) 단일소스 — 레거시 컨트롤러(auth.controller.js)와 Nest(nest/auth) 공용.
//   쿠키 세팅은 호출측(어댑터)이 cookie.js로 처리한다(응답 객체 의존 분리).

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * 회원가입. 추천(ref) 쿠키가 있으면 추천 관계 연결(실패해도 가입은 성공).
 * @returns {{user:object, refLinked:boolean}} refLinked=true면 호출측이 ref 쿠키를 지운다.
 */
async function signup(body = {}, refCode) {
  const { email, password, displayName } = body;
  const user = await authService.signup({ email, password, displayName });
  let refLinked = false;
  if (refCode) {
    const affiliateService = require('../affiliate/affiliate.service');
    await affiliateService.linkReferral(refCode, user.id).catch(() => {});
    refLinked = true;
  }
  return { user, refLinked };
}

/** 로그인. 체험 계정은 첫 로그인 시점부터 카운트 시작(이미 시작했으면 무변경). */
async function login(body = {}) {
  const { email, password } = body;
  const user = await authService.login({ email, password });
  await require('../trial/trial.service').startTrialIfNeeded(user.id);
  return user;
}

/** 현재 사용자 — 계정이 사라졌으면 401 */
async function me(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw httpError(401, 'Unauthorized');
  return user;
}

/** 표시 이름 변경 */
async function updateProfile(userId, body = {}) {
  const displayName = String(body.displayName || '').trim();
  if (!displayName) throw httpError(400, 'Display name cannot be empty.');
  if (displayName.length > 50) throw httpError(400, 'Display name is too long (max 50).');
  const user = await userRepo.updateDisplayName(userId, displayName);
  if (!user) throw httpError(404, 'Account not found.');
  return user;
}

/** 계정 소프트 삭제(호출측이 쿠키 제거) */
function deleteAccount(userId) {
  return userRepo.softDelete(userId);
}

module.exports = { signup, login, me, updateProfile, deleteAccount };
