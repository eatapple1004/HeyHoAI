/**
 * ugcVideo.service.js — UGC 영상 엔진 비동기 오케스트레이션 (스튜디오 배선)
 * ============================================================================
 * 제품+컨셉 → 대본 → broll 클립(이미지→모션) → RenderPlan → ffmpeg 조립 → 결과 저장.
 * videoJob.service 의 크레딧·결과저장·mediaStore 패턴을 재사용하되, UGC는 단일 Kling task가
 * 아니라 다단계 오케스트레이션이라 자체 백그라운드 잡으로 돈다(공유 Kling 폴러 미사용).
 *
 * ⚠️ v1 배선 제약(다음 증분에서 해소):
 *   - 잡 상태 = 인메모리 Map (프로세스 재시작 시 소실). durable 하려면 `ugc_jobs` 테이블
 *     → prod 마이그레이션 배치에 포함 필요([[doppia_local_prod_isolation]]로 로컬 migrate 금지).
 *   - 크레딧 원가 = placeholder(클립수 × videoCost). 확정 단가는 비즈 결정(별도).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../lib/logger');
const log = logger('UgcVideo');
const promptRepo = require('../generate/prompt.repository');
const resultRepo = require('../generate/result.repository');
const reviewRepo = require('../generate/review.repository');
const creditService = require('../credits/credit.service');
const teamCredit = require('../teams/team.credit');
const mediaStore = require('../storage/mediaStore');

const { generateUgcScript } = require('./ugcScript.service');
const { renderClips } = require('./clipPipeline.service');
const { buildRenderPlan } = require('./renderPlan');
const { assemble } = require('./assembler/ffmpeg.assembler');

const servedDir = path.join(process.cwd(), 'tmp', 'images'); // /images 라우트가 서빙하는 디렉토리

// v1 인메모리 잡 스토어(재시작 시 소실 — durable=ugc_jobs 테이블은 다음 증분)
const JOBS = new Map();
function setJob(id, patch) { JOBS.set(id, { ...(JOBS.get(id) || {}), ...patch, updatedAt: Date.now() }); }

/** 크레딧 원가 추정 — placeholder(클립수 × pro 5s 릴 단가). 확정 단가는 비즈 결정. */
function estimateCost(nClips, isTemplate) {
  return Math.max(nClips, 1) * creditService.videoCost(5, 'pro', isTemplate);
}

/**
 * 제출: 대본 생성 → 클립수만큼 크레딧 차감 → jobId 즉시 반환, 파이프라인은 백그라운드.
 * @returns {Promise<{ jobId:string, script:object, cost:number }>}
 */
async function submit({ user, product, concept, outputType = 'product-ad', referenceImagePath = null,
  dryRunVideo = false, visibility, isTemplate = false }) {
  if (!product || !concept) { const e = new Error('product and concept are required'); e.statusCode = 400; throw e; }

  // 1) 대본(opus) — 저렴, 차감 前 실행(빠른 실패)
  const script = await generateUgcScript({ product, concept, outputType });
  const nClips = (script.scenes || []).filter((s) => s.type === 'broll').length;
  if (!nClips) { const e = new Error('script produced no broll scenes'); e.statusCode = 422; throw e; }

  // 2) 크레딧 차감(클립수 기준) — statusCode 에러(402/403)는 그대로 전파
  const cost = estimateCost(nClips, isTemplate);
  const charge = await teamCredit.chargeGeneration(user, cost, `UGC 영상 (${outputType}, ${nClips}컷)`);
  const teamId = await teamCredit.activeTeamId(user.id);

  // 3) 잡 생성 + 즉시 반환
  const jobId = crypto.randomUUID();
  setJob(jobId, {
    id: jobId, userId: user.id, teamId, status: 'processing', outputType,
    title: script.title, nClips, cost, resultUrl: null, error: null,
    caption: script.caption, hashtags: script.hashtags, createdAt: Date.now(),
  });
  log.info(`UGC job ${jobId} submitted (${outputType}, ${nClips}컷, cost=${cost})`);

  // 4) 백그라운드 파이프라인(await 안 함)
  runPipeline({ jobId, script, referenceImagePath, dryRunVideo, visibility, teamId, userId: user.id, charge })
    .catch((err) => log.error(`UGC job ${jobId} pipeline crash: ${err.message}`));

  return { jobId, script, cost };
}

/** 백그라운드: 클립 렌더 → 조립 → 서빙 디렉토리로 복사 → 결과 저장 → 잡 완료. 실패 시 환불. */
async function runPipeline({ jobId, script, referenceImagePath, dryRunVideo, visibility, teamId, userId, charge }) {
  try {
    // 클립(이미지→모션) — 스튜디오는 LIVE(dryRunVideo=false)가 기본
    const clips = await renderClips(script, { dryRunVideo, referenceImagePath, concurrency: 2, log: (m) => log.info(`[${jobId}] ${m}`) });
    if (!clips.some((c) => c.clipUrl)) throw new Error('all clips failed to render');

    const plan = buildRenderPlan(script, clips);
    const out = await assemble(plan, { log: (m) => log.info(`[${jobId}] ${m}`) });

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

    setJob(jobId, { status: 'succeeded', resultUrl: `/images/${filename}`, resultIdx: savedResult.idx, durationSec, subtitleMode: out.subtitleMode });
    log.info(`UGC job ${jobId} succeeded → /images/${filename} (자막=${out.subtitleMode})`);
  } catch (err) {
    if (charge) await charge.refund().catch(() => {});
    setJob(jobId, { status: 'failed', error: String(err.message).slice(0, 300) });
    log.error(`UGC job ${jobId} failed(refunded): ${err.message}`);
  }
}

/** 잡 상태 조회(소유자 본인 또는 팀 멤버) */
async function getJob(id, userId) {
  const j = JOBS.get(id);
  if (!j) return null;
  if (j.userId !== userId) {
    // 팀 멤버 허용
    const isMember = j.teamId && (await teamCredit.activeTeamId(userId)) === j.teamId;
    if (!isMember) return null;
  }
  return {
    id: j.id, status: j.status, resultUrl: j.resultUrl, error: j.error,
    title: j.title, outputType: j.outputType, caption: j.caption, hashtags: j.hashtags,
    durationSec: j.durationSec, subtitleMode: j.subtitleMode, cost: j.cost, nClips: j.nClips,
  };
}

module.exports = { submit, getJob, estimateCost };
