/**
 * tts.service.js — VO 내레이션(OpenAI TTS)
 * ============================================================================
 * 대본 → 한국어 내레이션 mp3. OpenAI /v1/audio/speech (OPENAI_API_KEY). 벤더 0.
 * v3 음성 트랙. 나중에 ElevenLabs로 교체 가능(같은 인터페이스: text → mp3 path).
 */
const fs = require('fs');
const path = require('path');
const { env } = require('../../config');

const OPENAI_TTS = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_VOICE = 'nova'; // alloy·echo·fable·onyx·nova·shimmer (다국어, 한국어 OK)

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
 * 텍스트 → mp3 파일. isConfigured=false면 null(호출부가 VO 스킵).
 * @returns {Promise<string|null>} mp3 경로
 */
async function synthesize(text, { voice = DEFAULT_VOICE, outPath, model = 'tts-1' } = {}) {
  if (!env.OPENAI_API_KEY) return null;
  if (!text || !text.trim()) return null;

  const res = await fetch(OPENAI_TTS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice, input: text.slice(0, 4000), response_format: 'mp3' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = outPath || path.join(process.cwd(), 'tmp', 'ugc', `vo_${Date.now()}.mp3`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

/** 대본 → VO mp3(내레이션 조립 포함). */
async function voiceoverForScript(script, opts = {}) {
  return synthesize(narrationFromScript(script), opts);
}

function isConfigured() { return !!env.OPENAI_API_KEY; }

module.exports = { synthesize, voiceoverForScript, narrationFromScript, isConfigured, DEFAULT_VOICE };
