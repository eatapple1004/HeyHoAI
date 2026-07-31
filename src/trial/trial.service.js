const crypto = require('crypto');
const { query } = require('../db/client');
const { hashPassword } = require('../auth/password');
const { addCredits } = require('../credits/credit.service');

/**
 * 체험 계정 모듈 — 회사별 전용 계정. 첫 로그인 시점부터 N일 + 토큰(◈ 크레딧) 한도.
 *  - createTrialAccount: 관리자 발급 (role='user', is_trial=true) + 토큰 지급
 *  - startTrialIfNeeded: 첫 로그인 시 trial_started_at 세팅 (카운트 시작점)
 *  - assertCanGenerate: 생성 전 게이트 (기간 만료 시 throw · 사용량은 크레딧 잔액이 담당)
 *  - listTrials / getStatus: 관리자 목록 / 본인 상태
 *
 * ⚠️ 순수 토큰 기반(2026-07-31): 사용 한도 = 크레딧 잔액(일반 유저처럼 생성 시 정상 차감,
 *    0이면 402). 과거 '사진 장수(trial_image_quota)' 게이팅은 폐지 — 해당 컬럼은 이제
 *    '지급 토큰(발급액)' 표시용으로 재활용한다(관리자 목록의 사용/잔액 바 계산).
 */

function genPassword(len = 10) {
  // 헷갈리는 문자 제외(0/O/1/l/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[buf[i] % chars.length];
  return out;
}

/** 회사명 → 후보 이메일 (영숫자만, 충돌 시 숫자 접미) */
async function uniqueEmail(base) {
  const slug = String(base || 'trial').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'trial';
  for (let n = 0; n < 50; n++) {
    const email = `${slug}${n === 0 ? '' : n}@trial.doppia.ai`;
    const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount === 0) return email;
  }
  return `${slug}-${Date.now()}@trial.doppia.ai`;
}

/**
 * 체험 계정 생성. email/password 미지정 시 자동 생성. 평문 비밀번호를 1회 반환한다.
 * 지급 토큰(◈ 크레딧)만큼 크레딧 원장에 적립한다(발급액 = trial_image_quota에 표시용 기록).
 * @returns {Promise<{id,email,password,companyName,credits,days}>}
 */
async function createTrialAccount({ companyName, email, password, credits = 1500, days = 7 }) {
  const company = String(companyName || '').trim();
  if (!company) { const e = new Error('회사명을 입력하세요.'); e.statusCode = 400; throw e; }
  const c = Math.max(1, Math.min(parseInt(credits, 10) || 1500, 10000000));
  const d = Math.max(1, Math.min(parseInt(days, 10) || 7, 365));
  const mail = (email && String(email).trim().toLowerCase()) || await uniqueEmail(company);
  const dup = await query('SELECT 1 FROM users WHERE email = $1', [mail]);
  if (dup.rowCount > 0) { const e = new Error('이미 존재하는 이메일입니다.'); e.statusCode = 409; throw e; }
  const pw = (password && String(password)) || genPassword();

  const r = await query(
    `INSERT INTO users (email, password_hash, display_name, company_name, role, status,
        is_trial, trial_days, trial_image_quota, trial_image_used, credit_balance)
     VALUES ($1,$2,$3,$3,'user','active', true,$4,$5,0,0)
     RETURNING id, email, company_name`,
    [mail, hashPassword(pw), company, d, c] // trial_image_quota=발급 토큰(표시용)
  );
  const userId = r.rows[0].id;
  // 토큰(크레딧) 지급 — 원장 기록 포함. 이후 생성은 이 잔액에서 정상 차감된다.
  await addCredits(userId, c, { type: 'trial_grant', description: `체험 계정 발급 지급 ◈${c}` });
  return { id: userId, email: mail, password: pw, companyName: company, credits: c, days: d };
}

/** 첫 로그인 시 카운트다운 시작점 기록 (체험 계정 + 아직 시작 안 한 경우만). */
async function startTrialIfNeeded(userId) {
  await query(
    `UPDATE users SET trial_started_at = now(), updated_at = now()
     WHERE id = $1 AND is_trial = true AND trial_started_at IS NULL`,
    [userId]
  ).catch(() => {});
}

/**
 * 생성 게이트. 체험 계정이면 기간(일) 만료만 검사한다.
 * 사용량 한도는 크레딧 잔액이 담당 → null을 반환해 generate.route가 일반 크레딧 차감을 적용하게 한다.
 * (잔액 0이면 chargeGeneration이 402를 던짐)
 * @throws statusCode 403 (기간 만료) — message에 사유.
 * @returns {Promise<null>}
 */
async function assertCanGenerate(userId) {
  const r = await query(
    `SELECT is_trial, trial_started_at, trial_days,
            (trial_started_at + (trial_days || ' days')::interval) AS expires_at,
            now() AS now
       FROM users WHERE id = $1`, [userId]);
  const u = r.rows[0];
  if (!u || !u.is_trial) return null;

  // 아직 시작 전이면(로그인 훅 누락 등) 지금 시작 처리
  if (!u.trial_started_at) { await startTrialIfNeeded(userId); }
  else if (u.now > u.expires_at) {
    const e = new Error(`체험 기간(${u.trial_days}일)이 만료되었습니다.`); e.statusCode = 403; e.trial = true; throw e;
  }
  return null; // 사용 한도 = 크레딧 잔액. 일반 차감 경로로 진행.
}

