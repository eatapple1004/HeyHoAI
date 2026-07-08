/**
 * assembler/ffmpeg.assembler.js — RenderPlan → 최종 mp4 (v1: video + subtitle, 무음)
 * ============================================================================
 * 트랙 스택에서 채워진 트랙만 합성한다. v1은:
 *   video    → 각 클립을 9:16(1080x1920) 무음 세그먼트로 정규화 후 concat
 *   subtitle → onScreenText를 ASS 자막으로 번인
 *   music/vo/presenter → 미배선(있어도 무시). 후속 버전에서 트랙 추가.
 *
 * ffmpeg 필요(로컬 설치 확인됨). Kling http 클립은 받아서 로컬화, nanoBanana file:// 및
 * dry-run 정지 이미지도 처리.
 */
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { activeTracks } = require('../renderPlan');
const tts = require('../audio/tts.service');
const music = require('../audio/music.service');

const execFileP = promisify(execFile);

const TARGET_W = 1080;
const TARGET_H = 1920;
const FPS = 30;

// 9:16 캔버스에 맞춰 축소+레터박스, SAR 정규화
const FIT_916 = `scale=${TARGET_W}:${TARGET_H}:force_original_aspect_ratio=decrease,pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${FPS}`;

async function ff(args, cwd) {
  try {
    await execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    throw new Error(`ffmpeg failed: ${(err.stderr || err.message || '').toString().slice(0, 400)}`);
  }
}

// 자막 번인 가능 필터 탐지(libass/libfreetype). 최소 빌드엔 없으므로 사이드카로 폴백.
let _textFilter; // undefined=미탐지, null=없음, 'subtitles'|'ass'=사용필터
async function detectTextFilter() {
  if (_textFilter !== undefined) return _textFilter;
  try {
    const { stdout } = await execFileP('ffmpeg', ['-hide_banner', '-filters'], { maxBuffer: 8 * 1024 * 1024 });
    _textFilter = /(^|\s)subtitles\s/m.test(stdout) ? 'subtitles'
      : /(^|\s)ass\s/m.test(stdout) ? 'ass' : null;
  } catch { _textFilter = null; }
  return _textFilter;
}

