/**
 * Product Pack — repository (content_packs · pack_assets).
 *
 * 자기완결: 공유 hot파일(migrate.js)을 안 건드리고 ensureSchema()로 IF NOT EXISTS 생성.
 *   통합 시점에 migrate.js로 접어넣어도 됨(동일 DDL).
 */
const crypto = require('crypto');
const { query } = require('../db/client');

let _ensured = false;
async function ensureSchema() {
  if (_ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS content_packs (
      id         BIGSERIAL PRIMARY KEY,
      share_id   TEXT UNIQUE NOT NULL,
      user_id    TEXT,
      vertical   TEXT,
      product    TEXT,
      config     JSONB DEFAULT '{}'::jsonb,
      status     TEXT NOT NULL DEFAULT 'processing',
      error      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
  await query(`
    CREATE TABLE IF NOT EXISTS pack_assets (
      id         BIGSERIAL PRIMARY KEY,
      pack_id    BIGINT NOT NULL,
      kind       TEXT NOT NULL,
      cut_key    TEXT,
      label      TEXT,
      url        TEXT,
      meta       JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
  await query(`CREATE INDEX IF NOT EXISTS idx_pack_assets_pack ON pack_assets(pack_id);`);
  _ensured = true;
}

async function createPack({ userId, vertical, product, config }) {
  await ensureSchema();
  const shareId = crypto.randomUUID();
  const r = await query(
    `INSERT INTO content_packs (share_id, user_id, vertical, product, config)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, share_id, status, created_at`,
    [shareId, userId != null ? String(userId) : null, vertical, product, JSON.stringify(config || {})]
  );
  return r.rows[0];
}

async function setStatus(packId, status, error) {
  await query(`UPDATE content_packs SET status=$2, error=$3, updated_at=now() WHERE id=$1`,
    [packId, status, error || null]);
}

/** 팩의 크리에이션 prompt_idx를 config에 병합 저장(재생성분도 같은 배치에 묶이게). */
async function setPromptIdx(packId, promptIdx) {
  await query(
    `UPDATE content_packs
        SET config = coalesce(config,'{}'::jsonb) || jsonb_build_object('prompt_idx', $2::int),
            updated_at = now()
      WHERE id = $1`,
    [packId, promptIdx]
  );
}

/** 플래너가 컷을 확정하는 즉시 예상 슬롯목록을 config.plan 에 병합 저장(JSONB merge — 스키마 변경 없음).
 *  → GET 이 config.plan 을 실어주면 클라가 총개수·컷라벨을 알고 "생성되는 수만큼" 플레이스홀더를 깐다. */
async function setPlan(packId, plan) {
  await query(
    `UPDATE content_packs
        SET config = coalesce(config,'{}'::jsonb) || jsonb_build_object('plan', $2::jsonb),
            updated_at = now()
      WHERE id = $1`,
    [packId, JSON.stringify(plan || {})]
  );
}

async function addAsset({ packId, kind, cutKey, label, url, meta }) {
  const r = await query(
    `INSERT INTO pack_assets (pack_id, kind, cut_key, label, url, meta)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [packId, kind, cutKey || null, label || null, url || null, JSON.stringify(meta || {})]
  );
  return r.rows[0].id;
}

/** 소유권 포함 조회(공유 링크는 share_id, 내 팩은 id). */
async function getPack({ id, shareId, userId }) {
  await ensureSchema();
  const where = id ? 'id=$1' : 'share_id=$1';
  const p = await query(
    `SELECT id, share_id, user_id, vertical, product, config, status, error, created_at
       FROM content_packs WHERE ${where}`, [id || shareId]);
  if (!p.rows[0]) return null;
  const pack = p.rows[0];
  const a = await query(
    `SELECT kind, cut_key, label, url, meta FROM pack_assets WHERE pack_id=$1 ORDER BY id`, [pack.id]);
  pack.assets = a.rows;
  return pack;
}

module.exports = { ensureSchema, createPack, setStatus, setPlan, setPromptIdx, addAsset, getPack };
