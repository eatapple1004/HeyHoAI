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

/**
 * ─── 카드 재생용 가벼운 영상 (2026-10-17) — GET /images/v/<file> ───
 * 카드·hover 재생이 원본(1080p·~12Mbps, 15초에 22MB)을 그대로 받아 여러 장이 동시에 대역폭을 나눠 쓰며 한참 멈춰 있었다.
 * 짧은 변 720 이하·H.264 CRF 28(최대 1.8Mbps)·faststart 사본을 만들어 준다(15초 기준 1~3MB).
 * 서버(2코어)를 prd 와 같이 쓰므로: 첫 요청은 기다리게 하지 않고 원본으로 302(no-store) + 뒤에서 하나씩(nice, 1스레드) 만든다.
 * 다음 요청부터 사본을 30일 immutable 로. 사본이 원본보다 크면(이미 가벼운 영상) 원본을 재인코딩 없이 faststart 만 한다.
 */
const PREVIEW_DIR = path.join(THUMBS_DIR, 'v');
const pvQueue = []; const pvQueued = new Set(); let pvBusy = false;
function ffmpeg(args, timeout) {
  return new Promise((ok, no) => execFile('nice', ['-n', '10', 'ffmpeg', '-y', '-v', 'error', ...args], { timeout }, (err) => (err ? no(err) : ok())));
}
async function buildPreview(name) {
  const out = path.join(PREVIEW_DIR, name);
  if (fs.existsSync(out)) return;
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const src = await sourceFile(name);
  if (!src) return;
  const tmpOut = `${out}.${process.pid}.tmp.mp4`;
  try {
    await ffmpeg(['-i', src.file, '-vf', 'scale=w=720:h=720:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-maxrate', '1800k', '-bufsize', '3600k', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-threads', '1', tmpOut], 180000);
    if (fs.statSync(tmpOut).size >= fs.statSync(src.file).size) await ffmpeg(['-i', src.file, '-c', 'copy', '-movflags', '+faststart', tmpOut], 60000);
    fs.renameSync(tmpOut, out);
  } catch (e) {
    fs.unlink(tmpOut, () => {});
  } finally { if (src.temp) fs.unlink(src.file, () => {}); }
}
async function pumpPreviews() {
  if (pvBusy) return;
  pvBusy = true;
  try {
    while (pvQueue.length) { const n = pvQueue.shift(); await buildPreview(n).catch(() => {}); pvQueued.delete(n); }
  } finally { pvBusy = false; }
}

/** Express 핸들러 — /images/v/:file */
function previewHandler(req, res, next) {
  const name = path.basename(String(req.params.file || ''));
  if (!VID_RE.test(name)) return next();
  const out = path.join(PREVIEW_DIR, name);
  if (fs.existsSync(out)) return res.sendFile(out, { maxAge: MAX_AGE_SEC * 1000, immutable: true, headers: { 'Content-Type': 'video/mp4' } });
  if (!pvQueued.has(name) && pvQueue.length < 200) { pvQueued.add(name); pvQueue.push(name); pumpPreviews(); }
  res.set('Cache-Control', 'no-store');
  return res.redirect(302, `/images/${encodeURIComponent(name)}`);
}

/**
 * ─── 정적 사진 썸네일 (2026-10-17) — GET /img/t/<w>/<public/img 아래 경로> ───
 * Marketplace 템플릿 대표 사진(public/img/… PNG 최대 770KB)이 폰에서 늦게 떠 한동안 이모지만 보이던 것.
 * public/img 안의 사진만, 폭 w WebP 로 줄여 tmp/thumbs/static 에 캐시(파일이 바뀌면 mtime 이 달라져 다시 만든다).
 */
const PUBLIC_IMG = path.join(process.cwd(), 'public', 'img');
async function staticHandler(req, res, next) {
  const w = parseInt(req.params.w, 10);
  const rest = req.params.rest; // Express 5 이름 붙은 와일드카드 = 경로 조각 배열
  const rel = Array.isArray(rest) ? rest.join('/') : String(rest || '');
  if (!WIDTHS.has(w) || !IMG_RE.test(rel)) return next();
  const src = path.resolve(PUBLIC_IMG, rel);
  if (!src.startsWith(PUBLIC_IMG + path.sep) || !fs.existsSync(src)) return next(); // 경로 탈출·없는 파일 → 404
  const mtime = Math.floor(fs.statSync(src).mtimeMs);
  const out = path.join(THUMBS_DIR, 'static', String(w), `${rel.replace(/[^\w.-]+/g, '_')}.${mtime}.webp`);
  const send = () => res.sendFile(out, { maxAge: 24 * 3600 * 1000, headers: { 'Content-Type': 'image/webp' } });
  try {
    if (fs.existsSync(out)) return send();
    await acquire();
    try {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      // eslint-disable-next-line global-require
      const sharp = require('sharp');
      await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${out}.${process.pid}.tmp`);
      fs.renameSync(`${out}.${process.pid}.tmp`, out);
    } finally { release(); }
    return send();
  } catch (e) {
    return res.redirect(302, `/img/${rel}`);
  }
}

module.exports = { handler, previewHandler, staticHandler, WIDTHS };
