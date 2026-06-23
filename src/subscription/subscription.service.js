const { query } = require('../db/client');
const { PLANS, planKey, entitlementsFor, isPro } = require('../lib/entitlements');
const { PRICING } = require('../pricing/pricing.config');

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
  const user = { role: reqUser.role, plan: row.plan };
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
async function activatePlan(userId, plan, nowMs, months = 1) {
  if (!PLANS[plan] || plan === 'free') {
    throw Object.assign(new Error('유효한 유료 플랜이 아닙니다.'), { statusCode: 400 });
  }
  const renews = new Date(nowMs + months * 30 * 24 * 60 * 60 * 1000).toISOString();
  await query('UPDATE users SET plan = $2, plan_renews_at = $3, updated_at = now() WHERE id = $1',
    [userId, plan, renews]);
  return { plan, renewsAt: renews };
}

module.exports = { PRICES, OFFER, offerPrice, getSubscription, startOffer, activatePlan };
