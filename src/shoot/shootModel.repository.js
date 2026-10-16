/**
 * ─── Shoot 모델(내 캐릭터) 저장소 ───
 * (2026-10-16) shoot_models — Doppia Shoot 의 "Create your model". 힉스필드 Soul ID(custom reference) 한 건 + 장면 뱅크.
 *   status: training(Soul ID 학습 중) · bank(장면 생성 중) · ready · failed  (다각도는 학습 전 별도 잡 — service angleJobs)
 *   photos = 학습에 넣은 공개 URL들 · bank = [{url,label}] (우리 /images 경로) · avatar = 얼굴 클로즈업
 */
const { query } = require('../db/client');

const COLS = 'id, user_id, team_id, name, status, hf_reference_id, photos, bank, avatar, error, charged, created_at, updated_at';

async function insert({ userId, teamId, name, status, photos, charged }) {
  const r = await query(
    `INSERT INTO shoot_models (user_id, team_id, name, status, photos, charged) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
    [userId, teamId || null, name, status, JSON.stringify(photos || []), !!charged]
  );
  return r.rows[0];
}

async function findById(id) {
  const r = await query(`SELECT ${COLS} FROM shoot_models WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

/** 개인이면 본인·비팀, 팀 컨텍스트면 팀 소유 */
async function findMine(userId, teamId) {
  const r = teamId
    ? await query(`SELECT ${COLS} FROM shoot_models WHERE team_id = $1 ORDER BY created_at DESC`, [teamId])
    : await query(`SELECT ${COLS} FROM shoot_models WHERE user_id = $1 AND team_id IS NULL ORDER BY created_at DESC`, [userId]);
  return r.rows;
}

/** 부분 갱신 — 주어진 필드만. jsonb 는 문자열로 넘긴다. */
async function update(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return findById(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const vals = keys.map((k) => (k === 'photos' || k === 'bank') ? JSON.stringify(fields[k]) : fields[k]);
  const r = await query(`UPDATE shoot_models SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING ${COLS}`, [id, ...vals]);
  return r.rows[0] || null;
}

module.exports = { insert, findById, findMine, update };
