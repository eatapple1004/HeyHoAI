const { pool, query } = require('../db/client');

// ─── 크레딧 가격표 (2026-07-06 재설계: 커스텀/템플릿 분리 + 30배 인플레이션) ───
//   근거·마진표: docs/생성원가_마진_분석_2026-07-06.md
//   원가(구글 직접, ₩1,400/$): Pro사진 $0.134 · Flash $0.039 · Kling Pro 릴 5s $0.56 / 10s $1.12
//   배수: 커스텀 2~3배 / 템플릿 4~6배 — "배수 범위"는 플랜별 ₩/크레딧으로 실현(pricing.js). 여기 값은 30배 인플레이션 반영.
const SIGNUP_BONUS = 1500; // 가입 시 무료 크레딧 = 템플릿 5장(300×5). Free 티어와 동일.

// 이미지: 모델티어별 [커스텀per장, 템플릿per장]. 총액 = count × per.
const IMG_CREDIT = {
  flash: [45, 90],                 // Nano Banana (2.5 Flash Image)
  pro: [150, 300],                 // Nano Banana Pro (3 Pro Image) — 스튜디오 기본
  'gpt-image-2': [150, 300],       // pro 티어 근사(별도 원가 확정 전)
  'gpt-image-2-high': [270, 540],  // 상위 티어 근사
};
// 영상: 길이별 [커스텀per릴, 템플릿per릴]. 현재 Kling Pro 고정 기준.
const VIDEO_CREDIT = {
  5: [625, 1250],
  10: [1250, 2500],
};
const COSTS = {
  caption: 30, // 캡션+해시태그 애드온 (옛 1 ×30)
  enhance: 30, // 프롬프트 Enhance 애드온 (옛 1 ×30)
  img: IMG_CREDIT,     // 클라 비용표시용 — {model:[커스텀,템플릿]}
  video: VIDEO_CREDIT, // {duration:[커스텀,템플릿]}
};

/** 이미지 생성 비용 = 장당(모델티어·커스텀/템플릿) × count. isTemplate=템플릿 기반(4~6배)/false=커스텀(2~3배). */
function imageCost(model, count = 4, isTemplate = false) {
  const n = Math.max(1, Math.min(parseInt(count, 10) || 1, 8));
  const tier = IMG_CREDIT[model] || IMG_CREDIT.pro;
  return n * (isTemplate ? tier[1] : tier[0]);
}

/** 비디오(릴스) 생성 1회 비용. isTemplate=템플릿 릴(4~6배)/false=커스텀 릴(2~3배). mode는 Kling Pro 고정이라 현재 미사용(std 연결 시 확장). */
function videoCost(duration, mode, isTemplate = false) {
  const tier = VIDEO_CREDIT[parseInt(duration, 10)] || VIDEO_CREDIT[5];
  return isTemplate ? tier[1] : tier[0];
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
