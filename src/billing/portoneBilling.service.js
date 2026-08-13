/**
 * PortOne V2 빌링키(정기결제) — 카드 등록·조회·삭제 + 등록 카드로 청구.
 *
 * 설계 원칙: **결제 검증과 크레딧 충전은 새로 만들지 않는다.**
 *   단건 결제(portone.service.js)가 이미 `billing_orders` pending → PortOne 재조회 →
 *   금액 대조 → 멱등 충전 → payments 기록 → 제휴 커미션까지 처리한다.
 *   빌링키 청구도 "주문을 만들고 → PortOne에 청구시킨 뒤 → 같은 verifyAndComplete로 마무리"로
 *   흘려보내면, 금액 위변조 검증·멱등성·수수료 정산이 전부 공짜로 따라온다.
 *   (여기서 충전 로직을 다시 쓰면 두 벌이 갈라지고, 갈라진 쪽은 반드시 낡는다.)
 *
 * 카드번호는 우리가 갖지 않는다 — PG가 보관하고 우리는 토큰(billingKey)과 표시용 last4만 저장한다.
 */
const crypto = require('crypto');
const { env } = require('../config');
const { query } = require('../db/client');
const log = require('../lib/logger')('PortOneBilling');
const { PACKS } = require('./billing.route');
const { isKrwSellable } = require('../pricing/pricing.config');
const portone = require('./portone.service');

const API = 'https://api.portone.io';

const authHeaders = () => ({
  Authorization: `PortOne ${env.PORTONE_API_SECRET}`,
  'Content-Type': 'application/json',
});

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

function assertConfigured() {
  if (!portone.configured()) throw fail('PortOne 결제가 설정되지 않았습니다.', 503);
}

/**
 * 빌링(자동결제) 전용 채널. 일반결제와 **PG 계약이 별개**라 PortOne 채널도 따로 만들어야 한다.
 * 미설정이면 일반결제 채널로 폴백하지만, 그 채널은 빌링 미계약이라 PG가 거절한다
 * (그래서 아래 billingAvailable()이 기본 꺼짐이다 — 폴백은 계약 후 키만 옮기는 과도기용).
 */
function billingChannelKey() {
  return env.PORTONE_BILLING_CHANNEL_KEY || env.PORTONE_CHANNEL_KEY;
}

/**
 * 빌링을 실제로 쓸 수 있는가. PORTONE_BILLING_ENABLED=true/1/on/yes 일 때만 켜진다(fail-closed).
 *
 * ⚠️ 왜 기본을 끄는가: 계약 전에 requestIssueBillingKey를 부르면 PG가 거절하면서
 *   **PortOne이 자체 iframe 에러창**("자동 결제(빌링) 계약이 안 되어 있습니다")을 띄우는데,
 *   그 창의 닫기 버튼이 동작하지 않아 사용자가 새로고침 말고는 빠져나갈 방법이 없다.
 *   우리 화면에서 먼저 막는 편이 유일하게 사용자를 구할 수 있는 지점이다.
 */
function billingAvailable() {
  const flag = String(env.PORTONE_BILLING_ENABLED == null ? '' : env.PORTONE_BILLING_ENABLED)
    .trim()
    .toLowerCase();
  const on = flag === 'true' || flag === '1' || flag === 'on' || flag === 'yes';
  return on && portone.configured() && Boolean(billingChannelKey());
}

function assertBillingAvailable() {
  assertConfigured();
  if (!billingAvailable()) {
    throw fail('자동결제(정기결제)는 준비 중입니다. PG 자동결제 계약 승인 후 이용할 수 있습니다.', 503);
  }
}

function findPack(packId) {
  return PACKS.find((p) => p.id === packId) || null;
}

/**
 * 발급 요청 식별자. 프론트 SDK(requestIssueBillingKey)의 issueId로 쓰고, 그대로 돌려받는다.
 * 영숫자만 — PortOne이 특수문자를 거른다(결제건 식별자 paymentId와 같은 규칙).
 */
function newIssueId() {
  return 'bk' + crypto.randomBytes(12).toString('hex');
}

/** 프론트가 카드 등록창을 띄우는 데 필요한 파라미터(공개값만). */
function issueParams(user) {
  assertBillingAvailable();
  return {
    storeId: env.PORTONE_STORE_ID,
    channelKey: billingChannelKey(),
    billingKeyMethod: 'CARD',
    issueId: newIssueId(),
    customer: {
      customerId: String(user.id),
      fullName: user.email ? user.email.split('@')[0] : 'customer',
      email: user.email || undefined,
    },
  };
}