/** 생성 성공 후 사용량 증가(체험 계정만). */
async function consumeImages(userId, count = 1) {
  await query(
    `UPDATE users SET trial_image_used = trial_image_used + $2, updated_at = now()
     WHERE id = $1 AND is_trial = true`, [userId, Math.max(0, count)]
  ).catch(() => {});
}

/** 본인 체험 상태(스튜디오 배너용). 비-체험이면 null. quota=발급 토큰·balance=잔액. */
async function getStatus(userId) {
  const r = await query(
    `SELECT is_trial, company_name, trial_started_at, trial_days, trial_image_quota, credit_balance,
            (trial_started_at + (trial_days || ' days')::interval) AS expires_at, now() AS now
       FROM users WHERE id = $1`, [userId]);
  const u = r.rows[0];
  if (!u || !u.is_trial) return null;
  const started = !!u.trial_started_at;
  const expired = started && u.now > u.expires_at;
  const daysLeft = started ? Math.max(0, Math.ceil((u.expires_at - u.now) / 86400000)) : u.trial_days;
  const granted = u.trial_image_quota;          // 발급 토큰(표시용)
  const balance = u.credit_balance;             // 남은 토큰
  return {
    isTrial: true, companyName: u.company_name,
    started, expired,
    daysLeft, quota: granted, balance, used: Math.max(0, granted - balance),
    remaining: Math.max(0, balance),
    expiresAt: u.expires_at,
  };
}

/** 관리자: 전체 체험 계정 + 상태. quota=발급 토큰·balance=잔액·used=사용(발급-잔액). */
async function listTrials() {
  const r = await query(
    `SELECT id, email, company_name, status, created_at, trial_started_at, trial_days,
            trial_image_quota, credit_balance,
            (trial_started_at + (trial_days || ' days')::interval) AS expires_at, now() AS now
       FROM users WHERE is_trial = true ORDER BY created_at DESC`);
  return r.rows.map((u) => {
    const started = !!u.trial_started_at;
    const expired = started && u.now > u.expires_at;
    const daysLeft = started ? Math.max(0, Math.ceil((u.expires_at - u.now) / 86400000)) : u.trial_days;
    const granted = u.trial_image_quota;        // 발급 토큰(표시용)
    const balance = u.credit_balance;           // 남은 토큰
    return {
      id: u.id, email: u.email, companyName: u.company_name, status: u.status,
      createdAt: u.created_at, startedAt: u.trial_started_at, started, expired,
      days: u.trial_days, daysLeft,
      quota: granted, balance, used: Math.max(0, granted - balance),
      remaining: Math.max(0, balance),
    };
  });
}

/** 관리자: 계정 활성/비활성 토글 (status active|disabled). */
async function setStatus(userId, status) {
  const s = status === 'disabled' ? 'disabled' : 'active';
  await query(`UPDATE users SET status = $2, updated_at = now() WHERE id = $1 AND is_trial = true`, [userId, s]);
  return s;
}

/**
 * 관리자: 기존 체험 계정에 토큰(◈ 크레딧) 추가 지급.
 * 크레딧 잔액을 늘리고, 발급액 표시(trial_image_quota)도 함께 증가시킨다(목록 바 정합).
 * @returns {Promise<{balance:number, granted:number, added:number}>}
 */
async function grantCredits(userId, amount) {
  const amt = Math.max(1, Math.min(parseInt(amount, 10) || 0, 10000000));
  const chk = await query('SELECT is_trial FROM users WHERE id = $1', [userId]);
  if (!chk.rows[0] || !chk.rows[0].is_trial) { const e = new Error('체험 계정이 아닙니다.'); e.statusCode = 404; throw e; }
  await addCredits(userId, amt, { type: 'trial_grant', description: `체험 계정 토큰 추가 지급 ◈${amt}` });
  const r = await query(
    `UPDATE users SET trial_image_quota = trial_image_quota + $2, updated_at = now()
       WHERE id = $1 RETURNING credit_balance, trial_image_quota`, [userId, amt]);
  return { balance: r.rows[0].credit_balance, granted: r.rows[0].trial_image_quota, added: amt };
}

/** 관리자: 체험 기간(일) 변경. 첫 로그인 기준 N일. */
async function setDays(userId, days) {
  const d = Math.max(1, Math.min(parseInt(days, 10) || 7, 365));
  await query('UPDATE users SET trial_days = $2, updated_at = now() WHERE id = $1 AND is_trial = true', [userId, d]);
  return d;
}

module.exports = {
  createTrialAccount, startTrialIfNeeded, assertCanGenerate, consumeImages,
  getStatus, listTrials, setStatus, grantCredits, setDays,
};
