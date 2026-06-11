const { query } = require('../db/client');

/**
 * 이메일로 사용자를 조회한다. (비밀번호 해시 포함 — 로그인 검증용)
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  return result.rows[0] || null;
}

/**
 * ID로 사용자를 조회한다.
 * @param {string} id UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const result = await query(
    'SELECT id, email, display_name, role, status, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * 사용자를 생성한다.
 * @param {{ email: string; passwordHash: string; displayName?: string; role?: string }} data
 * @returns {Promise<object>}
 */
async function insert({ email, passwordHash, displayName = null, role = 'user' }) {
  const result = await query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, display_name, role, status, created_at`,
    [String(email).toLowerCase(), passwordHash, displayName, role]
  );
  return result.rows[0];
}

/** google_id로 사용자 조회 */
async function findByGoogleId(googleId) {
  const result = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return result.rows[0] || null;
}

/** Google OAuth 신규 사용자 생성 (비밀번호 없음) */
async function insertGoogle({ email, googleId, displayName = null, avatarUrl = null, role = 'user' }) {
  const result = await query(
    `INSERT INTO users (email, password_hash, display_name, role, google_id, avatar_url)
     VALUES ($1, NULL, $2, $3, $4, $5)
     RETURNING id, email, display_name, role, status, created_at`,
    [String(email).toLowerCase(), displayName, role, googleId, avatarUrl]
  );
  return result.rows[0];
}

/** 기존(이메일) 계정에 google_id 연결 */
async function linkGoogle(userId, googleId, avatarUrl = null) {
  await query(
    `UPDATE users SET google_id = $2, avatar_url = COALESCE($3, avatar_url), updated_at = now() WHERE id = $1`,
    [userId, googleId, avatarUrl]
  );
}

module.exports = { findByEmail, findById, insert, findByGoogleId, insertGoogle, linkGoogle };
