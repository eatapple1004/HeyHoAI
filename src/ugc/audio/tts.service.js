/**
 * tts.service.js — VO 내레이션 (ElevenLabs 우선, OpenAI 폴백)
 * ============================================================================
 * 대본 → 한국어 내레이션 mp3. 벤더 라우팅:
 *   ELEVENLABS_API_KEY 있으면 → ElevenLabs TTS(광고급 표현력, 한국어 다국어 v2)
 *   없고 OPENAI_API_KEY 있으면 → OpenAI TTS(폴백)
 *   둘 다 없으면 → null(호출부가 VO 스킵 → 무음)
 * 인터페이스 불변: text → mp3 path. 벤더 교체는 이 파일 안에서만.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { env } = require('../../config');

const OPENAI_TTS = 'https://api.openai.com/v1/audio/speech';
const EL_TTS = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE = 'nova'; // OpenAI 폴백용: alloy·echo·fable·onyx·nova·shimmer(다국어)

/** 현재 활성 벤더('elevenlabs' | 'openai' | null) */
function provider() {
  if (env.ELEVENLABS_API_KEY) return 'elevenlabs';
  if (env.OPENAI_API_KEY) return 'openai';
  return null;
}

/** 대본 → 내레이션 텍스트(hook + 씬별 onScreenText + cta). 문장 사이 자연스러운 쉼. */
function narrationFromScript(script) {
  const parts = [];
  if (script.hook) parts.push(script.hook);
  for (const s of script.scenes || []) {
    const t = (s.spoken || s.onScreenText || '').trim(); // spoken 있으면 우선(향후), 없으면 자막
    if (t) parts.push(t);
  }
  if (script.cta) parts.push(script.cta);
  // 마침표로 끝나지 않으면 붙여 자연스러운 억양/쉼 유도
  return parts.map((p) => (/[.!?…]$/.test(p) ? p : p + '.')).join(' ');
}

/**
 * 말속도 조절 = ffmpeg atempo 후처리(피치 유지, 0.5~2.0). 벤더 speed 파라미터 대신 사용.
 *   ElevenLabs voice_settings.speed 는 multilingual_v2 에서 >1.0(빠르게)이 무시되는 문제가 있어(실측),
 *   벤더 무관하게 여기서 균일 적용한다. ffmpeg 없거나 실패 시 원본 반환(속도만 미적용, 무breakage).
 */
function applyTempo(buf, speed) {
  const t = Number(speed);
  if (!buf || !Number.isFinite(t) || Math.abs(t - 1) < 0.01) return Promise.resolve(buf);
  const tempo = Math.min(Math.max(t, 0.5), 2.0);
  return new Promise((resolve) => {
    let done = false; const chunks = [];
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-filter:a', `atempo=${tempo}`, '-f', 'mp3', 'pipe:1']);
    // 멈춘 ffmpeg가 안 죽고 매달리는 것 방지 — 60s 넘으면 강제 종료하고 원본 버퍼 반환.
    const killT = setTimeout(() => { try { ff.kill('SIGKILL'); } catch (e) {} }, 60000);
    const finish = (out) => { if (!done) { done = true; clearTimeout(killT); resolve(out); } };
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.on('error', () => finish(buf)); // ffmpeg 미설치 등 → 원본
    ff.on('close', (code) => finish(code === 0 && chunks.length ? Buffer.concat(chunks) : buf));
    ff.stdin.on('error', () => {});
    ff.stdin.write(buf); ff.stdin.end();
  });
}

/**
 * 유저 친화 쉼 마크 → ElevenLabs SSML break(3c). [쉼]=0.6s·[긴쉼]=1.2s·[pause]=0.6s.
 *   말줄임표(…/...)는 ElevenLabs가 자연스러운 짧은 쉼으로 알아서 처리하므로 손대지 않음.
 */
function applyPauseMarks(text) {
  return String(text || '')
    .replace(/\[긴쉼\]/g, '<break time="1.2s" />')
    .replace(/\[쉼\]/g, '<break time="0.6s" />')
    .replace(/\[pause\]/gi, '<break time="0.6s" />');
}

