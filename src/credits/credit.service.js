const { pool, query } = require('../db/client');

// ─── 크레딧 가격표 (docs/UI_기능설명서.md 부록 A 기준) ───
const SIGNUP_BONUS = 10;

// 실원가 기준(docs/가격_재설계.md): 사진 4장 ≈ $0.16($0.039/장), 릴스 5초 ≈ $0.25(Runway).
// 1cr=$0.10 기준가 → 사진 "1장=1cr"(4cr), 릴스 5초 8cr / 10초 16cr 로 기준가 마진 60~69% 확보.
const COSTS = {
  imageUnit: 1, // 사진 장당 (count×imageUnit). 유저가 1~8장 선택 → 장당 과금.
  imageBase: 4, // (레거시 표시용) = imageUnit×4
  imageModelSurcharge: { flash: 0, pro: 1, 'gpt-image-2': 1, 'gpt-image-2-high': 2 },
  video: { 5: 8, 10: 16 }, // 릴스 (duration 초)
  videoHighSurcharge: 2, // mode=high 추가
  caption: 1, // 캡션 + 해시태그 생성 (애드온)
  enhance: 1, // 프롬프트 Enhance (Claude 확장, Custom 애드온)
};

/** 이미지 생성 비용 = 장당(count×imageUnit) + 모델가산(생성당 1회). count 미지정 시 4(기존 기준가). */
function imageCost(model, count = 4) {
  const n = Math.max(1, Math.min(parseInt(count, 10) || 1, 8));
  const surcharge = COSTS.imageModelSurcharge[model];
  return n * COSTS.imageUnit + (surcharge === undefined ? 1 : surcharge);
}

/** 비디오(릴스) 생성 1회 비용 */
function videoCost(duration, mode) {
  const base = COSTS.video[parseInt(duration, 10)] || COSTS.video[5];
  // 화질 가산: std 외(pro/high)는 surcharge
  return base + (mode && mode !== 'std' ? COSTS.videoHighSurcharge : 0);
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
 * 범용 크레딧 차감. admin은 과금하지 않는다(기존 운영 플로우 보존).
 * @returns {Promise<{amount:number, balanceAfter:number, refund:Function}|null>}
 *   null = 과금 면제(admin). refund()는 실패 시 전액 환불.
 */
async function charge(user, amount, { type = 'generation', description = '', refId = null } = {}) {
  if (!user || user.role === 'admin') return null;
  if (amount <= 0) return null;
  const balanceAfter = await applyDelta(user.id, -amount, { type, description, refId });
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

/** 생성 비용 차감 (charge의 generation 래퍼) */
function chargeForGeneration(user, amount, description, refId = null) {
  return charge(user, amount, { type: 'generation', description, refId });
}

// ─── 크리에이터 포인트(로열티) — credit(토큰)과 분리. 토큰 교환 가능 / 추후 현금. ───
async function applyPointDelta(userId, delta, { type, description = '', refId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT point_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (cur.rowCount === 0) throw new Error('User not found');
    const after = cur.rows[0].point_balance + delta;
    if (after < 0) { const e = new Error('포인트가 부족합니다.'); e.statusCode = 402; throw e; }
    await client.query('UPDATE users SET point_balance = $1, updated_at = now() WHERE id = $2', [after, userId]);
    await client.query(
      `INSERT INTO point_ledger (user_id, amount, balance_after, type, description, ref_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, delta, after, type, description, refId]
    );
    await client.query('COMMIT');
    return after;
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
}

/** 포인트 적립 (로열티) */
async function addPoints(userId, amount, opts) { return applyPointDelta(userId, Math.abs(amount), opts); }

/** 포인트 잔액 */
async function getPoints(userId) {
  const r = await query('SELECT point_balance FROM users WHERE id = $1', [userId]);
  return r.rows[0] ? r.rows[0].point_balance : 0;
}

/** 포인트 내역 */
async function getPointLedger(userId, limit = 50) {
  const r = await query(
    `SELECT id, amount, balance_after, type, description, ref_id, created_at
     FROM point_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return r.rows;
}

/** 포인트 → 크레딧 교환 (1:1, 원자적: 포인트 차감 + 크레딧 적립) */
async function exchangePointsToCredits(userId, amount) {
  const amt = Math.floor(Math.abs(parseInt(amount, 10) || 0));
  if (amt <= 0) { const e = new Error('교환할 포인트 수량을 입력하세요.'); e.statusCode = 400; throw e; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query('SELECT point_balance, credit_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (u.rowCount === 0) throw new Error('User not found');
    const { point_balance, credit_balance } = u.rows[0];
    if (point_balance < amt) { const e = new Error(`포인트가 부족합니다. (보유 ${point_balance} / 요청 ${amt})`); e.statusCode = 402; throw e; }
    const pAfter = point_balance - amt, cAfter = credit_balance + amt; // 1:1
    await client.query('UPDATE users SET point_balance = $1, credit_balance = $2, updated_at = now() WHERE id = $3', [pAfter, cAfter, userId]);
    await client.query(`INSERT INTO point_ledger (user_id, amount, balance_after, type, description) VALUES ($1,$2,$3,'exchange','포인트→크레딧 교환')`, [userId, -amt, pAfter]);
    await client.query(`INSERT INTO credit_ledger (user_id, amount, balance_after, type, description) VALUES ($1,$2,$3,'point_exchange','포인트 교환 적립')`, [userId, amt, cAfter]);
    await client.query('COMMIT');
    return { pointBalance: pAfter, creditBalance: cAfter, exchanged: amt };
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
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
  charge,
  chargeForGeneration,
  grantSignupBonus,
  addPoints,
  getPoints,
  getPointLedger,
  exchangePointsToCredits,
};
