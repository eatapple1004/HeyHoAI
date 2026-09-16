/**
 * PortOne V2 결제 취소(환불) — 크레딧 팩 단건결제·빌링키 청구 **양쪽 공통**.
 *
 * 두 결제 경로(portone.service.beginPack / portoneBilling.chargePack)가 모두 같은
 * `billing_orders` + `payments` + 원장(type='purchase')을 남기므로, 취소도 한 벌이면 된다.
 *
 * ── 설계에서 가장 중요한 두 가지 ──
 *
 * ① **크레딧을 먼저 회수하고, 그 다음에 PG를 취소한다.**
 *    반대 순서(PG 먼저)면 취소가 성공한 직후 회수 전까지의 틈에 사용자가 크레딧을 써버릴 수 있고,
 *    그러면 돈은 돌려줬는데 재화는 소비된 상태로 굳는다(되돌릴 방법이 없다).
 *    먼저 회수하면 최악의 경우가 "PG 취소 실패 → 크레딧 원복"이라 언제나 복구 가능하다.
 *    (생성 과금이 charge() → 실패 시 refund() 로 도는 것과 같은 방향이다.)
 *
 * ② **금액의 진실원본은 우리 DB가 아니라 PortOne이다.**
 *    취소 가능액 = PG가 말하는 (결제액 − 기취소액). 팩 정가로 계산하면 가격표를 고친 뒤
 *    과거 결제를 취소할 때 어긋난다.
 *
 * 정책 근거 = public/refund.html (취소·환불 규정).
 *   제2조 청약철회 7일 / 제3조 사용 개시분 철회 제한 / 제4조 미사용 전액환불·부분사용 비례환불·
 *   청구가능기간 12개월 / 제7조 원결제수단 승인취소.
 */
const { query } = require('../db/client');
const creditService = require('../credits/credit.service');
const log = require('../lib/logger')('PortOneRefund');
const { env } = require('../config');
const portone = require('./portone.service');

const API = 'https://api.portone.io';

/** 청약철회 기간(환불규정 제2조 ①) — 이 기간 + 전량 미사용이어야 셀프 전액환불이 열린다. */
const WITHDRAWAL_DAYS = 7;
/** 환불 청구 가능기간(제4조) — 결제일로부터 12개월. 크레딧 유효기간과 같다. */
const CLAIM_DAYS = 365;

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const authHeaders = () => ({
  Authorization: `PortOne ${env.PORTONE_API_SECRET}`,
  'Content-Type': 'application/json',
});

/** PortOne 결제 단건 조회 — 취소 가능액·상태의 진실원본. */
async function fetchPayment(paymentId) {
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, { headers: authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = (body && (body.message || body.type)) || `HTTP ${res.status}`;
    throw fail(`결제 정보를 조회하지 못했습니다. (${reason})`, res.status === 404 ? 404 : 502);
  }
  return body;
}

/** 우리 쪽 주문 + 결제기록. 없으면 404. */
async function loadOrder(paymentId, q = query) {
  const r = await q(
    `SELECT o.order_id, o.user_id, o.provider, o.pack_id, o.credits, o.amount_usd, o.status,
            o.created_at, p.created_at AS paid_at, p.refunded_usd
       FROM billing_orders o
       LEFT JOIN payments p ON p.provider = 'portone' AND p.order_id = o.order_id
      WHERE o.order_id = $1 AND o.provider = 'portone'`,
    [paymentId]
  );
  const order = r.rows[0];
  if (!order) throw fail('주문을 찾을 수 없습니다.', 404);
  return order;
}

/**
 * 이 결제로 지급한 크레딧이 지급 시점 이후 얼마나 소비됐는가.
 *
 * 크레딧은 대체가능(fungible)이라 "이 결제분을 썼는지"를 개별 추적할 수 없다. 그래서
 * **지급 시점 이후의 모든 차감**을 사용분으로 본다 — 이용자에게 불리하지 않은 방향의 근사다
 * (다른 잔액을 먼저 썼더라도 사용으로 세므로 회사가 유리해지지 않는다).
 * 우리가 회수한 분(type='purchase_refund'의 음수)은 소비가 아니므로 제외한다.
 */
