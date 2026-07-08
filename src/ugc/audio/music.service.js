/**
 * music.service.js — 배경음악(ElevenLabs Music v2)
 * ============================================================================
 * 대본의 musicVibe → 광고 배경음 mp3. ElevenLabs Music(POST /v1/music).
 * music_v2 = 라이선스 클리어 훈련(상업 광고물 안전). force_instrumental=true 로
 * 보컬 없는 베드만 뽑아 내레이션(VO)과 겹치지 않게 한다.
 * 인터페이스: script → mp3 path (assembler music 슬롯). ELEVENLABS_API_KEY 없으면 null.
 */
const fs = require('fs');
const path = require('path');
const { env } = require('../../config');

const EL_MUSIC = 'https://api.elevenlabs.io/v1/music';
const MIN_MS = 3000;
const MAX_MS = 600000;

function isConfigured() { return !!env.ELEVENLABS_API_KEY; }

/** 대본 → 음악 프롬프트. musicVibe 우선, 없으면 outputType 기반 기본값. 인스트루멘탈 베드 강제. */
function promptFromScript(script = {}) {
  const vibe = (script.musicVibe || '').trim();
  const ot = script.outputType || 'product';
  const base = vibe || 'Upbeat modern, clean and premium';
  return `${base}. Instrumental background music bed for a short-form ${ot} advertising video. `
    + `No vocals, subtle and supportive so a voiceover can sit on top, consistent energy, clean mix.`;
}

/**
 * 프롬프트 → mp3 버퍼→파일. 미설정이면 null.
 * @param {{ durationMs?:number, outPath?:string, model?:string, instrumental?:boolean }} [opts]
 */
async function compose(prompt, { durationMs, outPath, model = env.ELEVENLABS_MUSIC_MODEL, instrumental = true } = {}) {
  if (!env.ELEVENLABS_API_KEY) return null;
  if (!prompt || !prompt.trim()) return null;

  const len = Math.min(Math.max(Math.round(durationMs || 20000), MIN_MS), MAX_MS);
  const res = await fetch(`${EL_MUSIC}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt.slice(0, 2000),
      music_length_ms: len,
      model_id: model,
      force_instrumental: instrumental,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs Music failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = outPath || path.join(process.cwd(), 'tmp', 'ugc', `music_${Date.now()}.mp3`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

/** 대본 → 배경음 mp3(길이=영상 길이에 맞춤). */
async function composeForScript(script, opts = {}) {
  return compose(promptFromScript(script), opts);
}

module.exports = { compose, composeForScript, promptFromScript, isConfigured };
