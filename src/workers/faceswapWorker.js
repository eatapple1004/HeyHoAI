#!/usr/bin/env node
// faceswapWorker.js — On Model stage-2 워커. faceswap_jobs 폴링 → facefusion 스왑 → 결과 삽입.
//   실행: node src/workers/faceswapWorker.js   (facefusion 있는 박스 = v1은 이 Mac)
//   설계: docs/onmodel_faceswap_설계_2026-07-18.md
//   web과 DB 큐 + R2로 디커플 → 확장 = 이 워커를 다른 박스에서 추가 실행(웹 코드 변경 0).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env } = require('../config');
const logger = require('../lib/logger');
const log = logger('FaceswapWorker');
const mediaStore = require('../storage/mediaStore');
const resultRepo = require('../generate/result.repository');
const reviewRepo = require('../generate/review.repository');
const creditService = require('../credits/credit.service');
const teamCredit = require('../teams/team.credit');
const faceswapRepo = require('../images/faceswapJob.repository');
const { swapFace, cleanupOnBoot } = require('../images/faceswap.service');

const outputDir = path.join(process.cwd(), 'tmp', 'images');
const publicDir = path.join(process.cwd(), 'public');
const POLL_IDLE_MS = Number(env.FACESWAP_POLL_MS || 5000);

// stage-1(스왑 타겟) 로드: 로컬 tmp 우선 → R2 폴백 (generate.route readRefBase64 미러).
async function loadStage1(filename) {
  const local = path.join(outputDir, filename);
  if (fs.existsSync(local)) return fs.readFileSync(local);
  const obj = await mediaStore.getObject(filename);
  if (obj && obj.Body) {
    const chunks = [];
    for await (const c of obj.Body) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    return Buffer.concat(chunks);
  }
  return null;
}

// 로스터 얼굴 경로(/img/models/<id>...) → 로컬 절대경로. 확장자(.jpg/.png/.webp) 유연 해석.
function resolveSourceFace(p) {
  const clean = String(p || '').replace(/^\/+/, '');
  const abs = path.join(publicDir, clean);
  if (fs.existsSync(abs)) return abs;
  for (const ext of ['.jpg', '.png', '.webp']) {
    const alt = abs.replace(/\.(png|jpe?g|webp)$/i, ext);
    if (alt !== abs && fs.existsSync(alt)) return alt;
  }
  return null;
}

// 실패 환불 (videoJob.refundJob 미러).
async function refund(job) {
  if (!(job.charge_amount > 0)) return;
  const opts = { type: 'refund', description: '환불: On Model faceswap 실패', refId: job.id };
  if (job.team_id) await teamCredit.addCredits(job.team_id, job.charge_amount, { ...opts, actorId: job.user_id }).catch(() => {});
  else await creditService.addCredits(job.user_id, job.charge_amount, opts).catch(() => {});
}

async function processJob(job) {
  const t0 = Date.now();
  const targetBuffer = await loadStage1(job.stage1_filename);
  if (!targetBuffer) throw new Error(`stage-1 not found: ${job.stage1_filename}`);
  const sourceFacePath = resolveSourceFace(job.source_face_path);
  if (!sourceFacePath) throw new Error(`source face not found: ${job.source_face_path}`);

  const swapped = await swapFace({ sourceFacePath, targetBuffer, jobId: job.id }); // facefusion nsfw+age 게이트 내장

  const filename = `${crypto.randomUUID()}.png`;
  await mediaStore.put(filename, swapped); // R2 영속(웹서버가 여기서 서빙)
  // 로컬 사본은 R2 미설정(순수 로컬)일 때만 — 워커가 웹서버와 다른 박스면 로컬 tmp는 아무도 안 읽어 누적만 됨.
  if (!mediaStore.isRemote()) { try { fs.mkdirSync(outputDir, { recursive: true }); fs.writeFileSync(path.join(outputDir, filename), swapped); } catch (e) {} }

  const gm = (job.gen_meta && typeof job.gen_meta === 'object') ? job.gen_meta : {};
  const savedResult = await resultRepo.insert({
    promptIdx: job.prompt_idx, characterId: job.character_id || null,
    filePath: `tmp/images/${filename}`, fileSizeKb: Math.round(swapped.length / 1024),
    model: job.model_id, visibility: job.visibility,
    templateId: job.template_id, templateSource: job.template_source, templateName: job.template_name,
    metadata: { faceswap: true, source_face: job.source_face_path, ...gm },
  });
  await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: job.prompt_idx, memo: 'faceswap on-model — needs human review' });
  await faceswapRepo.markSucceeded(job.id, { resultIdx: savedResult.idx, resultUrl: `/images/${filename}` });
  await mediaStore.del(job.stage1_filename).catch(() => {}); // stage-1 중간물 정리 — 스왑 성공 후 불필요(R2 고아 방지)
  log.info(`job ${job.id} done ${Date.now() - t0}ms → result ${savedResult.idx}`);
  return savedResult.idx;
}

let running = false;

// 잡 1건 처리. 처리했으면 true(연속 처리), 큐 비면 false(쉼).
async function tick() {
  const job = await faceswapRepo.claimNext();
  if (!job) return false;
  try {
    await processJob(job);
  } catch (err) {
    log.warn(`job ${job.id} failed: ${err.message}`);
    await faceswapRepo.markFailed(job.id, { error: err.message }).catch(() => {});
    await refund(job).catch(() => {});
  }
  return true;
}

async function loop() {
  cleanupOnBoot();
  try { await faceswapRepo.reapStuck(); } catch (e) {}
  running = true;
  log.info(`faceswap worker started (idle ${POLL_IDLE_MS}ms)`);
  let lastReap = Date.now();
  while (running) {
    let did = false;
    try { did = await tick(); } catch (e) { log.warn('tick error: ' + e.message); }
    if (Date.now() - lastReap > 60000) { faceswapRepo.reapStuck().catch(() => {}); lastReap = Date.now(); }
    if (!did) await new Promise((r) => setTimeout(r, POLL_IDLE_MS));
  }
}

function stop() { running = false; }

if (require.main === module) {
  loop().catch((e) => { log.error('worker crashed: ' + e.message); process.exit(1); });
  process.on('SIGINT', () => { log.info('SIGINT — stopping'); stop(); setTimeout(() => process.exit(0), 500); });
  process.on('SIGTERM', () => { stop(); setTimeout(() => process.exit(0), 500); });
}

module.exports = { loop, stop, tick, processJob };
