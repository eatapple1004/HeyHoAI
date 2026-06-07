const { pool, query } = require('../db/client');

// ─── 크레딧 가격표 (docs/UI_기능설명서.md 부록 A 기준) ───
const SIGNUP_BONUS = 10;

const COSTS = {
  imageBase: 2, // 사진 생성 요청당 (최대 4장)
  imageModelSurcharge: { flash: 0, pro: 1, 'gpt-image-2': 1, 'gpt-image-2-high': 2 },
  video: { 5: 6, 10: 12 }, // 릴스 (duration 초)
  videoHighSurcharge: 2, // mode=high 추가
};

/** 이미지 생성 1회 비용 */
function imageCost(model) {
  const surcharge = COSTS.imageModelSurcharge[model];
  return COSTS.imageBase + (surcharge === undefined ? 1 : surcharge);
}

/** 비디오(릴스) 생성 1회 비용 */
function videoCost(duration, mode) {
  const base = COSTS.video[parseInt(duration, 10)] || COSTS.video[5];
  return base + (mode === 'high' ? COSTS.videoHighSurcharge : 0);
}

/** statusCode 402를 가진 에러 (errorHandler가 그대로 응답) */
function insufficientError(balance, required) {
  const err = new Error(`크레딧이 부족합니다. (보유 ◈${balance} / 필요 ◈${required})`);
  err.statusCode = 402;
  return err;
}

/** 현재 잔액 조회 */
async function getBalance(userId) {
  const result = await query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
  return result.rows[0] ? result.rows[0].credit_balance : 0;
}

/** 최근 거래 내역 */
async function getLedger(userId, limit = 50) {
  const result = await query(
    `SELECT id, amount, balance_after, type, description, ref_id, created_at
     FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * 크레딧 증감 공통 트랜잭션.
 * delta < 0(차감)인데 잔액이 부족하면 402 에러를 던진다.
 */
async function applyDelta(userId, delta, { type, description = '', refId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      'SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (cur.rowCount === 0) throw new Error('User not found');
    const balance = cur.rows[0].credit_balance;
    const after = balance + delta;
    if (after < 0) {
      throw insufficientError(balance, -delta);
    }
    await client.query('UPDATE users SET credit_balance = $1, updated_at = now() WHERE id = $2', [after, userId]);
    await client.query(
      `INSERT INTO credit_ledger (user_id, amount, balance_after, type, description, ref_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, delta, after, type, description, refId]
    );
    await client.query('COMMIT');
    return after;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** 크레딧 적립 (충전·보너스·환불) */
async function addCredits(userId, amount, opts) {
  return applyDelta(userId, Math.abs(amount), opts);
}

/**
 * 생성 비용 차감. admin은 과금하지 않는다(기존 운영 플로우 보존).
 * @returns {Promise<{amount:number, balanceAfter:number, refund:Function}|null>}
 *   null = 과금 면제(admin). refund()는 실패 시 전액 환불.
 */
async function chargeForGeneration(user, amount, description, refId = null) {
  if (!user || user.role === 'admin') return null;
  const balanceAfter = await applyDelta(user.id, -amount, {
    type: 'generation',
    description,
    refId,
  });
  let refunded = false;
  return {
    amount,
    balanceAfter,
    refund: async () => {
      if (refunded) return;
      refunded = true;
      await addCredits(user.id, amount, {
        type: 'refund',
        description: `환불: ${description}`,
        refId,
      }).catch(() => {});
    },
  };
}

/** 가입 보너스 지급 */
async function grantSignupBonus(userId) {
  return addCredits(userId, SIGNUP_BONUS, {
    type: 'signup_bonus',
    description: `가입 보너스 ◈${SIGNUP_BONUS}`,
  });
}

module.exports = {
  SIGNUP_BONUS,
  COSTS,
  imageCost,
  videoCost,
  getBalance,
  getLedger,
  addCredits,
  chargeForGeneration,
  grantSignupBonus,
};
