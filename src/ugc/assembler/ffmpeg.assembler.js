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
const { chunkCaption } = require('./captionChunk');

// 음성 자막(A+) 청킹 — 씬 자막(sceneN 有, id 無)의 통문장을 짧은 청크로 확장. 자유 자막(id 有)은 그대로.
//   ⚠️ 클라 프리뷰 오버레이(studio.html ugcChunkCaption)와 동일 로직 → 미리보기 == 번인.
//   저장되는 caption.timings는 씬 단위 그대로(여기선 번인 시점의 로컬 확장만).
function expandCaptionChunks(subtitle) {
  const out = [];
  for (const c of (subtitle || [])) {
    const isScene = c && c.sceneN != null && c.id == null;
    const text = c && c.text != null ? String(c.text).trim() : '';
    if (isScene && text && !c.chunked) { // c.chunked = B 실 타임스탬프 청크(이미 청크) → 재청킹 안 함. 그 외 씬 통문장만 균등 청킹.
      for (const ch of chunkCaption(text, c.startMs, c.durMs)) {
        out.push({ text: ch.text, startMs: ch.startMs, durMs: ch.durMs, style: c.style, sceneN: c.sceneN });
      }
    } else {
      out.push(c);
    }
  }
  return out;
}
const { env } = require('../../config');

const execFileP = promisify(execFile);

const TARGET_W = 1080;
const TARGET_H = 1920;
const FPS = 30;
// 단일 ffmpeg 작업(세그먼트·concat·mux·번인) 상한. 멈춘 ffmpeg가 안 죽고 쌓여 서버를 잠식하던 문제 방지.
//   짧은 광고 클립 한 작업은 보통 수초~1분이라 6분은 정상 작업엔 절대 안 걸리는 넉넉한 상한. 초과 시 SIGKILL로 강제 종료.
const FF_TIMEOUT_MS = 6 * 60 * 1000;

// 캔버스(W×H)에 맞춰 축소+레터박스, SAR 정규화 (비율 동적)
const fitFilter = (w, h) => `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${FPS}`;

async function ff(args, cwd) {
  try {
    await execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { cwd, maxBuffer: 64 * 1024 * 1024, timeout: FF_TIMEOUT_MS, killSignal: 'SIGKILL' });
  } catch (err) {
    // 신호 종료(OOM 등)는 stderr가 비어 원인이 안 보이므로 명시. stderr 우선, 없으면 message.
    const sig = (err.killed || err.signal) ? ` [killed${err.signal ? ' ' + err.signal : ''}]` : '';
    const detail = ((err.stderr || '').toString().trim()) || (err.message || '').toString();
    throw new Error(`ffmpeg failed${sig}: ${detail.slice(0, 400)}`);
  }
}

