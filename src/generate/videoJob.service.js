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
async function submit({ user, prompt, duration = '5', mode = 'std', aspectRatio, audio = false, sourceImagePath, endFramePath,
  visibility, templateId, templateSource, templateName }) {
  const KLING_ASPECTS = ['9:16', '1:1', '16:9'];
  const aspect = KLING_ASPECTS.includes(aspectRatio) ? aspectRatio : '9:16';
  const wantAudio = audio === true || audio === 'true';
  // ⚠️ Kling Standard(std) 미연결 — Pro만 사용. 들어온 mode가 pro가 아니면 pro로 강제(비용·Kling 요청·저장 모두 pro).
  //    (추후 std 연결되면 이 한 줄 가드만 제거하면 복구.)
  if (mode !== 'pro') mode = 'pro';
  // 자동공개(P2): 이미지 경로와 동일 정책 — Private Mode 명시 안 하면 공개. + 출처 템플릿 attribution.
  const vis = visibility === 'private' ? 'private' : 'public';
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
        negative_prompt: 'ugly, deformed, blurry, static', duration, mode, aspect_ratio: aspect };
      // 끝프레임(선택) → Kling image_tail
      if (endFramePath) { try { body.image_tail = fs.readFileSync(endFramePath).toString('base64'); } catch {} }
    } else {
      endpoint = 'https://api.klingai.com/v1/videos/text2video';
      body = { model_name: 'kling-v3', prompt,
        negative_prompt: 'ugly, deformed, blurry, static', duration, mode, aspect_ratio: aspect };
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
      `INSERT INTO video_jobs (user_id, team_id, prompt, duration, mode, task_id, charge_amount, status, audio,
         visibility, template_id, template_source, template_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'processing',$8,$9,$10,$11,$12) RETURNING id`,
      [user.id, teamId, String(prompt).slice(0, 2000), duration, mode, taskId, chargeAmount, wantAudio,
       vis, templateId || null, templateSource || null, templateName ? String(templateName).slice(0, 120) : null]
    );
    log.info(`Submitted job ${ins.rows[0].id} task=${taskId} (${duration}s ${mode}${wantAudio ? ' +audio' : ''})`);
    return { jobId: ins.rows[0].id };
  } catch (err) {
    if (!err.statusCode && charge) await charge.refund().catch(() => {});
    throw err;
  } finally {
    if (sourceImagePath) { try { fs.unlinkSync(sourceImagePath); } catch {} }
    if (endFramePath) { try { fs.unlinkSync(endFramePath); } catch {} }
  }
}

/** 실패 시 환불 (개인/팀 컨텍스트별) */
async function refundJob(job) {
  if (!(job.charge_amount > 0)) return;
  const opts = { type: 'refund', description: '환불: 릴스 생성 실패', refId: job.id };
  if (job.team_id) await teamCredit.addCredits(job.team_id, job.charge_amount, { ...opts, actorId: job.user_id }).catch(() => {});
  else await creditService.addCredits(job.user_id, job.charge_amount, opts).catch(() => {});
}

