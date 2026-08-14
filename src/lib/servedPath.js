const path = require('path');
const fs = require('fs');

/**
 * `/images/<file>` 서빙 경로 ↔ 실제 디스크 경로.
 * ============================================================================
 * 우리는 생성물을 `tmp/images/`에 저장하고 `/images/<file>`로 서빙한다(index.js·pages/assets.controller).
 * 그래서 코드 여기저기서 "이 문자열이 URL인가, 서빙 경로인가, 로컬 파일인가"를 판단해야 하는데,
 * 각자 판단하다 **같은 버그를 세 번 냈다**(seedance.provider · productExtract · frameFit).
 *   `/images/x.png`는 path.isAbsolute()가 true라 그대로 fs에 넘기면 루트에서 찾다가 실패한다.
 * 그 판단을 여기 한 곳에 둔다.
 */

const IMAGES_DIR = path.join(process.cwd(), 'tmp', 'images');
const SERVED_RE = /^\/images\/([^/?#]+)$/;

/** 원격 URL인가(우리가 못 읽는 것) */
function isRemote(src) {
  return /^https?:\/\//i.test(String(src || ''));
}

/**
 * 읽을 수 있는 로컬 절대경로로 바꾼다.
 * @returns {string|null} 로컬 파일이 아니거나 없으면 null(원격 URL 포함)
 */
function toLocalPath(src) {
  const s = String(src || '');
  if (!s || isRemote(s) || s.startsWith('data:')) return null;

  const served = s.match(SERVED_RE);
  const abs = served ? path.join(IMAGES_DIR, served[1])
    : (path.isAbsolute(s) ? s : path.join(process.cwd(), s));
  return fs.existsSync(abs) ? abs : null;
}

/** 디스크 경로 → 서빙 URL(`/images/<file>`) */
function toServedUrl(absPath) {
  return `/images/${path.basename(absPath)}`;
}

module.exports = { toLocalPath, toServedUrl, isRemote, IMAGES_DIR };
