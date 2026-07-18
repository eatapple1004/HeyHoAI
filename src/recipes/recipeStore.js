/**
 * Recipe Store — 정본 레시피를 카드 id(slug(name))로 조회 가능한 메모리 맵으로 제공.
 *
 * 데이터 소스(2026-06 전환):
 *   - 런타임 정본 = DB `recipes` 테이블 (서버 부팅 시 init(db)로 메모리 로드).
 *   - 폴백 = 시드 JS(src/recipes/seeds/recipes.<section>.v2.js) — DB 미연결/0행/init 전.
 *   동기 API(getById/list)는 그대로 — 소비처(resolver·route) 수정 불필요.
 *
 * 시더(recipeDbSeed)는 DB가 아니라 항상 시드 JS를 읽어야 하므로 listSeed()를 쓴다(순환 방지).
 *
 * id 규칙은 scripts/recipe_card_contract.js 의 slug()와 동일해야 FE 카드
 * (public/js/recipes.generated.js)의 id와 1:1로 매칭된다.
 */
const path = require('path');
const { resolveToolId } = require('../tools/registry');

// 12개 섹션 (FE recipes.generated.js의 cards 키와 정합)
const SECTIONS = ['influencer', 'fashion', 'beauty', 'jewelry', 'food', 'coffee', 'home', 'tech', 'pet', 'ugc', 'general', 'headshot', 'productcut', 'studiomodel', 'producthero', 'accessories', 'bodywear'];

/** 카드 계약과 동일한 slug 규칙 (id = slug(name)) */
function slug(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** 섹션별 시드 로드: v2 우선, 없으면 v1 */
function loadSection(key) {
  for (const file of [`recipes.${key}.v2.js`, `recipes.${key}.js`]) {
    try {
      const mod = require(path.join(__dirname, 'seeds', file));
      if (Array.isArray(mod)) return mod;
      if (mod && Array.isArray(mod.recipes)) return mod.recipes;
    } catch (e) { /* 다음 후보 */ }
  }
  return [];
}

/** 시드 JS만으로 맵 구성 (폴백·시더 소스). 항상 파일 기준, DB 무관. */
function buildFromSeed() {
  const m = new Map();
  for (const key of SECTIONS) {
    for (const r of loadSection(key)) {
      if (!r || !r.name || !r.config) continue; // config 없는 항목 제외(생성 불가)
      const id = slug(r.name);
      const tool = resolveToolId(r.tool, r.output_type === 'reel' ? 'reel' : 'image');
      if (!m.has(id)) m.set(id, { ...r, id, section: key, tool });
    }
  }
  return m;
}

let MAP = null;        // 런타임 정본(메모리)
let SOURCE = 'seed';   // 'db' | 'seed'

/** 동기 접근: init 전이면 시드로 지연 빌드(폴백). */
function map() {
  if (!MAP) { MAP = buildFromSeed(); SOURCE = 'seed'; }
  return MAP;
}

/**
 * 부팅 시 DB `recipes` 테이블을 메모리로 로드. db = pg pool/client.
 * 실패/0행이면 시드 JS로 폴백(생성이 절대 멈추지 않게). { source, count } 반환.
 */
async function init(db) {
  try {
    const { rows } = await db.query(
      `SELECT id, name, section, mode, vertical, category, output_type, credit_cost,
              sort_order, tool, rationale, meta, config, text_overlay
         FROM recipes`
    );
    if (!rows.length) throw new Error('recipes 테이블이 비어 있음 — 시드 폴백');
    const m = new Map();
    for (const row of rows) {
      const tool = row.tool || resolveToolId(null, row.output_type === 'reel' ? 'reel' : 'image');
      const rec = { id: row.id, name: row.name, section: row.section, config: row.config, tool };
      // 시드 객체와 동일한 형태로 복원(undefined/null 키는 생략 — 동작 동일).
      if (row.mode != null) rec.mode = row.mode;
      if (row.vertical != null) rec.vertical = row.vertical;
      if (row.category != null) rec.category = row.category;
      if (row.output_type != null) rec.output_type = row.output_type;
      if (row.credit_cost != null) rec.credit_cost = row.credit_cost;
      if (row.sort_order != null) rec.sort_order = row.sort_order;
      if (row.rationale != null) rec.rationale = row.rationale;
      if (row.meta != null) rec.meta = row.meta;
      if (row.text_overlay != null) rec.text_overlay = row.text_overlay;
      m.set(row.id, rec);
    }
    MAP = m; SOURCE = 'db';
    return { source: 'db', count: m.size };
  } catch (e) {
    MAP = buildFromSeed(); SOURCE = 'seed';
    return { source: 'seed', count: MAP.size, error: e.message };
  }
}

/** id(slug)로 레시피 조회 */
function getById(id) {
  return map().get(String(id)) || null;
}

/** 전체/모드별 카드 메타 목록 (생성 가능한 것만).
 * config.parent_id 있는 자식(변형) 레시피는 카드 목록에서 제외 — 진입점은 부모 1장.
 * getById는 자식도 반환하므로 Studio가 컷 선택 시 자식 id로 resolve 가능. */
function list({ mode, vertical } = {}) {
  return [...map().values()]
    .filter((r) => !(r.config && r.config.parent_id))
    .filter((r) => !mode || r.mode === mode)
    .filter((r) => !vertical || r.vertical === vertical)
    .map((r) => ({
      id: r.id,
      name: r.name,
      mode: r.mode,
      vertical: r.vertical || null,
      category: r.category || null,
      type: r.output_type === 'reel' ? 'reel' : 'image',
      tool: r.tool,
      credit_cost: r.credit_cost,
      section: r.section,
      description: r.rationale || '',
    }));
}

/** 시더 전용: 항상 시드 JS 기준 전체 레시피(DB와 무관 — 순환 방지). */
function listSeed() {
  return [...buildFromSeed().values()];
}

/** 현재 런타임 데이터 소스('db' | 'seed') — 진단/로깅용. */
function getSource() {
  return SOURCE;
}

module.exports = { getById, list, slug, SECTIONS, init, listSeed, getSource };