async function usedSince(userId, sinceISO, q = query) {
  const r = await q(
    `SELECT COALESCE(SUM(-amount), 0)::int AS used
       FROM credit_ledger
      WHERE user_id = $1 AND amount < 0 AND type <> 'purchase_refund' AND created_at >= $2`,
    [userId, sinceISO]
  );
  return r.rows[0].used;
}

/** 크레딧이 실제로 지급된 시각(원장) — 없으면 payments/주문 시각으로 폴백. */
async function grantedAt(order, q = query) {
  const r = await q(
    `SELECT created_at FROM credit_ledger
      WHERE ref_id = $1 AND type = 'purchase' ORDER BY created_at LIMIT 1`,
    [order.order_id]
  );
  return r.rows[0] ? r.rows[0].created_at : order.paid_at || order.created_at;
}

const daysSince = (t) => (Date.now() - new Date(t).getTime()) / 86400000;

/**
 * 환불 가능 여부 판정(부작용 없음). 화면·관리자 미리보기·실제 환불이 **같은 함수**를 쓴다.
 * @param {string} paymentId
 * @param {{userId?:string}} [opts] userId를 주면 소유자만 볼 수 있다 —
 *   안 걸면 결제번호를 넣어보는 것만으로 남의 결제 금액·시각이 새어나간다.
 * @returns {Promise<object>} 정책 판정 + 금액/크레딧 계산 결과
 */
async function assess(paymentId, opts = {}) {
  // 🔎 opts.db = **다른 환경(dev·stg·prd)의 읽기 전용 질의 함수**. 관리자 화면이 환경을 골라
  //   조회할 때만 들어온다(nest/common/env-db.service). 안 주면 이 서버 자신의 DB.
  //   ⚠️ 판정은 순수 조회다 — 여기에 쓰기가 섞이면 교차 환경 조회가 곧 교차 환경 쓰기가 된다.
  const q = opts.db || query;
  const order = await loadOrder(paymentId, q);
  if (opts.userId && String(order.user_id) !== String(opts.userId)) {
    throw fail('본인의 결제 건이 아닙니다.', 403);
  }
  const pay = await fetchPayment(paymentId);

  const total = Number((pay.amount && pay.amount.total) || 0);
  const cancelled = Number((pay.amount && pay.amount.cancelled) || 0);
  const cancellable = Math.max(0, Number((pay.amount && pay.amount.paid) || total) - cancelled);

  const granted = await grantedAt(order, q);
  const used = await usedSince(order.user_id, granted, q);
  const purchased = Number(order.credits);
  // 앞선 부분취소로 이미 회수한 분은 남은 권리에서 빼야 한다 — 안 빼면 같은 크레딧을
  // 두 번 환불 계산에 넣게 된다(부분취소를 두 번 이상 할 때 드러난다).
  const clawedBack = (
    await q(
      `SELECT COALESCE(SUM(credits_clawed), 0)::int AS c FROM billing_refunds
        WHERE order_id = $1 AND status = 'succeeded'`,
      [paymentId]
    )
  ).rows[0].c;
  const unused = Math.max(0, purchased - used - clawedBack);
  // credit.service.getBalance 와 같은 조회 — 환경 교차 조회에서도 같은 값을 보려면 주입된 q로 읽어야 한다.
  const balance = (await q('SELECT credit_balance FROM users WHERE id = $1', [order.user_id])).rows[0]?.credit_balance || 0;

  const elapsed = daysSince(granted);
  const withinWithdrawal = elapsed <= WITHDRAWAL_DAYS;
  const withinClaim = elapsed <= CLAIM_DAYS;

  // 제4조 ② 비례환불액 = 결제금액 × (미사용 ÷ 총 구매). 회사 귀책 사유가 있을 때 관리자가 쓴다.
  const proratedKRW = purchased > 0 ? Math.min(cancellable, Math.floor(total * (unused / purchased))) : 0;

  // 셀프(사용자) 전액환불 조건 — 하나라도 어긋나면 사유를 그대로 돌려준다.
  const blockers = [];
  if (pay.status !== 'PAID' && pay.status !== 'PARTIAL_CANCELLED') blockers.push(`결제 상태가 ${pay.status}입니다.`);
  if (order.status !== 'paid') blockers.push(`주문 상태가 ${order.status}입니다.`);
  if (cancellable <= 0) blockers.push('이미 전액 취소된 결제입니다.');
  if (!withinClaim) blockers.push(`환불 청구 가능기간(결제일부터 ${CLAIM_DAYS}일)이 지났습니다.`);
  if (!withinWithdrawal) blockers.push(`청약철회 기간(결제일부터 ${WITHDRAWAL_DAYS}일)이 지났습니다.`);
  if (used > 0) blockers.push(`이미 ◈${used.toLocaleString()} 크레딧을 사용해 청약철회가 제한됩니다.`);
  if (clawedBack > 0) blockers.push('이미 부분취소된 결제라 관리자 확인이 필요합니다.');
  if (balance < purchased) blockers.push(`잔액(◈${balance.toLocaleString()})이 충전분(◈${purchased.toLocaleString()})보다 적습니다.`);

  return {
    paymentId,
    packId: order.pack_id,
    status: pay.status,
    orderStatus: order.status,
    paidAt: granted,
    daysElapsed: Math.floor(elapsed),
    amount: { total, cancelled, cancellable, currency: pay.currency || 'CURRENCY_KRW' },
    credits: { purchased, used, clawedBack, unused, balance },
    prorated: { amountKRW: proratedKRW, credits: unused },
    selfRefundable: blockers.length === 0,
    blockers,
  };
}

/**
 * 결제 취소 실행.
 *
 * @param {string} paymentId
 * @param {object} opts
 * @param {string} [opts.userId]    셀프 환불이면 요청자 = 주문 소유자여야 한다(관리자는 생략).
 * @param {'CUSTOMER'|'ADMIN'} [opts.requester='CUSTOMER']
 * @param {number} [opts.amountKRW] 부분취소 금액(생략 = 전액). 관리자만 지정 가능.
 * @param {number} [opts.credits]   회수할 크레딧(생략 = 취소비율에 비례).
 * @param {string} [opts.reason]    PG에 전달할 취소 사유(필수값이라 기본값을 채운다).
 * @param {string} [opts.actorUserId] 관리자 취소 시 실행자
 */
async function refund(paymentId, opts = {}) {
  if (!portone.configured()) throw fail('PortOne 결제가 설정되지 않았습니다.', 503);
  const requester = opts.requester === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
  const reason = String(opts.reason || '').trim() || (requester === 'ADMIN' ? '관리자 취소' : '고객 청약철회');

  const view = await assess(paymentId);
  const order = await loadOrder(paymentId);

  if (opts.userId && String(order.user_id) !== String(opts.userId)) {
    throw fail('본인의 결제 건이 아닙니다.', 403); // 남의 주문 번호를 넣어도 존재 여부가 새지 않게 403
  }
  if (requester === 'CUSTOMER' && !view.selfRefundable) {
    // 규정상 부분사용분은 "회사 귀책이 있는 경우"에만 환불 → 사람이 판단해야 하므로 안내로 끝낸다.
    throw fail(`${view.blockers[0]} 자세한 문의는 고객센터(support@doppia.ai)로 부탁드립니다.`, 400);
  }
  if (view.amount.cancellable <= 0) throw fail('취소 가능한 금액이 없습니다.', 400);

  // 취소 금액 — 셀프는 언제나 전액, 관리자는 지정 가능(취소가능액 상한).
  const amountKRW =
    requester === 'ADMIN' && opts.amountKRW != null
      ? Math.floor(Number(opts.amountKRW))
      : view.amount.cancellable;
  if (!Number.isFinite(amountKRW) || amountKRW <= 0) throw fail('취소 금액이 올바르지 않습니다.', 400);
  if (amountKRW > view.amount.cancellable) {
    throw fail(`취소 가능액(₩${view.amount.cancellable.toLocaleString()})을 넘을 수 없습니다.`, 400);
  }
  const isFull = amountKRW >= view.amount.cancellable && view.amount.cancelled === 0;

  // 회수 크레딧 — 지정이 없으면 취소 금액 비율만큼. 잔액을 넘겨 회수하지는 않는다(관리자 부분취소).
  const proportional = view.amount.total > 0
    ? Math.round(view.credits.purchased * (amountKRW / view.amount.total))
    : 0;
  let clawback = opts.credits != null && requester === 'ADMIN' ? Math.floor(Number(opts.credits)) : proportional;
  if (!Number.isFinite(clawback) || clawback < 0) throw fail('회수 크레딧이 올바르지 않습니다.', 400);
  if (requester === 'ADMIN') clawback = Math.min(clawback, view.credits.balance);

  // 취소액에 대응하는 USD 환산 — 매출 집계(payments.refunded_usd)에서 빼는 값.
  const refundUSD = view.amount.total > 0
    ? Number((Number(order.amount_usd) * (amountKRW / view.amount.total)).toFixed(2))
    : 0;

  // ── 동시 취소 방지 ──
  //   'paid' → 'refunding' 으로 **원자적으로 선점**한 세션만 진행한다(verifyAndComplete의
  //   pending→paid 선점과 같은 방식). 두 번 눌러도 두 번 취소되지 않는다.
  //
  //   10분 지난 'refunding'도 다시 선점할 수 있게 열어둔다 — 그러지 않으면 PG 호출 도중
  //   프로세스가 죽었을 때 주문이 영원히 갇혀 아무도 환불할 수 없다(사람이 DB를 고쳐야 한다).
  //   그 사이 앞선 취소가 실제로 성공했더라도 아래 currentCancellableAmount 검증에서
  //   PortOne이 거절하므로 이중취소로 이어지지 않는다.
  const claim = await query(
    `UPDATE billing_orders SET status='refunding', updated_at=now()
      WHERE order_id=$1
        AND (status='paid' OR (status='refunding' AND updated_at < now() - interval '10 minutes'))
      RETURNING order_id`,
    [paymentId]
  );
  if (claim.rowCount === 0) throw fail('이미 취소 중이거나 취소된 결제입니다.', 409);

  const refundRow = await query(
    `INSERT INTO billing_refunds (order_id, user_id, provider, amount_krw, amount_usd, credits_clawed,
                                  reason, requester, actor_user_id, status)
     VALUES ($1,$2,'portone',$3,$4,$5,$6,$7,$8,'requested') RETURNING id`,
    [paymentId, order.user_id, amountKRW, refundUSD, clawback, reason, requester, opts.actorUserId || null]
  );
  const refundId = refundRow.rows[0].id;

  // ① 크레딧 선회수 — 실패(잔액 부족)하면 PG를 건드리기 전에 멈춘다.
  let clawed = 0;
  try {
    if (clawback > 0) {
      await creditService.deductCredits(order.user_id, clawback, {
        type: 'purchase_refund',
        description: `결제 취소 회수 (${order.pack_id}, PortOne)`,
        refId: paymentId,
      });
      clawed = clawback;
    }
  } catch (e) {
    await query(`UPDATE billing_orders SET status='paid', updated_at=now() WHERE order_id=$1`, [paymentId]);
    await query(
      `UPDATE billing_refunds SET status='failed', raw=$2, updated_at=now() WHERE id=$1`,
      [refundId, JSON.stringify({ stage: 'clawback', error: e.message })]
    );
    throw fail(`크레딧 회수에 실패해 취소를 진행하지 않았습니다. (${e.message})`, e.statusCode || 400);
  }

  // ② PG 승인취소 — currentCancellableAmount를 함께 보내 우리가 본 잔액과 PG의 잔액이
  //    어긋나면(그 사이 다른 취소가 있었다면) PortOne이 거절하도록 한다.
  try {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        storeId: env.PORTONE_STORE_ID,
        reason,
        requester,
        currentCancellableAmount: view.amount.cancellable,
        ...(isFull ? {} : { amount: amountKRW }), // 금액 생략 = 전액취소
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const why = (body && (body.message || body.type)) || `HTTP ${res.status}`;
      throw fail(`결제 취소에 실패했습니다. (${why})`, 502);
    }

    const cancellation = body.cancellation || {};
    await query(
      `UPDATE billing_refunds SET status='succeeded', pg_cancel_id=$2, raw=$3, updated_at=now() WHERE id=$1`,
      [refundId, cancellation.id || null, JSON.stringify(cancellation)]
    );
    // 부분취소면 잔액이 남아 다시 취소할 수 있어야 하므로 'paid'로 되돌린다.
    const remaining = view.amount.cancellable - amountKRW;
    await query(
      `UPDATE billing_orders SET status=$2, updated_at=now() WHERE order_id=$1`,
      [paymentId, remaining > 0 ? 'paid' : 'refunded']
    );
    await query(
      `UPDATE payments SET refunded_usd = refunded_usd + $2, refunded_at = now()
        WHERE provider='portone' AND order_id=$1`,
      [paymentId, refundUSD]
    );

    // 추천 커미션 환수 — 전액취소일 때만. 실패해도 환불은 이미 끝난 일이라 막지 않는다.
    let commission = null;
    if (remaining <= 0) {
      commission = await require('../affiliate/affiliate.service')
        .reverseCommission(order.user_id, paymentId)
        .catch((e) => {
          log.warn(`commission reverse ${paymentId}: ${e.message}`);
          return null;
        });
    }

    log.info(`✅ 취소 ${paymentId}: ₩${amountKRW.toLocaleString()} / −◈${clawed} (${requester})`);
    return {
      ok: true,
      paymentId,
      refundId,
      amountKRW,
      creditsClawed: clawed,
      full: remaining <= 0,
      remainingCancellable: Math.max(0, remaining),
      status: cancellation.status || 'SUCCEEDED',
      commission,
    };
  } catch (e) {
    // ③ PG 취소 실패 → 회수했던 크레딧을 되돌리고 주문을 원상복구한다.
    if (clawed > 0) {
      await creditService
        .addCredits(order.user_id, clawed, {
          type: 'purchase_refund',
          description: `결제 취소 실패 원복 (${order.pack_id}, PortOne)`,
          refId: paymentId,
        })
        .catch((e2) => log.error(`❗회수 크레딧 원복 실패 ${paymentId}: ${e2.message}`));
    }
    await query(`UPDATE billing_orders SET status='paid', updated_at=now() WHERE order_id=$1`, [paymentId]);
    await query(
      `UPDATE billing_refunds SET status='failed', raw=$2, updated_at=now() WHERE id=$1`,
      [refundId, JSON.stringify({ stage: 'pg-cancel', error: e.message })]
    );
    log.warn(`취소 실패 ${paymentId}: ${e.message}`);
    throw e.statusCode ? e : fail(`결제 취소에 실패했습니다. (${e.message})`, 502);
  }
}

