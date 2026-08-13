/**
 * 구독 정기결제 — 빌링키로 월 자동 재청구.
 *
 * 축 분리:
 *   - `users.plan` / `plan_renews_at` = **지금 무슨 권한인가**(엔타이틀먼트). activatePlan이 관리.
 *   - `subscriptions`                 = **언제 얼마를 다시 청구할 것인가**(청구 계약). 이 파일이 관리.
 *   둘을 한 테이블에 섞으면 "결제는 실패했는데 권한은 살아 있어야 하는" 유예 기간을 표현할 수 없다.
 *
 * 멱등:
 *   `subscription_charges(subscription_id, period_start)` 유니크 인덱스가 최종 방어선이다.
 *   스케줄러가 겹쳐 돌든 재시도가 얽히든 같은 주기는 한 번만 긁힌다.
 *
 * 재사용:
 *   PortOne 청구·결제 검증은 새로 쓰지 않고 `portoneBilling`/`portone` 것을 그대로 쓴다.
 */
const crypto = require('crypto');
const { env } = require('../config');
const { query } = require('../db/client');
const log = require('../lib/logger')('SubBilling');
const { PRICING } = require('../pricing/pricing.config');
const { PLANS } = require('../lib/entitlements');
const portone = require('./portone.service');
const portoneBilling = require('./portoneBilling.service');
const subscriptionService = require('../subscription/subscription.service');

const API = 'https://api.portone.io';
const DAY_MS = 24 * 60 * 60 * 1000;
/** 청구 실패 시 이 횟수까지 재시도하고, 넘으면 구독을 내린다(더닝) */
const MAX_FAIL = 3;
/** 재시도 간격 — 카드사 한도·잔액 문제는 하루면 풀리는 경우가 많다 */
const RETRY_DAYS = 2;

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

/** 플랜의 국내 청구 금액(원). 서버 단일소스에서만 읽는다 — 클라 금액은 절대 안 믿는다. */
function planPriceKrw(plan) {
  const p = PRICING.plans[plan];
  return p ? Number(p.priceKRW) : null;
}

function assertSellablePlan(plan) {
  if (!PLANS[plan] || plan === 'free') throw fail('유효한 이용권이 아닙니다.', 400);
  if (!PRICING.subscriptionsForSale) throw fail('구독 판매가 중지되어 있습니다.', 503);
  const krw = planPriceKrw(plan);
  if (!krw || krw <= 0) throw fail('유효한 이용권이 아닙니다.', 400);
  return krw;
}

