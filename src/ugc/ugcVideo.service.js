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

const { generateUgcScript, suggestConcept } = require('./ugcScript.service');
const { renderClips } = require('./clipPipeline.service');
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

/** 크레딧 원가 추정 — placeholder(클립수 × pro 5s 릴 단가). 확정 단가는 비즈 결정. */
function estimateCost(nClips, isTemplate) {
  return Math.max(nClips, 1) * creditService.videoCost(5, 'pro', isTemplate);
}

function brollCount(script) { return ((script && script.scenes) || []).filter((s) => s.type === 'broll').length; }

/**
 * 1단계 — 대본만 생성(무료·미리보기). 과금·DB·렌더 없음. 유저 검토용.
 * @returns {Promise<{ script:object, nClips:number, cost:number }>}
 */
async function generateScript({ product, concept, outputType = 'product-ad', image = null, details = '', voiceover = true, category = '' }) {
  if (!concept) { const e = new Error('concept is required'); e.statusCode = 400; throw e; }
  const script = await generateUgcScript({ product, concept, outputType, image, details, voiceover, category });
  const nClips = brollCount(script);
  if (!nClips) { const e = new Error('script produced no broll scenes'); e.statusCode = 422; throw e; }
  return { script, nClips, cost: estimateCost(nClips, false) };
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

  // 과금(클립수 기준) — statusCode 에러(402/403) 그대로 전파. 승인 후에만.
  const cost = estimateCost(nClips, isTemplate);
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

    await updateJob(jobId, { status: 'succeeded', result_url: `/images/${filename}`, result_idx: savedResult.idx, duration_sec: durationSec, subtitle_mode: out.subtitleMode });
    log.info(`UGC job ${jobId} succeeded → /images/${filename} (자막=${out.subtitleMode})`);
  } catch (err) {
    if (charge) await charge.refund().catch(() => {});
    await updateJob(jobId, { status: 'failed', error: String(err.message).slice(0, 300) });
    log.error(`UGC job ${jobId} failed(refunded): ${err.message}`);
  }
}

/** 잡 상태 조회(소유자 본인 또는 팀 멤버) */
async function getJob(id, userId) {
  const r = await query(
    `SELECT id, status, result_url, error, title, output_type, caption, hashtags,
            duration_sec, subtitle_mode, charge_amount, n_clips
     FROM ugc_jobs
     WHERE id = $1 AND (
       user_id = $2
       OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
     )`,
    [id, userId]
  );
  const j = r.rows[0];
  if (!j) return null;
  return {
    id: j.id, status: j.status, resultUrl: j.result_url, error: j.error,
    title: j.title, outputType: j.output_type, caption: j.caption, hashtags: j.hashtags,
    durationSec: j.duration_sec, subtitleMode: j.subtitle_mode, cost: j.charge_amount, nClips: j.n_clips,
  };
}

module.exports = { generateScript, render, submit, getJob, estimateCost, suggestConcept };
