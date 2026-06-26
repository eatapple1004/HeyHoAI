const crypto = require('crypto');
const { query } = require('../db/client');
const { hashPassword } = require('../auth/password');

/**
 * 체험 계정 모듈 — 회사별 전용 계정. 첫 로그인 시점부터 N일 + 이미지 M장 제한.
 *  - createTrialAccount: 관리자 발급 (role='user', is_trial=true)
 *  - startTrialIfNeeded: 첫 로그인 시 trial_started_at 세팅 (카운트 시작점)
 *  - assertCanGenerate: 생성 전 게이트 (만료/소진 시 statusCode 에러 throw)
 *  - consumeImages: 생성 성공 후 사용량 증가
 *  - listTrials / getStatus: 관리자 목록 / 본인 상태
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
 * @returns {Promise<{id,email,password,companyName,quota,days}>}
 */
async function createTrialAccount({ companyName, email, password, quota = 200, days = 7 }) {
  const company = String(companyName || '').trim();
  if (!company) { const e = new Error('회사명을 입력하세요.'); e.statusCode = 400; throw e; }
  const q = Math.max(1, Math.min(parseInt(quota, 10) || 200, 100000));
  const d = Math.max(1, Math.min(parseInt(days, 10) || 7, 365));
  const mail = (email && String(email).trim().toLowerCase()) || await uniqueEmail(company);
  const dup = await query('SELECT 1 FROM users WHERE email = $1', [mail]);
  if (dup.rowCount > 0) { const e = new Error('이미 존재하는 이메일입니다.'); e.statusCode = 409; throw e; }
  const pw = (password && String(password)) || genPassword();

  const r = await query(
    `INSERT INTO users (email, password_hash, display_name, company_name, role, status,
        is_trial, trial_days, trial_image_quota, trial_image_used)
     VALUES ($1,$2,$3,$3,'user','active', true,$4,$5,0)
     RETURNING id, email, company_name`,
    [mail, hashPassword(pw), company, d, q]
  );
  return { id: r.rows[0].id, email: mail, password: pw, companyName: company, quota: q, days: d };
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
 * 생성 게이트. 체험 계정이면 만료/소진 검사. 비-체험 계정은 null 반환(제한 없음).
 * @throws statusCode 403 (만료/소진) — message에 사유.
 * @returns {Promise<null|{used,quota,remaining}>}
 */
async function assertCanGenerate(userId, count = 1) {
  const r = await query(
    `SELECT is_trial, trial_started_at, trial_days, trial_image_quota, trial_image_used,
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
  if (u.trial_image_used + count > u.trial_image_quota) {
    const left = Math.max(0, u.trial_image_quota - u.trial_image_used);
    const e = new Error(`체험 생성 한도를 초과했습니다. (남은 ${left}장 / 총 ${u.trial_image_quota}장)`);
    e.statusCode = 403; e.trial = true; throw e;
  }
  return { used: u.trial_image_used, quota: u.trial_image_quota, remaining: u.trial_image_quota - u.trial_image_used };
}

/** 생성 성공 후 사용량 증가(체험 계정만). */
async function consumeImages(userId, count = 1) {
  await query(
    `UPDATE users SET trial_image_used = trial_image_used + $2, updated_at = now()
     WHERE id = $1 AND is_trial = true`, [userId, Math.max(0, count)]
  ).catch(() => {});
}

/** 본인 체험 상태(스튜디오 배너용). 비-체험이면 null. */
async function getStatus(userId) {
  const r = await query(
    `SELECT is_trial, company_name, trial_started_at, trial_days, trial_image_quota, trial_image_used,
            (trial_started_at + (trial_days || ' days')::interval) AS expires_at, now() AS now
       FROM users WHERE id = $1`, [userId]);
  const u = r.rows[0];
  if (!u || !u.is_trial) return null;
  const started = !!u.trial_started_at;
  const expired = started && u.now > u.expires_at;
  const daysLeft = started ? Math.max(0, Math.ceil((u.expires_at - u.now) / 86400000)) : u.trial_days;
  return {
    isTrial: true, companyName: u.company_name,
    started, expired,
    daysLeft, quota: u.trial_image_quota, used: u.trial_image_used,
    remaining: Math.max(0, u.trial_image_quota - u.trial_image_used),
    expiresAt: u.expires_at,
  };
}

/** 관리자: 전체 체험 계정 + 상태. */
async function listTrials() {
  const r = await query(
    `SELECT id, email, company_name, status, created_at, trial_started_at, trial_days,
            trial_image_quota, trial_image_used,
            (trial_started_at + (trial_days || ' days')::interval) AS expires_at, now() AS now
       FROM users WHERE is_trial = true ORDER BY created_at DESC`);
  return r.rows.map((u) => {
    const started = !!u.trial_started_at;
    const expired = started && u.now > u.expires_at;
    const daysLeft = started ? Math.max(0, Math.ceil((u.expires_at - u.now) / 86400000)) : u.trial_days;
    return {
      id: u.id, email: u.email, companyName: u.company_name, status: u.status,
      createdAt: u.created_at, startedAt: u.trial_started_at, started, expired,
      days: u.trial_days, daysLeft, quota: u.trial_image_quota, used: u.trial_image_used,
      remaining: Math.max(0, u.trial_image_quota - u.trial_image_used),
    };
  });
}

/** 관리자: 계정 활성/비활성 토글 (status active|disabled). */
async function setStatus(userId, status) {
  const s = status === 'disabled' ? 'disabled' : 'active';
  await query(`UPDATE users SET status = $2, updated_at = now() WHERE id = $1 AND is_trial = true`, [userId, s]);
  return s;
}

module.exports = {
  createTrialAccount, startTrialIfNeeded, assertCanGenerate, consumeImages,
  getStatus, listTrials, setStatus,
};
