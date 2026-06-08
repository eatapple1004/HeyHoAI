const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config');
const { query } = require('../db/client');
const logger = require('../lib/logger');
const log = logger('VideoJob');
const promptRepo = require('./prompt.repository');
const resultRepo = require('./result.repository');
const reviewRepo = require('./review.repository');
const creditService = require('../credits/credit.service');
const teamCredit = require('../teams/team.credit');

const POLL_INTERVAL_MS = 15000;   // 15초마다 폴링 틱
const MAX_ATTEMPTS = 48;          // 48 * 15s = 12분 후 타임아웃
const outputDir = path.join(process.cwd(), 'tmp', 'images');

function klingToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: env.KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5, iat: now },
    env.KLING_SECRET_KEY,
    { algorithm: 'HS256' }
  );
}

/**
 * 비동기 릴스 제출: 크레딧 차감 → Kling 제출 → 잡 생성. (수 초 내 완료)
 * @returns {Promise<{ jobId: string }>}
 * @throws statusCode 붙은 에러 (402/403/400 등)
 */
async function submit({ user, prompt, duration = '5', mode = 'std', sourceImagePath }) {
  if (!prompt) { const e = new Error('Prompt is required'); e.statusCode = 400; throw e; }
  if (!env.KLING_ACCESS_KEY || !env.KLING_SECRET_KEY) {
    const e = new Error('Kling API keys not configured'); e.statusCode = 400; throw e;
  }

  const teamId = await teamCredit.activeTeamId(user.id);

  // 크레딧 차감 (개인=admin면제 / 팀=풀, viewer 403, 부족 402) — statusCode 에러는 그대로 전파
  const charge = await teamCredit.chargeGeneration(
    user, creditService.videoCost(duration, mode), `릴스 생성 (${duration}s, ${mode})`
  );
  const chargeAmount = charge ? charge.amount : 0;

  try {
    // Kling 제출 (이미지→비디오 우선, 없으면 텍스트→비디오)
    let endpoint, body;
    if (sourceImagePath) {
      const imageBase64 = fs.readFileSync(sourceImagePath).toString('base64');
      endpoint = 'https://api.klingai.com/v1/videos/image2video';
      body = { model_name: 'kling-v3', image: imageBase64, prompt,
        negative_prompt: 'ugly, deformed, blurry, static', duration, mode, aspect_ratio: '9:16' };
    } else {
      endpoint = 'https://api.klingai.com/v1/videos/text2video';
      body = { model_name: 'kling-v3', prompt,
        negative_prompt: 'ugly, deformed, blurry, static', duration, mode, aspect_ratio: '9:16' };
    }

    const submitRes = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + klingToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const submitData = await submitRes.json();
    const taskId = submitData.data?.task_id;
    if (!taskId) {
      // 제출 실패 → 즉시 환불
      if (charge) await charge.refund();
      const e = new Error(`Kling submit failed: ${submitData.message || submitData.code || submitRes.status}`);
      e.statusCode = 502; throw e;
    }

    const ins = await query(
      `INSERT INTO video_jobs (user_id, team_id, prompt, duration, mode, task_id, charge_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'processing') RETURNING id`,
      [user.id, teamId, String(prompt).slice(0, 2000), duration, mode, taskId, chargeAmount]
    );
    log.info(`Submitted job ${ins.rows[0].id} task=${taskId} (${duration}s ${mode})`);
    return { jobId: ins.rows[0].id };
  } catch (err) {
    if (!err.statusCode && charge) await charge.refund().catch(() => {});
    throw err;
  } finally {
    if (sourceImagePath) { try { fs.unlinkSync(sourceImagePath); } catch {} }
  }
}

/** 실패 시 환불 (개인/팀 컨텍스트별) */
async function refundJob(job) {
  if (!(job.charge_amount > 0)) return;
  const opts = { type: 'refund', description: '환불: 릴스 생성 실패', refId: job.id };
  if (job.team_id) await teamCredit.addCredits(job.team_id, job.charge_amount, { ...opts, actorId: job.user_id }).catch(() => {});
  else await creditService.addCredits(job.user_id, job.charge_amount, opts).catch(() => {});
}

