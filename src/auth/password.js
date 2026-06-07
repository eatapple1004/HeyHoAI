const crypto = require('crypto');

/**
 * 비밀번호를 scrypt로 해시한다. (별도 의존성 없이 node:crypto 사용)
 * 결과 포맷: scrypt$<salt-hex>$<hash-hex>
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * 평문 비밀번호가 저장된 해시와 일치하는지 확인한다. (타이밍 안전 비교)
 * @param {string} password
 * @param {string} stored hashPassword()가 만든 문자열
 * @returns {boolean}
 */
function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
