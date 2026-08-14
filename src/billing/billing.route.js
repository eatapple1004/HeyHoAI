const express = require('express');
const crypto = require('crypto');
const { env } = require('../config');
const { query } = require('../db/client');
const creditService = require('../credits/credit.service');
const { PRICING, isKrwSellable } = require('../pricing/pricing.config');
const log = require('../lib/logger')('Billing');

const router = express.Router();

// ─── 크레딧 팩 = pricing.config 단일소스에서 파생 (표시가=청구가 정합). ───
//   id/credits/usd/krw가 프론트(pricing.js)·studio 페이월과 완전 일치 → "Unknown pack" 방지.
//   usd=해외(Eximbay) 청구 통화, krw=국내(KCP) 청구 통화(KCP 연동은 개발자 후속).
const PACKS = PRICING.packs.map((p) => {
  const credits = p.cr + p.bonus;
  return {
    id: p.id,
    credits,
    bonus: p.bonus,
    usd: p.price,
    krw: p.priceKRW,
    // 🔒 KRW 1회 충전 한도(PG 심사 요건) 미만인 팩만 국내 결제 가능. USD 경로는 무관.
    krwSellable: isKrwSellable(p),
    best: Boolean(p.best),
    label: `◈ ${credits.toLocaleString()}`,
  };
});

// Lemon Squeezy 폴백(현재 키 미설정=휴면). 신규 pack ID로 매핑.
function variantIdFor(packId) {
  const map = {
    pack9:   env.LS_VARIANT_PACK50,
    pack49:  env.LS_VARIANT_PACK120,
    pack199: env.LS_VARIANT_PACK300,
    pack349: env.LS_VARIANT_PACK700,
  };
  return map[packId] || null;
}

function lsConfigured() {
  return Boolean(env.LEMONSQUEEZY_API_KEY && env.LEMONSQUEEZY_STORE_ID);
}

/**
 * GET /api/billing/packs
 * 팩 목록 + 결제 연동 설정 여부
 */
router.get('/packs', (_req, res) => {
  res.json({
    success: true,
    data: {
      packs: PACKS.map((p) => ({ ...p, available: lsConfigured() && Boolean(variantIdFor(p.id)) })),
      configured: lsConfigured(),
    },
  });
});

/**
 * POST /api/billing/checkout { packId }
 * Lemon Squeezy 결제 페이지 URL 생성
 */
router.post('/checkout', async (req, res, next) => {
  try {
    const { packId } = req.body || {};
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) return res.status(400).json({ success: false, error: 'Unknown pack' });
    if (!lsConfigured()) {
      return res.status(503).json({ success: false, error: '결제가 아직 설정되지 않았습니다. (Lemon Squeezy 키 필요)' });
    }
    const variantId = variantIdFor(packId);
    if (!variantId) {
      return res.status(503).json({ success: false, error: `${packId}의 상품(variant)이 설정되지 않았습니다.` });
    }

    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: req.user.email || undefined,
              // webhook에서 어떤 유저에게 충전할지 식별
              custom: { user_id: req.user.id, pack_id: pack.id, credits: String(pack.credits) },
            },
            product_options: {
              redirect_url: `${req.protocol}://${req.get('host')}/billing?purchased=${pack.id}`,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(env.LEMONSQUEEZY_STORE_ID) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    });
    const lsData = await lsRes.json();
    const url = lsData?.data?.attributes?.url;
    if (!lsRes.ok || !url) {
      log.error('Checkout create failed:', lsRes.status, JSON.stringify(lsData).slice(0, 300));
      return res.status(503).json({ success: false, error: '결제 페이지 생성에 실패했습니다.' });
    }
    res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/billing/history
 * 내 결제 내역
 */
router.get('/history', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, provider, product, amount_usd, credits, created_at
       FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Lemon Squeezy webhook 핸들러.
 * express.json보다 먼저 raw body로 마운트해야 한다 (서명 검증용).
 * POST /api/billing/webhook
 */
async function webhookHandler(req, res) {
  try {
    const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      log.error('Webhook received but LEMONSQUEEZY_WEBHOOK_SECRET not set');
      return res.status(503).json({ success: false });
    }

    // ── 서명 검증 (HMAC-SHA256 hex) ──
    const rawBody = req.body; // Buffer (express.raw)
    const signature = req.get('X-Signature') || '';
    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const valid =
      signature.length === digest.length &&
      crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signature, 'utf8'));
    if (!valid) {
      log.warn('Webhook signature mismatch');
      return res.status(401).json({ success: false });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventName = payload?.meta?.event_name;
    if (eventName !== 'order_created') {
      return res.json({ success: true, ignored: eventName });
    }

    const custom = payload?.meta?.custom_data || {};
    const userId = custom.user_id;
    const packId = custom.pack_id;
    const pack = PACKS.find((p) => p.id === packId);
    const orderId = String(payload?.data?.id || '');
    const status = payload?.data?.attributes?.status;
    const totalUsd = (payload?.data?.attributes?.total_usd ?? payload?.data?.attributes?.total ?? 0) / 100;

    if (!userId || !pack || !orderId) {
      log.warn('Webhook missing fields:', JSON.stringify({ userId, packId, orderId }));
      return res.json({ success: true, ignored: 'missing fields' });
    }
    if (status && status !== 'paid') {
      return res.json({ success: true, ignored: `status=${status}` });
    }

    // ── 멱등 처리: 같은 주문은 한 번만 충전 (UNIQUE(provider, order_id)) ──
    const inserted = await query(
      `INSERT INTO payments (user_id, provider, order_id, product, amount_usd, credits, raw)
       VALUES ($1, 'lemonsqueezy', $2, $3, $4, $5, $6)
       ON CONFLICT (provider, order_id) DO NOTHING
       RETURNING id`,
      [userId, orderId, pack.id, totalUsd, pack.credits, JSON.stringify(payload).slice(0, 100000)]
    );
    if (inserted.rowCount === 0) {
      log.info(`Order ${orderId} already processed — skipping`);
      return res.json({ success: true, duplicate: true });
    }

    await creditService.addCredits(userId, pack.credits, {
      type: 'purchase',
      description: `크레딧 팩 구매 (${pack.id}, $${totalUsd})`,
      refId: orderId,
    });
    log.info(`✅ Order ${orderId}: +◈${pack.credits} → user ${userId}`);

    // 추천인 커미션 (크레딧으로 지급 — 실패해도 결제엔 영향 없음)
    const affiliateService = require('../affiliate/affiliate.service');
    await affiliateService.payCommission(userId, pack.credits, orderId).catch((e) =>
      log.warn('Referral commission failed:', e.message)
    );

    res.json({ success: true });
  } catch (err) {
    log.error('Webhook error:', err.message);
    res.status(500).json({ success: false });
  }
}

module.exports = { router, webhookHandler, PACKS };
