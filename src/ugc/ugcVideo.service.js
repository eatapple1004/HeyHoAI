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

const { generateUgcScript, suggestConcept, refineScene, generateAddScene } = require('./ugcScript.service');
const { renderClips, renderSceneClip } = require('./clipPipeline.service');
const { buildRenderPlan, aspectDims } = require('./renderPlan');
const { assemble } = require('./assembler/ffmpeg.assembler');

const servedDir = path.join(process.cwd(), 'tmp', 'images'); // /images 라우트가 서빙하는 디렉토리

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
  try {
    const { w, h } = aspectDims(aspect);
    // 클립(이미지→모션) — 스튜디오는 LIVE(dryRunVideo=false)가 기본. refImage 있으면 제품/모델 고정.
    const clips = await renderClips(script, { dryRunVideo, referenceImagePath: refImage, referenceKind: refKind, productImagePath, modelImagePath, width: w, height: h, aspect, concurrency: 2, log: (m) => log.info(`[${jobId}] ${m}`) });
    if (!clips.some((c) => c.clipUrl)) throw new Error('all clips failed to render');

    const sceneClips = await persistSceneClips(clips); // 결과 편집(재배치·삭제·재생성)용 씬 클립 영속화

    const plan = buildRenderPlan(script, clips);
    plan.meta.aspect = aspect; // 선택 비율을 조립기·결과 메타에 반영
    const out = await assemble(plan, { audio, script, aspect, log: (m) => log.info(`[${jobId}] ${m}`) });

    // 서빙 디렉토리로 복사(/images 라우트가 서빙 + mediaStore 영속화)
    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(out.videoPath, served);

    // 결과 저장(generation_results 'video' → 기존 Library/Explore 피드에 자동 노출)
    const savedPrompt = await promptRepo.insert({
      userId, promptText: `${script.title} — ${script.caption}`.slice(0, 2000),
      model: 'ugc-v1', tags: ['video', 'ugc', script.outputType], teamId,
    });
    const durationSec = Math.round((plan.meta.durationMs || 0) / 1000);
    const savedResult = await resultRepo.insert({
      promptIdx: savedPrompt.idx, filePath: `tmp/images/${filename}`,
      fileSizeKb: Math.round(fs.statSync(served).size / 1024), model: 'ugc-v1',
      metadata: { type: 'video', source: 'ugc', outputType: script.outputType, duration: durationSec,
        subtitleMode: out.subtitleMode, clips: plan.tracks.video.length },
      visibility: visibility === 'private' ? 'private' : 'public',
    });
    await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx }).catch(() => {});
    await mediaStore.putFile(served); // 영속 스토리지 best-effort(라이브 404 방지)

    // 편집(재조립/씬재생성)용: 대본 + 렌더 설정 + 레퍼런스 + 씬 클립을 영속화.
    //   _render.product/model = 씬Redo(P2)가 원본 제품/모델 레퍼런스로 이미지를 다시 그리는 데 필요.
    let productRef = null;
    if (refImage) {
      try { await mediaStore.putFile(refImage); } catch {} // 재배포 후 redo 대비 영속화
      productRef = { clip: path.basename(refImage), kind: refKind || 'product' };
    }
    const persistedScript = { ...script, _render: { audio: audio || {}, aspect, product: productRef, model: modelImagePath || null } };
    await updateJob(jobId, {
      status: 'succeeded', result_url: `/images/${filename}`, result_idx: savedResult.idx,
      duration_sec: durationSec, subtitle_mode: out.subtitleMode,
      script: JSON.stringify(persistedScript), scene_clips: JSON.stringify(sceneClips),
    });
    log.info(`UGC job ${jobId} succeeded → /images/${filename} (자막=${out.subtitleMode})`);
  } catch (err) {
    if (charge) await charge.refund().catch(() => {});
    await updateJob(jobId, { status: 'failed', error: String(err.message).slice(0, 300) });
    log.error(`UGC job ${jobId} failed(refunded): ${err.message}`);
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
    `SELECT id, status, result_idx, output_type, visibility, script, scene_clips
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
  }
  if (Array.isArray(order) && order.length) {
    const pos = new Map(order.map((n, i) => [Number(n), i]));
    out.sort((a, b) => (pos.has(a.n) ? pos.get(a.n) : 1e9) - (pos.has(b.n) ? pos.get(b.n) : 1e9));
  }
  return out;
}

/**
 * 재조립/씬재생성 — 저장된 씬 클립을 재사용해 재배치·삭제·자막수정을 반영(무과금),
 *   redoScenes 지정 시 그 씬만 이미지→모션 재생성(과금). 기존 결과를 in-place 갱신(피드에 새 카드 안 쌓임).
 *   - 재배치/삭제/자막: Kling/nanoBanana 재호출 0 → 무과금. spoken 바뀌고 음성ON이면 그 구간만 재TTS(무과금).
 *   - redoScenes: 씬당 1클립 과금(placeholder=videoCost). editedPrompts[n]로 brollPrompt 교체(P3 Advanced).
 * @param {{ user:object, jobId:string, order?:number[], removed?:number[], edits?:object,
 *           redoScenes?:number[], editedPrompts?:object, dryRunVideo?:boolean }} p
 */
async function reRender({ user, jobId, order = null, removed = [], edits = {}, redoScenes = [], editInstructions = {}, addScenes = [], dryRunVideo = false }) {
  const row = await loadJobForEdit(jobId, user.id);
  if (!row) { const e = new Error('Job not found'); e.statusCode = 404; throw e; }
  if (row.status !== 'succeeded' || !row.script || !row.result_idx) {
    const e = new Error('This video is not editable'); e.statusCode = 400; throw e;
  }
  const script = safeParse(row.script);
  const sceneClips = safeParse(row.scene_clips) || {};
  if (!script || !Array.isArray(script.scenes)) { const e = new Error('script unavailable'); e.statusCode = 400; throw e; }

  // 편집 적용: broll 씬만 대상 → 삭제 → 자막/내레이션 수정 → 재정렬(순수 헬퍼)
  const scenes = applySceneEdits(script.scenes, { order, removed, edits });
  if (!scenes.length) { const e = new Error('At least one scene must remain'); e.statusCode = 422; throw e; }

  const aspect = (script._render && script._render.aspect) || script.aspect || '9:16';
  const audio = (script._render && script._render.audio) || {};

  // 새 씬 추가(끝에) — 기존 대본 맥락으로 Claude가 생성(자연어 지시 or AI 제안). 한 영상 최대 12씬.
  const adds = Array.isArray(addScenes) ? addScenes : [];
  if (adds.length) {
    if (scenes.length + adds.length > 12) { const e = new Error('You can have up to 12 scenes in one video'); e.statusCode = 422; throw e; }
    let maxN = scenes.reduce((mx, s) => Math.max(mx, Number(s.n) || 0), 0);
    for (const a of adds) {
      const ns = await generateAddScene({ script, instruction: a && a.instruction, outputType: row.output_type });
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
          const refined = await refineScene({ brollPrompt: s.brollPrompt, direction: s.direction, instruction: ins, subject: s.subject });
          s.brollPrompt = refined.brollPrompt; s.direction = refined.direction;
        }
        const clip = await renderSceneClip(s, {
          productImagePath: productKind === 'product' ? productLocal : null,
          referenceImagePath: productKind === 'product' ? null : productLocal,
          referenceKind: productKind, modelImagePath: modelPath,
          width: w, height: h, aspect, dryRunVideo,
          log: (m) => log.info(`[re-render ${jobId}] ${m}`),
        });
        if (!clip || !clip.clipUrl) throw Object.assign(new Error(`Scene ${s.n} could not be re-generated`), { statusCode: 502 });
        Object.assign(sceneClips, await persistSceneClips([clip]));
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
    const out = await assemble(plan, { audio, script, aspect, log: (m) => log.info(`[re-render ${jobId}] ${m}`) });

    // in-place 갱신: 새 mp4 서빙 + 기존 generation_results 행 교체 + 잡 갱신
    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(out.videoPath, served);
    await mediaStore.putFile(served);
    const durationSec = Math.round((plan.meta.durationMs || 0) / 1000);
    await query(
      `UPDATE generation_results SET file_path=$2, file_size_kb=$3, metadata=$4 WHERE idx=$1`,
      [row.result_idx, `tmp/images/${filename}`, Math.round(fs.statSync(served).size / 1024),
       JSON.stringify({ type: 'video', source: 'ugc', outputType: row.output_type, duration: durationSec,
         subtitleMode: out.subtitleMode, clips: plan.tracks.video.length, edited: true })]
    );
    await updateJob(jobId, {
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
  return {
    id: j.id, status: j.status, resultUrl: j.result_url, error: j.error,
    title: j.title, outputType: j.output_type, caption: j.caption, hashtags: j.hashtags,
    durationSec: j.duration_sec, subtitleMode: j.subtitle_mode, cost: j.charge_amount, nClips: j.n_clips,
    scenes: editableScenes(j.script, j.scene_clips), // 결과 편집용(brollPrompt 미노출)
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
      subject: sc.subject || 'product',
      durationSec: sc.durationSec || Math.round((cl.durationMs || 3000) / 1000),
      thumb: cl.thumb ? `/images/${cl.thumb}` : null,
      clipUrl: cl.clip ? (cl.remote ? cl.clip : `/images/${cl.clip}`) : null, // 씬 카드 자동재생용
      isStill: !!cl.isStill, // 정지이미지 클립(dryRun)이면 video 대신 썸네일
      hasClip: !!cl.clip,
      // 원본 프롬프트는 프론트로 보내지 않음(No prompt engineering) — 수정은 자연어 지시로만
    };
  });
}
function safeParse(v) { try { return JSON.parse(v); } catch { return null; } }

module.exports = { generateScript, render, submit, getJob, reRender, estimateCost, suggestConcept, persistSceneClips, editableScenes, applySceneEdits };
