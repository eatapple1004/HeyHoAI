const htmlCollector = require('./html.collector');
const log = require('../../lib/logger')('AdStudio:collect');

/**
 * 수집기 라우터 — URL에서 제품 정보를 얻는 경로를 순서대로 시도한다.
 * ============================================================================
 * 엔진 프로바이더(src/videos/providers/)와 같은 패턴이다. 사이트마다 막히는 지점이 달라서
 * **하나로는 절대 안 되고**, 실패 사유에 따라 다음 수단으로 넘겨야 한다.
 *
 *   html        fetch만. 싸고 빠르지만 JS 렌더·봇 차단에 무력
 *   playwright  실제 브라우저(미구현) — JS 렌더 해결. 메모리 200~400MB
 *   api         외주 스크린샷 API(미구현) — 봇 차단까지 우회. 건당 과금
 *   manual      전부 실패 시 사용자가 이미지·제품명 직접 입력
 *
 * ⚠️ 지금 등록된 건 html 하나뿐이다. 나머지는 실패 사유를 기록해두고
 *    실제 실패율을 본 뒤 어느 쪽에 투자할지 정한다(기획서 §4-3).
 */

const CHAIN = [htmlCollector];

function normalizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) throw Object.assign(new Error('URL이 필요합니다.'), { statusCode: 400 });
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  let u;
  try { u = new URL(withScheme); } catch { throw Object.assign(new Error('올바른 URL이 아닙니다.'), { statusCode: 400 }); }
  // SSRF 방어 — 내부망·로컬을 가리키는 주소는 받지 않는다.
  const host = u.hostname.toLowerCase();
  const isPrivate = host === 'localhost'
    || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    || /^169\.254\./.test(host) || host.endsWith('.local') || host.endsWith('.internal');
  if (isPrivate) throw Object.assign(new Error('내부 주소는 수집할 수 없습니다.'), { statusCode: 400 });
  if (!['http:', 'https:'].includes(u.protocol)) throw Object.assign(new Error('http/https만 지원합니다.'), { statusCode: 400 });
  return u.href;
}

/**
 * @returns {Promise<{ok:boolean, collector?:string, data?:object, reason?:string, attempts:object[]}>}
 *   실패해도 attempts에 각 수집기의 사유가 남는다 — 어디에 투자할지 판단하는 근거가 된다.
 */
async function collect(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const attempts = [];

  for (const c of CHAIN) {
    let r;
    try {
      r = await c.collect(url);
    } catch (e) {
      r = { ok: false, reason: `예외: ${e.message}` };
    }
    attempts.push({ collector: c.name, ok: !!r.ok, reason: r.reason, blocked: r.blocked, needsBrowser: r.needsBrowser });
    if (r.ok) {
      log.info(`수집 성공(${c.name}): ${url}`);
      return { ...r, attempts };
    }
    log.warn(`수집 실패(${c.name}): ${r.reason} — ${url}`);
  }

  // 전부 실패. 왜 실패했는지가 다음 수단을 고르는 정보다.
  const needsBrowser = attempts.some((a) => a.needsBrowser || a.blocked);
  return {
    ok: false,
    attempts,
    reason: needsBrowser
      ? '이 사이트는 브라우저 렌더가 필요합니다. 제품 이미지를 직접 올려주세요.'
      : (attempts[attempts.length - 1] || {}).reason || '수집 실패',
    fallback: 'manual',
  };
}

module.exports = { collect, normalizeUrl, CHAIN };
