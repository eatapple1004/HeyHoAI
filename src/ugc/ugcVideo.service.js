/**
 * ugcVideo.service.js — UGC 영상 엔진 비동기 오케스트레이션 (스튜디오 배선)
 * ============================================================================
 * 제품+컨셉 → 대본 → broll 클립(이미지→모션) → RenderPlan → ffmpeg 조립 → 결과 저장.
 * videoJob.service 의 크레딧·결과저장·mediaStore 패턴을 재사용하되, UGC는 단일 Kling task가
 * 아니라 다단계 오케스트레이션이라 자체 백그라운드 잡으로 돈다(공유 Kling 폴러 미사용).
 *
 * 잡 상태 = `ugc_jobs` 테이블(재시작·멀티인스턴스 견고). ⚠️ prod엔 마이그레이션 미적용 —
 *   배포 배치에서 `node src/db/migrate.js` 실행 필요([[doppia_local_prod_isolation]]로 로컬만 적용됨).
 * ⚠️ 크레딧 원가 = placeholder(클립수 × videoCost). 확정 단가는 비즈 결정(별도).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../lib/logger');
const log = logger('UgcVideo');
const { query } = require('../db/client');
const promptRepo = require('../generate/prompt.repository');
const resultRepo = require('../generate/result.repository');
const reviewRepo = require('../generate/review.repository');
const creditService = require('../credits/credit.service');
const teamCredit = require('../teams/team.credit');
const mediaStore = require('../storage/mediaStore');

const { generateUgcScript, suggestConcept, refineScene, generateAddScene, normalizeAddSceneObj } = require('./ugcScript.service');
const { renderClips, renderSceneClip } = require('./clipPipeline.service');
const { buildRenderPlan, aspectDims } = require('./renderPlan');
const { assemble, burnCaptions, muxAudio } = require('./assembler/ffmpeg.assembler');
const music = require('./audio/music.service');
const tts = require('./audio/tts.service');

const servedDir = path.join(process.cwd(), 'tmp', 'images'); // /images 라우트가 서빙하는 디렉토리

// ── 오디오 캐싱(옵션 B) ──────────────────────────────────────────────
// VO·음악 mp3를 영속화하고 캐시키로 재사용 판단 → 편집 시 안 바뀐 오디오는 재생성 안 함.
//   VO 키 = 내레이션 텍스트 + 보이스 + 속도.  음악 키 = 음악 프롬프트(무드) + 영상 길이.
//   음악만 바꾸기 = musicVibe만 달라짐 → 음악 키만 변경 → VO 재사용, 음악만 재생성.
function audioKey(parts) { return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16); }
// VO 키 = 씬 대사(spoken 우선)만 — voSegments와 동일 기준(hook/CTA 제외). 자막만 바뀌고 spoken 있으면 키 불변→VO 재사용.
function voKey(script, audio = {}) {
  const text = (script.narration && String(script.narration).trim())
    || (script.scenes || []).map((s) => (s.spoken || s.onScreenText || '').trim()).filter(Boolean).join('|');
  return audioKey([text, audio.voiceId || '', String(audio.speed || 1)]);
}
// 음악 키 = 무드(프롬프트)만. 길이는 제외 — 음성 주도로 durationMs가 매 편집 변하는데,
//   음악 길이는 muxAudio가 영상에 맞춰 트림/패딩하므로 재생성 불필요. vibe 바뀔 때만 재생성.
function musicKey(script) { return audioKey([music.promptFromScript(script)]); }

/** assemble이 만든 오디오 mp3(로컬 절대경로)를 서빙 디렉토리로 영속화 → basename 반환(restoreClipLocal로 복원). */
async function persistAudioFile(localPath) {
  if (!localPath || !fs.existsSync(localPath)) return null;
  const filename = `${crypto.randomUUID()}.mp3`;
  const dest = path.join(servedDir, filename);
  fs.mkdirSync(servedDir, { recursive: true });
  fs.copyFileSync(localPath, dest);
  try { await mediaStore.putFile(dest); } catch {}
  return filename;
}

/** mp4(무자막 베이스 등)를 서빙 디렉토리로 영속화 → basename 반환(restoreClipLocal로 복원). B+ 재합성 토대. */
async function persistVideoFile(localPath) {
  if (!localPath || !fs.existsSync(localPath)) return null;
  const filename = `${crypto.randomUUID()}.mp4`;
  const dest = path.join(servedDir, filename);
  fs.mkdirSync(servedDir, { recursive: true });
  fs.copyFileSync(localPath, dest);
  try { await mediaStore.putFile(dest); } catch {}
  return filename;
}

/**
 * assemble 반환 오디오 경로 → {vo:{file,key}, music:{file,key}} 영속 자산.
 * reuseMap[kind] 있으면(=재사용된 트랙) 재영속화 없이 기존 entry 유지.
 */
async function buildAudioAssets(rendered, script, audio, reuseMap = {}) {
  const assets = {};
  // VO = 씬별 세그먼트 배열(F). 재사용이면 기존 entry 유지, 아니면 각 세그먼트 영속화 + 캐시키(전체 텍스트 기준).
  if (rendered && Array.isArray(rendered.vo) && rendered.vo.length) {
    assets.vo = reuseMap.vo || {
      key: voKey(script, audio),
      segs: await Promise.all(rendered.vo.map(async (s) => ({ sceneN: s.sceneN, file: await persistAudioFile(s.path), startMs: s.startMs }))),
    };
  }
  if (rendered && rendered.music) assets.music = reuseMap.music || { file: await persistAudioFile(rendered.music), key: musicKey(script) };
  return assets;
}

/** ugc_jobs 상태 갱신 (updated_at 자동). patch 키 = 컬럼명 */
async function updateJob(id, patch) {
  const cols = Object.keys(patch);
  if (!cols.length) return;
  const set = cols.map((c, i) => `${c}=$${i + 2}`).join(', ');
  await query(`UPDATE ugc_jobs SET ${set}, updated_at=now() WHERE id=$1`, [id, ...cols.map((c) => patch[c])]);
}

/** Kling 생성 길이(네이티브 5s/10s only) — 8초+ 는 10초 생성, 그 이하는 5초 생성(짧게는 5초 만들어 트림). */
function klingGenDur(durationSec) { return (Number(durationSec) >= 8) ? 10 : 5; }

/** 크레딧 원가 추정 — 씬별 Kling 생성 길이(5/10) 단가 합산. 짧게(3~4s)는 5초 생성이라 5초 단가. */
function estimateCost(script, isTemplate) {
  const broll = ((script && script.scenes) || []).filter((s) => s.type === 'broll');
  if (!broll.length) return creditService.videoCost(5, 'pro', isTemplate);
  return broll.reduce((sum, s) => sum + creditService.videoCost(klingGenDur(s.durationSec), 'pro', isTemplate), 0);
}

function brollCount(script) { return ((script && script.scenes) || []).filter((s) => s.type === 'broll').length; }

