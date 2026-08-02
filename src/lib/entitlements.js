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
  // ── 콘텐츠 팩 미리보기(캐논 레퍼) 3축 (2026-08-03) — 아래 '팩 미리보기 정산' 주석에 근거 계산 있음 ──
  // packUnusedCap  안 쓴 팩(컷 0장) 동시 보유 상한. 넘으면 새 팩 생성 차단(409). 컷을 뽑으면 저절로 비워진다.
  // refRebakeFree  주기당 무료 재생성 횟수. 초과분은 굽기당 ◈100.
  free:     { name: 'Free',     rank: 0, monthlyCredits: 1500,  packUnusedCap: 3,  refRebakeFree: 5,   watermarkFree: false, hd: false, commercial: false, privateMode: false },
  starter:  { name: 'Starter',  rank: 1, monthlyCredits: 7300,  packUnusedCap: 5,  refRebakeFree: 15,  watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  standard: { name: 'Standard', rank: 2, monthlyCredits: 20300, packUnusedCap: 8,  refRebakeFree: 35,  watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  pro:      { name: 'Pro',      rank: 3, monthlyCredits: 44000, packUnusedCap: 12, refRebakeFree: 70,  watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  premium:  { name: 'Premium',  rank: 4, monthlyCredits: 95000, packUnusedCap: 20, refRebakeFree: 130, watermarkFree: true,  hd: true,  commercial: true,  privateMode: true  },
  // ⇒ 개방 결과: 유료 4티어는 기능 축이 완전히 동일하고 monthlyCredits(쓰는 양)만 다르다.
  //    가격표도 정확히 그렇게 말할 것 — 없는 차별점을 지어내면 slots/Concept cut 사태가 반복된다.
  //
  // ── 기업 3티어 (2026-08-03 추가) ──
  // 🔴 여태 pricing.config.js enterprise(team·pro·elite)에만 있고 여기엔 없었다 = 실제 버그였다.
  //    planKey()가 `!PLANS[user.plan] → 'free'` 로 떨어뜨려, 기업 고객을 만들면 결제는 990만원인데
  //    권한은 Free(◈1,500·상업권 없음)가 된다. 고객이 아직 0명이라 안 터졌을 뿐이다.
  // 키 이름이 가격표와 다른 이유: 가격표는 enterprise.{team,pro,elite} 중첩이고 여기는 평평한 키라
  //    'pro'가 개인 Pro와 충돌한다 ⇒ entTeam·entPro·elite. users.plan에 저장될 값도 이것.
  entTeam:  { name: 'Enterprise Team', rank: 5, monthlyCredits: 362000, packUnusedCap: 40, refRebakeFree: 360, watermarkFree: true, hd: true, commercial: true, privateMode: true },
  entPro:   { name: 'Enterprise Pro',  rank: 6, monthlyCredits: 575000, packUnusedCap: 60, refRebakeFree: 540, watermarkFree: true, hd: true, commercial: true, privateMode: true },
  elite:    { name: 'Elite',           rank: 7, monthlyCredits: 813000, packUnusedCap: 80, refRebakeFree: 700, watermarkFree: true, hd: true, commercial: true, privateMode: true },
};

// ─── 팩 미리보기(캐논 레퍼) 정산 ────────────────────────────────────────────────
// 원칙: **기본은 넉넉히 무료, 넘으면 값.** 기능을 자르는 곳은 한 군데도 없다.
//
//   ① 초기 굽기   팩당 REF_FREE_INITIAL(6)장까지 무료 · 초과분 굽기당 ◈100
//   ② 새 팩 생성  안 쓴 팩이 packUnusedCap 이상이면 409 차단(과금 아님)
//   ③ 재생성      주기당 refRebakeFree 회까지 무료 · 초과분 굽기당 ◈100
//
// 🔑 왜 축마다 통제 방식이 다른가 — **수입이 비용을 따라오는가**가 갈린다.
//   · 초기 굽기는 게이트 최소 선택이 4컷이라 팩당 최소 4컷 수입이 항상 동반된다.
//     굽기 1회 원가 $0.149 vs 4컷 마진 $1.02(최악 Elite) ⇒ 레퍼 6장까지 흑자(손익분기 6.8).
//     그래서 6까지 무료로 열어도 안전하고, 그 위는 값을 받되 **자르지는 않는다**
//     (변형 10색 세트를 6색으로 조용히 깎으면 셀러 눈엔 제품 손실이다).
//   · 재생성은 컷을 안 뽑아도 무한 반복이 된다 ⇒ 수입 0에 비용만 쌓인다.
//     팩당 한도로는 못 막는다(팩 개수가 무제한이라 총량이 안 잡힘) ⇒ **주기당 총량**으로 막는다.
//     refRebakeFree는 최악(무료분을 다 쓰고 컷을 하나도 안 뽑음)에도 원가가 월 마진의 15% 안이 되게 잡았다.
//   · 새 팩 생성은 "만들고 방치"만 겨냥한다. 컷을 뽑으면 칸이 저절로 비므로 해제 로직이 필요 없고,
//     돈을 안 받으니 "무료라며 왜 돈 내냐"는 반발도 없다.
//
// ⚠️ 상위 티어일수록 컷당 마진이 **낮다**(볼륨 할인: Starter $0.552 → Elite $0.255).
//    그래서 "상위 플랜에 더 준다"는 **팩당 기준으로는 성립하지 않는다** — 주기당 총량 기준으로만 성립한다
//    (월 마진이 Starter $13 vs Elite $691이라 총량으로는 정직하게 더 줄 수 있다).
const REF_FREE_INITIAL = 6;

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

/** 안 쓴 팩(컷 0장) 동시 보유 상한 */
function packUnusedCap(user) {
  const e = entitlementsFor(user);
  return (e && e.packUnusedCap) || PLANS.free.packUnusedCap;
}

/** 주기당 무료 재생성 횟수 */
function refRebakeFree(user) {
  const e = entitlementsFor(user);
  return (e && e.refRebakeFree) || PLANS.free.refRebakeFree;
}

// ── 재생성 주기의 경계 ──────────────────────────────────────────────────────
// 전원 공통 '매월 1일'이 아니라 **사용자마다 다른 구독 앵커일**을 쓴다(사용자 결정, 2026-08-03).
//
// 🔑 앵커 출처를 이 함수 하나에 가둔 이유: 지금 코드는 아직 기간권(선불)이다
//    (subscription.service.js가 m*30일 만료·자동재청구 없음, 실제 결제 주기를 담은 테이블도 없다).
//    정기결제(포트원 빌링키)가 붙으면 **이 함수 내부만** 결제일 기준으로 갈아끼우면 되고,
//    호출부는 손대지 않는다.
// 현재 앵커: plan_renews_at(갱신일) → 없으면 users.created_at(가입일) → 둘 다 없으면 1일.
//    ⚠️ 기간권은 30일 단위 연장이라 갱신 때마다 앵커일이 1~2일씩 밀린다. 정기결제 전까지의 한계.
const KST_MS = 9 * 60 * 60 * 1000;
function _kstParts(d) { const t = new Date(d.getTime() + KST_MS); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; }
function _kstMidnight(y, m, day) { return new Date(Date.UTC(y, m, day) - KST_MS); }   // KST 자정 → UTC Date
function _daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

/** 이 사용자의 현재 재생성 주기 시작 시각(UTC Date). 앵커일 31은 짧은 달 말일로 clamp(표준 청구 관행). */
function refPeriodStart(user, now = new Date()) {
  const src = user && (user.plan_renews_at || user.created_at);
  const anchor = src ? new Date(src) : null;
  const anchorDay = anchor && !isNaN(anchor.getTime()) ? _kstParts(anchor).d : 1;
  const n = _kstParts(now);
  let y = n.y, m = n.m;
  let day = Math.min(anchorDay, _daysInMonth(y, m));
  if (_kstMidnight(y, m, day).getTime() > now.getTime()) {   // 이번 달 기준일이 아직 안 왔으면 지난 주기
    m -= 1; if (m < 0) { m = 11; y -= 1; }
    day = Math.min(anchorDay, _daysInMonth(y, m));
  }
  return _kstMidnight(y, m, day);
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

module.exports = { PLANS, planKey, entitlementsFor, isPro, isWatermarkExempt, requirePlan,
  REF_FREE_INITIAL, packUnusedCap, refRebakeFree, refPeriodStart };
