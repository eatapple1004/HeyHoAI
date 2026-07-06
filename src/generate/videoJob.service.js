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
const mediaStore = require('../storage/mediaStore');

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

// (2026-07-06) 타임아웃 붙은 fetch — Kling 제출/영상 다운로드가 무한정 매달려 폴러를 막거나,
//   제출 요청이 Cloudflare 100초 한도를 넘겨 502 HTML을 유발하는 걸 방지. 초과 시 AbortError로 던짐.
async function fetchWithTimeout(url, opts = {}, ms = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  catch (e) { if (e.name === 'AbortError') throw new Error(`request timed out after ${ms}ms`); throw e; }
  finally { clearTimeout(t); }
}

// (2026-07-06) 다운로드 재시도 — Kling 완성영상 다운로드가 'fetch failed'(일시 네트워크)로 실패하면
//   생성 성공한 잡이 통째로 실패·환불됨(실측: 'make her dance' 잡). 몇 번 백오프 재시도로 회수.
async function downloadBuf(url, { timeoutMs = 120000, retries = 4 } = {}) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url, {}, timeoutMs);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) { last = e; if (i < retries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1))); } // 1.5s·3s·4.5s 백오프
  }
  throw new Error(`${(last && last.message) || 'fetch failed'} (after ${retries} tries)`);
}

/**
 * 비동기 릴스 제출: 크레딧 차감 → Kling 제출 → 잡 생성. (수 초 내 완료)
 * @returns {Promise<{ jobId: string }>}
 * @throws statusCode 붙은 에러 (402/403/400 등)
 */
async function submit({ user, prompt, duration = '5', mode = 'std', aspectRatio, audio = false, sourceImagePath, endFramePath,
  visibility, templateId, templateSource, templateName, isTemplate = false }) {
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
    user, creditService.videoCost(duration, mode, isTemplate), `릴스 생성 (${duration}s, ${mode})`
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

    const submitRes = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + klingToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 45000); // CF 100초 한도보다 짧게 — 초과 시 여기서 끊고 환불→JSON 에러(프록시 HTML 502 방지)
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

  // (2026-07-06) 단계별 에러 라벨 — video_jobs.error에 원인(다운로드/파일쓰기)이 남아 진단 가능("output failed to save"의 실체).
  let videoBuf;
  try { videoBuf = await downloadBuf(videoUrl); } // 타임아웃+4회 재시도 — 일시 'fetch failed'로 완성영상 잃지 않게
  catch (e) { throw new Error(`video download failed: ${e.message}`); }
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.mp4`;
  const filePath = path.join(outputDir, filename);
  try { fs.mkdirSync(outputDir, { recursive: true }); }
  catch (e) { throw new Error(`output dir not writable (${outputDir}): ${e.message}`); } // prod FS 읽기전용/비영속이면 여기서 명확히

  // 오디오 옵션: video-to-audio → ffmpeg 합성. 실패해도 무음 영상으로 저장(품질 우선).
  let hasAudio = false;
  if (job.audio) {
    try {
      const audioUrl = await generateAudioFor({ videoId, videoUrl, prompt: job.prompt });
      if (audioUrl) {
        const tmpV = path.join(outputDir, `_v_${uuid}.mp4`), tmpA = path.join(outputDir, `_a_${uuid}.mp3`);
        fs.writeFileSync(tmpV, videoBuf);
        fs.writeFileSync(tmpA, Buffer.from(await (await fetchWithTimeout(audioUrl, {}, 60000)).arrayBuffer()));
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
    try { fs.writeFileSync(filePath, videoBuf); }
    catch (e) { throw new Error(`file write failed (FS ${e.code || ''} @ ${outputDir}): ${e.message}`); } // RO/비영속 FS면 여기서 명확히
  }

  const savedPrompt = await promptRepo.insert({
    userId: job.user_id, promptText: job.prompt, model: 'kling-v3',
    tags: ['video', job.mode, job.duration + 's', ...(hasAudio ? ['audio'] : [])], teamId: job.team_id,
  });
  let savedResult;
  try {
    savedResult = await resultRepo.insert({
      promptIdx: savedPrompt.idx, filePath: `tmp/images/${filename}`,
      fileSizeKb: Math.round(fs.statSync(filePath).size / 1024), model: 'kling-v3',
      metadata: { type: 'video', duration: videoDuration, mode: job.mode, taskId, unitsUsed, audio: hasAudio },
      // 자동공개(P2): 잡이 운반한 visibility·출처 템플릿을 결과에 기록 → Explore 피드 노출.
      visibility: job.visibility, templateId: job.template_id, templateSource: job.template_source, templateName: job.template_name,
    });
  } catch (e) {
    // 유니크 인덱스(uniq_gen_results_video_task) 위반 = 다른 프로세스가 같은 task를 이미 저장.
    //   SELECT-가드의 TOCTOU 레이스를 DB가 원자적으로 막은 것 → 기존 결과에 잡 연결하고 종료.
    if (e.code === '23505') {
      const ex = (await query(
        `SELECT idx, file_path FROM generation_results
         WHERE metadata->>'type'='video' AND metadata->>'taskId'=$1 ORDER BY idx LIMIT 1`, [taskId])).rows[0];
      if (ex) {
        const exUrl = ex.file_path ? `/${ex.file_path.replace(/^tmp\//, '')}` : null;
        await query(`UPDATE video_jobs SET status='succeeded', result_idx=$1, result_url=$2, updated_at=now() WHERE id=$3`,
          [ex.idx, exUrl, job.id]);
        try { fs.unlinkSync(filePath); } catch {} // 방금 받은 중복 파일 정리
        log.warn(`Job ${job.id}: task ${taskId} 동시 저장 충돌(23505) — 기존 결과 ${ex.idx}에 연결, 중복 스킵`);
        return;
      }
    }
    throw e;
  }
  await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx }).catch(() => {});

  // 영속 스토리지에도 업로드(best-effort, 실패해도 throw 안 함). 로컬 tmp 소실·재배포·메모리킬 시
  //   /images 라우트가 S3로 302 폴백 → 라이브 영상 간헐 404 해소. MEDIA_S3 미설정이면 no-op.
  await mediaStore.putFile(filePath);

  // 자동민팅 폐지(2026-07-01): 릴 생성 자동 템플릿화 제거. 승격은 수동 add-to-my-templates로만.

  await query(
    `UPDATE video_jobs SET status='succeeded', result_idx=$1, result_url=$2, updated_at=now() WHERE id=$3`,
    [savedResult.idx, `/images/${filename}`, job.id]
  );
  log.info(`Job ${job.id} succeeded → /images/${filename}${hasAudio ? ' (audio)' : ''}`);
}

