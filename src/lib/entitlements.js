/**
 * 플랜 기반 권한(entitlement) 판정 + 게이팅.
 * users.plan ('free' | 'creator' | 'pro' | 'brand') 과 role 을 기준으로 한다.
 * 유료 플랜이 워터마크 제거 등 권한을 자동으로 부여한다.
 * 가격/한도는 프론트의 public/js/pricing.js 와 일치시킨다.
 */

// 플랜별 권한 정의 (서버측 단일 소스). (2026-07-06) 티어 다양화: free/starter/standard/pro/premium.
// monthlyCredits는 pricing.config.js plans.cr와 일치(표시·참고용).
const PLANS = {
  // privateMode = 결과물을 공개 Explore 피드에서 빼는 권한(구독자 전용). free는 항상 공개.
  free:     { name: 'Free',     rank: 0, monthlyCredits: 1500,  watermarkFree: false, hd: false, commercial: false, privateMode: false },
  starter:  { name: 'Starter',  rank: 1, monthlyCredits: 7300,  watermarkFree: true,  hd: true,  commercial: false, privateMode: true  },
  standard: { name: 'Standard', rank: 2, monthlyCredits: 20300, watermarkFree: true,  hd: true,  commercial: false, privateMode: true  },
  pro:      { name: 'Pro',      rank: 3, monthlyCredits: 44000, watermarkFree: true,  hd: true,  commercial: false, privateMode: true  },
  premium:  { name: 'Premium',  rank: 4, monthlyCredits: 95000, watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
};

/** 사용자의 유효 플랜 키 (admin은 최상위 premium 권한으로 취급) */
function planKey(user) {
  if (!user) return 'free';
  if (user.role === 'admin') return 'premium';
  if (!PLANS[user.plan] || user.plan === 'free') return 'free';
  // 기간권(선불) 만료 강등: plan_renews_at(만료일)이 지났으면 free. 자동재청구 없음(eximbay 정기결제 오픈 전).
  //   ⚠️ 만료 반영하려면 조회 지점에서 plan_renews_at도 넣을 것(없으면 만료 체크 스킵=하위호환).
  if (user.plan_renews_at) {
    const exp = new Date(user.plan_renews_at).getTime();
    if (!isNaN(exp) && exp < Date.now()) return 'free';
  }
  return user.plan;
}

/** 플랜 권한 객체 */
function entitlementsFor(user) {
  return PLANS[planKey(user)];
}

/** 유료(워터마크 면제) 등급인가 — Creator/Pro/Brand/admin */
function isPro(user) {
  return entitlementsFor(user).watermarkFree;
}

/** 워터마크 면제 대상인가 (유료 플랜/admin이면 항상 클린) */
function isWatermarkExempt(user) {
  return entitlementsFor(user).watermarkFree;
}

/**
 * 특정 플랜 등급 이상을 요구하는 Express 미들웨어 게이트.
 * 예: router.post('/pro-feature', requirePlan('pro'), handler)
 * req.user.plan 이 필요하므로, JWT에 plan이 없으면 라우트에서 먼저 로드해 둘 것.
 */
function requirePlan(minPlan) {
  const need = PLANS[minPlan]?.rank ?? 0;
  return (req, res, next) => {
    const have = entitlementsFor(req.user).rank;
    if (have < need) {
      return res.status(403).json({
        success: false,
        error: `이 기능은 ${PLANS[minPlan].name} 플랜 이상에서 사용할 수 있어요.`,
        upgrade: { required: minPlan },
      });
    }
    next();
  };
}

module.exports = { PLANS, planKey, entitlementsFor, isPro, isWatermarkExempt, requirePlan };