/** 살아있는 구독(active·past_due) 1건. 없으면 null. */
async function getSubscription(userId) {
  const r = await query(
    `SELECT s.*, b.card_brand, b.card_last4
       FROM subscriptions s
       LEFT JOIN billing_keys b ON b.id = s.billing_key_id
      WHERE s.user_id = $1 AND s.status IN ('active','past_due') LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

/**
 * 빌링키로 1회 청구하고 결과를 기록한다.
 *
 * ⚠️ **주문(subscription_charges) 행을 먼저 만든다.** 유니크 인덱스가 여기서 걸리면
 *   같은 주기가 이미 청구된 것이므로 PG를 부르지 않고 빠져나온다 —
 *   "PG를 부른 뒤 중복을 발견"하면 이미 돈이 나간 뒤라 되돌릴 수 없다.
 *
 * @returns {{ok:boolean, already?:boolean, paymentId?:string, error?:string}}
 */
async function chargeOnce(sub, billingKey, periodStart) {
  const paymentId = 'sub' + crypto.randomBytes(12).toString('hex');
  try {
    await query(
      `INSERT INTO subscription_charges (subscription_id, user_id, payment_id, period_start, amount_krw, status)
       VALUES ($1,$2,$3,$4,$5,'pending')`,
      [sub.id, sub.user_id, paymentId, periodStart, sub.amount_krw]
    );
  } catch (e) {
    if (e && e.code === '23505') {           // unique_violation = 이 주기는 이미 처리됐다
      log.info(`sub ${sub.id}: period ${periodStart} already charged — skip`);
      return { ok: true, already: true };
    }
    throw e;
  }

  const planName = (PLANS[sub.plan] && PLANS[sub.plan].name) || sub.plan;
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: 'POST',
    headers: { Authorization: `PortOne ${env.PORTONE_API_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: env.PORTONE_STORE_ID,
      channelKey: portoneBilling.billingChannelKey(), // 빌링은 일반결제와 채널(=PG계약)이 다르다
      billingKey,
      orderName: `Doppia ${planName} 구독 (1개월)`,
      amount: { total: Number(sub.amount_krw) },
      currency: 'KRW',
      customer: { customerId: String(sub.user_id) },
    }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const reason = (body && (body.message || body.type)) || `HTTP ${res.status}`;
    await query(`UPDATE subscription_charges SET status='failed', error=$2, updated_at=now() WHERE payment_id=$1`,
      [paymentId, reason]);
    log.warn(`sub ${sub.id} charge failed: ${reason}`);
    return { ok: false, error: reason };
  }

  // 승인 응답을 믿지 않고 PortOne 조회로 재확인한다(단건 결제와 같은 원칙).
  const paid = await verifyPaid(paymentId, sub.amount_krw);
  if (!paid.ok) {
    await query(`UPDATE subscription_charges SET status='failed', error=$2, updated_at=now() WHERE payment_id=$1`,
      [paymentId, paid.error || 'verify failed']);
    return { ok: false, error: paid.error || '결제 확인 실패' };
  }

  await query(`UPDATE subscription_charges SET status='paid', updated_at=now() WHERE payment_id=$1`, [paymentId]);
  return { ok: true, paymentId };
}