/** 등록된 활성 카드(표시용). 없으면 null — 카드번호·토큰은 절대 내보내지 않는다. */
async function getCard(userId) {
  const r = await query(
    `SELECT id, card_brand, card_last4, created_at
       FROM billing_keys WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

/** 내부용 — 청구에 쓸 토큰까지 포함해 조회. */
async function getActiveKey(userId) {
  const r = await query(
    `SELECT id, billing_key, card_brand, card_last4
       FROM billing_keys WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

/**
 * 카드 등록 — 프론트가 SDK로 발급받은 billingKey를 저장한다.
 *
 * ⚠️ 프론트가 준 billingKey를 그대로 믿지 않는다. PortOne 단건 조회로 **실재하는 키인지**
 *   확인한 뒤에만 저장한다(단건 결제에서 결제건을 재조회하는 것과 같은 이유).
 */
async function registerCard(user, billingKey) {
  assertBillingAvailable();
  if (!billingKey || typeof billingKey !== 'string') throw fail('billingKey가 필요합니다.', 400);

  const res = await fetch(`${API}/billing-keys/${encodeURIComponent(billingKey)}`, {
    headers: authHeaders(),
  });
  const info = await res.json().catch(() => ({}));
  if (!res.ok) {
    log.warn(`billing key lookup failed: ${res.status}`);
    throw fail('카드 정보를 확인하지 못했습니다.', 400);
  }

  // 카드 표시정보는 채널별로 위치가 조금씩 다르다 — 없으면 비워둔다(표시용일 뿐 결제에 안 쓴다).
  const method = info.methods && info.methods[0] ? info.methods[0] : {};
  const card = method.card || info.card || {};
  const brand = card.name || card.brand || card.issuer || null;
  const last4 = card.number ? String(card.number).slice(-4) : (card.last4 || null);

  // 카드 교체 시 이전 카드를 먼저 내린다. 없으면 조용히 통과(silent) — 첫 등록이 정상 경로다.
  await deleteCard(user, { silent: true }).catch((e) => log.warn('prev card cleanup:', e.message));

  const ins = await query(
    `INSERT INTO billing_keys (user_id, provider, billing_key, card_brand, card_last4, raw)
     VALUES ($1, 'portone', $2, $3, $4, $5) RETURNING id, card_brand, card_last4, created_at`,
    [user.id, billingKey, brand, last4, JSON.stringify(info)]
  );
  log.info(`card registered: user ${user.id} (${brand || '?'} ****${last4 || '????'})`);
  return ins.rows[0];
}

/**
 * 카드 삭제 — PG에서 키를 폐기하고 우리 쪽은 status='deleted'로 내린다.
 * PG 삭제가 실패해도 우리 쪽은 내린다(사용자가 "해지했다"고 믿는 상태를 우선). 실패는 로그로 남긴다.
 */
async function deleteCard(user, opts = {}) {
  const key = await getActiveKey(user.id);
  if (!key) {
    if (opts.silent) return null;
    throw fail('등록된 카드가 없습니다.', 404);
  }

  if (portone.configured()) {
    try {
      const res = await fetch(`${API}/billing-keys/${encodeURIComponent(key.billing_key)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) log.warn(`billing key delete failed at PG: ${res.status}`);
    } catch (e) {
      log.warn(`billing key delete error: ${e.message}`);
    }
  }

  await query(
    `UPDATE billing_keys SET status = 'deleted', updated_at = now() WHERE id = $1`, [key.id]
  );
  log.info(`card deleted: user ${user.id}`);
  return { deleted: true };
}

/**
 * 등록된 카드로 크레딧 팩을 청구한다(결제창 없이 서버가 직접 승인 요청).
 *
 * 금액은 **서버의 PACKS**에서 가져온다 — 클라이언트가 보낸 금액은 쓰지 않는다.
 * 승인 후에는 단건 결제와 똑같이 verifyAndComplete가 PortOne을 재조회해 충전한다.
 */
async function chargePack(user, packId) {
  assertBillingAvailable();
  const pack = findPack(packId);
  if (!pack) throw fail('Unknown pack', 400);
  // 국내 결제라 1회 충전 한도(PG 심사 요건)를 여기서도 지킨다 — 자동 청구는 화면을 안 거친다.
  if (!isKrwSellable({ priceKRW: pack.krw })) {
    throw fail('국내 결제는 1회 충전 한도(10만원 미만) 팩만 이용할 수 있습니다.', 400);
  }

  const key = await getActiveKey(user.id);
  if (!key) throw fail('등록된 카드가 없습니다. 카드를 먼저 등록하세요.', 400);

  const paymentId = 'dp' + crypto.randomBytes(12).toString('hex');
  await query(
    `INSERT INTO billing_orders (order_id, user_id, provider, pack_id, credits, amount_usd, status)
     VALUES ($1, $2, 'portone', $3, $4, $5, 'pending')`,
    [paymentId, user.id, pack.id, pack.credits, pack.usd]
  );

  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      storeId: env.PORTONE_STORE_ID,
      channelKey: billingChannelKey(),
      billingKey: key.billing_key,
      orderName: `Doppia credits ${pack.credits} (${pack.id})`,
      amount: { total: Number(pack.krw) },
      currency: 'KRW',
      customer: {
        customerId: String(user.id),
        email: user.email || undefined,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const reason = (body && (body.message || body.type)) || `HTTP ${res.status}`;
    await query(
      `UPDATE billing_orders SET status='failed', updated_at=now() WHERE order_id=$1 AND status='pending'`,
      [paymentId]
    );
    log.warn(`billing charge failed ${paymentId}: ${reason}`);
    throw fail(`결제에 실패했습니다. (${reason})`, 402);
  }

  // 승인 났어도 우리가 다시 확인한다 — 충전 판단의 진실원본은 언제나 PortOne 조회 결과다.
  const done = await portone.verifyAndComplete(paymentId);
  if (!done.ok) {
    log.warn(`charge approved but verify pending ${paymentId}: status=${done.status || '?'}`);
    return { paymentId, pending: true };
  }
  log.info(`✅ billing charge ${paymentId}: +◈${done.credits || 0} → user ${user.id}`);
  return { paymentId, credits: done.credits || null, already: !!done.already };
}

module.exports = {
  issueParams, getCard, registerCard, deleteCard, chargePack,
  billingAvailable, assertBillingAvailable, billingChannelKey,
};