/** ElevenLabs TTS → mp3 버퍼. 속도는 synthesizeBuffer의 atempo가 담당(여기선 안 보냄). */
async function synthElevenLabs(text, { voiceId } = {}) {
  const vid = voiceId || env.ELEVENLABS_VOICE_ID;
  const body = { text: applyPauseMarks(text).slice(0, 5000), model_id: env.ELEVENLABS_TTS_MODEL };
  const res = await fetch(`${EL_TTS}/${vid}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${b.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** OpenAI TTS → mp3 버퍼 (폴백) */
async function synthOpenAI(text, { voice = DEFAULT_VOICE, model = 'tts-1' } = {}) {
  const res = await fetch(OPENAI_TTS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice, input: text.slice(0, 4000), response_format: 'mp3' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * 텍스트 → mp3 파일. 벤더 미설정이면 null(호출부가 VO 스킵).
 * @returns {Promise<string|null>} mp3 경로
 */
async function synthesizeBuffer(text, opts = {}) {
  const p = provider();
  if (!p) return null;
  if (!text || !text.trim()) return null;
  const buf = p === 'elevenlabs' ? await synthElevenLabs(text, opts) : await synthOpenAI(text, opts);
  return buf ? applyTempo(buf, opts.speed) : buf; // 속도는 벤더 무관 atempo로(미리듣기·실제 생성 공통 경로)
}

async function synthesize(text, opts = {}) {
  const buf = await synthesizeBuffer(text, opts);
  if (!buf) return null;
  const out = opts.outPath || path.join(process.cwd(), 'tmp', 'ugc', `vo_${Date.now()}.mp3`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

// ── B: 단어 타임스탬프 기반 청킹 (ElevenLabs with-timestamps) ──────────────
// 글자별 정렬 → 단어 → 청크(≤14자·≤4단어, ugcChunkCaption과 동일 정책). 타이밍만 실제 발화값.
//   speed는 atempo로 audio가 늘고 줄므로 char time을 1/speed로 스케일해 최종 오디오에 맞춤.
function chunksFromAlignment(alignment, speed) {
  if (!alignment || !Array.isArray(alignment.characters)) return null;
  const chars = alignment.characters;
  const st = alignment.character_start_times_seconds || [];
  const et = alignment.character_end_times_seconds || [];
  const sf = (Number(speed) > 0 ? Number(speed) : 1);
  const ms = (i, arr) => Math.round(((arr[i] != null ? arr[i] : (st[i] || 0)) * 1000) / sf);
  const words = []; let cur = '', ws = null, we = null;
  for (let i = 0; i < chars.length; i++) {
    const c = String(chars[i] == null ? '' : chars[i]);
    if (/\s/.test(c) || !c) { if (cur) { words.push({ text: cur, startMs: ws, endMs: we }); cur = ''; ws = null; } continue; }
    if (!cur) ws = ms(i, st);
    cur += c; we = ms(i, et);
  }
  if (cur) words.push({ text: cur, startMs: ws, endMs: we });
  if (!words.length) return null;
  const groups = []; let g = [], gc = 0;
  for (const w of words) {
    const add = (g.length ? 1 : 0) + w.text.length;
    if (g.length && (g.length >= 4 || gc + add > 14)) { groups.push(g); g = [w]; gc = w.text.length; }
    else { g.push(w); gc += add; }
  }
  if (g.length) groups.push(g);
  return groups.map((grp) => ({ text: grp.map((w) => w.text).join(' '), startMs: grp[0].startMs, durMs: Math.max(1, grp[grp.length - 1].endMs - grp[0].startMs) }));
}

// ElevenLabs with-timestamps → { buffer, alignment }. ElevenLabs 아니면 null(호출부가 무타임스탬프 폴백).
async function synthWithTimestamps(text, opts = {}) {
  if (provider() !== 'elevenlabs') return null;
  const vid = opts.voiceId || env.ELEVENLABS_VOICE_ID;
  const body = { text: applyPauseMarks(text).slice(0, 5000), model_id: env.ELEVENLABS_TTS_MODEL };
  const res = await fetch(`${EL_TTS}/${vid}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const b = await res.text().catch(() => ''); throw new Error(`ElevenLabs timestamps failed (${res.status}): ${b.slice(0, 200)}`); }
  const j = await res.json();
  let buf = Buffer.from(j.audio_base64 || '', 'base64');
  buf = await applyTempo(buf, opts.speed);
  return { buffer: buf, alignment: j.alignment || j.normalized_alignment || null };
}

// text → { path, chunks:[{text,startMs,durMs}]|null }. ElevenLabs면 실 타임스탬프 청크, 아니면 chunks=null(무타임스탬프 → 균등 폴백).
async function synthesizeWithChunks(text, opts = {}) {
  let r = null;
  try { r = await synthWithTimestamps(text, opts); } catch (e) { r = null; } // 타임스탬프 실패 → 무청크 폴백(무음 방지)
  if (!r || !r.buffer || !r.buffer.length) {
    const p = await synthesize(text, opts); // 폴백: 일반 합성(청크 없음 → 호출부가 균등 청킹)
    return p ? { path: p, chunks: null } : null;
  }
  const out = opts.outPath || path.join(process.cwd(), 'tmp', 'ugc', `vo_${Date.now()}.mp3`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, r.buffer);
  return { path: out, chunks: chunksFromAlignment(r.alignment, opts.speed) };
}

/** 대본 → VO mp3(내레이션 조립 포함). */
async function voiceoverForScript(script, opts = {}) {
  return synthesize(narrationFromScript(script), opts);
}

function isConfigured() { return !!provider(); }

module.exports = { synthesize, synthesizeBuffer, synthesizeWithChunks, chunksFromAlignment, voiceoverForScript, narrationFromScript, isConfigured, provider, DEFAULT_VOICE };
