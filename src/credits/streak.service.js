const { pool } = require('../db/client');
const creditService = require('./credit.service');

// 데일리 보너스: 연속일에 비례 (1일차 ◈1 … 최대 ◈5)
const MAX_BONUS = 5;
function bonusForStreak(streak) {
  return Math.max(1, Math.min(streak, MAX_BONUS));
}

/**
 * 일일 출석 체크인 (KST 기준). 첫 생성 경험이 있는 사용자만 대상.
 * 같은 날 재호출은 중복 지급 없이 현재 스트릭만 반환. (트랜잭션 — 동시호출 안전)
 *
 * @returns {Promise<{eligible:boolean, claimedToday:boolean, granted:number, streak:number, best:number}>}
 */
async function checkin(userId, role) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 날짜 비교는 전부 SQL(KST)에서 — JS Date 변환에 따른 타임존 어긋남 방지
    const u = await client.query(
      `SELECT streak_count, streak_best,
              (last_bonus_at = (now() AT TIME ZONE 'Asia/Seoul')::date)     AS is_today,
              (last_bonus_at = (now() AT TIME ZONE 'Asia/Seoul')::date - 1) AS is_yesterday
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (u.rowCount === 0) throw new Error('User not found');
    const row = u.rows[0];

    // 첫 생성 경험이 있어야 보너스 대상 (engaged user gating)
    const gen = await client.query('SELECT 1 FROM prompts WHERE user_id = $1 LIMIT 1', [userId]);
    if (gen.rowCount === 0) {
      await client.query('COMMIT');
      return { eligible: false, claimedToday: false, granted: 0, streak: row.streak_count, best: row.streak_best };
    }

    // 오늘 이미 받음 → 중복 없음
    if (row.is_today) {
      await client.query('COMMIT');
      return { eligible: true, claimedToday: false, granted: 0, streak: row.streak_count, best: row.streak_best };
    }

    // 연속 여부: 어제 받았으면 +1, 아니면 1로 리셋
    const newStreak = row.is_yesterday ? row.streak_count + 1 : 1;
    const newBest = Math.max(newStreak, row.streak_best);
    const bonus = bonusForStreak(newStreak);

    await client.query(
      `UPDATE users SET streak_count = $1, streak_best = $2,
              last_bonus_at = (now() AT TIME ZONE 'Asia/Seoul')::date WHERE id = $3`,
      [newStreak, newBest, userId]
    );
    await client.query('COMMIT');

    // 크레딧 지급은 별도 트랜잭션 (admin도 지급하되 개인 컨텍스트선 무제한이라 무의미 → 일관성 위해 지급)
    await creditService.addCredits(userId, bonus, {
      type: 'daily_bonus',
      description: `데일리 보너스 (${newStreak}일 연속)`,
    }).catch(() => {});

    return { eligible: true, claimedToday: true, granted: bonus, streak: newStreak, best: newBest };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { checkin, bonusForStreak, MAX_BONUS };
