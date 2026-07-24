/**
 * Product Pack — repository (content_packs · pack_assets).
 *
 * 자기완결: 공유 hot파일(migrate.js)을 안 건드리고 ensureSchema()로 IF NOT EXISTS 생성.
 *   통합 시점에 migrate.js로 접어넣어도 됨(동일 DDL).
 */
const crypto = require('crypto');
const { query } = require('../db/client');

// 활동이 이 시간 넘게 없는 'processing' 팩 = 죽은 것으로 본다.
//   창은 **정상 생성의 최대 공백**보다 넉넉해야 한다: 플래너 차수(최대 4회 × 상태 수) + 레퍼 베이크가
//   첫 자산 전에 몰려 있고, provider 타임아웃이 컷당 최대 ~6분이다.
const STALE_MIN = Number(process.env.PACK_STALE_MIN) || 15;
const STALE_ERROR = '생성이 중간에 끊겼어요(서버 재시작 등). "이어서 만들기"를 누르면 남은 컷부터 계속합니다.';

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

/**
 * 🧟 죽은 팩 회수 — 'processing'인데 **활동이 끊긴 지** N분 넘은 것을 failed로 내린다.
 *
 * 왜 필요한가: 생성은 `setImmediate` 백그라운드라 pm2 restart·크래시와 **함께 사라진다**.
 *   그런데 DB엔 status='processing'이 그대로 남아 화면은 영원히 스피너였다 — 복구 수단이 아예 없었다.
 *
 * liveness = max(updated_at, 마지막 자산 생성시각). 생성 중이면 컷마다 자산이 쌓여 계속 갱신되므로
 *   "오래 걸리는 정상 생성"과 "죽은 팩"이 구분된다(updated_at만 보면 정상 생성도 죽은 걸로 오인).
 * ⚠️ 부팅 시 무조건 회수는 금물 — 같은 DB를 보는 다른 프로세스(로컬 :3001이 prod DB를 본다)가
 *    뜰 때 남의 진행 중 팩을 죽인다. 그래서 회수는 **언제 불리든** 이 활동 창을 지킨다.
 */
async function failStale(minutes = STALE_MIN, error) {
  await ensureSchema();
  const r = await query(
    `UPDATE content_packs c
        SET status='failed', error=$2, updated_at=now()
      WHERE c.status='processing'
        AND GREATEST(c.updated_at,
                     COALESCE((SELECT MAX(a.created_at) FROM pack_assets a WHERE a.pack_id=c.id), c.updated_at))
            < now() - make_interval(mins => $1::int)
      RETURNING c.id`,
    [Math.max(1, Number(minutes) || STALE_MIN), error || STALE_ERROR]
  );
  return r.rows.map((x) => x.id);
}

/** 활동 없음 판정(회수 SQL과 **같은 규칙**을 조회 경로에서도 쓴다). pack.assets가 실려 있어야 정확. */
function isStale(pack, minutes = STALE_MIN) {
  if (!pack || pack.status !== 'processing') return false;
  const ts = [pack.updated_at, ...(pack.assets || []).map((a) => a.created_at)]
    .map((t) => new Date(t).getTime()).filter(Number.isFinite);
  if (!ts.length) return false;   // updated_at을 안 실어온 조회 → 판단하지 않는다(오탐 금지)
  return Date.now() - Math.max(...ts) > Math.max(1, Number(minutes) || STALE_MIN) * 60000;
}

/** config에 임의 키를 병합 저장(JSONB merge — 스키마 변경 0). setPlan/setPromptIdx의 일반형. */
async function mergeConfig(packId, patch) {
  await query(
    `UPDATE content_packs
        SET config = coalesce(config,'{}'::jsonb) || $2::jsonb, updated_at = now()
      WHERE id = $1`,
    [packId, JSON.stringify(patch || {})]
  );
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
  // updated_at·자산 created_at = 활동 시각(isStale이 죽은 팩을 가려내는 근거). 조회에 항상 실어준다.
  const p = await query(
    `SELECT id, share_id, user_id, vertical, product, config, status, error, created_at, updated_at
       FROM content_packs WHERE ${where}`, [id || shareId]);
  if (!p.rows[0]) return null;
  const pack = p.rows[0];
  const a = await query(
    `SELECT kind, cut_key, label, url, meta, created_at FROM pack_assets WHERE pack_id=$1 ORDER BY id`, [pack.id]);
  pack.assets = a.rows;
  return pack;
}

module.exports = {
  ensureSchema, createPack, setStatus, setPlan, setPromptIdx, addAsset, getPack,
  failStale, isStale, mergeConfig, STALE_MIN, STALE_ERROR,
};
