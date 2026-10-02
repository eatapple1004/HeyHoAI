/**
 * provider가 만든 영상을 **우리 것으로 만들어** 공개 URL을 돌려준다.
 *
 * 왜 필요한가 — kling·runway는 완료 시 그대로 열리는 URL을 주지만, 새로 붙인 둘은 아니다:
 *   · Sora  : `/videos/{id}/content` 가 **MP4 바이너리**를 준다. URL 자체가 없다.
 *   · Veo   : `video.uri` 는 있는데 **API 키를 헤더에 실어야만** 받아진다. 프론트가 못 연다.
 * 이걸 provider 밖으로 미루면 videoUrl 계약("바로 재생 가능한 URL")이 provider마다 달라진다.
 * 그래서 여기서 받아 `tmp/images/<uuid>.mp4` 로 떨어뜨리고 `/images/...` 경로를 돌려준다
 * (UGC·퍼블리싱이 쓰는 것과 같은 서빙 경로 — src/index.js 의 `/images/:file` 라우트).
 *
 * R2 업로드는 best-effort다. 실패해도 로컬 파일로 서빙되고, cleanup cron(48h)이 지우기 전까지는 살아 있다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mediaStore = require('../../storage/mediaStore');

/** `/images/:file` 라우트가 서빙하는 디렉토리 — src/index.js 의 IMAGES_DIR과 같은 곳이어야 한다. */
const SERVED_DIR = path.join(process.cwd(), 'tmp', 'images');

/**
 * 원격 영상을 받아 서빙 디렉토리에 저장하고 공개 경로를 반환한다.
 * @param {string} url            내려받을 주소
 * @param {object} [opts]
 * @param {object} [opts.headers] 인증이 필요한 경우(예: Veo의 x-goog-api-key)
 * @param {string} [opts.ext]     확장자(기본 .mp4)
 * @returns {Promise<string>} `/images/<uuid>.mp4`
 */
async function fetchAndPersist(url, opts = {}) {
  const res = await fetch(url, { headers: opts.headers || {} });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`영상 다운로드 실패 (${res.status}) ${body.slice(0, 200)}`);
  }
  return persistBuffer(Buffer.from(await res.arrayBuffer()), opts.ext);
}

/** 이미 손에 있는 버퍼를 저장하고 공개 경로를 반환한다(Sora처럼 바이너리를 직접 받는 경우). */
async function persistBuffer(buffer, ext = '.mp4') {
  if (!buffer || !buffer.length) throw new Error('빈 영상 응답');
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.mkdirSync(SERVED_DIR, { recursive: true });
  fs.writeFileSync(path.join(SERVED_DIR, filename), buffer);
  // 영속화 실패는 재생을 막지 않는다 — 로컬 파일이 이미 서빙 가능하다.
  try { await mediaStore.putFile(path.join(SERVED_DIR, filename)); } catch (e) { /* best-effort */ }
  return `/images/${filename}`;
}

/**
 * 소스 이미지를 base64로 — Veo는 URL이 아니라 inlineData(바이트)를 요구한다.
 * @returns {Promise<{data:string, mimeType:string}>}
 */
async function imageToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`소스 이미지를 가져오지 못했습니다 (${res.status}) ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type') || 'image/png';
  return { data: buf.toString('base64'), mimeType: mimeType.split(';')[0] };
}

/** 소스 이미지를 Blob으로 — Sora는 multipart 파일 업로드를 요구한다. */
async function imageToBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`소스 이미지를 가져오지 못했습니다 (${res.status}) ${url}`);
  const type = (res.headers.get('content-type') || 'image/png').split(';')[0];
  return { blob: new Blob([await res.arrayBuffer()], { type }), type };
}

/**
 * 요청 길이를 provider가 허용하는 값으로 스냅한다.
 * 임의로 자르지 않고 **가장 가까운 허용값**을 고른다 — 허용 목록에 없는 값을 그대로 보내면
 * provider가 400을 내며 통째로 실패하는데, 사용자에겐 "5초를 요청했더니 아무것도 안 나온" 것으로 보인다.
 */
function snapDuration(requested, allowed) {
  const n = Number(requested);
  if (!Number.isFinite(n) || !allowed.length) return allowed[0];
  return allowed.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best), allowed[0]);
}

module.exports = { fetchAndPersist, persistBuffer, imageToBase64, imageToBlob, snapDuration, SERVED_DIR };