/** Kling video-to-audio: 효과음/배경음 트랙 생성 → mp3 url (실패/타임아웃 시 null). */
async function generateAudioFor({ videoId, videoUrl, prompt }) {
  const body = {
    ...(videoId ? { video_id: videoId } : { video_url: videoUrl }),
    sound_effect_prompt: String(prompt || '').slice(0, 200), bgm_prompt: '', asmr_mode: false,
  };
  const submitRes = await fetch('https://api.klingai.com/v1/audio/video-to-audio', {
    method: 'POST', headers: { Authorization: 'Bearer ' + klingToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let submitData; try { submitData = JSON.parse(await submitRes.text()); } catch { submitData = {}; }
  const audioTaskId = submitData.data?.task_id;
  if (!audioTaskId) return null;
  for (let j = 0; j < 18; j++) { // 최대 ~3분 폴링
    await new Promise((r) => setTimeout(r, 10000));
    const pollRes = await fetch(`https://api.klingai.com/v1/audio/video-to-audio/${audioTaskId}`, {
      headers: { Authorization: 'Bearer ' + klingToken() },
    });
    let d; try { d = JSON.parse(await pollRes.text()); } catch { continue; }
    const st = d.data?.task_status;
    if (st === 'succeed') {
      const a = d.data?.task_result?.audios?.[0];
      return a?.url_mp3 || a?.audio_url || a?.url_wav || a?.mp3_url || null;
    }
    if (st === 'failed') return null;
  }
  return null;
}

/** 잡 완료 처리: 영상(+옵션 오디오 합성) 다운로드 + 저장 + 결과 기록 */
async function finalizeSucceeded(job, v, unitsUsed) {
  const videoUrl = v.url, videoDuration = v.duration, videoId = v.id, taskId = job.task_id;

  // 멱등 가드: 같은 Kling task가 이미 결과로 저장됐으면 중복 저장 금지.
  //   원인 = PM2 재시작/재배포 시 옛·새 프로세스의 폴러가 잠깐 겹쳐, 단일-폴러 전제의
  //   원자적 claim을 우회해 같은 task를 두 번 finalize(고아 중복 결과·검정 카드 발생).
  //   여기서 task_id 기준으로 막으면 프로세스가 겹쳐도 결과는 1개만 유지된다.
  const dup = await query(
    `SELECT idx, file_path FROM generation_results
     WHERE metadata->>'type'='video' AND metadata->>'taskId'=$1
     ORDER BY idx LIMIT 1`,
    [taskId]
  );
  if (dup.rows[0]) {
    const ex = dup.rows[0];
    const exUrl = ex.file_path ? `/${ex.file_path.replace(/^tmp\//, '')}` : null;
    await query(
      `UPDATE video_jobs SET status='succeeded', result_idx=$1, result_url=$2, updated_at=now() WHERE id=$3`,
      [ex.idx, exUrl, job.id]
    );
    log.warn(`Job ${job.id}: task ${taskId} already saved as result ${ex.idx} — linked to existing, skipped duplicate save`);
    return;
  }

  const videoBuf = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
  fs.mkdirSync(outputDir, { recursive: true });
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.mp4`;
  const filePath = path.join(outputDir, filename);

  // 오디오 옵션: video-to-audio → ffmpeg 합성. 실패해도 무음 영상으로 저장(품질 우선).
  let hasAudio = false;
  if (job.audio) {
    try {
      const audioUrl = await generateAudioFor({ videoId, videoUrl, prompt: job.prompt });
      if (audioUrl) {
        const tmpV = path.join(outputDir, `_v_${uuid}.mp4`), tmpA = path.join(outputDir, `_a_${uuid}.mp3`);
        fs.writeFileSync(tmpV, videoBuf);
        fs.writeFileSync(tmpA, Buffer.from(await (await fetch(audioUrl)).arrayBuffer()));
        try {
          require('child_process').execSync(
            `ffmpeg -i "${tmpV}" -i "${tmpA}" -c:v copy -c:a aac -shortest -y "${filePath}" 2>&1`, { timeout: 30000 });
          hasAudio = true;
        } catch (e) { fs.writeFileSync(filePath, videoBuf); log.warn(`ffmpeg merge failed job ${job.id}: ${e.message}`); }
        try { fs.unlinkSync(tmpV); } catch {}
        try { fs.unlinkSync(tmpA); } catch {}
      } else { fs.writeFileSync(filePath, videoBuf); }
    } catch (e) { fs.writeFileSync(filePath, videoBuf); log.warn(`audio step failed job ${job.id}: ${e.message}`); }
  } else {
    fs.writeFileSync(filePath, videoBuf);
  }

  const savedPrompt = await promptRepo.insert({
    userId: job.user_id, promptText: job.prompt, model: 'kling-v3',
    tags: ['video', job.mode, job.duration + 's', ...(hasAudio ? ['audio'] : [])], teamId: job.team_id,
  });
  const savedResult = await resultRepo.insert({
    promptIdx: savedPrompt.idx, filePath: `tmp/images/${filename}`,
    fileSizeKb: Math.round(fs.statSync(filePath).size / 1024), model: 'kling-v3',
    metadata: { type: 'video', duration: videoDuration, mode: job.mode, taskId, unitsUsed, audio: hasAudio },
    // 자동공개(P2): 잡이 운반한 visibility·출처 템플릿을 결과에 기록 → Explore 피드 노출.
    visibility: job.visibility, templateId: job.template_id, templateSource: job.template_source, templateName: job.template_name,
  });
  await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx }).catch(() => {});

  await query(
    `UPDATE video_jobs SET status='succeeded', result_idx=$1, result_url=$2, updated_at=now() WHERE id=$3`,
    [savedResult.idx, `/images/${filename}`, job.id]
  );
  log.info(`Job ${job.id} succeeded → /images/${filename}${hasAudio ? ' (audio)' : ''}`);
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
        if (!v?.url) throw new Error('succeed but no video url');
        // 중복 처리 방지: processing → finalizing 원자적 클레임 (오디오 합성으로 길어질 수 있어 필수).
        const claim = await query(
          `UPDATE video_jobs SET status='finalizing', updated_at=now() WHERE id=$1 AND status='processing'`, [job.id]);
        if (claim.rowCount === 0) continue; // 다른 틱이 이미 가져감
        try {
          await finalizeSucceeded(job, v, pollData.data.final_unit_deduction);
        } catch (e) {
          log.error(`Finalize failed job ${job.id}: ${e.message}`);
          await refundJob(job);
          await query(`UPDATE video_jobs SET status='failed', error=$1, updated_at=now() WHERE id=$2`,
            [String(e.message).slice(0, 300), job.id]).catch(() => {});
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
