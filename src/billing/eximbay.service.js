const crypto = require('crypto');
const { env } = require('../config');
const { query } = require('../db/client');
const creditService = require('../credits/credit.service');
const log = require('../lib/logger')('Eximbay');
const { PACKS } = require('./billing.route');

const BASE = () => (env.EXIMBAY_ENV === 'production' ? 'https://api.eximbay.com' : 'https://api-test.eximbay.com');
const SDK_URL = () => `${BASE()}/v2/javascriptSDK.js`;

function configured() {
  return Boolean(env.EXIMBAY_API_KEY && env.EXIMBAY_MID);
}

/** Basic 인증 헤더 (API 키를 base64로) */
function authHeader() {
  return 'Basic ' + Buffer.from(`${env.EXIMBAY_API_KEY}:`).toString('base64');
}

function findPack(packId) {
  return PACKS.find((p) => p.id === packId) || null;
}

/**
 * 결제 준비: pending 주문 생성 + Eximbay /ready 호출 → fgkey 반환.
 * 클라이언트는 반환된 fgkey + payment/merchant/buyer/url로 SDK 결제창을 연다.
 */
async function ready({ user, packId, baseUrl }) {
  if (!configured()) { const e = new Error('결제가 아직 설정되지 않았습니다. (Eximbay 키 필요)'); e.statusCode = 503; throw e; }
  const pack = findPack(packId);
  if (!pack) { const e = new Error('Unknown pack'); e.statusCode = 400; throw e; }

  // 고유 주문번호 (영숫자)
  const orderId = 'dp' + crypto.randomBytes(12).toString('hex');

  const payment = { transaction_type: 'PAYMENT', order_id: orderId, currency: 'USD', amount: String(pack.usd), lang: 'EN' };
  const merchant = { mid: env.EXIMBAY_MID };
  const buyer = { name: user.email ? user.email.split('@')[0] : 'customer', email: user.email || 'customer@doppia.ai' };
  const url = {
    return_url: `${baseUrl}/billing.html?purchased=${pack.id}`,
    status_url: `${baseUrl}/api/billing/eximbay/status`,
  };

  // pending 주문 기록 (status_url에서 이 주문을 찾아 충전)
  await query(
    `INSERT INTO billing_orders (order_id, user_id, provider, pack_id, credits, amount_usd, status)
     VALUES ($1, $2, 'eximbay', $3, $4, $5, 'pending')`,
    [orderId, user.id, pack.id, pack.credits, pack.usd]
  );

  // Eximbay 결제 준비 API
  const res = await fetch(`${BASE()}/v1/payments/ready`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment, merchant, buyer, url }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.rescode !== '0000' || !data.fgkey) {
    log.error('ready failed:', JSON.stringify(data).slice(0, 300));
    await query(`UPDATE billing_orders SET status='failed', updated_at=now() WHERE order_id=$1`, [orderId]);
    const e = new Error('결제 준비에 실패했습니다.'); e.statusCode = 502; throw e;
  }

  // 클라이언트 SDK가 fgkey와 함께 동일 파라미터로 결제창을 열어야 함
  return { sdkUrl: SDK_URL(), fgkey: data.fgkey, payment, merchant, buyer, url };
}

/**
 * status_url 서버 알림 처리. 원본 쿼리스트링을 /verify로 위변조 검증한 뒤
 * 해당 주문을 충전한다. (멱등 — 이미 paid면 스킵)
 * @param {string} rawQuery Eximbay가 보낸 원본 application/x-www-form-urlencoded 본문
 */
async function handleStatus(rawQuery) {
  if (!configured()) { log.warn('status received but Eximbay not configured'); return; }

  const params = new URLSearchParams(rawQuery);
  const orderId = params.get('order_id');
  const resultCode = params.get('rescode') || params.get('resultcode');
  if (!orderId) { log.warn('status without order_id'); return; }

  // 결제 결과 코드가 성공(0000)이 아니면 무시
  if (resultCode && resultCode !== '0000') {
    await query(`UPDATE billing_orders SET status='failed', updated_at=now() WHERE order_id=$1 AND status='pending'`, [orderId]);
    log.info(`Order ${orderId} not approved (${resultCode})`);
    return;
  }

  // ── 위변조 검증: 원본 쿼리스트링을 Eximbay /verify로 확인 ──
  const verifyRes = await fetch(`${BASE()}/v1/payments/verify`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: rawQuery }),
  });
  const verifyData = await verifyRes.json().catch(() => ({}));
  if (verifyData.rescode !== '0000') {
    log.warn(`Verify failed for ${orderId}: ${JSON.stringify(verifyData).slice(0, 200)}`);
    return;
  }

  // ── 멱등 충전: pending → paid 로 바꾸는 데 성공한 경우에만 ──
  const upd = await query(
    `UPDATE billing_orders SET status='paid', updated_at=now()
     WHERE order_id=$1 AND status='pending' RETURNING user_id, pack_id, credits, amount_usd`,
    [orderId]
  );
  if (upd.rowCount === 0) { log.info(`Order ${orderId} already processed`); return; }
  const order = upd.rows[0];

  // payments 기록 (멱등 보강)
  await query(
    `INSERT INTO payments (user_id, provider, order_id, product, amount_usd, credits, raw)
     VALUES ($1,'eximbay',$2,$3,$4,$5,$6) ON CONFLICT (provider, order_id) DO NOTHING`,
    [order.user_id, orderId, order.pack_id, order.amount_usd, order.credits, JSON.stringify({ q: rawQuery.slice(0, 2000) })]
  );

  await creditService.addCredits(order.user_id, order.credits, {
    type: 'purchase', description: `크레딧 팩 구매 (${order.pack_id}, Eximbay)`, refId: orderId,
  });

  // 추천인 커미션 (실패해도 결제엔 영향 없음)
  const affiliateService = require('../affiliate/affiliate.service');
  await affiliateService.payCommission(order.user_id, order.credits, orderId).catch((e) => log.warn('commission:', e.message));

  log.info(`✅ Order ${orderId}: +◈${order.credits} → user ${order.user_id}`);
}

module.exports = { configured, ready, handleStatus, SDK_URL, BASE };
