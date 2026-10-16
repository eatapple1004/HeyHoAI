/**
 * ─── 썸네일 (2026-10-16) — GET /images/t/<w>/<file> ───
 *
 * Library 가 카드마다 원본 PNG(1536×2048, 6~8MB)를 받아 첫 화면 40장에 ~219MB, 장당 3.6초(dev·CDN HIT 실측)였다.
 * 카드용 작은 사본을 만들어 준다:
 *   - 이미지 → 폭 w 의 WebP(q78, ~30~80KB)
 *   - 영상   → 첫 프레임(0.1s) 폭 w 의 JPEG 포스터 — 카드는 포스터만, 영상은 hover 때 로드
 * 원본과 같은 UUID 파일명 = 불변 → 디스크(tmp/thumbs/<w>/)에 한 번 만들고 30일 immutable 캐시(Cloudflare 가 이어서 캐시).
 * 원본은 로컬 우선, 없으면 R2(mediaStore.getObject). 동시 생성은 4개로 제한(pm2 700MB 상한 — sharp·ffmpeg 메모리).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const mediaStore = require('../storage/mediaStore');

const IMAGES_DIR = path.join(process.cwd(), 'tmp', 'images');
const THUMBS_DIR = path.join(process.cwd(), 'tmp', 'thumbs');
const WIDTHS = new Set([240, 360, 480, 720, 960]);
const MAX_AGE_SEC = 60 * 60 * 24 * 30;
const IMG_RE = /\.(png|jpe?g|webp)$/i;
const VID_RE = /\.(mp4|webm|mov)$/i;

// 간단한 세마포어 — 썸네일 생성 동시 4개
let active = 0; const waiters = [];
const acquire = () => new Promise((ok) => { if (active < 4) { active += 1; ok(); } else waiters.push(ok); });
const release = () => { const n = waiters.shift(); if (n) n(); else active -= 1; };
const inflight = new Map(); // 같은 썸네일 동시 요청은 한 번만 만든다

async function sourceBuffer(name) {
  const local = path.join(IMAGES_DIR, name);
  if (fs.existsSync(local)) return fs.promises.readFile(local);
  const obj = await mediaStore.getObject(name);
  if (!obj || !obj.Body) return null;
  const chunks = [];
  for await (const c of obj.Body) chunks.push(c);
  return Buffer.concat(chunks);
}

async function sourceFile(name) { // 영상은 ffmpeg 가 파일 경로로 읽는다 — 원격이면 임시 파일로
  const local = path.join(IMAGES_DIR, name);
  if (fs.existsSync(local)) return { file: local, temp: false };
  const buf = await sourceBuffer(name);
  if (!buf) return null;
  const tmp = path.join(THUMBS_DIR, `.src-${crypto.randomUUID()}${path.extname(name)}`);
  await fs.promises.writeFile(tmp, buf);
  return { file: tmp, temp: true };
}

function ffmpegPoster(input, out, w) {
  return new Promise((ok, no) => execFile('ffmpeg', ['-y', '-v', 'error', '-ss', '0.1', '-i', input, '-frames:v', '1', '-vf', `scale='min(${w},iw)':-2`, '-q:v', '4', out],
    { timeout: 30000 }, (err) => (err ? no(err) : ok())));
}

async function build(name, w, out) {
  await acquire();
  try {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmpOut = `${out}.${process.pid}.tmp`;
    if (VID_RE.test(name)) {
      const src = await sourceFile(name);
      if (!src) return false;
      try { await ffmpegPoster(src.file, `${tmpOut}.jpg`, w); fs.renameSync(`${tmpOut}.jpg`, out); } finally { if (src.temp) fs.unlink(src.file, () => {}); }
    } else {
      const buf = await sourceBuffer(name);
      if (!buf) return false;
      // eslint-disable-next-line global-require
      const sharp = require('sharp');
      await sharp(buf, { limitInputPixels: 268402689 }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(tmpOut);
      fs.renameSync(tmpOut, out);
    }
    return true;
  } finally { release(); }
}

/** Express 핸들러 — /images/t/:w/:file */
async function handler(req, res, next) {
  const w = parseInt(req.params.w, 10);
  const name = path.basename(String(req.params.file || ''));
  if (!WIDTHS.has(w) || !(IMG_RE.test(name) || VID_RE.test(name))) return next();
  const isVid = VID_RE.test(name);
  const out = path.join(THUMBS_DIR, String(w), `${name}.${isVid ? 'jpg' : 'webp'}`);
  const send = () => res.sendFile(out, { maxAge: MAX_AGE_SEC * 1000, immutable: true, headers: { 'Content-Type': isVid ? 'image/jpeg' : 'image/webp' } });
  try {
    if (fs.existsSync(out)) return send();
    const key = `${w}/${name}`;
    if (!inflight.has(key)) inflight.set(key, build(name, w, out).finally(() => inflight.delete(key)));
    const ok = await inflight.get(key);
    if (!ok || !fs.existsSync(out)) return next(); // 원본 없음 → 404
    return send();
  } catch (e) {
    // 썸네일을 못 만들면 원본으로(카드가 비지 않게)
    return res.redirect(302, `/images/${encodeURIComponent(name)}`);
  }
}

module.exports = { handler, WIDTHS };
