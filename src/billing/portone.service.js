// PortOne V2 결제 — 크레딧 팩 일회성 결제(인증결제/결제창).
//   흐름: beginPack(pending 주문 생성) → 프론트 PortOne.requestPayment → 성공 시 서버가
//   PortOne 결제단건 API로 검증(status=PAID + 금액 일치) → 멱등 충전. 웹훅도 동일 검증 경로 재사용.
//   금액 위변조 방지: 프론트가 보낸 금액을 믿지 않고 서버가 PortOne API로 실제 결제금액을 재확인.
const crypto = require('crypto');
const { env } = require('../config');
const { query } = require('../db/client');
const creditService = require('../credits/credit.service');
const log = require('../lib/logger')('PortOne');
const { PACKS } = require('./billing.route');

const API = 'https://api.portone.io';

function configured() {
  // 임시 킬스위치: PORTONE_ENABLED=false/0/off/no 면 키가 있어도 비활성 처리(심사 대기 중 LS 브릿지 우선용).
  const flag = String(env.PORTONE_ENABLED == null ? '' : env.PORTONE_ENABLED).trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off' || flag === 'no') return false;
  return Boolean(env.PORTONE_STORE_ID && env.PORTONE_CHANNEL_KEY && env.PORTONE_API_SECRET);
}
// 프론트 노출용 공개 설정(시크릿 제외)
function publicConfig() {
  return { configured: configured(), storeId: env.PORTONE_STORE_ID || '', channelKey: env.PORTONE_CHANNEL_KEY || '' };
}
function findPack(packId) { return PACKS.find((p) => p.id === packId) || null; }

/** 팩 결제 준비 — pending 주문 생성 후 프론트가 requestPayment에 쓸 파라미터 반환. */
async function beginPack({ user, packId }) {
  if (!configured()) { const e = new Error('결제가 아직 설정되지 않았습니다. (PortOne 키 필요)'); e.statusCode = 503; throw e; }
  const pack = findPack(packId);
  if (!pack) { const e = new Error('Unknown pack'); e.statusCode = 400; throw e; }

  const paymentId = 'dp' + crypto.randomBytes(12).toString('hex'); // 영숫자 결제건 식별자
  await query(
    `INSERT INTO billing_orders (order_id, user_id, provider, pack_id, credits, amount_usd, status)
     VALUES ($1, $2, 'portone', $3, $4, $5, 'pending')`,
    [paymentId, user.id, pack.id, pack.credits, pack.usd]
  );

  return {
    storeId: env.PORTONE_STORE_ID,
    channelKey: env.PORTONE_CHANNEL_KEY,
    paymentId,
    orderName: `Doppia credits ${pack.credits} (${pack.id})`,
    totalAmount: Number(pack.krw),          // 원 단위 정수 (PortOne KRW)
    currency: 'CURRENCY_KRW',
    payMethod: 'CARD',
    customer: {
      fullName: user.email ? user.email.split('@')[0] : 'customer',
      email: user.email || undefined,
    },
  };
}

/**
 * 결제 검증 + 멱등 충전. 프론트 /complete 와 웹훅 둘 다 이 함수를 부른다.
 *   PortOne API가 진실원본 → 프론트 값 신뢰 없이 status/금액을 재확인 후에만 충전.
 * @returns {{ok:boolean, credits?:number, already?:boolean, status?:string, mismatch?:boolean}}
 */
async function verifyAndComplete(paymentId) {
  if (!configured()) { log.warn('complete but PortOne not configured'); return { ok: false }; }
  if (!paymentId || typeof paymentId !== 'string') return { ok: false };

  const ord = await query(`SELECT user_id, pack_id, credits, amount_usd, status FROM billing_orders WHERE order_id=$1`, [paymentId]);
  const order = ord.rows[0];
  if (!order) { log.warn(`no order for ${paymentId}`); return { ok: false }; }
  if (order.status === 'paid') return { ok: true, already: true };

  // PortOne 결제 단건 조회(진실원본)
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${env.PORTONE_API_SECRET}` },
  });
  const pay = await res.json().catch(() => ({}));
  if (!res.ok) { log.warn(`payment lookup failed ${paymentId}: ${res.status}`); return { ok: false }; }

  const status = pay.status;
  const paidAmount = pay.amount && pay.amount.total;
  if (status !== 'PAID') { log.info(`payment ${paymentId} status=${status}`); return { ok: false, status }; }

  // 금액 위변조 확인: 실제 결제금액 == 기대 KRW(pack_id로 재계산)
  const pack = findPack(order.pack_id);
  const expectKRW = pack ? Number(pack.krw) : null;
  if (expectKRW != null && Number(paidAmount) !== expectKRW) {
    log.warn(`amount mismatch ${paymentId}: paid ${paidAmount} != expect ${expectKRW}`);
    return { ok: false, mismatch: true };
  }

  // 멱등 충전: pending → paid 전환에 성공한 경우에만
  const upd = await query(
    `UPDATE billing_orders SET status='paid', updated_at=now()
     WHERE order_id=$1 AND status='pending' RETURNING user_id, pack_id, credits`,
    [paymentId]
  );
  if (upd.rowCount === 0) return { ok: true, already: true };
  const o = upd.rows[0];

  await query(
    `INSERT INTO payments (user_id, provider, order_id, product, amount_usd, credits, raw)
     VALUES ($1,'portone',$2,$3,$4,$5,$6) ON CONFLICT (provider, order_id) DO NOTHING`,
    [o.user_id, paymentId, o.pack_id, order.amount_usd, o.credits, JSON.stringify({ paidAmount, status })]
  );
  await creditService.addCredits(o.user_id, o.credits, {
    type: 'purchase', description: `크레딧 팩 구매 (${o.pack_id}, PortOne)`, refId: paymentId,
  });
  const affiliateService = require('../affiliate/affiliate.service');
  await affiliateService.payCommission(o.user_id, o.credits, paymentId).catch((e) => log.warn('commission:', e.message));

  log.info(`✅ PortOne ${paymentId}: +◈${o.credits} → user ${o.user_id}`);
  return { ok: true, credits: o.credits };
}

/** 웹훅(결제알림) — paymentId 추출 후 verifyAndComplete(진실원본 재확인)로 위임. */
async function handleWebhook(rawBody) {
  let body = {};
  try { body = JSON.parse(typeof rawBody === 'string' ? rawBody : Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : ''); } catch { return; }
  const paymentId = body && body.data && (body.data.paymentId || body.data.payment_id);
  if (!paymentId) { log.warn('webhook without paymentId'); return; }
  await verifyAndComplete(paymentId).catch((e) => log.warn('webhook complete:', e.message));
}

module.exports = { configured, publicConfig, beginPack, verifyAndComplete, handleWebhook };
