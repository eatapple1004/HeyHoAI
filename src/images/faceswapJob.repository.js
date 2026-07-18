// faceswapJob.repository.js — faceswap_jobs 큐 접근 (On Model stage-2).
//   원자적 claim(FOR UPDATE SKIP LOCKED)으로 다중 워커 안전. 설계: docs/onmodel_faceswap_설계_2026-07-18.md
const { query } = require('../db/client');

// 잡 enqueue (generate.route가 stage-1 생성 직후 호출).
async function insert(job) {
  const {
    userId, teamId = null, promptIdx = null, characterId = null,
    sourceFacePath, stage1Filename, modelId = null, visibility = 'public',
    templateId = null, templateSource = null, templateName = null,
    genMeta = {}, chargeAmount = 0,
  } = job;
  const { rows } = await query(
    `INSERT INTO faceswap_jobs
       (user_id, team_id, prompt_idx, character_id, source_face_path, stage1_filename,
        model_id, visibility, template_id, template_source, template_name, gen_meta, charge_amount, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'queued')
     RETURNING *`,
    [userId, teamId, promptIdx, characterId, sourceFacePath, stage1Filename,
     modelId, visibility, templateId, templateSource, templateName, JSON.stringify(genMeta), chargeAmount],
  );
  return rows[0];
}

// 원자적으로 다음 queued 잡 1건을 claim → processing. 없으면 null. 다중 워커 안전(SKIP LOCKED).
async function claimNext() {
  const { rows } = await query(
    `UPDATE faceswap_jobs SET status='processing', attempts=attempts+1, updated_at=now()
     WHERE id = (
       SELECT id FROM faceswap_jobs WHERE status='queued'
       ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
     )
     RETURNING *`,
  );
  return rows[0] || null;
}

async function markSucceeded(id, { resultIdx, resultUrl }) {
  await query(
    `UPDATE faceswap_jobs SET status='succeeded', result_idx=$2, result_url=$3, error=NULL, updated_at=now() WHERE id=$1`,
    [id, resultIdx, resultUrl],
  );
}

async function markFailed(id, { error }) {
  await query(
    `UPDATE faceswap_jobs SET status='failed', error=$2, updated_at=now() WHERE id=$1`,
    [id, String(error || '').slice(0, 500)],
  );
}

// 크래시/재배포로 processing에 갇힌 잡 회수 — attempts 한도 내면 재큐, 초과면 실패.
//   (video 폴러의 finalizing 회수와 동일 정신. 워커가 죽으면 updated_at이 안 갱신됨.)
async function reapStuck({ staleMinutes = 10, maxAttempts = 3 } = {}) {
  await query(
    `UPDATE faceswap_jobs SET status='queued', updated_at=now()
     WHERE status='processing' AND attempts < $2 AND updated_at < now() - ($1 || ' minutes')::interval`,
    [String(staleMinutes), maxAttempts],
  );
  const { rows } = await query(
    `UPDATE faceswap_jobs SET status='failed', error='exceeded max attempts (stuck)', updated_at=now()
     WHERE status='processing' AND attempts >= $2 AND updated_at < now() - ($1 || ' minutes')::interval
     RETURNING id`,
    [String(staleMinutes), maxAttempts],
  );
  return rows.length; // 최종 실패로 전환된 수(환불은 워커 부트에서 처리 가능)
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM faceswap_jobs WHERE id=$1`, [id]);
  return rows[0] || null;
}

module.exports = { insert, claimNext, markSucceeded, markFailed, reapStuck, findById };
