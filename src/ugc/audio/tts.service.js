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
    const finish = (out) => { if (!done) { done = true; resolve(out); } };
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-filter:a', `atempo=${tempo}`, '-f', 'mp3', 'pipe:1']);
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

/** 대본 → VO mp3(내레이션 조립 포함). */
async function voiceoverForScript(script, opts = {}) {
  return synthesize(narrationFromScript(script), opts);
}

function isConfigured() { return !!provider(); }

module.exports = { synthesize, synthesizeBuffer, voiceoverForScript, narrationFromScript, isConfigured, provider, DEFAULT_VOICE };