/** clipUrl(file://, http(s)://, 로컬경로) → 로컬 파일 경로 */
async function resolveToLocal(clipUrl, workDir, idx) {
  if (clipUrl.startsWith('file://')) return clipUrl.replace('file://', '');
  if (/^https?:\/\//i.test(clipUrl)) {
    const res = await fetch(clipUrl);
    if (!res.ok) throw new Error(`download failed (${res.status}) ${clipUrl}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = clipUrl.split('?')[0].split('.').pop().slice(0, 4) || 'mp4';
    const p = path.join(workDir, `dl_${idx}.${ext}`);
    await fsp.writeFile(p, buf);
    return p;
  }
  return clipUrl; // 이미 로컬 경로
}

/** 단일 클립(영상 또는 정지 이미지) → 정규화된 무음 세그먼트 mp4 */
async function makeSegment(item, workDir, idx) {
  const local = await resolveToLocal(item.clipUrl, workDir, idx);
  const durSec = Math.max((item.durMs || 3000) / 1000, 1);
  const seg = path.join(workDir, `seg_${String(idx).padStart(3, '0')}.mp4`);
  const isImage = item.isStill || /\.(png|jpe?g|webp)$/i.test(local);

  const common = ['-vf', FIT_916, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', durSec.toFixed(2), seg];
  if (isImage) {
    await ff(['-loop', '1', '-i', local, ...common], workDir);
  } else {
    await ff(['-i', local, ...common], workDir);
  }
  return seg;
}

// ── ASS 자막 ──
function assTime(ms) {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

function escapeAss(text) {
  return String(text).replace(/\n/g, '\\N').replace(/[{}]/g, '');
}

function buildAss(subtitle) {
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${TARGET_W}`,
    `PlayResY: ${TARGET_H}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // 하단 중앙(Alignment 2), 흰 글자 + 검은 아웃라인, 굵게
    'Style: Kinetic, Arial, 72, &H00FFFFFF, &H00000000, &H00000000, 1, 1, 4, 2, 2, 80, 80, 240, 1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const lines = (subtitle || []).map((c) => {
    const start = assTime(c.startMs);
    const end = assTime(c.startMs + c.durMs);
    // 간단 키네틱: 짧은 페이드 인/아웃
    return `Dialogue: 0,${start},${end},Kinetic,,0,0,0,,{\\fad(150,150)}${escapeAss(c.text)}`;
  });
  return header.concat(lines).join('\n') + '\n';
}

// SRT 사이드카(번인 불가 환경 폴백 — 범용 포맷)
function srtTime(ms) {
  const t = Math.max(ms, 0);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const mm = t % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mm).padStart(3, '0')}`;
}
function buildSrt(subtitle) {
  return (subtitle || []).map((c, i) =>
    `${i + 1}\n${srtTime(c.startMs)} --> ${srtTime(c.startMs + c.durMs)}\n${c.text}\n`
  ).join('\n');
}

/**
 * 무음 영상에 오디오 트랙(들)을 믹싱해 최종 mp4 산출.
 * 각 입력은 volume 적용 후 apad(무음 패딩)되어 amix, -t 로 영상 길이에 맞춰 잘림.
 * → VO는 재생 후 무음, 음악은 전 구간(더킹된 볼륨)으로 깔림.
 * @param {string} videoIn  무음 영상(workDir 상대 경로)
 * @param {Array<{file:string, volume:number}>} audioInputs  workDir 상대 mp3들
 * @param {number} durSec  최종 길이(=영상 길이)
 * @returns {Promise<string>} 믹싱된 영상 절대 경로
 */
async function muxAudio(videoIn, audioInputs, durSec, workDir, outName) {
  const inputs = ['-i', videoIn];
  const filters = [];
  const labels = [];
  audioInputs.forEach((a, i) => {
    inputs.push('-i', a.file);
    const lbl = `a${i}`;
    filters.push(`[${i + 1}:a]volume=${a.volume},apad[${lbl}]`);
    labels.push(`[${lbl}]`);
  });

  let filter;
  if (audioInputs.length === 1) {
    filter = filters[0].replace(/\[a0\]$/, '[mix]'); // 단일 입력: amix 불필요
  } else {
    filter = filters.join(';') + ';' + labels.join('')
      + `amix=inputs=${audioInputs.length}:normalize=0:duration=longest[mix]`;
  }

  await ff([
    ...inputs, '-filter_complex', filter,
    '-map', '0:v', '-map', '[mix]',
    '-t', durSec.toFixed(2), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', outName,
  ], workDir);
  return path.join(workDir, outName);
}

/**
 * RenderPlan → 최종 mp4.
 * @param {object} plan  renderPlan.buildRenderPlan 산출
 * @param {{ outDir?:string, log?:Function }} [opts]
 * @returns {Promise<{ videoPath:string, workDir:string, activeTracks:string[], segments:number }>}
 */
async function assemble(plan, opts = {}) {
  const log = opts.log || (() => {});
  const clips = (plan.tracks.video || []).filter((c) => c.clipUrl);
  if (!clips.length) throw new Error('no video clips in plan');

  const runId = crypto.randomUUID().slice(0, 8);
  const workDir = opts.outDir || path.join(process.cwd(), 'tmp', 'ugc', runId);
  await fsp.mkdir(workDir, { recursive: true });

  // 1) 클립별 세그먼트 정규화
  log(`세그먼트 정규화 ${clips.length}개…`);
  const segments = [];
  for (let i = 0; i < clips.length; i++) {
    segments.push(await makeSegment(clips[i], workDir, i));
  }

  // 2) concat (동일 코덱이라 stream copy)
  const listPath = path.join(workDir, 'concat.txt');
  await fsp.writeFile(listPath, segments.map((s) => `file '${path.basename(s)}'`).join('\n') + '\n');
  const concatPath = path.join(workDir, 'concat.mp4');
  await ff(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'concat.mp4'], workDir);

  const active = activeTracks(plan);

  // 3) 자막: 필터 있으면 번인, 없으면(최소 ffmpeg 빌드) 사이드카(.srt/.ass) + 무음영상
  const subtitle = plan.tracks.subtitle || [];
  const finalPath = path.join(workDir, 'final.mp4');
  let subtitleMode = 'none';
  let subtitleFile = null;

  if (subtitle.length) {
    const filter = await detectTextFilter();
    // 사이드카는 항상 기록(디버그/외부 조립기용)
    await fsp.writeFile(path.join(workDir, 'subs.ass'), buildAss(subtitle));
    await fsp.writeFile(path.join(workDir, 'subs.srt'), buildSrt(subtitle));

    if (filter) {
      log(`자막 ${subtitle.length}개 번인(${filter})…`);
      await ff(['-i', 'concat.mp4', '-vf', `${filter}=subs.ass`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', 'final.mp4'], workDir);
      subtitleMode = 'burned';
    } else {
      log(`⚠️ 로컬 ffmpeg에 자막필터(libass) 없음 → 무음영상 + 자막 사이드카(subs.srt). libass 빌드/prod에선 자동 번인.`);
      await fsp.copyFile(concatPath, finalPath);
      subtitleMode = 'sidecar';
      subtitleFile = path.join(workDir, 'subs.srt');
    }
  } else {
    await fsp.copyFile(concatPath, finalPath);
  }

  // 4) 오디오 트랙 — opts.audio 요청 시 무음 final에 믹싱(v3 음성 VO + v2 음악)
  //    VO=ElevenLabs/OpenAI TTS, 음악=ElevenLabs Music. 둘 다 있으면 음악을 더킹해 VO 밑에 깖.
  let videoOut = finalPath;
  const audioTracks = [];
  const durSec = Math.max((plan.meta.durationMs || 0) / 1000, 1);
  const wantVoice = !!(opts.audio && opts.audio.voice);
  const wantMusic = !!(opts.audio && opts.audio.music);
  const audioInputs = [];

  if (wantVoice && opts.script) {
    if (tts.isConfigured()) {
      try {
        log(`VO(음성) 생성… [${tts.provider()}]`);
        const vo = await tts.voiceoverForScript(opts.script, { outPath: path.join(workDir, 'vo.mp3') });
        if (vo) audioInputs.push({ file: 'vo.mp3', volume: 1.0, kind: 'vo' });
      } catch (e) { log(`⚠️ VO 실패, 스킵: ${e.message}`); }
    } else { log('⚠️ VO 요청됨 — TTS 미설정(ELEVENLABS/OPENAI 키), 스킵'); }
  }

  if (wantMusic) {
    if (music.isConfigured()) {
      try {
        log('배경음악 생성… [elevenlabs music]');
        const m = await music.composeForScript(opts.script || {}, { durationMs: plan.meta.durationMs, outPath: path.join(workDir, 'music.mp3') });
        // VO 있으면 더킹(0.18), 없으면 배경 단독(0.5)
        if (m) audioInputs.push({ file: 'music.mp3', volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' });
      } catch (e) { log(`⚠️ 음악 실패, 스킵: ${e.message}`); }
    } else { log('⚠️ 음악 요청됨 — ELEVENLABS_API_KEY 미설정, 스킵'); }
  }

  if (audioInputs.length) {
    videoOut = await muxAudio('final.mp4', audioInputs, durSec, workDir, 'final_audio.mp4');
    audioInputs.forEach((a) => { audioTracks.push(a.kind); active.push(a.kind); });
    log(`오디오 믹싱 완료(${audioTracks.join('+')})`);
  }

  log(`조립 완료: ${videoOut}`);
  return { videoPath: videoOut, workDir, activeTracks: active, segments: segments.length, subtitleMode, subtitleFile, audioTracks };
}

module.exports = { assemble, muxAudio, buildAss, buildSrt, TARGET_W, TARGET_H, FPS };
