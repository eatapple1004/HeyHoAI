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
const { activeTracks, aspectDims } = require('../renderPlan');
const tts = require('../audio/tts.service');
const music = require('../audio/music.service');
const { env } = require('../../config');

const execFileP = promisify(execFile);

const TARGET_W = 1080;
const TARGET_H = 1920;
const FPS = 30;

// 캔버스(W×H)에 맞춰 축소+레터박스, SAR 정규화 (비율 동적)
const fitFilter = (w, h) => `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${FPS}`;

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
async function makeSegment(item, workDir, idx, fit) {
  const local = await resolveToLocal(item.clipUrl, workDir, idx);
  const durSec = Math.max((item.durMs || 3000) / 1000, 1);
  const seg = path.join(workDir, `seg_${String(idx).padStart(3, '0')}.mp4`);
  const isImage = item.isStill || /\.(png|jpe?g|webp)$/i.test(local);

  const common = ['-vf', fit || fitFilter(TARGET_W, TARGET_H), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', durSec.toFixed(2), seg];
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

// 자막 위치/크기 축. ASS Alignment: 2=하중,5=중중,8=상중. 색상은 ASS BGR(&HAABBGGRR).
const SUB_POS = { bottom: { align: 2, mv: 240 }, middle: { align: 5, mv: 0 }, top: { align: 8, mv: 240 } };
const SUB_SIZE = { s: 56, m: 72, l: 92 };
const SUB_COLOR = { white: '&H00FFFFFF', yellow: '&H0000FFFF', black: '&H00000000', mint: '&H00D9F5C7' };

// 캡션 스타일 프리셋(2단계) — 폰트 영/한 페어(언어로 스왑) + 박스/아웃라인 + 색. BorderStyle 1=아웃라인·3=박스.
//   폰트는 prod 서버에 설치 필요(영문 OFL + 한글 Pretendard). 한글 영상은 ko 폰트(라틴도 포함).
const SUB_PRESETS = {
  clean:   { en: 'Inter',      ko: 'Pretendard', border: 1, outlineW: 4, primary: '&H00FFFFFF', outlineC: '&H00000000', backC: '&H00000000' }, // 흰 글씨+검정 아웃라인
  boldbox: { en: 'Montserrat', ko: 'Pretendard', border: 3, outlineW: 8, primary: '&H00000000', outlineC: '&H0000FFFF', backC: '&H0000FFFF' }, // 노랑 하이라이트 박스+검정 글씨
  impact:  { en: 'Anton',      ko: 'Pretendard', border: 1, outlineW: 7, primary: '&H00FFFFFF', outlineC: '&H00000000', backC: '&H00000000' }, // 굵은 흰 글씨+두꺼운 아웃라인
  soft:    { en: 'Nunito',     ko: 'Pretendard', border: 1, outlineW: 3, primary: '&H00F0F4FF', outlineC: '&H00604838', backC: '&H00000000' }, // 부드러운 크림+갈색 아웃라인
};

function buildAss(subtitle, w = TARGET_W, h = TARGET_H, style = {}) {
  const pos = SUB_POS[style.position] || SUB_POS.bottom;
  const size = SUB_SIZE[style.size] || SUB_SIZE.m;
  const lang = style.lang === 'en' ? 'en' : 'ko';
  let font, primary, outlineC, backC, border, outlineW;
  const preset = SUB_PRESETS[style.preset];
  if (preset) {
    font = preset[lang]; primary = preset.primary; outlineC = preset.outlineC; backC = preset.backC;
    border = preset.border; outlineW = preset.outlineW;
  } else { // 하위호환: 프리셋 없으면 기존 color 축(폰트=config 기본)
    font = env.UGC_SUBTITLE_FONT;
    primary = SUB_COLOR[style.color] || SUB_COLOR.white;
    outlineC = style.color === 'black' ? '&H00FFFFFF' : '&H00000000';
    backC = '&H00000000'; border = 1; outlineW = 4;
  }
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${w}`,
    `PlayResY: ${h}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // 폰트·색·박스/아웃라인 = 프리셋(언어별 폰트). 위치·크기는 별도 축. 굵게.
    `Style: Kinetic, ${font}, ${size}, ${primary}, ${outlineC}, ${backC}, 1, ${border}, ${outlineW}, 2, ${pos.align}, 80, 80, ${pos.mv}, 1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  // 자막 등장 애니메이션(4단계 옵션2): 자막=짧은 키워드가 등장. 음성과 독립(음성 타임스탬프 불필요).
  //   pop = 살짝 오버슈트하며 커지는 통통 등장(짧폼 감성). 기본(none) = 짧은 페이드.
  const anim = subtitleAnim(style.anim);
  const lines = (subtitle || []).map((c) => {
    const start = assTime(c.startMs);
    const end = assTime(c.startMs + c.durMs);
    return `Dialogue: 0,${start},${end},Kinetic,,0,0,0,,${anim}${escapeAss(c.text)}`;
  });
  return header.concat(lines).join('\n') + '\n';
}

// 자막 등장 태그(라인 시작 기준 상대 시간). pop=50%→110%(오버슈트)→100% 스케일 + 페이드.
function subtitleAnim(kind) {
  if (kind === 'pop') return '{\\fad(60,100)\\fscx55\\fscy55\\t(0,120,\\fscx110\\fscy110)\\t(120,200,\\fscx100\\fscy100)}';
  return '{\\fad(150,150)}';
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
 * @param {Array<{file:string, volume:number, delayMs?:number}>} audioInputs  workDir 상대 mp3들
 *        delayMs = 트랙 시작 지연(씬별 VO 세그먼트를 해당 씬 시각에 배치, F 싱크).
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
    const d = Math.round(a.delayMs || 0);
    const delay = d > 0 ? `adelay=${d}|${d},` : ''; // 스테레오 양 채널 지연
    filters.push(`[${i + 1}:a]volume=${a.volume},${delay}apad[${lbl}]`);
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
 * 씬별 VO 세그먼트 계획 — 각 렌더된 씬의 대사를 그 씬 시작 시각에 배치(F 싱크).
 *   음성 텍스트 = 그 씬 대사만(spoken 우선, 없으면 onScreenText) → 씬 카드에 보이는 회색 음성줄과 정확히 일치.
 *   hook/CTA는 음성으로 읽지 않음(화면에 없는 게 들리는 불일치 방지 — 유저 결정).
 * @returns {Array<{sceneN:number, text:string, startMs:number}>}
 */
function voSegments(script, plan) {
  const scenes = Array.isArray(script.scenes) ? script.scenes : [];
  const videoByScene = new Map((plan.tracks.video || []).map((v) => [v.sceneN, v]));
  const segs = [];
  for (const s of scenes) {
    if (!videoByScene.has(s.n)) continue; // 클립 있는 씬만(영상 순서)
    const text = (s.spoken || s.onScreenText || '').trim();
    if (text) segs.push({ sceneN: s.n, text, startMs: videoByScene.get(s.n).startMs });
  }
  return segs;
}

// ── 음성 주도 타임라인(1단계) ──────────────────────────────────────
const MIN_SCENE_MS = 1500; // 음성이 짧아도 씬 최소 길이(컷 안 튐)
const VO_TAIL_MS = 300;    // 음성 끝나고 살짝 여운

/** mp3/영상 길이(ms). ffprobe 실패 시 0. */
async function probeDurationMs(file) {
  try {
    const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    const sec = parseFloat(String(stdout).trim());
    return Number.isFinite(sec) ? Math.round(sec * 1000) : 0;
  } catch { return 0; }
}

/**
 * 씬별 VO 세그먼트를 생성(또는 캐시 복원)하고 각 길이를 측정 → [{sceneN, rel, durationMs}].
 * 음성 미요청/미설정이면 null. startMs는 retimeByVoice가 나중에 배정.
 */
async function synthVoSegments(opts, plan, workDir, log) {
  if (!(opts.audio && opts.audio.voice) || !opts.script) return null;
  const reuse = Array.isArray(opts.reuseVo) ? opts.reuseVo : null;
  const out = [];
  if (reuse && reuse.length) {
    for (let i = 0; i < reuse.length; i++) {
      const seg = reuse[i];
      if (!seg.path || !fs.existsSync(seg.path)) continue;
      const rel = `vo_${i}.mp3`;
      await fsp.copyFile(seg.path, path.join(workDir, rel));
      out.push({ sceneN: seg.sceneN, rel, durationMs: await probeDurationMs(path.join(workDir, rel)) });
    }
    if (out.length) log(`VO 캐시 재사용(${out.length}세그먼트, 재생성 안 함)`);
  } else if (tts.isConfigured()) {
    const info = voSegments(opts.script, plan);
    for (let i = 0; i < info.length; i++) {
      const rel = `vo_${i}.mp3`;
      try {
        const p = await tts.synthesize(info[i].text, { outPath: path.join(workDir, rel), voiceId: opts.audio.voiceId, speed: opts.audio.speed });
        if (p) out.push({ sceneN: info[i].sceneN, rel, durationMs: await probeDurationMs(p) });
      } catch (e) { log(`⚠️ VO 세그먼트 ${i} 실패, 스킵: ${e.message}`); }
    }
    if (out.length) log(`VO(음성) ${out.length}세그먼트 생성… [${tts.provider()}]`);
  } else { log('⚠️ VO 요청됨 — TTS 미설정(ELEVENLABS/OPENAI 키), 스킵'); }
  return out.length ? out : null;
}

/**
 * 음성 주도 retiming — 음성 있는 씬의 길이를 그 씬 음성 길이(+여운, 최소 클램프)로 재설정하고
 *   video·subtitle·meta.durationMs를 누적 재계산(plan을 직접 갱신). 음성 없는 씬은 기존 길이 유지.
 *   → 음성이 씬 경계 넘어 끊김 없이 이어지고(연속), 영상이 음성에 맞춰 흐름.
 *   sceneOpts[sceneN] = { leadInMs, tailMs }(3a): 씬 시작 후 음성 딜레이(lead-in) / 음성 끝 여백(tail).
 * @returns {object|null} voStartByScene(음성 있는 씬의 음성 시작 시각) — 없으면 null(retiming 안 함)
 */
function retimeByVoice(plan, voSegs, sceneOpts = {}) {
  if (!voSegs || !voSegs.length) return null; // 무음 영상은 기존 씬 길이 유지
  const voDur = {};
  voSegs.forEach((s) => { voDur[s.sceneN] = s.durationMs; });
  let cursor = 0;
  const voStart = {};
  for (const v of (plan.tracks.video || [])) {
    const d = voDur[v.sceneN];
    const opt = sceneOpts[v.sceneN] || {};
    const lead = d ? Math.max(0, Math.round(opt.leadInMs || 0)) : 0;             // 씬 시작 후 음성까지 여백
    const tail = d ? Math.max(VO_TAIL_MS, Math.round(opt.tailMs || 0)) : 0;       // 음성 끝 후 여운(기본 VO_TAIL_MS)
    const durMs = d ? Math.max(lead + d + tail, MIN_SCENE_MS) : v.durMs;
    v.startMs = cursor;
    v.durMs = durMs;
    if (d) voStart[v.sceneN] = cursor + lead; // 음성은 lead-in 후 시작
    cursor += durMs;
  }
  for (const s of (plan.tracks.subtitle || [])) {
    const v = (plan.tracks.video || []).find((x) => x.sceneN === s.sceneN);
    if (v) { s.startMs = v.startMs; s.durMs = v.durMs; }
  }
  plan.meta.durationMs = cursor;
  return voStart;
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

  // 비율 → 캔버스 치수(9:16·1:1·16:9). opts.aspect 우선, 없으면 plan.meta.aspect
  const dims = aspectDims(opts.aspect || (plan.meta && plan.meta.aspect) || '9:16');
  const CW = dims.w, CH = dims.h;
  const fit = fitFilter(CW, CH);

  // 0) 음성 주도(1단계): VO 먼저 생성·길이 측정 → 씬 타이밍을 음성 길이로 재계산(plan mutate).
  //    음성 있는 씬 = 그 음성 길이만큼(+여운, 최소 클램프) → 음성이 씬 넘어 끊김 없이 이어짐.
  //    음성 없으면 voStart=null이고 씬 길이는 기존 유지(무음 영상).
  const voSegsData = await synthVoSegments(opts, plan, workDir, log);
  const sceneOpts = {}; // 씬별 lead-in/tail(3a) — 대본 씬 필드에서 추출
  ((opts.script && opts.script.scenes) || []).forEach((s) => { sceneOpts[s.n] = { leadInMs: s.leadInMs, tailMs: s.tailMs }; });
  const voStart = retimeByVoice(plan, voSegsData, sceneOpts);
  // clips는 plan.tracks.video와 동일 참조라 retiming(durMs) 자동 반영됨.

  // 1) 클립별 세그먼트 정규화
  log(`세그먼트 정규화 ${clips.length}개… (${CW}x${CH})`);
  const segments = [];
  for (let i = 0; i < clips.length; i++) {
    segments.push(await makeSegment(clips[i], workDir, i, fit));
  }

  // 2) concat (동일 코덱이라 stream copy)
  const listPath = path.join(workDir, 'concat.txt');
  await fsp.writeFile(listPath, segments.map((s) => `file '${path.basename(s)}'`).join('\n') + '\n');
  const concatPath = path.join(workDir, 'concat.mp4');
  await ff(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'concat.mp4'], workDir);

  const active = activeTracks(plan);

  // 3) 자막: 필터 있으면 번인, 없으면(최소 ffmpeg 빌드) 사이드카(.srt/.ass) + 무음영상
  //    subtitleStyle.off=true면 자막 트랙 무시(자막 없는 버전 — 음성/음악만).
  const captionsOff = !!(opts.subtitleStyle && opts.subtitleStyle.off);
  const subtitle = captionsOff ? [] : (plan.tracks.subtitle || []);
  const finalPath = path.join(workDir, 'final.mp4');
  let subtitleMode = 'none';
  let subtitleFile = null;

  if (subtitle.length) {
    const filter = await detectTextFilter();
    // 사이드카는 항상 기록(디버그/외부 조립기용)
    const subStyle = { ...(opts.subtitleStyle || {}), lang: (opts.script && opts.script.language) || (plan.meta && plan.meta.language) || 'ko' };
    await fsp.writeFile(path.join(workDir, 'subs.ass'), buildAss(subtitle, CW, CH, subStyle));
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
  //    opts.reuseVo / opts.reuseMusic = 캐시된 mp3 절대경로 → 있으면 재생성 대신 재사용(무과금·톤 고정).
  //    반환 audioAssets = 이번에 사용/생성한 vo·music 로컬 경로(호출부가 영속화).
  let videoOut = finalPath;
  const audioTracks = [];
  const durSec = Math.max((plan.meta.durationMs || 0) / 1000, 1);
  const wantVoice = !!(opts.audio && opts.audio.voice);
  const wantMusic = !!(opts.audio && opts.audio.music);
  const audioInputs = [];
  let voSegsOut = null, musicPath = null; // voSegsOut = [{sceneN, rel, durationMs}] (0단계 생성분)

  // VO: 0단계에서 이미 생성·측정·retiming됨 → 여기선 retimed 시작 시각(voStart)에 배치만.
  if (wantVoice && voSegsData) {
    voSegsOut = voSegsData;
    voSegsOut.forEach((seg) => audioInputs.push({ file: seg.rel, volume: 1.0, kind: 'vo', delayMs: (voStart && voStart[seg.sceneN]) || 0 }));
  }

  if (wantMusic) {
    if (opts.reuseMusic && fs.existsSync(opts.reuseMusic)) {
      musicPath = path.join(workDir, 'music.mp3');
      await fsp.copyFile(opts.reuseMusic, musicPath);
      audioInputs.push({ file: 'music.mp3', volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' });
      log('배경음악 캐시 재사용(재생성 안 함)');
    } else if (music.isConfigured()) {
      try {
        log('배경음악 생성… [elevenlabs music]');
        const m = await music.composeForScript(opts.script || {}, { durationMs: plan.meta.durationMs, outPath: path.join(workDir, 'music.mp3') });
        // VO 있으면 더킹(0.18), 없으면 배경 단독(0.5)
        if (m) { musicPath = m; audioInputs.push({ file: 'music.mp3', volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' }); }
      } catch (e) { log(`⚠️ 음악 실패, 스킵: ${e.message}`); }
    } else { log('⚠️ 음악 요청됨 — ELEVENLABS_API_KEY 미설정, 스킵'); }
  }

  if (audioInputs.length) {
    videoOut = await muxAudio('final.mp4', audioInputs, durSec, workDir, 'final_audio.mp4');
    audioInputs.forEach((a) => { audioTracks.push(a.kind); active.push(a.kind); });
    log(`오디오 믹싱 완료(${audioTracks.join('+')})`);
  }

  log(`조립 완료: ${videoOut}`);
  const voAssets = voSegsOut ? voSegsOut.map((s) => ({ sceneN: s.sceneN, path: path.join(workDir, s.rel), startMs: (voStart && voStart[s.sceneN]) || 0 })) : null;
  return { videoPath: videoOut, workDir, activeTracks: active, segments: segments.length, subtitleMode, subtitleFile, audioTracks, audioAssets: { vo: voAssets, music: musicPath } };
}

module.exports = { assemble, muxAudio, buildAss, buildSrt, voSegments, retimeByVoice, TARGET_W, TARGET_H, FPS };
