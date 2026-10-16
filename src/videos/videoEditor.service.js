/**
 * ─── Video Editor (2026-10-16) — /video-edit 타임라인 편집기의 서버 쪽 ───
 *
 * 화면 구성은 omniclip(오픈소스 웹 편집기, REA 로 캡처)·힉스필드를 참고: 미디어 · 미리보기 · AI 패널 · 타임라인(영상·텍스트·음악 트랙).
 * 이 모듈이 하는 일:
 *   · render()   — 타임라인 JSON → ffmpeg 로 mp4 1개(자르기·이어붙이기·비율 맞춤·텍스트·BGM) → 호출부가 Library 에 저장. 무료.
 *   · cut()      — 클립의 선택 구간만 잘라 AI 입력으로(Seedance Edit/Extend 는 4~30초).
 *   · captions() — 구간 오디오 → Gemini Flash 전사 → [{start,end,text}] (자동 자막).
 * AI 편집 자체는 기존 영상 파이프라인(videoJob.service.submit — 과금·잡·폴러·Library 저장)을 그대로 쓴다.
 *
 * 입력 영상은 우리 서빙 경로(/images/<file>.mp4)만 받는다 — 로컬 tmp/images 우선, 없으면 R2 에서 내려받는다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const sharp = require('sharp');
const { env } = require('../config');
const logger = require('../lib/logger');
const mediaStore = require('../storage/mediaStore');

const TMP = path.join(process.cwd(), 'tmp');
const IMAGES = path.join(TMP, 'images');
const WORK = path.join(TMP, 'video-edit');
const FPS = 30;
const MAX_CLIPS = 30;
const MAX_TOTAL_SEC = 180;
const FONT_STACK = "'Noto Sans CJK KR','Noto Sans KR','Noto Serif CJK KR','Apple SD Gothic Neo','DejaVu Sans',sans-serif";

function run(cmd, args, { timeoutMs = 300000, cwd } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${cmd} failed: ${String(stderr || err.message).split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400)}`));
      resolve({ stdout, stderr });
    });
  });
}

/** /images/<file> → 로컬 파일 경로(없으면 R2 에서 받아 캐시). 우리 경로가 아니면 null. */
async function localFile(src) {
  const m = /^\/images\/([\w.-]+\.(mp4|mov|webm|m4v|mp3|wav|m4a|aac|ogg|png|jpe?g|webp))$/i.exec(String(src || ''));
  const bm = /^\/bgm\/([\w.-]+)$/.exec(String(src || ''));
  if (bm) { const f = path.join(TMP, 'bgm', bm[1]); return fs.existsSync(f) ? f : null; }
  if (!m) return null;
  const f = path.join(IMAGES, m[1]);
  if (fs.existsSync(f)) return f;
  try {
    const obj = await mediaStore.getObject(m[1]);
    if (obj && obj.Body) {
      fs.mkdirSync(IMAGES, { recursive: true });
      await new Promise((ok, no) => { const w = fs.createWriteStream(f); obj.Body.pipe(w); w.on('finish', ok); w.on('error', no); });
      return f;
    }
  } catch (e) { /* 없음 */ }
  return null;
}

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { timeoutMs: 30000 });
  const j = JSON.parse(stdout);
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  const a = (j.streams || []).find((s) => s.codec_type === 'audio');
  return { duration: parseFloat((j.format && j.format.duration) || (v && v.duration) || 0) || 0, width: v ? v.width : 0, height: v ? v.height : 0, hasAudio: !!a };
}

/** 업로드 파일 → tmp/images/<uuid>.mp4 (+R2). 반환 { url, duration, width, height } */
async function saveUpload(filePath, originalName) {
  fs.mkdirSync(IMAGES, { recursive: true });
  const ext = (path.extname(originalName || '') || '.mp4').toLowerCase();
  const isAudio = /\.(mp3|wav|m4a|aac|ogg)$/.test(ext);
  const name = `${crypto.randomUUID()}${isAudio ? ext : '.mp4'}`;
  const out = path.join(IMAGES, name);
  if (isAudio || ext === '.mp4') fs.copyFileSync(filePath, out);
  else await run('ffmpeg', ['-y', '-i', filePath, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out]);
  fs.unlink(filePath, () => {});
  await mediaStore.putFile(out).catch(() => {});
  const meta = await probe(out);
  return { url: `/images/${name}`, kind: isAudio ? 'audio' : 'video', ...meta };
}

