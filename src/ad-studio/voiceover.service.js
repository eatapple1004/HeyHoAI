const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { synthesizeBuffer } = require('../ugc/audio/tts.service');
const log = require('../lib/logger')('AdStudio:vo');

const execFileP = promisify(execFile);

/**
 * 샷별 한국어 대사 → 나레이션 트랙 → 영상에 합성.
 * ============================================================================
 * ⚠️ **Kling은 오디오를 만들지 않는다.** `generate_audio`를 켜도 무시된다(Seedance만 네이티브 지원).
 *   그래서 대사가 프롬프트에만 남고 실제로는 안 들리는 상태가 된다.
 *   컴파일러가 이미 **타임코드가 박힌 샷별 대사**를 갖고 있으므로, 그 시각에 맞춰 TTS를 얹는다.
 *
 * Seedance로 전환하면 이 단계는 건너뛴다(엔진이 립싱크까지 해주므로 이중으로 얹으면 겹친다).
 */

const TMP = path.join(process.cwd(), 'tmp', 'ugc');

/** ffmpeg adelay는 ms 단위, 채널마다 값을 줘야 한다(스테레오면 `0|0`). */
const delayArg = (sec) => `${Math.max(0, Math.round(sec * 1000))}`;

/**
 * 샷 대사를 각자 시작 시각에 배치한 오디오 트랙을 만든다.
 * @param {Array<{startSec:number, dialogueKo:string}>} shots
 * @returns {Promise<string|null>} mp3 경로. 대사가 없거나 TTS 미설정이면 null
 */
async function buildVoiceTrack(shots, { voice } = {}) {
  const lines = (shots || []).filter((s) => s.dialogueKo && s.dialogueKo.trim());
  if (!lines.length) return null;

  fs.mkdirSync(TMP, { recursive: true });
  const parts = [];
  for (const s of lines) {
    const buf = await synthesizeBuffer(s.dialogueKo, { voice });
    if (!buf) return null;                       // 벤더 미설정 — 무음으로 두는 게 맞다
    const p = path.join(TMP, `vo_${crypto.randomUUID()}.mp3`);
    fs.writeFileSync(p, buf);
    parts.push({ file: p, startSec: s.startSec });
  }

  if (parts.length === 1 && parts[0].startSec < 0.05) return parts[0].file;   // 합성 불필요

  // 각 조각을 시작 시각만큼 지연시켜 하나로 섞는다.
  const out = path.join(TMP, `vo_mix_${crypto.randomUUID()}.mp3`);
  const inputs = parts.flatMap((p) => ['-i', p.file]);
  const filters = parts
    .map((p, i) => `[${i}:a]adelay=${delayArg(p.startSec)}:all=1[a${i}]`)
    .join(';');
  const mix = `${parts.map((_, i) => `[a${i}]`).join('')}amix=inputs=${parts.length}:normalize=0[out]`;

  await execFileP('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex', `${filters};${mix}`,
    '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '4', out,
  ]);
  parts.forEach((p) => fs.unlink(p.file, () => {}));
  return out;
}

/**
 * 영상에 오디오를 얹는다. 영상은 **재인코딩하지 않는다**(-c:v copy) — 화질 손실도 시간 낭비도 없다.
 * @returns {Promise<string>} 합성된 mp4 경로
 */
async function muxAudio(videoPath, audioPath) {
  const out = videoPath.replace(/\.mp4$/i, '') + `_vo.mp4`;
  await execFileP('ffmpeg', [
    '-y', '-i', videoPath, '-i', audioPath,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-shortest',                                  // 나레이션이 영상보다 길면 잘라낸다
    out,
  ]);
  return out;
}

/**
 * 편의 함수 — 대사가 있으면 트랙을 만들어 합성하고, 없으면 원본을 그대로 돌려준다.
 * @returns {Promise<{videoPath:string, added:boolean, reason?:string}>}
 */
async function addVoiceover(videoPath, shots, opts = {}) {
  let track;
  try {
    track = await buildVoiceTrack(shots, opts);
  } catch (e) {
    log.warn(`TTS 실패, 무음으로 둔다: ${e.message}`);
    return { videoPath, added: false, reason: e.message };
  }
  if (!track) return { videoPath, added: false, reason: '대사 없음 또는 TTS 미설정' };

  try {
    const merged = await muxAudio(videoPath, track);
    fs.unlink(track, () => {});
    log.info(`나레이션 합성 완료: ${path.basename(merged)}`);
    return { videoPath: merged, added: true };
  } catch (e) {
    log.warn(`오디오 합성 실패, 무음 원본 유지: ${e.message}`);
    return { videoPath, added: false, reason: e.message };
  }
}

module.exports = { buildVoiceTrack, muxAudio, addVoiceover };