/** PortOne 단건 조회로 status·금액을 재확인 — 금액 위변조·미완료 승인 방어. */
async function verifyPaid(paymentId, expectKrw) {
  try {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${env.PORTONE_API_SECRET}` },
    });
    const pay = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `조회 실패(${res.status})` };
    if (pay.status !== 'PAID') return { ok: false, error: `상태 ${pay.status}` };
    const total = pay.amount && pay.amount.total;
    if (Number(total) !== Number(expectKrw)) return { ok: false, error: `금액 불일치(${total})` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 구독 개시 — 등록된 카드로 첫 달을 청구하고 플랜을 활성화한다.
 * 카드 등록(빌링키 발급)은 프론트가 먼저 끝내둔 상태를 전제한다.
 */
async function subscribe(user, plan) {
  // 계약 전이면 여기서 끝낸다 — 아래로 내려가면 PG가 거절해 구독행만 만들었다 지우는 낭비가 된다.
  portoneBilling.assertBillingAvailable();
  const amountKrw = assertSellablePlan(plan);

  const existing = await getSubscription(user.id);
  if (existing) throw fail('이미 진행 중인 구독이 있습니다. 해지 후 다시 시도해주세요.', 409);

  const keyRow = await query(
    `SELECT id, billing_key FROM billing_keys WHERE user_id=$1 AND status='active' LIMIT 1`, [user.id]);
  const key = keyRow.rows[0];
  if (!key) throw fail('등록된 카드가 없습니다. 카드를 먼저 등록하세요.', 400);

  const now = new Date();
  const ins = await query(
    `INSERT INTO subscriptions (user_id, plan, billing_key_id, amount_krw, status, next_charge_at)
     VALUES ($1,$2,$3,$4,'active',$5) RETURNING *`,
    [user.id, plan, key.id, amountKrw, new Date(now.getTime() + 30 * DAY_MS).toISOString()]
  );
  const sub = ins.rows[0];

  const charged = await chargeOnce(sub, key.billing_key, now.toISOString());
  if (!charged.ok) {
    // 첫 청구 실패 = 구독이 성립하지 않은 것. 흔적을 남기되 살아있는 구독으로 두지 않는다.
    await query(`UPDATE subscriptions SET status='canceled', canceled_at=now(), last_error=$2, updated_at=now() WHERE id=$1`,
      [sub.id, charged.error || null]);
    throw fail(`결제에 실패했습니다. (${charged.error || '알 수 없는 오류'})`, 402);
  }

  // 권한 부여 — 월 1개월씩. activatePlan이 크레딧 지급·기간 연장까지 처리한다.
  const activated = await subscriptionService.activatePlan(user.id, plan, now.getTime(), 1);
  log.info(`✅ subscribe ${user.id} → ${plan} (₩${amountKrw})`);
  return { subscriptionId: sub.id, plan, amountKrw, nextChargeAt: sub.next_charge_at, ...activated };
}

/**
 * 해지 — 기본은 **기말 해지**(이미 낸 기간은 그대로 쓰게 둔다).
 * 즉시 환불은 정책·정산이 얽혀 여기서 하지 않는다(고객센터 경유).
 */
async function cancel(userId) {
  const sub = await getSubscription(userId);
  if (!sub) throw fail('진행 중인 구독이 없습니다.', 404);
  await query(
    `UPDATE subscriptions SET status='canceled', canceled_at=now(), next_charge_at=NULL, updated_at=now() WHERE id=$1`,
    [sub.id]);
  log.info(`구독 해지(기말): user ${userId}, sub ${sub.id}`);
  return { canceled: true, activeUntil: sub.next_charge_at };
}

/**
 * 도래한 구독을 청구한다(스케줄러가 호출).
 *
 * ⚠️ 실제 돈이 빠지는 경로다. 호출부에서 플래그로 막고, 여기서는 한 번에 처리할 건수를 제한한다.
 */
async function chargeDue(limit = 50) {
  const due = await query(
    `SELECT s.*, b.billing_key
       FROM subscriptions s
       JOIN billing_keys b ON b.id = s.billing_key_id AND b.status='active'
      WHERE s.status IN ('active','past_due')
        AND s.next_charge_at IS NOT NULL AND s.next_charge_at <= now()
      ORDER BY s.next_charge_at
      LIMIT $1`, [limit]);

  let ok = 0, failed = 0;
  for (const sub of due.rows) {
    try {
      const periodStart = new Date(sub.next_charge_at).toISOString();
      const r = await chargeOnce(sub, sub.billing_key, periodStart);

      if (r.ok) {
        await query(
          `UPDATE subscriptions
              SET status='active', fail_count=0, last_error=NULL,
                  next_charge_at = $2, updated_at=now()
            WHERE id=$1`,
          [sub.id, new Date(new Date(sub.next_charge_at).getTime() + 30 * DAY_MS).toISOString()]);
        if (!r.already) {
          await subscriptionService.activatePlan(sub.user_id, sub.plan, Date.now(), 1)
            .catch((e) => log.warn(`activatePlan failed for ${sub.user_id}: ${e.message}`));
        }
        ok++;
      } else {
        const n = (sub.fail_count || 0) + 1;
        if (n >= MAX_FAIL) {
          // 더 이상 재시도하지 않는다. 권한(users.plan)은 만료일까지 그대로 두고 청구만 멈춘다.
          await query(
            `UPDATE subscriptions SET status='canceled', canceled_at=now(), fail_count=$2,
                    last_error=$3, next_charge_at=NULL, updated_at=now() WHERE id=$1`,
            [sub.id, n, r.error || null]);
          log.warn(`sub ${sub.id}: ${n}회 실패 → 해지`);
        } else {
          await query(
            `UPDATE subscriptions SET status='past_due', fail_count=$2, last_error=$3,
                    next_charge_at=$4, updated_at=now() WHERE id=$1`,
            [sub.id, n, r.error || null, new Date(Date.now() + RETRY_DAYS * DAY_MS).toISOString()]);
          log.warn(`sub ${sub.id}: ${n}회 실패 → ${RETRY_DAYS}일 뒤 재시도`);
        }
        failed++;
      }
    } catch (e) {
      log.error(`sub ${sub.id} charge error: ${e.message}`);
      failed++;
    }
  }
  if (due.rows.length) log.info(`구독 정기청구: 성공 ${ok} · 실패 ${failed}`);
  return { processed: due.rows.length, ok, failed };
}

module.exports = { getSubscription, subscribe, cancel, chargeDue, planPriceKrw };