/**
 * PG에서 이미 일어난 취소를 우리 쪽에 반영(동기화).
 *
 * **왜 필요한가**: 취소는 우리 API 말고도 일어난다 — PortOne 관리자 콘솔에서 직접 누르거나,
 * 카드사/PG가 강제 취소하는 경우다. 그때 웹훅만 받고 아무 것도 안 하면 **돈은 돌려줬는데
 * 크레딧은 그대로 남는다.** 이 함수가 그 간극을 메운다.
 *
 * 우리 API를 통한 취소는 이미 billing_refunds에 기록돼 있으므로, PG 누적취소액에서
 * 기록분을 뺀 **차액만** 반영한다(웹훅이 중복 도착해도 두 번 회수되지 않는다).
 * 잔액이 모자라면 남은 만큼만 회수한다 — 여기서 던져봐야 이미 끝난 취소를 되돌릴 수 없다.
 */
async function reconcileFromPg(paymentId) {
  const order = await loadOrder(paymentId).catch(() => null);
  if (!order) return { ok: false, reason: 'no order' };
  if (order.status === 'refunding') return { ok: false, reason: 'in progress' }; // 우리 취소가 진행 중

  const pay = await fetchPayment(paymentId);
  const total = Number((pay.amount && pay.amount.total) || 0);
  const cancelledTotal = Number((pay.amount && pay.amount.cancelled) || 0);
  if (cancelledTotal <= 0 || total <= 0) return { ok: false, reason: 'nothing cancelled' };

  const rec = await query(
    `SELECT COALESCE(SUM(amount_krw), 0)::int AS krw FROM billing_refunds
      WHERE order_id = $1 AND status = 'succeeded'`,
    [paymentId]
  );
  const delta = cancelledTotal - rec.rows[0].krw;
  if (delta <= 0) return { ok: true, already: true };

  const purchased = Number(order.credits);
  const balance = await creditService.getBalance(order.user_id);
  const want = Math.round(purchased * (delta / total));
  const clawback = Math.max(0, Math.min(want, balance));

  if (clawback > 0) {
    await creditService
      .deductCredits(order.user_id, clawback, {
        type: 'purchase_refund',
        description: `PG 취소 동기화 회수 (${order.pack_id}, PortOne)`,
        refId: paymentId,
      })
      .catch((e) => log.error(`reconcile clawback ${paymentId}: ${e.message}`));
  }
  const usd = Number((Number(order.amount_usd) * (delta / total)).toFixed(2));
  await query(
    `INSERT INTO billing_refunds (order_id, user_id, provider, amount_krw, amount_usd, credits_clawed,
                                  reason, requester, status, raw)
     VALUES ($1,$2,'portone',$3,$4,$5,'PG 콘솔/외부 취소 동기화','ADMIN','succeeded',$6)`,
    [paymentId, order.user_id, delta, usd, clawback, JSON.stringify({ cancelledTotal, want, balance })]
  );
  await query(
    `UPDATE payments SET refunded_usd = refunded_usd + $2, refunded_at = now()
      WHERE provider='portone' AND order_id=$1`,
    [paymentId, usd]
  );
  const fullyCancelled = cancelledTotal >= Number((pay.amount && pay.amount.paid) || total);
  if (fullyCancelled) {
    await query(`UPDATE billing_orders SET status='refunded', updated_at=now() WHERE order_id=$1`, [paymentId]);
    await require('../affiliate/affiliate.service')
      .reverseCommission(order.user_id, paymentId)
      .catch((e) => log.warn(`commission reverse ${paymentId}: ${e.message}`));
  }
  if (want > clawback) {
    log.warn(`⚠️ ${paymentId}: 잔액부족으로 ◈${want - clawback} 미회수 (취소 ₩${delta.toLocaleString()})`);
  }
  log.info(`↩︎ PG 취소 동기화 ${paymentId}: ₩${delta.toLocaleString()} / −◈${clawback}`);
  return { ok: true, amountKRW: delta, creditsClawed: clawback, full: fullyCancelled };
}

