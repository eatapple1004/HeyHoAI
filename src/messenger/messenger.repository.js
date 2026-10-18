/**
 * ─── 메신저(카톡·LINE) 사용자 저장소 ───
 * (2026-10-18) messenger_users — 채널 사용자(external_id) ↔ Doppia 섀도 계정. 세션(고른 메뉴·AI 인물·마지막 결과·언어)도 여기.
 *   channel: 'line' | 'kakao' · lang: 'ko'|'ja'|'en' · menu: 'product'|'shoot' · model_id: 고른 공식 AI 인물(shoot_models.id)
 */
const { query } = require('../db/client');

const COLS = 'id, channel, external_id, user_id, lang, menu, model_id, last_result, free_left, created_at, updated_at';

async function find(channel, externalId) {
  const r = await query(`SELECT ${COLS} FROM messenger_users WHERE channel = $1 AND external_id = $2`, [channel, externalId]);
  return r.rows[0] || null;
}

async function insert({ channel, externalId, userId, lang, freeLeft }) {
  const r = await query(
    `INSERT INTO messenger_users (channel, external_id, user_id, lang, free_left) VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
    [channel, externalId, userId, lang || 'ko', freeLeft ?? 3]
  );
  return r.rows[0];
}

/** 부분 갱신 — 주어진 필드만 */
async function update(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return null;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const r = await query(`UPDATE messenger_users SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING ${COLS}`, [id, ...keys.map((k) => fields[k])]);
  return r.rows[0] || null;
}

module.exports = { find, insert, update };