/** 잡 완료 처리: 영상 다운로드 + 저장 + 결과 기록 */
async function finalizeSucceeded(job, videoUrl, videoDuration, unitsUsed, taskId) {
  const resFetch = await fetch(videoUrl);
  const videoBuf = Buffer.from(await resFetch.arrayBuffer());
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.mp4`;
  fs.writeFileSync(path.join(outputDir, filename), videoBuf);

  const savedPrompt = await promptRepo.insert({
    userId: job.user_id, promptText: job.prompt, model: 'kling-v3',
    tags: ['video', job.mode, job.duration + 's'], teamId: job.team_id,
  });
  const savedResult = await resultRepo.insert({
    promptIdx: savedPrompt.idx, filePath: `tmp/images/${filename}`,
    fileSizeKb: Math.round(videoBuf.length / 1024), model: 'kling-v3',
    metadata: { type: 'video', duration: videoDuration, mode: job.mode, taskId, unitsUsed },
  });
  await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx }).catch(() => {});

  await query(
    `UPDATE video_jobs SET status='succeeded', result_idx=$1, result_url=$2, updated_at=now() WHERE id=$3`,
    [savedResult.idx, `/images/${filename}`, job.id]
  );
  log.info(`Job ${job.id} succeeded → /images/${filename}`);
}

/** processing 잡들을 한 번씩 폴링 (백그라운드 틱) */
async function pollOnce() {
  const jobs = (await query(`SELECT * FROM video_jobs WHERE status='processing' ORDER BY created_at LIMIT 20`)).rows;
  for (const job of jobs) {
    try {
      const pollRes = await fetch(`https://api.klingai.com/v1/videos/image2video/${job.task_id}`, {
        headers: { Authorization: 'Bearer ' + klingToken() },
      });
      const pollData = await pollRes.json();
      const status = pollData.data?.task_status;

      if (status === 'succeed') {
        const v = pollData.data.task_result?.videos?.[0];
        if (v?.url) {
          await finalizeSucceeded(job, v.url, v.duration, pollData.data.final_unit_deduction, job.task_id);
        } else {
          throw new Error('succeed but no video url');
        }
      } else if (status === 'failed') {
        const msg = pollData.data?.task_status_msg || 'Kling generation failed';
        await refundJob(job);
        await query(`UPDATE video_jobs SET status='failed', error=$1, updated_at=now() WHERE id=$2`, [msg, job.id]);
        log.warn(`Job ${job.id} failed: ${msg}`);
      } else {
        // 아직 처리 중 → 시도 횟수 증가, 한도 초과 시 타임아웃
        const attempts = job.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await refundJob(job);
          await query(`UPDATE video_jobs SET status='failed', error='timeout', attempts=$1, updated_at=now() WHERE id=$2`, [attempts, job.id]);
          log.warn(`Job ${job.id} timed out`);
        } else {
          await query(`UPDATE video_jobs SET attempts=$1, updated_at=now() WHERE id=$2`, [attempts, job.id]);
        }
      }
    } catch (err) {
      log.error(`Poll error job ${job.id}: ${err.message}`);
      // 다음 틱에 재시도 (status는 processing 유지). attempts로 결국 타임아웃됨.
      await query(`UPDATE video_jobs SET attempts=attempts+1, updated_at=now() WHERE id=$1`, [job.id]).catch(() => {});
    }
  }
}

/** 잡 상태 조회 (소유자 본인 또는 팀 멤버) */
async function getJob(id, userId) {
  const r = await query(
    `SELECT v.id, v.status, v.result_url, v.error, v.duration
     FROM video_jobs v
     WHERE v.id = $1 AND (
       v.user_id = $2
       OR (v.team_id IS NOT NULL AND v.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
     )`,
    [id, userId]
  );
  return r.rows[0] || null;
}

let started = false;
function startPoller() {
  if (started) return;
  started = true;
  setInterval(() => { pollOnce().catch((e) => log.error('pollOnce:', e.message)); }, POLL_INTERVAL_MS);
  log.info(`Video job poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
}

module.exports = { submit, getJob, pollOnce, startPoller };