// 자막 번인 가능 필터 탐지(libass/libfreetype). 최소 빌드엔 없으므로 사이드카로 폴백.
let _textFilter; // undefined=미탐지, null=없음, 'subtitles'|'ass'=사용필터
async function detectTextFilter() {
  if (_textFilter !== undefined) return _textFilter;
  try {
    const { stdout } = await execFileP('ffmpeg', ['-hide_banner', '-filters'], { maxBuffer: 8 * 1024 * 1024, timeout: 30000, killSignal: 'SIGKILL' });
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

/** 단일 클립(영상 또는 정지 이미지) → 정규화된 무음 세그먼트 mp4.
 *  동영상 정규화가 실패(비영속 tmp 클립 유실·불완전 다운로드·OOM 등)하면 씬 썸네일 정지컷으로
 *  폴백해 재조립 전체가 죽지 않게 한다(특히 무과금 자막편집이 깨진 한 클립에 막히면 안 됨).
 *  폴백 소스(썸네일)도 없을 때만 명확한 에러로 실패. */
async function makeSegment(item, workDir, idx, fit, log = () => {}) {
  const durSec = Math.max((item.durMs || 3000) / 1000, 1);
  const seg = path.join(workDir, `seg_${String(idx).padStart(3, '0')}.mp4`);
  const vf = fit || fitFilter(TARGET_W, TARGET_H);
  const tail = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', durSec.toFixed(2), seg];
  const stillFrom = (img) => ff(['-loop', '1', '-i', img, '-vf', vf, '-an', ...tail], workDir);
  const sceneLabel = item.sceneN != null ? item.sceneN : idx + 1;

  const local = await resolveToLocal(item.clipUrl, workDir, idx);
  const isImage = item.isStill || /\.(png|jpe?g|webp)$/i.test(local);
  if (isImage) { await stillFrom(local); return seg; }

  try {
    let sz = -1; try { sz = (await fsp.stat(local)).size; } catch { /* 없으면 아래 ffmpeg가 실패 */ }
    if (sz >= 0 && sz < 1024) throw new Error(`source clip truncated/empty (${sz}B)`); // 잘린/0바이트 다운로드 조기 감지
    await ff(['-i', local, '-vf', vf, '-an', ...tail], workDir);
    return seg;
  } catch (err) {
    let thumb = null;
    if (item.imageUrl) { try { thumb = await resolveToLocal(item.imageUrl, workDir, `t${idx}`); } catch { thumb = null; } }
    if (thumb && fs.existsSync(thumb)) {
      log(`⚠️ 씬 ${sceneLabel} 클립 정규화 실패 → 썸네일 정지컷으로 대체 (${err.message})`);
      await stillFrom(thumb);
      return seg;
    }
    throw new Error(`scene ${sceneLabel} clip unavailable (no still fallback): ${err.message}`);
  }
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
    'WrapStyle: 2', // 자동 줄바꿈 끔 — 사용자가 넣은 수동 줄바꿈(\N)만. escapeAss가 \n→\N 변환(미리보기 white-space:pre와 일치).
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
  // 자유 위치(드래그) — posX/posY(%, 중앙 앵커)면 \an5\pos(x,y)로 임의 위치. 미리보기 오버레이(translate(-50%,-50%))와 좌표 규칙 일치.
  const custom = typeof style.posX === 'number' && typeof style.posY === 'number';
  const posTag = custom ? `{\\an5\\pos(${Math.round(style.posX / 100 * w)},${Math.round(style.posY / 100 * h)})}` : '';
  const lines = expandCaptionChunks(subtitle).map((c) => {
    const start = assTime(c.startMs);
    const end = assTime(c.startMs + c.durMs);
    return `Dialogue: 0,${start},${end},Kinetic,,0,0,0,,${posTag}${anim}${escapeAss(c.text)}`;
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
  return expandCaptionChunks(subtitle).map((c, i) =>
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
    // 음악은 영상 길이만큼 aloop로 반복(짧은 음악이 뒤에서 무음되는 것 방지 — 클라 미리보기 loop=true와 일치).
    //   VO는 apad(한 번 재생 후 무음) 유지. -t durSec가 최종적으로 영상 길이에 맞춰 트림.
    const parts = [];
    if (a.kind === 'music') parts.push('aloop=loop=-1:size=2147483647'); // 전 구간 반복
    parts.push(`volume=${a.volume}`);
    if (d > 0) parts.push(`adelay=${d}|${d}`); // 스테레오 양 채널 지연
    if (a.kind !== 'music') parts.push('apad'); // 무음 패딩(VO 등)
    filters.push(`[${i + 1}:a]${parts.join(',')}[${lbl}]`);
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
    const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { timeout: 30000, killSignal: 'SIGKILL' });
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
 * 통 나레이션(단일 음성 트랙) 생성/재사용 — 영상 전체에 하나의 음성. 씬별 세그먼트 아님(유저 결정).
 *   영상 길이는 씬 고정 길이 그대로 → 음성이 길이를 좌우하지 않음. 음성 편집 = 이 트랙만 교체(재타이밍 0).
 *   반환은 기존 세그먼트 배열 shape 유지(요소 1개, sceneN:0, startMs:0) → 캐싱·믹싱 하류 코드 재사용.
 * @returns {Array<{sceneN:0, rel:string, durationMs:number}>|null}
 */
async function synthNarration(opts, workDir, log) {
  if (!(opts.audio && opts.audio.voice) || !opts.script) return null;
  // 나레이션 텍스트 = 전용 필드(narration, V2 나레이션 편집기) 우선, 없으면 씬 대사를 이어 읽기.
  const text = (opts.script.narration && String(opts.script.narration).trim())
    || ((opts.script.scenes) || []).map((s) => (s.spoken || s.onScreenText || '').trim()).filter(Boolean).join(' ');
  if (!text) return null;
  const rel = 'vo_0.mp3';
  const reuse = Array.isArray(opts.reuseVo) ? opts.reuseVo : null;
  // 단일 세그먼트일 때만 재사용(=신 통나레이션 캐시). 옛 잡의 씬별 다중 세그먼트는 재사용하면 첫 씬만
  //   들어가므로 통 나레이션으로 재생성한다.
  if (reuse && reuse.length === 1 && reuse[0].path && fs.existsSync(reuse[0].path)) {
    await fsp.copyFile(reuse[0].path, path.join(workDir, rel));
    log('VO 캐시 재사용(통 나레이션, 재생성 안 함)');
    return [{ sceneN: 0, rel, durationMs: await probeDurationMs(path.join(workDir, rel)) }];
  }
  if (!tts.isConfigured()) { log('⚠️ VO 요청됨 — TTS 미설정(ELEVENLABS/OPENAI 키), 스킵'); return null; }
  try {
    const p = await tts.synthesize(text, { outPath: path.join(workDir, rel), voiceId: opts.audio.voiceId, speed: opts.audio.speed });
    if (!p) return null;
    log(`VO(통 나레이션) 생성… [${tts.provider()}]`);
    return [{ sceneN: 0, rel, durationMs: await probeDurationMs(p) }];
  } catch (e) { log(`⚠️ VO 실패, 스킵: ${e.message}`); return null; }
}

/**
 * 씬 타이밍 재계산 — **음성-주도(옵션B, 음성/비디오/자막 싱크)**.
 *   음성 있는 씬 = 그 씬 음성 길이(+lead-in/tail, 최소 클램프 MIN_SCENE_MS)만큼 지속 → 음성이 씬 경계 넘어
 *   끊김 없이 이어지고(연속), 비디오·자막이 음성에 정확히 정렬. 영상 총 길이는 음성 따라 가변(예측성↔싱크 트레이드오프에서 싱크 택함).
 *   video·subtitle·meta.durationMs를 누적 재계산(plan 직접 갱신). 음성 없는 씬·무음 영상은 기존 고정 길이 유지.
 *   sceneOpts[sceneN] = { leadInMs, tailMs }(3a): 음성 시작 딜레이 / 음성 끝 여백.
 * @returns {object|null} voStartByScene(음성 있는 씬의 음성 시작 시각) — 없으면 null
 */
function retimeByVoice(plan, voSegs, sceneOpts = {}) {
  if (!voSegs || !voSegs.length) return null; // 무음 영상은 고정 길이 유지
  const voDur = {};
  voSegs.forEach((s) => { voDur[s.sceneN] = s.durationMs; });
  let cursor = 0;
  const voStart = {};
  for (const v of (plan.tracks.video || [])) {
    const d = voDur[v.sceneN];
    const opt = sceneOpts[v.sceneN] || {};
    const lead = d ? Math.max(0, Math.round(opt.leadInMs || 0)) : 0;             // 씬 시작 후 음성까지 여백
    const tail = d ? Math.max(VO_TAIL_MS, Math.round(opt.tailMs || 0)) : 0;       // 음성 끝 후 여운(기본 VO_TAIL_MS)
    const durMs = d ? Math.max(lead + d + tail, MIN_SCENE_MS) : v.durMs;     // 음성 있는 씬 = 음성 길이(+여운, 최소 클램프)만큼 → 연속 음성·씬 단위 정확 싱크. 음성 없으면 기존 고정 길이.
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
 * 베이스 영상(영상+음성, 자막 없음) 위에 자막만 1패스 번인 → 최종 mp4. 오디오는 copy로 유지.
 *   B+ 자막 굽기의 핵심: 자막 편집 시 클립/음성 재작업 0, 이 함수만 재실행하면 됨(빠르고 실패지점 1개).
 *   libass 없으면 사이드카 폴백(베이스 그대로 + subs.srt). subtitle 비면 베이스=최종.
 * @param {{ basePath:string, subtitle:Array, style:object, w:number, h:number, workDir:string, hasAudio?:boolean, log?:Function }} p
 */
async function burnCaptions({ basePath, subtitle, style, w, h, workDir, hasAudio = true, log = () => {} }) {
  const finalPath = path.join(workDir, 'final.mp4');
  if (!subtitle || !subtitle.length) { await fsp.copyFile(basePath, finalPath); return { videoPath: finalPath, subtitleMode: 'none', subtitleFile: null }; }
  const filter = await detectTextFilter();
  await fsp.writeFile(path.join(workDir, 'subs.ass'), buildAss(subtitle, w, h, style));
  await fsp.writeFile(path.join(workDir, 'subs.srt'), buildSrt(subtitle));
  if (filter) {
    log(`자막 ${subtitle.length}개 번인(${filter})…`);
    const aArgs = hasAudio ? ['-c:a', 'copy'] : ['-an'];
    // basePath는 절대경로(assemble의 workDir 내부거나, 재합성 시 다른 곳의 복원 베이스) — 둘 다 -i 절대경로로 안전.
    await ff(['-i', basePath, '-vf', `${filter}=subs.ass`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', ...aArgs, 'final.mp4'], workDir);
    return { videoPath: finalPath, subtitleMode: 'burned', subtitleFile: null };
  }
  log('⚠️ libass 없음 → 자막 사이드카(subs.srt), 베이스 그대로(prod libass에선 자동 번인).');
  await fsp.copyFile(basePath, finalPath);
  return { videoPath: finalPath, subtitleMode: 'sidecar', subtitleFile: path.join(workDir, 'subs.srt') };
}

/**
 * RenderPlan → 최종 mp4 + 자막 없는 베이스.
 * @param {object} plan  renderPlan.buildRenderPlan 산출
 * @param {{ outDir?:string, log?:Function }} [opts]
 * @returns {Promise<{ videoPath:string, basePath:string, caption:object, workDir:string, activeTracks:string[], segments:number }>}
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

  // 0) 음성-주도 타이밍(옵션B, 예전 방식 복원): 씬별 VO 먼저 생성·길이 측정 → 씬 타이밍을 음성 길이로 재계산(plan mutate).
  //    각 음성 있는 씬 = 그 음성 길이(+여운, 최소 클램프)만큼 지속 → 음성·비디오·자막이 씬 단위로 정확히 정렬(연속 음성).
  //    clips는 plan.tracks.video 동일 참조라 retiming(durMs) 자동 반영. 음성 없으면 voStart=null·기존 길이(무음).
  const voSegsData = await synthVoSegments(opts, plan, workDir, log);
  const sceneOpts = {}; ((opts.script && opts.script.scenes) || []).forEach((s) => { sceneOpts[s.n] = { leadInMs: s.leadInMs, tailMs: s.tailMs }; });
  const voStart = retimeByVoice(plan, voSegsData, sceneOpts); // 씬별 음성 시작 시각 map(없으면 null)

  // B: 실 타임스탬프 청크가 있으면 자막 트랙을 청크 단위(실 발화 타이밍)로 교체. 청크 상대시각 → voStart(씬 음성시작) 기준 절대시각.
  //    청크 없는 씬은 기존 씬 엔트리 유지(균등 청킹 폴백). chunked:true 플래그로 하류(번인·오버레이)가 재청킹 안 함.
  if (opts.voiceChunks && voStart) {
    const newSub = [];
    for (const s of (plan.tracks.subtitle || [])) {
      const cks = opts.voiceChunks[s.sceneN];
      if (cks && cks.length) {
        const vid = plan.tracks.video.find((v) => v.sceneN === s.sceneN);
        const base = (voStart[s.sceneN] != null) ? voStart[s.sceneN] : (vid ? vid.startMs : s.startMs);
        for (const c of cks) newSub.push({ text: c.text, startMs: base + c.startMs, durMs: c.durMs, style: s.style, sceneN: s.sceneN, chunked: true });
      } else { newSub.push(s); }
    }
    plan.tracks.subtitle = newSub;
  }

  // 1) 클립별 세그먼트 정규화
  log(`세그먼트 정규화 ${clips.length}개… (${CW}x${CH})`);
  const segments = [];
  for (let i = 0; i < clips.length; i++) {
    segments.push(await makeSegment(clips[i], workDir, i, fit, log));
  }

  // 2) concat (동일 코덱이라 stream copy)
  const listPath = path.join(workDir, 'concat.txt');
  await fsp.writeFile(listPath, segments.map((s) => `file '${path.basename(s)}'`).join('\n') + '\n');
  const concatPath = path.join(workDir, 'concat.mp4');
  await ff(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'concat.mp4'], workDir);

  const active = activeTracks(plan);
  const durSec = Math.max((plan.meta.durationMs || 0) / 1000, 1);

  // 3) 오디오(VO+음악)를 무자막 concat에 먼저 믹싱 → "베이스"(영상+음성, 자막 없음).
  //    자막은 4)에서 베이스 위에 얹는다 → 편집 시 이 베이스에 자막만 1패스 재번인(클립/음성 재작업 0).
  //    opts.reuseVo/reuseMusic = 캐시된 mp3 → 있으면 재생성 대신 재사용. 반환 audioAssets = 사용/생성 경로.
  const audioTracks = [];
  const audioInputs = [];
  let voSegsOut = null, musicPath = null; // voSegsOut = [{sceneN, rel, durationMs}] (0단계 생성분)
  const wantVoice = !!(opts.audio && opts.audio.voice);
  const wantMusic = !!(opts.audio && opts.audio.music);

  if (wantVoice && voSegsData) {
    voSegsOut = voSegsData;
    voSegsOut.forEach((seg) => audioInputs.push({ file: seg.rel, volume: 1.0, kind: 'vo', delayMs: (voStart && voStart[seg.sceneN]) || 0 })); // 씬별 VO를 그 씬 시작(lead-in) 시각에 배치=싱크
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
        if (m) { musicPath = m; audioInputs.push({ file: 'music.mp3', volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' }); } // VO 있으면 더킹(0.18)
      } catch (e) { log(`⚠️ 음악 실패, 스킵: ${e.message}`); }
    } else { log('⚠️ 음악 요청됨 — ELEVENLABS_API_KEY 미설정, 스킵'); }
  }

  let basePath = concatPath;
  const hasAudio = audioInputs.length > 0;
  if (hasAudio) {
    basePath = await muxAudio('concat.mp4', audioInputs, durSec, workDir, 'base.mp4');
    audioInputs.forEach((a) => { audioTracks.push(a.kind); active.push(a.kind); });
    log(`오디오 믹싱(${audioTracks.join('+')}) → 베이스`);
  }

  // 4) 자막을 베이스 위에 번인 → 최종본. subtitleStyle.off면 자막 없이 베이스=최종.
  //    caption 스펙(자막 타이밍·스타일·치수)은 항상 반환 → 오버레이 미리보기 + 1패스 재번인에 사용.
  const captionsOff = !!(opts.subtitleStyle && opts.subtitleStyle.off);
  const subtitle = captionsOff ? [] : (plan.tracks.subtitle || []);
  const subStyle = { ...(opts.subtitleStyle || {}), lang: (opts.script && opts.script.language) || (plan.meta && plan.meta.language) || 'ko' };
  const burned = await burnCaptions({ basePath, subtitle, style: subStyle, w: CW, h: CH, workDir, hasAudio, log });

  log(`조립 완료: ${burned.videoPath}`);
  const voAssets = voSegsOut ? voSegsOut.map((s) => ({ sceneN: s.sceneN, path: path.join(workDir, s.rel), startMs: (voStart && voStart[s.sceneN]) || 0 })) : null;
  return {
    videoPath: burned.videoPath, basePath, silentPath: concatPath, workDir, activeTracks: active, segments: segments.length,
    subtitleMode: burned.subtitleMode, subtitleFile: burned.subtitleFile, audioTracks,
    audioAssets: { vo: voAssets, music: musicPath },
    // B+ 재합성 스펙: silentPath=무자막·무음 concat(음악만 갈아끼울 때 베이스), caption=자막 타이밍·스타일·치수
    // 자유(직접 추가) 자막은 id+text 보존(씬에 안 묶여 다음 재조립 때 텍스트 소스가 없음). 씬 자막은 sceneN만(텍스트는 씬에서).
    caption: { timings: subtitle.map((s) => (s.id != null ? { id: s.id, text: s.text, startMs: s.startMs, durMs: s.durMs } : (s.chunked ? { sceneN: s.sceneN, text: s.text, startMs: s.startMs, durMs: s.durMs, chunked: true } : { sceneN: s.sceneN, startMs: s.startMs, durMs: s.durMs }))), style: subStyle, w: CW, h: CH, hasAudio },
  };
}

module.exports = { assemble, burnCaptions, muxAudio, buildAss, buildSrt, voSegments, retimeByVoice, probeDurationMs, TARGET_W, TARGET_H, FPS };
