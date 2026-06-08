const { query } = require('../db/client');
const creditService = require('../credits/credit.service');

const COMMISSION_RATE = 0.3; // 추천인은 피추천인 구매 크레딧의 30%를 크레딧으로 받음
const REF_COOKIE = 'ref';
const REF_COOKIE_MAX_AGE = 60 * 24 * 60 * 60 * 1000; // 60일

/** 코드로 사용자 조회 */
async function findUserByCode(code) {
  if (!code) return null;
  const r = await query('SELECT id, referral_code FROM users WHERE referral_code = $1', [code]);
  return r.rows[0] || null;
}

/** 클릭 1건 기록 (유효한 코드일 때만) */
async function recordClick(code) {
  const u = await findUserByCode(code);
  if (!u) return false;
  await query('INSERT INTO referral_clicks (code) VALUES ($1)', [code]);
  return true;
}

/**
 * 가입 시 추천 연결. 자기추천/중복은 무시. (멱등 — referred_user_id UNIQUE)
 */
async function linkReferral(code, newUserId) {
  const referrer = await findUserByCode(code);
  if (!referrer || referrer.id === newUserId) return;
  await query(
    `INSERT INTO referrals (referrer_id, referred_user_id, code)
     VALUES ($1, $2, $3) ON CONFLICT (referred_user_id) DO NOTHING`,
    [referrer.id, newUserId, code]
  ).catch(() => {});
}

/**
 * 피추천인이 크레딧을 구매했을 때 추천인에게 커미션 크레딧 지급.
 * billing webhook에서 호출. (실패해도 결제 자체엔 영향 없음)
 */
async function payCommission(buyerUserId, purchasedCredits, refId) {
  const r = await query(
    'SELECT id, referrer_id FROM referrals WHERE referred_user_id = $1',
    [buyerUserId]
  );
  const ref = r.rows[0];
  if (!ref) return;
  const commission = Math.round(purchasedCredits * COMMISSION_RATE);
  if (commission <= 0) return;
  await creditService.addCredits(ref.referrer_id, commission, {
    type: 'referral_commission',
    description: `추천 커미션 (구매 ◈${purchasedCredits}의 30%)`,
    refId,
  });
  await query('UPDATE referrals SET commission_earned = commission_earned + $1 WHERE id = $2', [commission, ref.id]);
}

/** 사용자 어필리에이트 통계 */
async function getStats(userId) {
  let u = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
  // 코드가 없으면 즉석 발급 (구버전 가입자 안전망)
  if (u.rows[0] && !u.rows[0].referral_code) {
    u = await query(
      `UPDATE users SET referral_code = substr(md5(gen_random_uuid()::text), 1, 8)
       WHERE id = $1 RETURNING referral_code`,
      [userId]
    );
  }
  const code = u.rows[0]?.referral_code;
  const clicks = await query('SELECT count(*) FROM referral_clicks WHERE code = $1', [code]);
  const refs = await query(
    'SELECT count(*) AS signups, COALESCE(sum(commission_earned),0) AS earned FROM referrals WHERE referrer_id = $1',
    [userId]
  );
  return {
    code,
    clicks: parseInt(clicks.rows[0].count, 10),
    signups: parseInt(refs.rows[0].signups, 10),
    earnedCredits: parseInt(refs.rows[0].earned, 10),
    commissionRate: COMMISSION_RATE,
  };
}

module.exports = {
  COMMISSION_RATE,
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
  recordClick,
  linkReferral,
  payCommission,
  getStats,
  findUserByCode,
};