/**
 * 사용자의 결제 내역(셀프 환불 화면용).
 *   `refunding`도 포함한다 — 취소 처리 중인 건이 화면에서 사라지면 사용자는 결제가
 *   증발한 것처럼 본다. 결제창에서 이탈한 `pending`·`failed`만 감춘다.
 */
async function listRefundable(userId, limit = 20) {
  const r = await query(
    `SELECT o.order_id, o.pack_id, o.credits, o.amount_usd, o.status, o.updated_at,
            COALESCE(SUM(f.amount_krw) FILTER (WHERE f.status='succeeded'), 0)::int AS refunded_krw
       FROM billing_orders o
       LEFT JOIN billing_refunds f ON f.order_id = o.order_id
      WHERE o.user_id = $1 AND o.provider = 'portone'
        AND o.status IN ('paid','refunded','refunding')
      GROUP BY o.order_id
      ORDER BY o.updated_at DESC LIMIT $2`,
    [userId, Math.min(50, Math.max(1, limit))]
  );
  return r.rows;
}

/** 취소 이력(관리자). order_id를 주면 그 주문만. */
async function listRefunds({ orderId = null, limit = 50, db = null } = {}) {
  const r = await (db || query)(
    `SELECT f.*, u.email
       FROM billing_refunds f LEFT JOIN users u ON u.id = f.user_id
      WHERE ($1::text IS NULL OR f.order_id = $1)
      ORDER BY f.created_at DESC LIMIT $2`,
    [orderId, Math.min(200, Math.max(1, limit))]
  );
  return r.rows;
}

module.exports = {
  assess,
  refund,
  reconcileFromPg,
  listRefundable,
  listRefunds,
  WITHDRAWAL_DAYS,
  CLAIM_DAYS,
};
