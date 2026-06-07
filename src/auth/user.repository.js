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

module.exports = { findByEmail, findById, insert };