/**
 * 씬별 클립을 영속화하고 { [sceneN]: {clip, thumb, durationMs, isStill} } 맵을 만든다(결과 편집용).
 *   - nanoBanana 이미지(imageUrl=file://tmp/images/x)와 dryRun 클립은 이미 로컬+S3 → basename만.
 *   - Kling live 클립(http)은 tmp/images로 다운로드 + mediaStore.putFile 후 basename.
 * basename만 저장 → 재조립은 tmp/images/<base>(로컬) 또는 /images/<base>(S3 폴백)로 복원.
 */
async function persistSceneClips(clips) {
  const map = {};
  for (const c of clips || []) {
    if (!c.clipUrl) continue;
    const entry = { durationMs: c.durationMs, isStill: !!c.isStill };
    if (c.imageUrl && String(c.imageUrl).startsWith('file://')) entry.thumb = path.basename(c.imageUrl.replace('file://', ''));
    if (String(c.clipUrl).startsWith('file://')) {
      entry.clip = path.basename(c.clipUrl.replace('file://', ''));
    } else if (/^https?:\/\//i.test(c.clipUrl)) {
      let saved = false;
      try {
        const res = await fetch(c.clipUrl);
        if (res.ok) {
          const filename = `${crypto.randomUUID()}.mp4`;
          const dest = path.join(servedDir, filename);
          fs.mkdirSync(servedDir, { recursive: true });
          fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
          await mediaStore.putFile(dest); // 영속 스토리지 best-effort
          entry.clip = filename; saved = true;
        }
      } catch (e) { log.warn(`scene ${c.sceneN} clip persist failed: ${e.message}`); }
      // 다운로드 실패 시 원본 URL 폴백 보관 → 씬 유실 방지(만료 전까지 편집 가능; 재조립이 http 다운로드)
      if (!saved) { entry.clip = c.clipUrl; entry.remote = true; }
    } else {
      entry.clip = path.basename(String(c.clipUrl));
    }
    if (entry.clip) map[c.sceneN] = entry;
  }
  return map;
}

// 씬 클립 엔트리에서 순수 클립 정보만(버전 목록 element용) — versions/v 같은 메타 제외.
function stripClipEntry(e) { const o = {}; ['clip', 'thumb', 'isStill', 'durationMs', 'remote'].forEach((k) => { if (e && k in e) o[k] = e[k]; }); return o; }

// 자막 타이밍 → 텍스트 리졸버. 자유 자막(직접 추가)은 자기 text, 씬 자막은 씬의 onScreenText.
function captionTextOf(t, byN) { return (t && t.text != null ? String(t.text) : ((byN[t.sceneN] && byN[t.sceneN].onScreenText) || '')).trim(); }

/**
 * 1단계 — 대본만 생성(무료·미리보기). 과금·DB·렌더 없음. 유저 검토용.
 * @returns {Promise<{ script:object, nClips:number, cost:number }>}
 */
async function generateScript({ product, concept, outputType = 'product-ad', image = null, details = '', voiceover = true, category = '', sceneCount = 0, sceneDuration = 0 }) {
  if (!concept) { const e = new Error('concept is required'); e.statusCode = 400; throw e; }
  const script = await generateUgcScript({ product, concept, outputType, image, details, voiceover, category, sceneCount, sceneDuration });
  const nClips = brollCount(script);
  if (!nClips) { const e = new Error('script produced no broll scenes'); e.statusCode = 422; throw e; }
  return { script, nClips, cost: estimateCost(script, false) };
}

/**
 * 2단계 — 검토한 대본으로 렌더(여기서만 과금). jobId 즉시 반환, 파이프라인 백그라운드.
 * @returns {Promise<{ jobId:string, cost:number }>}
 */
async function render({ user, script, product, concept, outputType = 'product-ad',
  referenceImagePath = null, productImagePath = null, modelImagePath = null, aspect = '9:16', dryRunVideo = false, visibility, isTemplate = false,
  audio = {} }) {
  if (!script || !Array.isArray(script.scenes)) { const e = new Error('script is required'); e.statusCode = 400; throw e; }
  const nClips = brollCount(script);
  if (!nClips) { const e = new Error('script has no broll scenes'); e.statusCode = 422; throw e; }

  // 레퍼런스: 업로드 제품 사진=제품 고정('product'), 없고 모델 ref면 인물 유지('person').
  const refImage = productImagePath || referenceImagePath || null;
  const refKind = productImagePath ? 'product' : 'person';

  // 과금(씬별 길이 반영) — statusCode 에러(402/403) 그대로 전파. 승인 후에만.
  const cost = estimateCost(script, isTemplate);
  const charge = await teamCredit.chargeGeneration(user, cost, `UGC 영상 (${outputType}, ${nClips}컷)`);
  const teamId = await teamCredit.activeTeamId(user.id);

  const vis = visibility === 'private' ? 'private' : 'public';
  const ins = await query(
    `INSERT INTO ugc_jobs (user_id, team_id, output_type, product, concept, title, n_clips,
       charge_amount, status, caption, hashtags, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'processing',$9,$10,$11) RETURNING id`,
    [user.id, teamId, outputType, String(product || '').slice(0, 500), String(concept || '').slice(0, 1000),
     script.title, nClips, charge ? charge.amount : 0, script.caption,
     JSON.stringify(script.hashtags || []), vis]
  );
  const jobId = ins.rows[0].id;
  log.info(`UGC job ${jobId} render (${outputType}, ${nClips}컷, cost=${cost})`);

  runPipeline({ jobId, script, refImage, refKind, productImagePath: refImage, modelImagePath, aspect, dryRunVideo, visibility, teamId, userId: user.id, charge, audio })
    .catch((err) => log.error(`UGC job ${jobId} pipeline crash: ${err.message}`));

  return { jobId, cost };
}

/** 원샷(하네스/하위호환): 대본 생성 → 즉시 렌더. */
async function submit(input) {
  const { script } = await generateScript(input);
  const r = await render({ ...input, script });
  return { ...r, script };
}

