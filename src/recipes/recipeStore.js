/**
 * Recipe Store — 시드(src/recipes/seeds/recipes.<section>.v2.js, 폴백 v1)를 로드해
 * 카드 id(slug(name))로 조회 가능한 정본 레시피 맵으로 구성한다.
 *
 * id 규칙은 scripts/recipe_card_contract.js 의 slug()와 동일해야 FE 카드
 * (public/js/recipes.generated.js)의 id와 1:1로 매칭된다.
 */
const path = require('path');

// 12개 섹션 (FE recipes.generated.js의 cards 키와 정합)
const SECTIONS = ['influencer', 'fashion', 'beauty', 'jewelry', 'food', 'coffee', 'home', 'tech', 'pet', 'ugc', 'general', 'headshot'];

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

let MAP = null;
function build() {
  if (MAP) return MAP;
  MAP = new Map();
  for (const key of SECTIONS) {
    for (const r of loadSection(key)) {
      if (!r || !r.name || !r.config) continue; // config 없는 항목 제외(생성 불가)
      const id = slug(r.name);
      if (!MAP.has(id)) MAP.set(id, { ...r, id, section: key });
    }
  }
  return MAP;
}

/** id(slug)로 레시피 조회 */
function getById(id) {
  return build().get(String(id)) || null;
}

/** 전체/모드별 카드 메타 목록 (생성 가능한 것만) */
function list({ mode, vertical } = {}) {
  return [...build().values()]
    .filter((r) => !mode || r.mode === mode)
    .filter((r) => !vertical || r.vertical === vertical)
    .map((r) => ({
      id: r.id,
      name: r.name,
      mode: r.mode,
      vertical: r.vertical || null,
      category: r.category || null,
      type: r.output_type === 'reel' ? 'reel' : 'image',
      credit_cost: r.credit_cost,
      section: r.section,
      description: r.rationale || '',
    }));
}

module.exports = { getById, list, slug, SECTIONS };
