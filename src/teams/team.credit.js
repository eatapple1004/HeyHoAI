const { pool, query } = require('../db/client');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/** 팀 잔액 조회 */
async function getBalance(teamId) {
  const r = await query('SELECT credit_balance FROM teams WHERE id = $1', [teamId]);
  return r.rows[0] ? r.rows[0].credit_balance : 0;
}

/** 팀 거래 내역 */
async function getLedger(teamId, limit = 50) {
  const r = await query(
    `SELECT id, actor_id, amount, balance_after, type, description, ref_id, created_at
     FROM team_credit_ledger WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [teamId, limit]
  );
  return r.rows;
}

/** 팀 잔액 증감 (트랜잭션, 차감 시 부족하면 402) */
async function applyDelta(client, teamId, delta, { actorId = null, type, description = '', refId = null }) {
  const cur = await client.query('SELECT credit_balance FROM teams WHERE id = $1 FOR UPDATE', [teamId]);
  if (cur.rowCount === 0) throw httpError(404, '팀을 찾을 수 없습니다.');
  const after = cur.rows[0].credit_balance + delta;
  if (after < 0) throw httpError(402, `팀 크레딧이 부족합니다. (보유 ◈${cur.rows[0].credit_balance} / 필요 ◈${-delta})`);
  await client.query('UPDATE teams SET credit_balance = $1 WHERE id = $2', [after, teamId]);
  await client.query(
    `INSERT INTO team_credit_ledger (team_id, actor_id, amount, balance_after, type, description, ref_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [teamId, actorId, delta, after, type, description, refId]
  );
  return after;
}

/** 팀 크레딧 적립 (단독 트랜잭션) */
async function addCredits(teamId, amount, opts) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const after = await applyDelta(client, teamId, Math.abs(amount), opts);
    await client.query('COMMIT');
    return after;
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }
}

/**
 * 팀 풀에서 생성비 차감. 반환된 refund()로 실패 시 환불.
 * @returns {{amount, balanceAfter, refund}}
 */
async function charge(teamId, amount, { actorId, description = '', refId = null }) {
  const client = await pool.connect();
  let balanceAfter;
  try {
    await client.query('BEGIN');
    balanceAfter = await applyDelta(client, teamId, -amount, { actorId, type: 'generation', description, refId });
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }

  let refunded = false;
  return {
    amount,
    balanceAfter,
    refund: async () => {
      if (refunded) return;
      refunded = true;
      await addCredits(teamId, amount, { actorId, type: 'refund', description: `환불: ${description}`, refId }).catch(() => {});
    },
  };
}

/**
 * 개인 크레딧 → 팀 풀 이체 (한 트랜잭션). owner 전용은 라우트에서 검증.
 */
async function transferFromUser(userId, teamId, amount) {
  if (!(amount > 0)) throw httpError(400, '이체 금액은 1 이상이어야 합니다.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 개인 차감
    const u = await client.query('SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (u.rowCount === 0) throw httpError(404, 'User not found');
    const uAfter = u.rows[0].credit_balance - amount;
    if (uAfter < 0) throw httpError(402, `개인 크레딧이 부족합니다. (보유 ◈${u.rows[0].credit_balance})`);
    await client.query('UPDATE users SET credit_balance = $1, updated_at = now() WHERE id = $2', [uAfter, userId]);
    await client.query(
      `INSERT INTO credit_ledger (user_id, amount, balance_after, type, description, ref_id)
       VALUES ($1, $2, $3, 'team_transfer', $4, $5)`,
      [userId, -amount, uAfter, `팀으로 이체 ◈${amount}`, teamId]
    );
    // 팀 적립
    const tAfter = await applyDelta(client, teamId, amount, {
      actorId: userId, type: 'transfer_in', description: `개인 크레딧 이체 ◈${amount}`, refId: userId,
    });
    await client.query('COMMIT');
    return { userBalance: uAfter, teamBalance: tAfter };
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }
}

/**
 * 사용자의 활성 작업 컨텍스트 해석.
 * @returns {{type:'personal'}|{type:'team', teamId, teamName, role}}
 */
async function resolveContext(userId) {
  const r = await query(
    `SELECT u.active_team_id, t.name AS team_name, tm.role
     FROM users u
     LEFT JOIN teams t ON t.id = u.active_team_id
     LEFT JOIN team_members tm ON tm.team_id = u.active_team_id AND tm.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const row = r.rows[0];
  // 활성 팀이 있고 여전히 멤버일 때만 team 컨텍스트
  if (row && row.active_team_id && row.role) {
    return { type: 'team', teamId: row.active_team_id, teamName: row.team_name, role: row.role };
  }
  return { type: 'personal' };
}

/**
 * 활성 컨텍스트에 맞춰 생성비를 차감한다.
 * 팀 컨텍스트면 팀 풀에서(viewer는 403), 개인이면 개인 잔액에서(admin 면제).
 * @returns {Promise<{amount, refund}|null>} null = 개인+admin 면제
 */
async function chargeGeneration(user, amount, description, refId = null) {
  const ctx = await resolveContext(user.id);
  if (ctx.type === 'team') {
    if (ctx.role === 'viewer') {
      throw httpError(403, 'Viewer는 콘텐츠를 생성할 수 없어요. Editor 이상 권한이 필요합니다.');
    }
    return charge(ctx.teamId, amount, { actorId: user.id, description, refId });
  }
  return require('../credits/credit.service').chargeForGeneration(user, amount, description, refId);
}

/**
 * 생성 일부 실패 시 부분 환불 — charge.refund()는 전액 전용이라 별도 헬퍼.
 * 활성 컨텍스트(팀 풀/개인 잔액)에 맞춰 amount를 되돌린다. (admin 개인은 charge=null이라 호출부에서 애초에 안 부름)
 */
async function refundGeneration(user, amount, description, refId = null) {
  if (!(amount > 0)) return;
  const ctx = await resolveContext(user.id);
  if (ctx.type === 'team') {
    await addCredits(ctx.teamId, amount, { actorId: user.id, type: 'refund', description, refId }).catch(() => {});
  } else {
    await require('../credits/credit.service').addCredits(user.id, amount, { type: 'refund', description, refId }).catch(() => {});
  }
}

/** 활성 컨텍스트의 현재 잔액 */
async function contextBalance(userId) {
  const ctx = await resolveContext(userId);
  if (ctx.type === 'team') return getBalance(ctx.teamId);
  return require('../credits/credit.service').getBalance(userId);
}

/** 활성 팀 id (개인이면 null) — 데이터 태깅용 */
async function activeTeamId(userId) {
  const ctx = await resolveContext(userId);
  return ctx.type === 'team' ? ctx.teamId : null;
}

module.exports = {
  getBalance,
  getLedger,
  addCredits,
  charge,
  chargeGeneration,
  refundGeneration,
  contextBalance,
  activeTeamId,
  transferFromUser,
  resolveContext,
};
