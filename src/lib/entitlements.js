/**
 * 플랜 기반 권한(entitlement) 판정 + 게이팅.
 * users.plan ('free' | 'starter' | 'standard' | 'pro' | 'premium') 과 role 을 기준으로 한다.
 * 가격/한도는 프론트의 public/js/pricing.js 와 일치시킨다.
 */

// 플랜별 권한 정의 (서버측 단일 소스). (2026-07-06) 티어 다양화: free/starter/standard/pro/premium.
// monthlyCredits는 pricing.config.js plans.cr와 일치(표시·참고용).
const PLANS = {
  // ── 축별 '실제 강제(enforcement)' 상태 — 가격표 카피를 쓰기 전에 반드시 읽을 것 ──
  // privateMode   ✅ 진짜 강제. 결과물을 공개 커뮤니티 피드(Community Creations)에서 빼는 권한(유료 전용).
  //                  generate.route.js canUsePrivate()가 서버에서 검사 → free가 privateMode=true를 보내도 공개로 강제.
  //                  ⇒ Free→유료 전환에서 '코드로 지켜지는' 유일한 제품 차이.
  // commercial    ⚖️ 계약(약관)으로 강제되는 라이선스 축. 코드 게이트는 없다(terms.html 제13조 표가 근거).
  //                  (2026-07-17) 유료 전 티어 개방 — 타깃이 '파는 셀러'인데 유료 4티어 중 3개가 개인용이라
  //                  랜딩 CTA를 따라 가입한 셀러가 약관상 결과물을 자기 상품에 못 쓰는 구조적 모순이었다.
  //                  ⚠️ 값을 바꾸면 terms.html 제8조②(:149)와 제13조② 표(:210-211)를 반드시 함께 고칠 것.
  // watermarkFree ⛔ 선언만 있고 미배선. src/lib/watermark.js는 호출자 0건이고
  //                  generate.route.js:385가 플랜과 무관하게 watermarked:false를 반환한다 ⇒ free도 워터마크 없음.
  //                  (studio.html:4560의 업셀 토스트는 그래서 한 번도 발화하지 않는다.)
  // hd            ⛔ 선언만 있고 미배선. 해상도를 플랜으로 나누는 코드가 없다(subscription API 응답에만 노출).
  //                  ⇒ watermarkFree·hd는 배선 전까지 가격표에서 차별점으로 팔지 말 것 = 지금 지키지 못하는 약속.
  free:     { name: 'Free',     rank: 0, monthlyCredits: 1500,  watermarkFree: false, hd: false, commercial: false, privateMode: false },
  starter:  { name: 'Starter',  rank: 1, monthlyCredits: 7300,  watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  standard: { name: 'Standard', rank: 2, monthlyCredits: 20300, watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  pro:      { name: 'Pro',      rank: 3, monthlyCredits: 44000, watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  premium:  { name: 'Premium',  rank: 4, monthlyCredits: 95000, watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  // ⇒ 개방 결과: 유료 4티어는 기능 축이 완전히 동일하고 monthlyCredits(쓰는 양)만 다르다.
  //    가격표도 정확히 그렇게 말할 것 — 없는 차별점을 지어내면 slots/Concept cut 사태가 반복된다.
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

/**
 * 유료 등급인가 — Starter/Standard/Pro/Premium/admin (admin은 planKey()가 premium으로 매핑).
 * plan_renews_at 만료 시 free로 강등되어 false.
 * ⚠️ 이름과 달리 '워터마크 면제'를 뜻하지 않는다 — watermarkFree는 미배선이라 free도 워터마크가 없다.
 *    subscription.service.js가 이 값을 응답에 실어 보낼 뿐, 생성 경로는 보지 않는다.
 */
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