/** 백그라운드: 클립 렌더 → 조립 → 서빙 디렉토리로 복사 → 결과 저장 → 잡 완료. 실패 시 환불. */
async function runPipeline({ jobId, script, refImage, refKind, productImagePath, modelImagePath, aspect = '9:16', dryRunVideo, visibility, teamId, userId, charge, audio = {} }) {
  let renderWorkDir = null; // assemble 작업 폴더(스크래치) — 성공/실패 무관 finally에서 정리(디스크 누수 방지). 서빙본·베이스·씬클립은 이미 servedDir로 복사된 뒤라 안전.
  try {
    const { w, h } = aspectDims(aspect);
    // 클립(이미지→모션) — 스튜디오는 LIVE(dryRunVideo=false)가 기본. refImage 있으면 제품/모델 고정.
    const clips = await renderClips(script, { dryRunVideo, referenceImagePath: refImage, referenceKind: refKind, productImagePath, modelImagePath, width: w, height: h, aspect, concurrency: 2, log: (m) => log.info(`[${jobId}] ${m}`) });
    if (!clips.some((c) => c.clipUrl)) throw new Error('all clips failed to render');

    const sceneClips = await persistSceneClips(clips); // 결과 편집(재배치·삭제·재생성)용 씬 클립 영속화

    const plan = buildRenderPlan(script, clips);
    plan.meta.aspect = aspect; // 선택 비율을 조립기·결과 메타에 반영
    renderWorkDir = path.join(process.cwd(), 'tmp', 'ugc', crypto.randomUUID().slice(0, 8));
    const out = await assemble(plan, { audio, script, aspect, outDir: renderWorkDir, log: (m) => log.info(`[${jobId}] ${m}`) });

    // 서빙 디렉토리로 복사(/images 라우트가 서빙 + mediaStore 영속화)
    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(out.videoPath, served);

    // 🔖 DRAFT: 완성 mp4·대본·씬클립만 영속화. generation_results 저장은 "Save & finish" 또는 이탈 시(commitJob)로 미룸.
    //   → 저장 전엔 generation_results에 없으므로 My creations/Library/Explore 어디에도 안 뜸(쿼리 무수정).
    const durationSec = Math.round((plan.meta.durationMs || 0) / 1000);
    await mediaStore.putFile(served); // 영속 스토리지 best-effort(라이브 404 방지)

    // 편집(재조립/씬재생성)용: 대본 + 렌더 설정 + 레퍼런스 + 씬 클립을 영속화.
    let productRef = null;
    if (refImage) {
      try { await mediaStore.putFile(refImage); } catch {} // 재배포 후 redo 대비 영속화
      productRef = { clip: path.basename(refImage), kind: refKind || 'product' };
    }
    // 오디오 캐싱: 생성된 VO·음악을 영속화 + 캐시키 저장 → 이후 편집 시 안 바뀐 트랙 재사용(무재생성).
    const audioAssets = await buildAudioAssets(out.audioAssets, script, audio || {}, {});
    // B+ 재합성 토대: 무자막·무음 베이스(silentBase, 음악 교체용) + 자막 없는 미리보기 베이스(previewBase, 자막 1패스 재번인·오버레이용) + 자막 타이밍.
    const silentBase = await persistVideoFile(out.silentPath);
    const previewBase = await persistVideoFile(out.basePath);
    const persistedScript = { ...script, _render: {
      audio: audio || {}, aspect, product: productRef, model: modelImagePath || null, audioAssets,
      silentBase, previewBase, caption: out.caption, durationMs: plan.meta.durationMs || 0,
    } };
    await updateJob(jobId, {
      status: 'succeeded', result_url: `/images/${filename}`,
      duration_sec: durationSec, subtitle_mode: out.subtitleMode,
      script: JSON.stringify(persistedScript), scene_clips: JSON.stringify(sceneClips),
    });
    log.info(`UGC job ${jobId} succeeded(draft) → /images/${filename} (자막=${out.subtitleMode})`);
  } catch (err) {
    if (charge) await charge.refund().catch(() => {});
    await updateJob(jobId, { status: 'failed', error: String(err.message).slice(0, 300) });
    log.error(`UGC job ${jobId} failed(refunded): ${err.message}`);
  } finally {
    // 렌더 스크래치 정리 — 서빙본·silentBase·previewBase·오디오·씬클립은 try 안에서 이미 servedDir로 복사됨(finally는 그 뒤 실행). 편집 경로(tryReComposite)와 동일 패턴.
    if (renderWorkDir) { try { fs.rmSync(renderWorkDir, { recursive: true, force: true }); } catch (e) {} }
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

/** 영속 씬 클립(basename) → 로컬 절대경로. 로컬에 없으면(재배포 후) mediaStore에서 복원. 없으면 null. */
async function restoreClipLocal(basename) {
  if (!basename) return null;
  const p = path.join(servedDir, basename);
  if (fs.existsSync(p)) return p;
  try {
    const obj = await mediaStore.getObject(basename);
    if (obj && obj.Body) {
      fs.mkdirSync(servedDir, { recursive: true });
      fs.writeFileSync(p, await streamToBuffer(obj.Body));
      return p;
    }
  } catch (e) { log.warn(`restore clip ${basename} failed: ${e.message}`); }
  return null;
}

/** 편집용 원본 잡 로드(소유권 게이트). script/scene_clips 원문 포함. */
async function loadJobForEdit(id, userId) {
  const r = await query(
    `SELECT id, status, result_idx, result_url, output_type, visibility, script, scene_clips
     FROM ugc_jobs WHERE id = $1 AND (
       user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`,
    [id, userId]
  );
  return r.rows[0] || null;
}

/**
 * broll 씬 배열에 편집(삭제·자막/내레이션 수정·재정렬)을 적용한 새 배열을 반환(순수).
 * @param {Array} scenes  script.scenes (broll 포함)
 * @param {{ order?:number[], removed?:number[], edits?:object }} ops
 */
function applySceneEdits(scenes, { order = null, removed = [], edits = {} } = {}) {
  const removedSet = new Set((removed || []).map(Number));
  const out = (scenes || []).filter((s) => s.type === 'broll' && !removedSet.has(s.n)).map((s) => ({ ...s }));
  for (const s of out) {
    const e = (edits || {})[s.n] || (edits || {})[String(s.n)];
    if (!e) continue;
    if ('onScreenText' in e) s.onScreenText = String(e.onScreenText || '').slice(0, 300);
    if ('spoken' in e) s.spoken = String(e.spoken || '').slice(0, 600);
    if ('leadInMs' in e) s.leadInMs = Math.max(0, Math.min(Number(e.leadInMs) || 0, 3000)); // 3a: 음성 시작 딜레이
    if ('tailMs' in e) s.tailMs = Math.max(0, Math.min(Number(e.tailMs) || 0, 3000));       // 3a: 음성 끝 여백
  }
  if (Array.isArray(order) && order.length) {
    const pos = new Map(order.map((n, i) => [Number(n), i]));
    out.sort((a, b) => (pos.has(a.n) ? pos.get(a.n) : 1e9) - (pos.has(b.n) ? pos.get(b.n) : 1e9));
  }
  return out;
}

/**
 * 재조립 킥오프(동기) — 소유권·편집가능 검증 후 잡을 'processing'으로 마킹하고 이전 URL 반환.
 *   라우트가 이걸 먼저 await(빠름)해 404/400을 즉시 응답한 뒤, reRender는 백그라운드로 돌린다.
 *   (동기 재조립이 Cloudflare 100초 한도를 넘겨 524가 나던 문제 해결 — 특히 Kling 씬재생성.)
 */
async function beginRerender(jobId, userId) {
  const row = await loadJobForEdit(jobId, userId);
  if (!row) { const e = new Error('Job not found'); e.statusCode = 404; throw e; }
  if (!row.script) { const e = new Error('This video is not editable'); e.statusCode = 400; throw e; }
  await updateJob(jobId, { status: 'processing', error: null }); // 폴링이 processing→succeeded 전환으로 완료 감지
  return { jobId, prevUrl: row.result_url };
}

/** 백그라운드 재조립 실패 처리 — 잡을 다시 편집가능('succeeded')으로 되돌리고 에러를 남겨 프론트가 표시. */
async function failRerender(jobId, err) {
  log.error(`UGC re-render ${jobId} failed: ${err && err.message}`);
  await updateJob(jobId, { status: 'succeeded', error: String((err && err.message) || 'Could not apply changes').slice(0, 300) }).catch(() => {});
}

/**
 * B+ 값싼 재합성 — 자막(텍스트/스타일)·음악·음성 편집을 "무자막 베이스 + 캐시/재합성 오디오"에서 재조립.
 *   영상 길이 고정 + 음성 단일 나레이션이라 재타이밍 없음 → 클립 재작업 0. 음성 변경 시 나레이션만 재합성(TTS 1회)+재믹싱.
 *   자막/스타일만 = previewBase에 자막 1패스. 음악/음성 = silentBase에 오디오 재믹싱 후 자막.
 *   muxAudio+burnCaptions+tts+music 프리미티브 재사용 → 몇 초·실패지점 최소.
 *   ⚠️ 씬 구조 바뀌는 편집(순서·삭제·씬재생성/추가·spoken·leadIn/tail)은 null → 전체 reRender 폴백. 레거시 잡(베이스 미영속)·복원 실패도 null.
 * @returns {Promise<{jobId,resultUrl,durationSec,cost}|null>}
 */
async function tryReComposite({ user, jobId, order = null, removed = [], edits = {}, redoScenes = [], addScenes = [], musicVibe = null, voice = null, voiceId = null, speed = null, subtitleStyle = null, narration = null, captionTimings = null, setVersions = null }) {
  if ((redoScenes && redoScenes.length) || (addScenes && addScenes.length) || (removed && removed.length) || (setVersions && Object.keys(setVersions).length)) return null; // 씬 구조/클립 변경(버전 전환 포함) → 전체 재조립 폴백
  for (const k in (edits || {})) { for (const f in (edits[k] || {})) if (f !== 'onScreenText') return null; } // 자막 텍스트 외(spoken/lead/tail)면 폴백
  const hasCaptionEdit = Object.keys(edits || {}).length > 0;
  const hasStyle = subtitleStyle && typeof subtitleStyle === 'object' && Object.keys(subtitleStyle).length > 0;
  const mv = musicVibe == null ? null : String(musicVibe).trim();
  const hasMusic = mv != null;
  const narrationChanged = narration != null; // V2 나레이션 편집기 → 통 나레이션 재합성(값싼)
  const hasVoiceEdit = (voice != null) || !!voiceId || (speed != null && speed !== '') || narrationChanged;
  const hasTimingEdit = Array.isArray(captionTimings) && captionTimings.length > 0; // V2 자막 타임라인 → 자막 타이밍만(값싼)
  if (!hasCaptionEdit && !hasStyle && !hasMusic && !hasVoiceEdit && !hasTimingEdit) return null; // 값싼 경로로 처리할 변경이 없음

  const row = await loadJobForEdit(jobId, user.id);
  if (!row || !row.script) return null;
  const script = safeParse(row.script);
  const R = script && script._render;
  if (!script || !Array.isArray(script.scenes) || !R || !R.silentBase || !R.previewBase || !R.caption) return null; // 레거시 잡 → 폴백

  const curOrder = script.scenes.map((s) => s.n);
  if (order && order.length && (order.length !== curOrder.length || order.some((n, i) => Number(n) !== curOrder[i]))) return null; // 순서 변경 → 폴백

  const rlog = (m) => log.info(`[recompose ${jobId}] ${m}`);
  const workDir = path.join(process.cwd(), 'tmp', 'ugc', `rc_${crypto.randomUUID().slice(0, 8)}`);
  fs.mkdirSync(workDir, { recursive: true });
  try {
    // 편집 반영(영속 대상): 자막 텍스트(onScreenText만) → script.scenes, 스타일 → _render.subtitleStyle, 음악 → _render.audio
    for (const k in (edits || {})) { const e = edits[k]; const s = script.scenes.find((x) => String(x.n) === String(k)); if (s && e && 'onScreenText' in e) s.onScreenText = String(e.onScreenText || '').slice(0, 300); }
    if (hasStyle) R.subtitleStyle = { ...(R.subtitleStyle || {}), ...subtitleStyle };
    let audio = { ...(R.audio || {}) };
    if (hasMusic) { if (mv.toLowerCase() === 'none') audio.music = false; else { script.musicVibe = mv.toLowerCase() === 'auto' ? '' : mv; audio.music = true; } }
    if (voice != null) audio.voice = !!voice;                              // 음성 on/off
    if (voiceId) audio.voiceId = String(voiceId);                          // 보이스 교체
    if (speed != null && speed !== '') audio.speed = Number(speed);        // 말속도
    if (narrationChanged) script.narration = String(narration).slice(0, 5000); // V2 나레이션 편집기 → 통 나레이션 텍스트
    if (hasMusic || hasVoiceEdit) R.audio = audio;                         // 오디오 변경 영속
    // V2 자막 타임라인 → 자막 타이밍 override(영속). 씬 매핑·숫자만 정제, 영상 길이 안에 클램프.
    if (hasTimingEdit) {
      const dur = R.durationMs || 0;
      R.caption.timings = captionTimings.map((t) => {
        const start = Math.max(0, Math.round(Number(t.startMs) || 0));
        let d = Math.max(200, Math.round(Number(t.durMs) || 0));
        if (dur && start + d > dur) d = Math.max(200, dur - start);
        const e = { startMs: start, durMs: d };
        if (Number.isFinite(Number(t.sceneN))) e.sceneN = Number(t.sceneN); // 씬 자막(텍스트는 씬에서)
        if (t.text != null) e.text = String(t.text).slice(0, 300);          // 자유 자막(자기 텍스트 보유)
        if (t.id != null) e.id = String(t.id).slice(0, 40);
        return e;
      }).filter((t) => Number.isFinite(t.sceneN) || (t.text != null && t.text !== '')); // 씬 자막 또는 텍스트 있는 자유 자막만
    }

    const byN = {}; script.scenes.forEach((s) => { byN[s.n] = s; });
    const style = { ...(R.caption.style || {}), ...(R.subtitleStyle || {}), lang: script.language || (R.caption.style && R.caption.style.lang) || 'ko' };
    const captionsOff = !!(R.subtitleStyle && R.subtitleStyle.off);
    const subtitle = captionsOff ? [] : R.caption.timings
      .map((t) => ({ sceneN: t.sceneN, startMs: t.startMs, durMs: t.durMs, text: captionTextOf(t, byN) })) // 자유 자막=자기 text, 씬 자막=씬에서
      .filter((s) => s.text);
    const W = R.caption.w || 1080, H = R.caption.h || 1920;
    const durMs = R.durationMs || R.caption.timings.reduce((m, t) => Math.max(m, t.startMs + t.durMs), 0) || 6000;
    const wantVoice = !!audio.voice, wantMusic = !!audio.music;

    let baseAbs; // 자막 얹을 베이스(영상+오디오, 자막 없음)
    if (hasMusic || hasVoiceEdit) {
      // 음악/음성 변경 → silentBase에 오디오 재믹싱 → previewBase 갱신 (재타이밍·클립 재작업 0)
      const silent = await restoreClipLocal(R.silentBase);
      if (!silent) return null; // 베이스 복원 실패 → 폴백
      const audioInputs = [];
      // VO(통 나레이션): 음성 편집이면 새 보이스/속도로 재합성, 아니면 캐시 재사용. voice off면 VO 없음.
      if (wantVoice) {
        const narrText = (script.narration && String(script.narration).trim()) || script.scenes.map((s) => (s.spoken || s.onScreenText || '').trim()).filter(Boolean).join(' ');
        let voLocal = null;
        if (hasVoiceEdit && narrText && tts.isConfigured()) {
          rlog(`나레이션 재합성(음성 변경) [${tts.provider()}]`);
          try { voLocal = await tts.synthesize(narrText, { outPath: path.join(workDir, 'vo.mp3'), voiceId: audio.voiceId, speed: audio.speed }); } catch (e) { rlog(`VO 재합성 실패: ${e.message}`); }
          if (voLocal && R.audioAssets) R.audioAssets.vo = { key: voKey(script, audio), segs: [{ sceneN: 0, file: await persistAudioFile(voLocal), startMs: 0 }] };
        } else if (R.audioAssets && R.audioAssets.vo && Array.isArray(R.audioAssets.vo.segs) && R.audioAssets.vo.segs[0]) {
          voLocal = await restoreClipLocal(R.audioAssets.vo.segs[0].file); // 재사용(음성 안 바뀜)
        }
        if (voLocal) audioInputs.push({ file: voLocal, volume: 1.0, kind: 'vo', delayMs: 0 });
      } else if (R.audioAssets) { delete R.audioAssets.vo; } // voice off → VO 자산 제거
      if (wantMusic) {
        if (music.isConfigured()) {
          rlog('음악만 재생성 [elevenlabs music]');
          const m = await music.composeForScript(script, { durationMs: durMs, outPath: path.join(workDir, 'music.mp3') });
          if (m) { audioInputs.push({ file: m, volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' }); if (R.audioAssets) R.audioAssets.music = { file: await persistAudioFile(m), key: musicKey(script) }; }
        } else if (R.audioAssets && R.audioAssets.music) { const mp = await restoreClipLocal(R.audioAssets.music.file); if (mp) audioInputs.push({ file: mp, volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' }); }
      } else if (R.audioAssets) { delete R.audioAssets.music; }
      if (audioInputs.length) baseAbs = await muxAudio(silent, audioInputs, Math.max(durMs / 1000, 1), workDir, 'base.mp4');
      else { baseAbs = path.join(workDir, 'base.mp4'); fs.copyFileSync(silent, baseAbs); }
      R.previewBase = await persistVideoFile(baseAbs); // 오디오 바뀐 새 무자막 미리보기 베이스
    } else {
      baseAbs = await restoreClipLocal(R.previewBase); // 자막/스타일만 → 기존 미리보기 베이스(영상+오디오) 재사용
      if (!baseAbs) return null;
    }

    const burned = await burnCaptions({ basePath: baseAbs, subtitle, style, w: W, h: H, workDir, hasAudio: wantVoice || wantMusic, log: rlog });

    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(burned.videoPath, served);
    await mediaStore.putFile(served).catch(() => {});
    const durationSec = Math.round(durMs / 1000);
    if (row.result_idx) { // committed 후에만 generation_results in-place 갱신(draft는 스킵)
      await query(`UPDATE generation_results SET file_path=$2, file_size_kb=$3, metadata=$4 WHERE idx=$1`,
        [row.result_idx, `tmp/images/${filename}`, Math.round(fs.statSync(served).size / 1024),
         JSON.stringify({ type: 'video', source: 'ugc', outputType: row.output_type, duration: durationSec, subtitleMode: burned.subtitleMode, edited: true })]);
    }
    await updateJob(jobId, { status: 'succeeded', result_url: `/images/${filename}`, duration_sec: durationSec, subtitle_mode: burned.subtitleMode, script: JSON.stringify(script) });
    rlog(`값싼 재합성 완료(${(hasMusic || hasVoiceEdit) ? '오디오+' : ''}자막, 클립/재타이밍 0) → /images/${filename}`);
    return { jobId, resultUrl: `/images/${filename}`, durationSec, cost: 0 };
  } catch (e) {
    log.warn(`[recompose ${jobId}] 실패 → 전체 재조립 폴백: ${e.message}`);
    return null; // 폴백(잡 미갱신 — 호출부 reRender가 원본 script로 다시 처리)
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

/**
 * 재조립/씬재생성 — 저장된 씬 클립을 재사용해 재배치·삭제·자막수정을 반영(무과금),
 *   redoScenes 지정 시 그 씬만 이미지→모션 재생성(과금). 기존 결과를 in-place 갱신(피드에 새 카드 안 쌓임).
 *   - 재배치/삭제/자막: Kling/nanoBanana 재호출 0 → 무과금. spoken 바뀌고 음성ON이면 그 구간만 재TTS(무과금).
 *   - redoScenes: 씬당 1클립 과금(placeholder=videoCost). editedPrompts[n]로 brollPrompt 교체(P3 Advanced).
 * @param {{ user:object, jobId:string, order?:number[], removed?:number[], edits?:object,
 *           redoScenes?:number[], editedPrompts?:object, dryRunVideo?:boolean }} p
 */
async function reRender({ user, jobId, order = null, removed = [], edits = {}, redoScenes = [], editInstructions = {}, addScenes = [], musicVibe = null, voice = null, voiceId = null, speed = null, subtitleStyle = null, narration = null, captionTimings = null, setVersions = {}, dryRunVideo = false }) {
  // B+ 값싼 경로 우선: 자막(텍스트/스타일·타이밍)·음악·음성/나레이션만 바뀌면 베이스에서 재합성(클립/재타이밍 0). 처리 불가면 null → 아래 전체 경로.
  const cheap = await tryReComposite({ user, jobId, order, removed, edits, redoScenes, addScenes, musicVibe, voice, voiceId, speed, subtitleStyle, narration, captionTimings, setVersions });
  if (cheap) return cheap;

  const row = await loadJobForEdit(jobId, user.id);
  if (!row) { const e = new Error('Job not found'); e.statusCode = 404; throw e; }
  // 편집 가능 조건 = 대본 보유(완성된 잡). result_idx는 요구하지 않음
  //   (draft 라이프사이클: 완성 직후엔 result_idx 없음 → Save & finish 전에도 편집 허용).
  //   status는 재조립을 백그라운드로 돌리는 동안 'processing'으로 두므로 여기선 판단 기준에서 제외
  //   (초기 생성 중 잡은 아직 script가 없어 자연히 걸러짐). generation_results 갱신은 result_idx 있을 때만.
  if (!row.script) {
    const e = new Error('This video is not editable'); e.statusCode = 400; throw e;
  }
  const script = safeParse(row.script);
  const sceneClips = safeParse(row.scene_clips) || {};
  if (!script || !Array.isArray(script.scenes)) { const e = new Error('script unavailable'); e.statusCode = 400; throw e; }

  // 편집 적용: broll 씬만 대상 → 삭제 → 자막/내레이션 수정 → 재정렬(순수 헬퍼)
  const scenes = applySceneEdits(script.scenes, { order, removed, edits });
  if (!scenes.length) { const e = new Error('At least one scene must remain'); e.statusCode = 422; throw e; }

  const aspect = (script._render && script._render.aspect) || script.aspect || '9:16';
  let audio = (script._render && script._render.audio) || {};

  // "음악만 바꾸기" — musicVibe override(무과금). 영상·클립·VO는 그대로, 배경음만 재생성+재조립.
  //   ''(Auto)=AI 기본 무드, 'none'=음악 끔, 그 외=무드 프리셋/자연어. 변경은 _render.audio에도 영속화(다음 편집서 유지).
  const mv = musicVibe == null ? null : String(musicVibe).trim();
  if (mv != null) {
    if (mv.toLowerCase() === 'none') {
      audio = { ...audio, music: false };
    } else {
      script.musicVibe = mv.toLowerCase() === 'auto' ? '' : mv;
      audio = { ...audio, music: true };
    }
    if (script._render) script._render.audio = audio;
  }

  // 음성 override(A/B) — on/off·보이스·속도. 캐싱이 voKey(텍스트+보이스+속도)로 재생성 자동 판단.
  //   voiceId/speed 바뀌면 VO만 재생성(클립·음악 재사용), voice=false면 VO 트랙 제거(무과금).
  let audioTouched = mv != null;
  if (voice != null) { audio = { ...audio, voice: !!voice }; audioTouched = true; }
  if (voiceId) { audio = { ...audio, voiceId: String(voiceId) }; audioTouched = true; }
  if (speed != null && speed !== '') { audio = { ...audio, speed: Number(speed) }; audioTouched = true; }
  if (audioTouched && script._render) script._render.audio = audio;

  // 자막 스타일 override(C) — 위치·크기·색상. 클립·VO·음악 전부 재사용, 자막만 재번인 = 완전 무과금.
  if (subtitleStyle && typeof subtitleStyle === 'object' && Object.keys(subtitleStyle).length && script._render) {
    script._render.subtitleStyle = { ...(script._render.subtitleStyle || {}), ...subtitleStyle };
  }

  // 새 씬 추가(끝에) — 기존 대본 맥락으로 Claude가 생성(자연어 지시 or AI 제안). 한 영상 최대 12씬.
  const adds = Array.isArray(addScenes) ? addScenes : [];
  if (adds.length) {
    if (scenes.length + adds.length > 12) { const e = new Error('You can have up to 12 scenes in one video'); e.statusCode = 422; throw e; }
    let maxN = scenes.reduce((mx, s) => Math.max(mx, Number(s.n) || 0), 0);
    const vo = scenes.some((s) => s.spoken && s.spoken.trim());
    for (const a of adds) {
      const ns = (a && a.scene && (a.scene.brollPrompt || a.scene.summary))
        ? normalizeAddSceneObj(a.scene, row.output_type, vo) // 제안 선택 — Claude 재생성 없이 그대로 추가
        : await generateAddScene({ script, instruction: a && a.instruction, outputType: row.output_type }); // 자연어 → 생성
      ns.n = ++maxN;
      scenes.push(ns);
    }
  }
  script.scenes = scenes;

  // 렌더 대상 = 재생성 지정 씬(redoScenes) + 새로 추가된 씬(클립 없음). 과금.
  const redoSet = new Set((redoScenes || []).map(Number));
  const addedNs = new Set(adds.length ? scenes.slice(-adds.length).map((s) => s.n) : []);
  const toRender = scenes.filter((s) => redoSet.has(s.n) || addedNs.has(s.n));
  let charge = null;
  if (toRender.length) {
    const cost = toRender.reduce((sum, s) => sum + creditService.videoCost(klingGenDur(s.durationSec), 'pro', false), 0);
    charge = await teamCredit.chargeGeneration(user, cost, `UGC 씬 ${toRender.length}컷 (재생성/추가)`); // 402/403 전파
  }
  try {
    if (toRender.length) {
      const { w, h } = aspectDims(aspect);
      const rp = script._render && script._render.product;
      const productLocal = rp && rp.clip ? await restoreClipLocal(rp.clip) : null;
      // 원본에 제품 레퍼런스가 있었는데 복원 실패 → off-brand 이미지 생성+과금 방지(환불되게 throw)
      if (rp && rp.clip && !productLocal) throw Object.assign(new Error('Product reference is no longer available — cannot re-generate this scene'), { statusCode: 410 });
      const productKind = (rp && rp.kind) || 'product';
      const modelPath = (script._render && script._render.model) || null;
      for (const s of toRender) {
        // 재생성 씬만 자연어 지시 반영(새 씬은 generateAddScene이 프롬프트 이미 생성) → Claude 이미지/모션 라우팅
        const ins = redoSet.has(s.n) ? (editInstructions[s.n] != null ? editInstructions[s.n] : editInstructions[String(s.n)]) : null;
        if (ins != null && String(ins).trim()) {
          const refined = await refineScene({ brollPrompt: s.brollPrompt, direction: s.direction, summary: s.summary, instruction: ins, subject: s.subject, language: script.language });
          s.brollPrompt = refined.brollPrompt; s.direction = refined.direction; s.summary = refined.summary;
        }
        const clip = await renderSceneClip(s, {
          productImagePath: productKind === 'product' ? productLocal : null,
          referenceImagePath: productKind === 'product' ? null : productLocal,
          referenceKind: productKind, modelImagePath: modelPath,
          width: w, height: h, aspect, dryRunVideo,
          log: (m) => log.info(`[re-render ${jobId}] ${m}`),
        });
        if (!clip || !clip.clipUrl) throw Object.assign(new Error(`Scene ${s.n} could not be re-generated`), { statusCode: 502 });
        // 비파괴: 덮어쓰지 않고 versions[]에 추가 + 새 것을 활성으로. 이전 클립 보존 → 씬 카드에서 되돌리기 가능.
        const nm = await persistSceneClips([clip]);
        const ne = nm[s.n] || nm[String(s.n)];
        if (ne) {
          const prev = sceneClips[s.n] || sceneClips[String(s.n)];
          let versions = (prev && Array.isArray(prev.versions)) ? prev.versions.slice() : (prev && prev.clip ? [stripClipEntry(prev)] : []);
          versions.push(stripClipEntry(ne));
          if (versions.length > 8) versions = versions.slice(-8); // 버전 상한(스토리지 보호)
          sceneClips[s.n] = Object.assign(stripClipEntry(ne), { versions, v: versions.length - 1 });
        }
      }
    }
    // 씬 버전 전환(무과금): 지정 씬의 활성 클립을 versions[idx]로 교체(재조립만, Kling 0). 렌더 뒤·복원 앞에 적용.
    for (const k in (setVersions || {})) {
      const n = Number(k), idx = Number(setVersions[k]);
      const cur = sceneClips[n] || sceneClips[String(n)];
      if (cur && Array.isArray(cur.versions) && cur.versions[idx]) {
        sceneClips[n] = Object.assign(stripClipEntry(cur.versions[idx]), { versions: cur.versions, v: idx });
      }
    }

    // 저장된 클립 복원(redo된 건 새 것, 나머지 기존; 로컬 우선 없으면 S3)
    const clips = [];
    for (const s of scenes) {
      const cl = sceneClips[s.n] || sceneClips[String(s.n)];
      if (!cl || !cl.clip) continue;
      let clipUrl;
      if (cl.remote) { clipUrl = cl.clip; } // persist 실패분: 원본 http URL(assembler가 다운로드)
      else { const local = await restoreClipLocal(cl.clip); if (!local) continue; clipUrl = `file://${local}`; }
      const thumbLocal = cl.thumb ? await restoreClipLocal(cl.thumb) : null;
      clips.push({ sceneN: s.n, clipUrl, durationMs: cl.durationMs, isStill: !!cl.isStill, imageUrl: thumbLocal ? `file://${thumbLocal}` : null });
    }
    if (!clips.length) throw Object.assign(new Error('Scene clips are no longer available'), { statusCode: 410 });

    // 재조립(원본 오디오/비율 재사용)
    const plan = buildRenderPlan(script, clips);
    plan.meta.aspect = aspect;
    // 자유(직접 추가) 자막은 씬에 안 묶임 → buildRenderPlan(씬 기반)이 놓치므로, 저장된 timings의 자유 자막을 이어붙여 보존.
    {
      const Rc = script._render && script._render.caption;
      const capOff = !!(script._render && script._render.subtitleStyle && script._render.subtitleStyle.off);
      if (Rc && Array.isArray(Rc.timings) && !capOff) {
        const dur = plan.meta.durationMs || 0;
        for (const t of Rc.timings) {
          if (t.text == null || !String(t.text).trim() || Number.isFinite(Number(t.sceneN))) continue; // 씬 자막은 이미 처리됨
          let start = Math.max(0, Math.round(Number(t.startMs) || 0));
          let d = Math.max(200, Math.round(Number(t.durMs) || 0));
          if (dur && start + d > dur) d = Math.max(200, dur - start);
          if (!dur || start < dur) plan.tracks.subtitle.push({ id: t.id, startMs: start, durMs: d, text: String(t.text).trim() });
        }
      }
    }

    // 오디오 캐싱: 저장된 VO·음악 중 키가 그대로면 재사용(재생성 안 함). 다르면 재생성.
    //   음악만 바꾸기 = 음악 키만 변경 → VO 재사용, 음악만 새로. 재배치/자막편집 = 텍스트 바뀌면 VO만 재생성.
    const prevAssets = (script._render && script._render.audioAssets) || {};
    const reuseMap = {};
    let reuseVo = null, reuseMusic = null;
    if (audio.voice && prevAssets.vo && prevAssets.vo.key === voKey(script, audio) && Array.isArray(prevAssets.vo.segs)) {
      const restored = [];
      for (const s of prevAssets.vo.segs) {
        const local = await restoreClipLocal(s.file);
        if (local) restored.push({ sceneN: s.sceneN, path: local, startMs: s.startMs });
      }
      if (restored.length === prevAssets.vo.segs.length) { reuseVo = restored; reuseMap.vo = prevAssets.vo; } // 전부 복원돼야 재사용
    }
    if (audio.music && prevAssets.music && prevAssets.music.key === musicKey(script)) {
      reuseMusic = await restoreClipLocal(prevAssets.music.file);
      if (reuseMusic) reuseMap.music = prevAssets.music;
    }
    const out = await assemble(plan, { audio, script, aspect, reuseVo, reuseMusic, subtitleStyle: (script._render && script._render.subtitleStyle) || undefined, log: (m) => log.info(`[re-render ${jobId}] ${m}`) });
    // 자산 갱신: 재사용 트랙은 기존 entry 유지, 재생성 트랙만 새로 영속화
    if (script._render) script._render.audioAssets = await buildAudioAssets(out.audioAssets, script, audio, reuseMap);

    // in-place 갱신: 새 mp4 서빙 + 기존 generation_results 행 교체 + 잡 갱신
    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(out.videoPath, served);
    await mediaStore.putFile(served);
    const durationSec = Math.round((plan.meta.durationMs || 0) / 1000);
    if (row.result_idx) { // committed(저장됨) 후 편집만 generation_results 반영. draft는 result_idx 없어 스킵.
      await query(
        `UPDATE generation_results SET file_path=$2, file_size_kb=$3, metadata=$4 WHERE idx=$1`,
        [row.result_idx, `tmp/images/${filename}`, Math.round(fs.statSync(served).size / 1024),
         JSON.stringify({ type: 'video', source: 'ugc', outputType: row.output_type, duration: durationSec,
           subtitleMode: out.subtitleMode, clips: plan.tracks.video.length, edited: true })]
      );
    }
    await updateJob(jobId, {
      status: 'succeeded', // 백그라운드 재조립 완료 — beginRerender가 걸어둔 'processing'을 해제(프론트 폴링 종료 신호)
      result_url: `/images/${filename}`, duration_sec: durationSec, subtitle_mode: out.subtitleMode,
      script: JSON.stringify(script), scene_clips: JSON.stringify(sceneClips),
    });
    log.info(`UGC job ${jobId} re-rendered (씬 ${scenes.length}개, 렌더 ${toRender.length}, ${charge ? 'cost=' + charge.amount : '무과금'}) → /images/${filename}`);
    return { jobId, resultUrl: `/images/${filename}`, durationSec, cost: charge ? charge.amount : 0 };
  } catch (e) {
    if (charge) await charge.refund().catch(() => {}); // redo 렌더/조립/저장 어디서 실패해도 재생성 과금 환불
    throw e;
  }
}

/**
 * "Save & finish" 또는 이탈 시 — draft를 generation_results에 확정 저장(My creations/Library/Explore 노출). 멱등.
 * @returns {Promise<{resultIdx:number, already?:boolean}|null>} null=없음/권한없음/미완성
 */
async function commitJob(id, userId) {
  const r = await query(
    `SELECT id, user_id, team_id, output_type, visibility, title, caption, hashtags,
            duration_sec, subtitle_mode, result_url, result_idx, script, status
     FROM ugc_jobs WHERE id = $1 AND (
       user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`,
    [id, userId]
  );
  const j = r.rows[0];
  if (!j) return null;
  if (j.result_idx) return { resultIdx: j.result_idx, already: true }; // 이미 저장됨(멱등 — 중복 방지)
  if (j.status !== 'succeeded' || !j.result_url) return null; // 아직 완성 안 됨
  const filename = String(j.result_url).split('/').pop();
  const served = path.join(servedDir, filename);
  const script = safeParse(j.script) || {};
  const nClips = ((script.scenes || []).filter((s) => s.type === 'broll')).length;
  const savedPrompt = await promptRepo.insert({
    userId: j.user_id, promptText: `${j.title || ''} — ${j.caption || ''}`.slice(0, 2000),
    model: 'ugc-v1', tags: ['video', 'ugc', j.output_type], teamId: j.team_id,
  });
  const savedResult = await resultRepo.insert({
    promptIdx: savedPrompt.idx, filePath: `tmp/images/${filename}`,
    fileSizeKb: fs.existsSync(served) ? Math.round(fs.statSync(served).size / 1024) : null, model: 'ugc-v1',
    metadata: { type: 'video', source: 'ugc', outputType: j.output_type, duration: j.duration_sec,
      subtitleMode: j.subtitle_mode, clips: nClips },
    visibility: j.visibility === 'private' ? 'private' : 'public',
  });
  await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx }).catch(() => {});
  await updateJob(id, { result_idx: savedResult.idx });
  log.info(`UGC job ${id} committed → generation_results idx ${savedResult.idx}`);
  return { resultIdx: savedResult.idx };
}

/** 잡 상태 조회(소유자 본인 또는 팀 멤버) */
async function getJob(id, userId) {
  const gate = `(user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`;
  let r;
  try {
    r = await query(
      `SELECT id, status, result_url, error, title, output_type, caption, hashtags,
              duration_sec, subtitle_mode, charge_amount, n_clips, script, scene_clips
       FROM ugc_jobs WHERE id = $1 AND ${gate}`,
      [id, userId]
    );
  } catch (e) {
    // script/scene_clips 컬럼 미마이그레이션 환경 폴백(구버전 잡)
    r = await query(
      `SELECT id, status, result_url, error, title, output_type, caption, hashtags,
              duration_sec, subtitle_mode, charge_amount, n_clips
       FROM ugc_jobs WHERE id = $1 AND ${gate}`,
      [id, userId]
    );
  }
  const j = r.rows[0];
  if (!j) return null;
  const sc = j.script ? (safeParse(j.script) || {}) : {};
  const R = sc._render || {};
  return {
    id: j.id, status: j.status, resultUrl: j.result_url, error: j.error,
    title: j.title, outputType: j.output_type, caption: j.caption, hashtags: j.hashtags,
    durationSec: j.duration_sec, subtitleMode: j.subtitle_mode, cost: j.charge_amount, nClips: j.n_clips,
    scenes: editableScenes(j.script, j.scene_clips), // 결과 편집용(brollPrompt 미노출)
    // B+ 2b: 편집 중 자막 없는 미리보기 영상 + 브라우저 오버레이용 자막 스펙(타이밍·스타일).
    previewUrl: R.previewBase ? `/images/${R.previewBase}` : null,
    captionSpec: R.caption ? { timings: R.caption.timings || [], style: R.caption.style || {}, w: R.caption.w || 1080, h: R.caption.h || 1920 } : null,
    subtitleStyle: R.subtitleStyle || null,
    language: sc.language || 'ko',
    // V2: 통 나레이션 텍스트(편집기 프리필) — 전용 필드 우선, 없으면 씬 대사 이어붙임. 음성 켜진 잡만 의미.
    narration: (sc.narration && String(sc.narration).trim()) || (Array.isArray(sc.scenes) ? sc.scenes.map((s) => (s.spoken || '').trim()).filter(Boolean).join(' ') : ''),
    hasVoice: !!(R.audio && R.audio.voice),
  };
}

/**
 * 저장된 script + scene_clips → 프론트 편집용 씬 배열.
 * broll 씬만, 편집에 필요한 필드만(자막·내레이션·썸네일·길이). brollPrompt/direction은 노출하지 않음(No prompt 원칙).
 */
function editableScenes(script, sceneClips) {
  if (!script) return null;
  const s = typeof script === 'string' ? safeParse(script) : script;
  const clips = typeof sceneClips === 'string' ? safeParse(sceneClips) : (sceneClips || {});
  if (!s || !Array.isArray(s.scenes)) return null;
  return s.scenes.filter((sc) => sc.type === 'broll').map((sc) => {
    const cl = clips[sc.n] || clips[String(sc.n)] || {};
    return {
      n: sc.n,
      onScreenText: sc.onScreenText || '',
      spoken: sc.spoken || '',
      leadInMs: sc.leadInMs || 0, // 3a: 음성 시작 딜레이
      tailMs: sc.tailMs || 0,     // 3a: 음성 끝 여백
      summary: sc.summary || '', // 사람용 장면 설명(프롬프트 숨김)
      subject: sc.subject || 'product',
      durationSec: sc.durationSec || Math.round((cl.durationMs || 3000) / 1000),
      thumb: cl.thumb ? `/images/${cl.thumb}` : null,
      clipUrl: cl.clip ? (cl.remote ? cl.clip : `/images/${cl.clip}`) : null, // 씬 카드 자동재생용
      isStill: !!cl.isStill, // 정지이미지 클립(dryRun)이면 video 대신 썸네일
      hasClip: !!cl.clip,
      // 비파괴 재생성: 이 씬의 렌더된 버전들(썸네일)+활성 인덱스 → 프론트 버전 선택기. 1개면 선택기 숨김.
      versions: Array.isArray(cl.versions) ? cl.versions.map((v) => ({ thumb: v.thumb ? `/images/${v.thumb}` : null, isStill: !!v.isStill })) : [],
      activeVersion: typeof cl.v === 'number' ? cl.v : 0,
      // 원본 프롬프트는 프론트로 보내지 않음(No prompt engineering) — 수정은 자연어 지시로만
    };
  });
}
// script/scene_clips는 JSONB 컬럼 → pg가 조회 시 이미 JS 객체로 자동 파싱함. 객체면 그대로 반환
//   (문자열을 또 JSON.parse 하면 실패해 null → reRender가 "script unavailable" 400을 던지던 버그).
function safeParse(v) { if (v && typeof v === 'object') return v; try { return JSON.parse(v); } catch { return null; } }

module.exports = { generateScript, render, submit, getJob, reRender, beginRerender, failRerender, commitJob, estimateCost, suggestConcept, persistSceneClips, editableScenes, applySceneEdits };