/**
 * Kling task 상태 조회 — ⚠️ Kling은 image2video·text2video 조회 엔드포인트가 분리돼 있고
 *   task_id는 "제출한 그 엔드포인트"로만 조회 가능. 제출 종류를 video_jobs에 저장하지 않으므로
 *   두 엔드포인트를 순차 시도(해당 task를 아는 쪽이 task_status를 반환). 못 찾으면 notFound.
 *   (이전엔 image2video만 조회 → text2video 잡이 영영 미완료되던 "됐다 안됐다" 버그.)
 * @returns {Promise<object>} Kling `data` 객체(task_status·task_result·final_unit_deduction)
 */
async function pollKlingTask(taskId) {
  let lastInfo = null;
  for (const kind of ['image2video', 'text2video']) {
    try {
      const res = await fetch(`https://api.klingai.com/v1/videos/${kind}/${taskId}`, {
        headers: { Authorization: 'Bearer ' + klingToken() },
      });
      const data = await res.json();
      if (data && data.data && data.data.task_status) return data.data; // 이 엔드포인트가 이 task를 앎
      lastInfo = (data && (data.message || data.code)) || `HTTP ${res.status}`;
    } catch (e) { lastInfo = e.message; }
  }
  const e = new Error(`Kling task ${taskId} not found on either endpoint (${lastInfo})`);
  e.notFound = true; throw e;
}

/** processing 잡들을 한 번씩 폴링 (백그라운드 틱) */
async function pollOnce() {
  // (2026-07-06) 크래시/재배포로 'finalizing'에 5분+ 멈춘 잡 회수 — 폴러 SELECT는 processing만 잡아 고아가 됨.
  //   processing으로 되돌리면 재폴링→재클레임→재finalize. task_id dup-guard가 중복 저장을 막으므로 안전.
  await query(`UPDATE video_jobs SET status='processing', updated_at=now() WHERE status='finalizing' AND updated_at < now() - interval '5 minutes'`).catch(() => {});
  // (2026-07-06) updated_at 12초 게이트 — 매 폴은 attempts/updated_at을 올리므로, 최근 12초 내 폴린 잡은 제외.
  //   폴러 틱이 겹치거나 prod가 멀티인스턴스여도 같은 잡을 이중으로 폴링하지 않음(실측 attempts=41/4분 폭주 방지).
  const jobs = (await query(`SELECT * FROM video_jobs WHERE status='processing' AND updated_at < now() - interval '12 seconds' ORDER BY created_at LIMIT 20`)).rows;
  for (const job of jobs) {
    try {
      const d = await pollKlingTask(job.task_id); // image2video/text2video 자동 판별
      const status = d.task_status;

      if (status === 'succeed') {
        const v = d.task_result?.videos?.[0];
        if (!v?.url) throw new Error('succeed but no video url');
        // 중복 처리 방지: processing → finalizing 원자적 클레임 (오디오 합성으로 길어질 수 있어 필수).
        const claim = await query(
          `UPDATE video_jobs SET status='finalizing', updated_at=now() WHERE id=$1 AND status='processing'`, [job.id]);
        if (claim.rowCount === 0) continue; // 다른 틱이 이미 가져감
        try {
          await finalizeSucceeded(job, v, d.final_unit_deduction);
        } catch (e) {
          log.error(`Finalize failed job ${job.id}: ${e.message}`);
          await refundJob(job);
          await query(`UPDATE video_jobs SET status='failed', error=$1, updated_at=now() WHERE id=$2`,
            [String(e.message).slice(0, 300), job.id]).catch(() => {});
        }
      } else if (status === 'failed') {
        const msg = d.task_status_msg || 'Kling generation failed';
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
let polling = false; // (2026-07-06) 재진입 가드 — pollOnce가 15초를 넘겨도(느린 다운로드/오디오 인라인) 틱이 겹치지 않게. 겹침=같은 잡 중복처리·attempts 부풀림·중복 Kling 호출의 원인.
function startPoller() {
  if (started) return;
  started = true;
  setInterval(() => {
    if (polling) { log.warn('pollOnce still running — skipping this tick'); return; }
    polling = true;
    pollOnce().catch((e) => log.error('pollOnce:', e.message)).finally(() => { polling = false; });
  }, POLL_INTERVAL_MS);
  log.info(`Video job poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
}

module.exports = { submit, getJob, pollOnce, startPoller };
