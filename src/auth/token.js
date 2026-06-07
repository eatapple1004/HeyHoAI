const jwt = require('jsonwebtoken');
const { env } = require('../config');

/**
 * 사용자 정보를 담은 JWT를 발급한다.
 * @param {{ id: string; role: string }} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * JWT를 검증하고 payload를 반환한다. 실패 시 null.
 * @param {string} token
 * @returns {{ id: string; role: string } | null}
 */
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };
