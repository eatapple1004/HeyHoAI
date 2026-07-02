const { query } = require('../db/client');
const { PLANS, planKey, entitlementsFor, isPro } = require('../lib/entitlements');
const { PRICING } = require('../pricing/pricing.config');
const creditService = require('../credits/credit.service');

// 구독 가격 (월, USD) — pricing.config 단일소스에서 파생
const PRICES = {
  creator: PRICING.plans.creator.price,
  pro: PRICING.plans.pro.price,
  brand: PRICING.plans.brand.price,
};

// 24시간 첫 업그레이드 오퍼 — 할인율은 pricing.config.firstMonthOff(단일소스)
const OFFER = {
  windowMs: 24 * 60 * 60 * 1000,        // 24h
  discountPct: PRICING.firstMonthOff,    // 50% (pricing.config 기준)
  plan: 'pro',                           // 대상 플랜
};

/** 오퍼 할인가 (정가 → 할인가, 정수 USD) */
function offerPrice(plan = OFFER.plan) {
  const base = PRICES[plan] || 0;
  return Math.round(base * (1 - OFFER.discountPct / 100));
}

/**
 * 사용자 구독 상태 + 권한 + 24h 오퍼 상태.
 * @param {{id:string, role:string}} reqUser  JWT 사용자
 * @param {number} nowMs  현재 시각(ms) — 라우트에서 Date.now()로 주입(테스트 용이)
 */
async function getSubscription(reqUser, nowMs) {
  const r = await query(
    'SELECT plan, pro_offer_started_at, plan_renews_at FROM users WHERE id = $1',
    [reqUser.id]
  );
  const row = r.rows[0] || {};
  const user = { role: reqUser.role, plan: row.plan, plan_renews_at: row.plan_renews_at }; // 만료 반영(planKey가 plan_renews_at 체크)
  const key = planKey(user);
  const ent = entitlementsFor(user);

  // 24h 오퍼: 시작됐고 아직 무료이며 윈도우 내면 활성
  let offer = { active: false, discountPct: OFFER.discountPct, plan: OFFER.plan };
  if (row.pro_offer_started_at && !isPro(user)) {
    const startedMs = new Date(row.pro_offer_started_at).getTime();
    const expiresMs = startedMs + OFFER.windowMs;
    if (nowMs < expiresMs) {
      offer = {
        active: true,
        discountPct: OFFER.discountPct,
        plan: OFFER.plan,
        listPrice: PRICES[OFFER.plan],
        offerPrice: offerPrice(),
        expiresAt: new Date(expiresMs).toISOString(),
        secondsLeft: Math.floor((expiresMs - nowMs) / 1000),
      };
    }
  }

  return {
    plan: key,
    planName: ent.name,
    isPro: isPro(user),
    prices: PRICES,
    entitlements: {
      monthlyCredits: ent.monthlyCredits,
      watermarkFree: ent.watermarkFree,
      hd: ent.hd,
      commercial: ent.commercial,
      privateMode: ent.privateMode,
    },
    renewsAt: row.plan_renews_at || null,
    offer,
  };
}

/**
 * 24h 오퍼 시작 (멱등 — 이미 시작했으면 기존 시작 시각 유지).
 * 보통 신규 무료 사용자가 페이월/업그레이드 화면을 처음 볼 때 호출.
 */
async function startOffer(userId, nowMs) {
  await query(
    `UPDATE users SET pro_offer_started_at = COALESCE(pro_offer_started_at, $2)
     WHERE id = $1 AND plan = 'free'`,
    [userId, new Date(nowMs).toISOString()]
  );
  return query('SELECT pro_offer_started_at FROM users WHERE id = $1', [userId])
    .then((r) => r.rows[0]?.pro_offer_started_at || null);
}

/**
 * 플랜 활성화. ⚠️ 결제 미연동 — 실제 과금 없이 plan을 세팅한다.
 * 운영(admin)·테스트 전용. 일반 사용자 결제 플로우는 Eximbay 구독상품 연동 후 webhook에서 호출 예정.
 *
 * @param {string} userId
 * @param {string} plan   creator | pro | brand
 * @param {number} nowMs
 * @param {number} [months=1] 갱신일 산정용 개월 수
 */
// 기간권(선불) 활성화: plan을 months개월 부여(plan_renews_at=만료일, 자동재청구 없음) + 기간분 크레딧 일괄 지급.
//   3달 후 eximbay 정기결제 오픈 시 이 함수를 재청구 webhook에서 반복 호출(월 리필)로 재활용.
async function activatePlan(userId, plan, nowMs, months = 3) {
  if (!PLANS[plan] || plan === 'free') {
    throw Object.assign(new Error('유효한 이용권이 아닙니다.'), { statusCode: 400 });
  }
  const m = Math.max(1, parseInt(months, 10) || 3);
  // 현재 활성 패스(만료 반영) 조회 — 중복구매 정책의 기준.
  const r = await query('SELECT plan, plan_renews_at FROM users WHERE id = $1', [userId]);
  const cur = planKey({ plan: r.rows[0] && r.rows[0].plan, plan_renews_at: r.rows[0] && r.rows[0].plan_renews_at }); // 만료면 'free'
  const curExpMs = r.rows[0] && r.rows[0].plan_renews_at ? new Date(r.rows[0].plan_renews_at).getTime() : 0;
  const newRank = PLANS[plan].rank, curRank = PLANS[cur].rank;
  // 하위 등급 구매 차단: 활성 상위 패스가 있으면 만료 후에만 가능(B안).
  if (cur !== 'free' && newRank < curRank) {
    throw Object.assign(new Error(`이미 ${PLANS[cur].name} 패스를 이용 중이에요. 만료 후 하위 이용권을 구매할 수 있어요.`), { statusCode: 409 });
  }
  // 기간: 활성 패스(같은/상위)면 남은 기간에 이어붙여 연장, 없으면 지금부터.
  const base = (cur !== 'free' && curExpMs > nowMs) ? curExpMs : nowMs;
  const expires = new Date(base + m * 30 * 24 * 60 * 60 * 1000).toISOString();
  // 등급: 상위 구매면 즉시 상향(newRank>curRank), 같으면 유지. (하위는 위에서 차단됨)
  const effPlan = newRank >= curRank ? plan : cur;
  await query('UPDATE users SET plan = $2, plan_renews_at = $3, updated_at = now() WHERE id = $1',
    [userId, effPlan, expires]);
  // 기간분 크레딧 일괄 지급(구매한 이용권 등급의 월 크레딧 × 개월, 누적). 만료 시 잔여 소멸.
  const credits = (PLANS[plan].monthlyCredits || 0) * m;
  if (credits > 0) {
    await creditService.addCredits(userId, credits, { type: 'plan', description: `${PLANS[plan].name} ${m}개월 이용권` })
      .catch((e) => { /* 크레딧 지급 실패해도 활성화는 유지 */ });
  }
  return { plan: effPlan, expiresAt: expires, months: m, creditsGranted: credits, extended: base > nowMs, upgraded: newRank > curRank };
}

module.exports = { PRICES, OFFER, offerPrice, getSubscription, startOffer, activatePlan };
