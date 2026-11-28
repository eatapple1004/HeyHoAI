/* HQ 화면 공용 — API 호출, 잠긴 카드 금고(브라우저 안에서만 풀기), 축 나누기.
 *   admin-hq.html · admin-hq-map.html 이 같이 쓴다.
 *   금고: 주인 비밀 문구 → 개인 열쇠 → 카드 열쇠. 비밀 문구·열쇠는 서버로 보내지 않는다. */
(function () {
  const PBKDF2_ITER = 600000;
  const OTHER = { name: '기타', color: '#6a6a85' };
  const VAULT = { name: '금고', color: '#4a4a62' };

  async function api(method, url, body) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({}));
    if (res.status === 403) throw new Error(j.error || '권한이 없습니다.');
    if (!res.ok || j.success === false) throw new Error(j.error || `요청 실패 (${res.status})`);
    return j.data;
  }
  const b64 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function passKey(pass, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  /** 금고를 만들고 개인 열쇠를 돌려준다 */
  async function createVault(pass) {
    const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    const publicKey = await crypto.subtle.exportKey('jwk', kp.publicKey);
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await passKey(pass, salt), pkcs8);
    await api('POST', '/api/admin/hq/vault', { publicKey, wrapped: { salt: b64(salt), iv: b64(iv), ct: b64(ct), iterations: PBKDF2_ITER } });
    return kp.privateKey;
  }
  /** 비밀 문구로 개인 열쇠를 푼다 */
  async function unlockVault(pass) {
    const w = await api('GET', '/api/admin/hq/vault');
    let pkcs8;
    try { pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(w.iv) }, await passKey(pass, unb64(w.salt)), unb64(w.ct)); } catch (_) { throw new Error('비밀 문구가 맞지 않습니다'); }
    return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  }
  /** 잠긴 글 하나를 푼다 → 카드 원문 */
  async function openSealed(priv, sealed) {
    const o = JSON.parse(sealed);
    const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, priv, unb64(o.k));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct))));
  }
  /** 사업 이름 → 축. 축의 match 중 하나라도 사업 이름에 들어 있으면 그 축(위에서부터) */
  function axisOf(area, axes) {
    const a = String(area || '').toLowerCase();
    if (!a) return OTHER;
    for (const ax of axes || []) if ((ax.match || []).some((m) => m && a.includes(String(m).toLowerCase()))) return ax;
    return OTHER;
  }
  window.HQ = { api, createVault, unlockVault, openSealed, axisOf, OTHER, VAULT };
})();