/** 구간 자르기(재인코딩 — 키프레임과 상관없이 정확). 반환 = tmp/uploads 경로(AI 파이프라인이 가져가 지운다) */
async function cut(src, inSec, outSec, { minSec = 0, maxSec = 30, minShort = 0 } = {}) {
  const f = await localFile(src);
  if (!f) throw Object.assign(new Error('Clip not found'), { statusCode: 404 });
  const meta = await probe(f);
  let a = Math.max(0, +inSec || 0), b = Math.min(meta.duration || 0, +outSec || meta.duration || 0);
  if (b - a > maxSec) b = a + maxSec;
  if (b - a < minSec) throw Object.assign(new Error(`Select at least ${minSec}s for this tool (now ${(b - a).toFixed(1)}s)`), { statusCode: 400 });
  const dir = path.join(TMP, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${crypto.randomUUID()}.mp4`);
  // minShort: 짧은 변 하한(Kling O3 Edit = 720px 이상만 받는다) — 작으면 비율 유지 확대
  const short = Math.min(meta.width || 0, meta.height || 0);
  const vf = minShort && short && short < minShort
    ? ['-vf', meta.width <= meta.height ? `scale=${minShort}:-2` : `scale=-2:${minShort}`] : [];
  await run('ffmpeg', ['-y', '-ss', a.toFixed(3), '-i', f, '-t', (b - a).toFixed(3), ...vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out]);
  return { path: out, duration: b - a };
}

/** 이미지(/images/x.png) → tmp/uploads 사본(모션 전이용 캐릭터 사진) */
async function copyImage(src) {
  const f = await localFile(src);
  if (!f || !/\.(png|jpe?g|webp)$/i.test(f)) throw Object.assign(new Error('Pick an image from your Library'), { statusCode: 400 });
  const out = path.join(TMP, 'uploads', `${crypto.randomUUID()}${path.extname(f)}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(f, out);
  return out;
}

/** 출력 크기 — height(720|1080)는 짧은 변. 9:16 720 → 720x1280 */
function frameSize(aspect, height) {
  const S = height === 1080 ? 1080 : 720;
  const even = (n) => Math.round(n / 2) * 2;
  const map = { '9:16': [S, S * 16 / 9], '4:5': [S, S * 5 / 4], '1:1': [S, S], '16:9': [S * 16 / 9, S] };
  return (map[aspect] || map['9:16']).map(even);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

/** 텍스트 → 투명 PNG(프레임 크기). x,y 는 0~1(중심), size 는 프레임 높이 대비 % */
async function textPng(t, W, H, file) {
  const size = Math.max(12, Math.round(H * (Math.min(20, Math.max(2, +t.size || 6)) / 100)));
  const lines = String(t.text || '').slice(0, 300).split('\n');
  const x = Math.round(W * Math.min(1, Math.max(0, t.x == null ? 0.5 : +t.x)));
  const y0 = Math.round(H * Math.min(1, Math.max(0, t.y == null ? 0.8 : +t.y))) - ((lines.length - 1) * size * 1.2) / 2;
  const color = /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : '#ffffff';
  const bg = t.bg ? `<rect x="0" y="${y0 - size * 1.0}" width="${W}" height="${lines.length * size * 1.2 + size * 0.5}" fill="#000000" fill-opacity="0.45"/>` : '';
  const tspans = lines.map((l, i) => `<text x="${x}" y="${y0 + i * size * 1.2}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT_STACK}" font-size="${size}" font-weight="${t.bold === false ? 400 : 800}" fill="${color}" stroke="#000000" stroke-opacity="0.55" stroke-width="${Math.max(1, size / 14)}" paint-order="stroke">${esc(l)}</text>`).join('');
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${bg}${tspans}</svg>`)).png().toFile(file);
}

/**
 * 타임라인 렌더.
 * tl = { aspect:'9:16'|'1:1'|'16:9'|'4:5', height:720|1080, fit:'contain'|'cover', clips:[{src,in,out,muted}], texts:[{text,start,end,x,y,size,color,bg}], audio:{src,start,volume,clipVolume} }
 * 반환 { file(tmp/images 경로), name, duration, width, height }
 */
async function render(tl) {
  const clips = (tl.clips || []).slice(0, MAX_CLIPS);
  if (!clips.length) throw Object.assign(new Error('Add at least one clip to the timeline'), { statusCode: 400 });
  const [W, H] = frameSize(tl.aspect, +tl.height);
  const id = crypto.randomUUID();
  const dir = path.join(WORK, id);
  fs.mkdirSync(dir, { recursive: true });
  try {
    // 1) 클립마다 같은 규격 세그먼트로(비율은 letterbox, 무음 클립엔 무음 트랙)
    let total = 0;
    const segs = [];
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const f = await localFile(c.src);
      if (!f) throw Object.assign(new Error(`Clip ${i + 1} is missing`), { statusCode: 400 });
      const meta = await probe(f);
      const a = Math.max(0, +c.in || 0), b = Math.min(meta.duration, +c.out || meta.duration);
      if (b - a < 0.1) continue;
      total += b - a;
      if (total > MAX_TOTAL_SEC) throw Object.assign(new Error(`Timeline is longer than ${MAX_TOTAL_SEC}s`), { statusCode: 400 });
      const seg = path.join(dir, `s${i}.mp4`);
      // fit: 'contain'(기본, 여백) | 'cover'(꽉 채우고 잘라냄)
      const vf = tl.fit === 'cover'
        ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS},format=yuv420p`
        : `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${FPS},format=yuv420p`;
      const args = ['-y', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', f];
      const silent = !meta.hasAudio || c.muted;
      if (silent) args.push('-f', 'lavfi', '-t', (b - a).toFixed(3), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
      args.push('-vf', vf, '-map', '0:v:0', '-map', silent ? '1:a:0' : '0:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', seg);
      await run('ffmpeg', args, { timeoutMs: 600000 });
      segs.push(seg);
    }
    if (!segs.length) throw Object.assign(new Error('All clips are empty'), { statusCode: 400 });
    // 2) 이어붙이기
    const list = path.join(dir, 'list.txt');
    fs.writeFileSync(list, segs.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
    const joined = path.join(dir, 'joined.mp4');
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined], { timeoutMs: 600000 });
    const dur = (await probe(joined)).duration;
    // 3) 텍스트·BGM
    const texts = (tl.texts || []).filter((t) => String(t.text || '').trim()).slice(0, 40);
    const audio = tl.audio && tl.audio.src ? tl.audio : null;
    const bgmFile = audio ? await localFile(audio.src) : null;
    fs.mkdirSync(IMAGES, { recursive: true });
    const name = `${id}.mp4`;
    const out = path.join(IMAGES, name);
    if (!texts.length && !bgmFile) {
      fs.copyFileSync(joined, out);
    } else {
      const args = ['-y', '-i', joined];
      const pngs = [];
      for (let i = 0; i < texts.length; i++) { const p = path.join(dir, `t${i}.png`); await textPng(texts[i], W, H, p); pngs.push(p); args.push('-i', p); }
      if (bgmFile) args.push('-stream_loop', '-1', '-i', bgmFile);
      const fc = [];
      let last = '0:v';
      texts.forEach((t, i) => {
        const s = Math.max(0, +t.start || 0), e = Math.max(s + 0.1, +t.end || dur);
        fc.push(`[${last}][${i + 1}:v]overlay=0:0:enable='between(t,${s.toFixed(2)},${e.toFixed(2)})'[v${i}]`);
        last = `v${i}`;
      });
      let aMap = '0:a';
      if (bgmFile) {
        const bi = texts.length + 1;
        const vol = Math.min(2, Math.max(0, audio.volume == null ? 0.6 : +audio.volume));
        const cv = Math.min(2, Math.max(0, audio.clipVolume == null ? 1 : +audio.clipVolume));
        const delay = Math.max(0, Math.round((+audio.start || 0) * 1000));
        fc.push(`[${bi}:a]volume=${vol},adelay=${delay}|${delay},atrim=0:${dur.toFixed(2)}[bg]`, `[0:a]volume=${cv}[ca]`, '[ca][bg]amix=inputs=2:duration=first:dropout_transition=0[aout]');
        aMap = '[aout]';
      }
      if (fc.length) args.push('-filter_complex', fc.join(';'));
      args.push('-map', texts.length ? `[${last}]` : '0:v', '-map', aMap, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', dur.toFixed(3), '-movflags', '+faststart', out);
      await run('ffmpeg', args, { timeoutMs: 900000 });
    }
    await mediaStore.putFile(out).catch(() => {});
    return { file: out, name, duration: dur, width: W, height: H };
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => {});
  }
}

/** 자동 자막 — 구간 오디오를 Gemini Flash 로 전사. 반환 [{start,end,text}] (구간 기준 초) */
async function captions(src, inSec, outSec, lang) {
  const f = await localFile(src);
  if (!f) throw Object.assign(new Error('Clip not found'), { statusCode: 404 });
  const meta = await probe(f);
  if (!meta.hasAudio) throw Object.assign(new Error('This clip has no sound to caption'), { statusCode: 400 });
  const a = Math.max(0, +inSec || 0), b = Math.min(meta.duration, +outSec || meta.duration, a + 300);
  const mp3 = path.join(TMP, 'uploads', `${crypto.randomUUID()}.mp3`);
  fs.mkdirSync(path.dirname(mp3), { recursive: true });
  try {
    await run('ffmpeg', ['-y', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', f, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', mp3]);
    if (!env.GEMINI_API_KEY) throw Object.assign(new Error('Captions are not configured on this server'), { statusCode: 400 });
    // eslint-disable-next-line global-require
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const prompt = `Transcribe the speech in this audio for on-screen captions${lang ? ` in ${lang}` : ' in the spoken language'}. `
      + 'Split into short caption lines (max ~32 characters, 1–3 seconds each). Reply with JSON only: [{"start": seconds, "end": seconds, "text": "..."}]. '
      + 'Times are relative to the start of the audio. If there is no speech, reply [].';
    const resp = await ai.models.generateContent({
      model: process.env.CAPTION_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/mp3', data: fs.readFileSync(mp3).toString('base64') } }, { text: prompt }] }],
      config: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
    });
    let arr = [];
    try { arr = JSON.parse(String(resp.text || '[]').replace(/^```json|```$/g, '').trim()); } catch (e) { arr = []; }
    return (Array.isArray(arr) ? arr : []).map((c) => ({ start: Math.max(0, +c.start || 0), end: Math.max(+c.start || 0, +c.end || 0), text: String(c.text || '').trim().slice(0, 120) }))
      .filter((c) => c.text && c.end > c.start).slice(0, 200);
  } finally {
    fs.unlink(mp3, () => {});
  }
}

/** 장면 전환 감지 — 파일 기준 초 배열(in~out 안쪽). AI 편집은 한 장면 단위가 안전해서(Kling 이 여러 장면을 한 장면으로 뭉갰다, dev 실측) */
async function scenes(src, inSec, outSec, threshold = 0.32) {
  const f = await localFile(src);
  if (!f) throw Object.assign(new Error('Clip not found'), { statusCode: 404 });
  const meta = await probe(f);
  const a = Math.max(0, +inSec || 0), b = Math.min(meta.duration, +outSec || meta.duration);
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', f, '-an', '-vf', `scale=160:-2,select='gt(scene,${threshold})',showinfo`, '-f', 'null', '-'], { timeoutMs: 120000 });
  const times = [];
  String(stderr).replace(/pts_time:([\d.]+)/g, (m, t) => { const x = a + parseFloat(t); if (x - a > 0.3 && b - x > 0.3 && (!times.length || x - times[times.length - 1] > 0.4)) times.push(+x.toFixed(3)); return m; });
  return times;
}

module.exports = { scenes, render, cut, captions, saveUpload, copyImage, probe, localFile, frameSize, MAX_TOTAL_SEC };
