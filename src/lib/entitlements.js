/**
 * 플랜 기반 권한(entitlement) 판정.
 * users.plan ('free' | 'pro') 과 role 을 기준으로 한다.
 * Pro 구독 티어(작업4)가 plan='pro'를 세팅하면 자동으로 클린 이미지가 적용된다.
 */

/** Pro 등급인가 (admin은 항상 Pro 취급) */
function isPro(user) {
  if (!user) return false;
  return user.role === 'admin' || user.plan === 'pro';
}

/** 워터마크 면제 대상인가 (Pro/admin이면 항상 클린) */
function isWatermarkExempt(user) {
  return isPro(user);
}

module.exports = { isPro, isWatermarkExempt };
