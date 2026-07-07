/**
 * build_producthero_seed.js — Cosmetics "Product Hero" 파라미터형 시드 생성
 * ------------------------------------------------------------------
 * beauty Hero 10종을 productcut처럼 부모1 + 스타일 자식10으로 재구성.
 *   - 부모 "Product Hero" (vertical:producthero, category:Hero, meta.cuts=스타일들)
 *   - 자식 = 스타일별 look+shots 오버라이드 + meta.fit(제품궁합 태그·픽커 필터용)
 * 소스 look/shots = recipes.beauty.v2.js의 Hero 카테고리 그대로 이식.
 * 실행: node scripts/build_producthero_seed.js  → src/recipes/seeds/recipes.producthero.v2.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const beauty = require(path.join(ROOT, 'src/recipes/seeds/recipes.beauty.v2.js'));
const hero = beauty.filter((x) => x.category === 'Hero');

// 원본명 → {깔끔한 스타일명, 제품궁합 fit 태그}
const MAP = {
  'Dewy Glass Hero':      { name: 'Dewy Glass',        fit: [] },                    // 범용(전체 필터 노출)
  'Liquid Splash Hero':   { name: 'Liquid Splash',     fit: ['skincare'] },
  'Botanical Dew':        { name: 'Botanical Dew',     fit: ['skincare'] },
  'Aqua Float':           { name: 'Aqua Float',        fit: ['skincare'] },
  'Cryo Frost Hero':      { name: 'Cryo Frost',        fit: ['skincare'] },
  'Noir Gold Hero':       { name: 'Noir Gold',         fit: ['luxury', 'fragrance'] },
  'Silk Drape Hero':      { name: 'Silk Drape',        fit: ['luxury', 'fragrance'] },
  'Stone Plinth Luxe':    { name: 'Stone Plinth Luxe', fit: ['luxury', 'skincare'] },
  'Sunlit Pop':           { name: 'Sunlit Pop',        fit: ['color'] },
  'Gift Set Group Hero':  { name: 'Gift Set Group',    fit: ['set'] },
};
const ORDER = ['Dewy Glass Hero','Liquid Splash Hero','Botanical Dew','Aqua Float','Cryo Frost Hero','Noir Gold Hero','Silk Drape Hero','Stone Plinth Luxe','Sunlit Pop','Gift Set Group Hero'];
function slug(s){ return String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

const byName = {}; hero.forEach((h) => { byName[h.name] = h; });
const parentDefault = byName['Dewy Glass Hero']; // 부모 기본 = 범용 Dewy Glass

const recipes = [];
// ── 부모 ──
recipes.push({
  mode: 'product', vertical: 'producthero', category: 'Hero', name: 'Product Hero',
  output_type: 'image_set', credit_cost: 2, sort_order: 1,
  rationale: 'One product photo into a clean, premium hero shot for your PDP and ads — no studio. Pick a mood style (dewy, splash, luxe, botanical, cryo, silk, sunlit, aqua…) filtered by your product type. The product is the hero; the exact packaging is locked to your reference.',
  meta: { cuts: ORDER.map((n) => slug(MAP[n].name)), flags: ['experimental','needs_human_review'],
    render_notes: 'Parent = shared base + default Dewy Glass. Style children override look + shots. meta.fit tags drive the product-fit filter in the picker.' },
  config: {
    schema_version: 1, mode: 'product',
    output: parentDefault.config.output,
    subject: parentDefault.config.subject,
    look: parentDefault.config.look,
    shot_strategy: 'list',
    shots: parentDefault.config.shots,
  },
});
// ── 스타일 자식 10 ──
ORDER.forEach((origName, i) => {
  const src = byName[origName]; const m = MAP[origName];
  recipes.push({
    mode: 'product', vertical: 'producthero', category: 'Hero', name: m.name,
    output_type: 'image_set', credit_cost: 2, sort_order: i + 2,
    rationale: (src.rationale || '').slice(0, 200),
    meta: { parent_fit: m.fit, fit: m.fit }, // fit = 제품궁합 태그(빈 배열=범용)
    config: {
      schema_version: 1, mode: 'product', parent_id: 'product-hero',
      look: src.config.look,
      shot_strategy: 'list',
      shots: src.config.shots,
    },
  });
});

const header = `/* ⚠️ AUTO-GENERATED — node scripts/build_producthero_seed.js\n * Cosmetics "Product Hero" 파라미터형(부모1 + 스타일 자식10). look/shots=beauty Hero 이식.\n * 자식 meta.fit = 제품궁합 태그(picker 필터). productcut과 동일 nesting(config.parent_id).\n */\n`;
const out = path.join(ROOT, 'src/recipes/seeds/recipes.producthero.v2.js');
fs.writeFileSync(out, header + 'module.exports = ' + JSON.stringify(recipes, null, 2) + ';\n');
console.log('생성:', recipes.length, '항목 (부모1 + 자식' + (recipes.length - 1) + ')');
console.log('스타일:', recipes.slice(1).map((r) => r.name + '[' + (r.meta.fit.join(',') || '범용') + ']').join(' · '));
