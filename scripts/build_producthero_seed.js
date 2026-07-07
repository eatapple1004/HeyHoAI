/**
 * build_producthero_seed.js — Cosmetics "Product Hero" 파라미터형 시드 생성
 * ------------------------------------------------------------------
 * 부모1 + 스타일 자식N (productcut nesting: config.parent_id).
 *   - 부모 "Product Hero" (vertical:producthero, category:Hero, meta.cuts=스타일 slug들)
 *   - 자식 = 스타일별 look+shots 오버라이드 + meta.fit(제품궁합 태그·픽커 필터용)
 * 베이스: 기존 recipes.producthero.v2.js(부모 + 기존 자식 10, beauty Hero 이관본이 정본)를
 *   그대로 보존하고, EXTRA(hand-authored 9종: 색조·향수·바디)를 append.
 *   ※ beauty.v2 Hero는 88b5843에서 producthero로 이관되며 제거됨 → 원본 재소싱 불가, 기존 시드가 정본.
 * 실행: node scripts/build_producthero_seed.js  → src/recipes/seeds/recipes.producthero.v2.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const existing = require(path.join(ROOT, 'src/recipes/seeds/recipes.producthero.v2.js'));
const parent = existing.find((x) => !x.config.parent_id); // 부모(Product Hero)
function slug(s){ return String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

// 공통 가드레일(단일 제품·라벨 고정·사람/손 없음) — 기존 스타일과 톤 통일
const GUARD = 'single product only, never duplicate or invent extra copies, packaging and label identical to the reference, do not fabricate lettering, product-only with no people or hands in frame,';
const NEG = 'warped or melted product, distorted label, gibberish typography, double product, duplicate copies, extra caps, harsh blown highlights, muddy crushed shadows, fingerprints, dust, cluttered background, oversaturated neon clipping, color banding, people, hands';

// (B) hand-authored 확장 스타일(색조·향수·바디). look/shots 직접 작성.
const EXTRA = [
  // ── Color 색조 (+4) ──
  {
    name: 'Bold Color Block', fit: ['color'],
    rationale: 'Graphic single-color studio block for lipsticks, compacts and color makeup — bold, clean, scroll-stopping.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:crisp_studio_flash', 'color:bold_flat_color_field', 'texture:clean_matte_pop', 'context:solid_color_block'],
      extra_positive: `premium beauty hero product photography, ${GUARD} the single product standing against a bold flat solid-color studio block backdrop that echoes the product shade, crisp hard studio flash from camera-left with a controlled soft fill, one clean graphic shadow, glossy acrylic base with a subtle reflection, modern editorial pop aesthetic, punchy high-contrast yet color-accurate brand packaging, shot on 100mm macro at f/8, tack-sharp legible label true to reference`,
      extra_negative: NEG + ', gradient background, busy pattern, dull flat lighting',
    },
    shots: [
      { scene: 'bold flat single-color block backdrop matched to the product shade, glossy acrylic base', pose: 'product standing upright, front face and label squared to camera', composition: 'medium_shot' },
      { scene: 'saturated solid color field with one crisp graphic shadow raking to the side', pose: 'product turned to a 3/4 hero angle showing front and side', composition: 'medium_shot' },
      { scene: 'tight frame on the cap and signature detail against the flat color, crisp specular highlight', pose: 'macro on the signature detail, label fully legible', composition: 'closeup' },
      { scene: 'product on a small color-matched acrylic riser, single simple geometric prop, bold cast shadow', pose: 'product staged on the podium, slight tilt, hero presentation', composition: 'medium_shot' },
    ],
  },
  {
    name: 'Gloss Mirror', fit: ['color', 'luxury'],
    rationale: 'Dramatic black-mirror reflection for lip, gloss and compacts — moody, glossy, premium.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:moody_directional_key', 'color:deep_black_reflective', 'texture:high_gloss_mirror', 'context:black_glass_surface'],
      extra_positive: `premium beauty hero product photography, ${GUARD} the single product on a polished black glass mirror surface with a sharp clean vertical mirror reflection beneath it, deep dark moody gradient backdrop, single directional key light with a crisp specular rim defining the edge, controlled reflections, dramatic luxe high-gloss mood, shot on 100mm macro at f/8, tack-sharp legible label true to reference, glossy jewel-like highlight on the cap`,
      extra_negative: NEG + ', washed-out background, flat frontal lighting, double reflection, cluttered props',
    },
    shots: [
      { scene: 'polished black glass mirror on a dark gradient backdrop, clean vertical reflection', pose: 'product upright, label squared to camera, reflection mirrored below', composition: 'medium_shot' },
      { scene: 'moody dark set with a single crisp rim light tracing the product silhouette', pose: 'product at a 3/4 hero angle, reflection anchoring it', composition: 'medium_shot' },
      { scene: 'macro on the cap and signature detail with a jewel-like specular highlight on black glass', pose: 'detail crop on the signature, label legible', composition: 'closeup' },
      { scene: 'product on a black glass plinth with a soft pool of light, minimal luxe staging', pose: 'hero presentation, subtle tilt, product dominant', composition: 'medium_shot' },
    ],
  },
  {
    name: 'Palette Flat-lay', fit: ['color', 'set'],
    rationale: 'Overhead flat-lay for palettes, compacts and multi-pan makeup — clean top-down grid.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:even_soft_overhead', 'color:warm_neutral_stone', 'texture:matte_paper_marble', 'context:top_down_flat_lay'],
      extra_positive: `premium beauty hero product photography, ${GUARD} an overhead top-down flat-lay of the single product opened flat on a warm neutral stone or matte paper surface, even soft overhead lighting with gentle directional shaping, all pans and shades true to the reference, a few minimal styling props kept sparse and out of the way, clean editorial flat-lay aesthetic, shot straight down on 50mm at f/8, tack-sharp legible label, color-accurate finish`,
      extra_negative: NEG + ', angled perspective, invented extra pans, busy clutter, harsh shadows',
    },
    shots: [
      { scene: 'top-down flat-lay on warm neutral stone, product opened flat and centered', pose: 'overhead, product squared to frame, all pans visible', composition: 'medium_shot' },
      { scene: 'flat-lay on matte paper with a soft directional highlight across the pans', pose: 'overhead with product slightly off-center, minimal negative space', composition: 'medium_shot' },
      { scene: 'tight overhead macro on the pans and finish detail true to reference', pose: 'top-down closeup on the shades and texture', composition: 'closeup' },
      { scene: 'flat-lay with one sparse prop (a brush) placed diagonally, calm neutral palette', pose: 'overhead styled composition, product dominant', composition: 'medium_shot' },
    ],
  },
  {
    name: 'Swatch Beside', fit: ['color'],
    rationale: 'Product paired with a clean cream swatch of itself — shows the shade and texture in one hero shot.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:soft_box_key_plus_fill', 'color:clean_neutral_studio', 'texture:cream_swatch_smear', 'context:stone_acrylic_slab'],
      extra_positive: `premium beauty hero product photography, ${GUARD} the single product standing beside one clean glossy cream swatch smear of its own shade drawn on a smooth stone or acrylic slab, the swatch color faithfully matching the product, soft box key with a gentle fill for even readable texture, minimal neutral studio backdrop, crisp macro detail on the swatch texture, modern clean-beauty aesthetic, shot on 100mm macro at f/8, tack-sharp legible label true to reference`,
      extra_negative: NEG + ', multiple messy swatches, wrong swatch color, smeared label, cluttered background',
    },
    shots: [
      { scene: 'smooth stone slab with one clean cream swatch smear beside the product', pose: 'product upright with the swatch drawn in front to camera-right', composition: 'medium_shot' },
      { scene: 'neutral studio set, product at a 3/4 angle with the shade swatch leading the eye', pose: 'product turned to hero angle, swatch anchoring the composition', composition: 'medium_shot' },
      { scene: 'macro on the glossy swatch texture and pigment, product soft behind', pose: 'detail crop on the swatch, product out of focus', composition: 'closeup' },
      { scene: 'acrylic slab with the product and a curved swatch stroke, minimal shadow', pose: 'styled hero pairing product and swatch, product dominant', composition: 'medium_shot' },
    ],
  },
  // ── Fragrance 향수 (+2, 향수-네이티브) ──
  {
    name: 'Light Caustics', fit: ['fragrance'],
    rationale: 'Sunlit water-caustic light dancing across the bottle — warm, luminous, fragrance-native.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:warm_sun_caustics', 'color:golden_warm_glow', 'texture:glass_light_refraction', 'context:sunlit_pool_ripple'],
      extra_positive: `premium luxury fragrance hero product photography, ${GUARD} the single glass bottle catching rippling sunlit water-caustic light patterns dancing across its surface and the surrounding surface, warm golden hour glow, backlit glass refracting light through the liquid, soft gradient backdrop, luminous airy caustic reflections, elegant refined mood, shot on 100mm macro at f/8, tack-sharp legible label true to reference, jewel-like specular highlights in the glass`,
      extra_negative: NEG + ', cold flat lighting, murky water, distorted caustic noise, cluttered background',
    },
    shots: [
      { scene: 'warm sunlit surface with rippling caustic light across the bottle and backdrop', pose: 'bottle upright, label squared to camera, caustics playing over the glass', composition: 'medium_shot' },
      { scene: 'backlit glass glowing with refracted golden light, soft gradient behind', pose: 'bottle at a 3/4 hero angle, light passing through the liquid', composition: 'medium_shot' },
      { scene: 'macro on the shoulder and cap with jewel-like caustic highlights', pose: 'detail crop on the glass edge and stopper', composition: 'closeup' },
      { scene: 'bottle on a warm stone ledge with dappled sun caustics and a soft shadow', pose: 'styled hero, warm luminous presentation, product dominant', composition: 'medium_shot' },
    ],
  },
  {
    name: 'Mineral Crystal', fit: ['fragrance', 'luxury'],
    rationale: 'Bottle on raw quartz and mineral — cool, sculptural, high-luxe fragrance staging.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:cool_directional_key', 'color:cool_stone_mineral', 'texture:raw_crystal_quartz', 'context:mineral_plinth'],
      extra_positive: `premium luxury fragrance hero product photography, ${GUARD} the single glass bottle staged on a raw quartz crystal and natural mineral plinth with a few sculptural stone accents, cool directional key light with a crisp specular rim, refined gallery-like backdrop, controlled shadows, sculptural high-luxe editorial mood, shot on 100mm macro at f/8, tack-sharp legible label true to reference, cool jewel-like highlights on glass and crystal facets`,
      extra_negative: NEG + ', plastic-looking fake crystal, warm muddy tone, busy clutter, flat frontal light',
    },
    shots: [
      { scene: 'raw quartz and mineral plinth on a cool gallery backdrop', pose: 'bottle upright on the crystal, label squared to camera', composition: 'medium_shot' },
      { scene: 'sculptural stone set with a crisp rim light on the glass and crystal facets', pose: 'bottle at a 3/4 hero angle, crystals framing the base', composition: 'medium_shot' },
      { scene: 'macro on the bottle shoulder resting against a quartz facet, cool highlights', pose: 'detail crop on glass meeting crystal', composition: 'closeup' },
      { scene: 'bottle on a mineral slab with one sculptural stone accent, soft cool shadow', pose: 'minimal luxe hero staging, product dominant', composition: 'medium_shot' },
    ],
  },
  // ── Body / Bath 바디 (+3, 신규 fit) ──
  {
    name: 'Wet Tile Spa', fit: ['body', 'skincare'],
    rationale: 'Product on wet stone tile with soft steam — clean spa hero for body & bath.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:soft_natural_daylight', 'color:calm_neutral_spa', 'texture:wet_stone_tile_steam', 'context:spa_bath_ledge'],
      extra_positive: `premium body and bath hero product photography, ${GUARD} the single product standing on a wet natural stone or matte tile surface with fine water beading and a hint of soft steam, calm neutral spa palette, soft diffused natural daylight from the side, gentle wet sheen and clean reflection, fresh serene wellness mood, shot on 100mm macro at f/8, tack-sharp legible label true to reference, color-accurate packaging`,
      extra_negative: NEG + ', heavy fog obscuring product, dirty grout, harsh sun, cluttered bathroom clutter',
    },
    shots: [
      { scene: 'wet natural stone tile with water beading and faint steam, soft daylight', pose: 'product upright, label squared to camera, wet sheen below', composition: 'medium_shot' },
      { scene: 'calm neutral spa ledge with a soft reflection on the wet surface', pose: 'product at a 3/4 hero angle, steam softly behind', composition: 'medium_shot' },
      { scene: 'macro on the pump or cap with water droplets, shallow depth', pose: 'detail crop on the dispenser and beading water', composition: 'closeup' },
      { scene: 'product on a wet stone ledge with a folded towel and a eucalyptus sprig out of focus', pose: 'styled spa hero, product dominant', composition: 'medium_shot' },
    ],
  },
  {
    name: 'Bath Ledge', fit: ['body'],
    rationale: 'Sunny bath-side ledge with towels and greenery — warm lifestyle-adjacent body hero.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:warm_window_daylight', 'color:warm_neutral_home', 'texture:linen_ceramic_matte', 'context:tub_edge_lifestyle'],
      extra_positive: `premium body care hero product photography, ${GUARD} the single product staged on a clean bright bathtub or basin ledge with soft folded linen towels and a touch of greenery, warm window daylight casting a gentle natural shadow, airy home-spa lifestyle setting kept clean and uncluttered, product remains the clear hero, shot on 85mm at f/5.6, tack-sharp legible label true to reference, warm inviting mood`,
      extra_negative: NEG + ', messy cluttered bathroom, busy background, harsh contrast, product lost in the scene',
    },
    shots: [
      { scene: 'bright tub ledge with folded linen towels and soft greenery, warm daylight', pose: 'product upright and forward, label squared to camera', composition: 'medium_shot' },
      { scene: 'sunlit basin ledge with a gentle natural shadow, airy home-spa mood', pose: 'product at a 3/4 hero angle, towels softly behind', composition: 'medium_shot' },
      { scene: 'macro on the cap and label with warm window light and soft bokeh greenery', pose: 'detail crop on the dispenser, background out of focus', composition: 'closeup' },
      { scene: 'product on the ledge with one plant and a rolled towel, clean lifestyle staging', pose: 'styled hero, product clearly dominant in frame', composition: 'medium_shot' },
    ],
  },
  {
    name: 'Foam & Suds', fit: ['body'],
    rationale: 'Soft lather and bubbles around the bottle — fresh, tactile hero for washes & cleansers.',
    look: {
      style_preset: 'Studio Beauty',
      attributes: ['lighting:bright_clean_key', 'color:fresh_light_airy', 'texture:soft_foam_bubbles', 'context:clean_studio_wet'],
      extra_positive: `premium body wash and cleanser hero product photography, ${GUARD} the single product surrounded by soft clean foam lather and delicate bubbles on a smooth wet surface, bright fresh airy palette, clean key light with a soft rim to catch the bubbles, crisp macro sparkle on the suds, fresh energetic clean mood, shot on 100mm macro at f/8, tack-sharp legible label true to reference, color-accurate packaging`,
      extra_negative: NEG + ', dirty grey foam, messy overflow covering the label, murky water, cluttered background',
    },
    shots: [
      { scene: 'smooth wet surface with soft clean foam and delicate bubbles around the product', pose: 'product upright, label kept clear of the foam, squared to camera', composition: 'medium_shot' },
      { scene: 'bright fresh set with rim-lit bubbles catching the light beside the product', pose: 'product at a 3/4 hero angle, lather curling around the base', composition: 'medium_shot' },
      { scene: 'macro on sparkling suds and a few crisp bubbles against the cap', pose: 'detail crop on the foam texture and dispenser', composition: 'closeup' },
      { scene: 'product on a wet ledge with a light drift of foam and a soft clean shadow', pose: 'styled fresh hero, product dominant and label readable', composition: 'medium_shot' },
    ],
  },
];

// 기존 자식(정본 look/shots) — EXTRA와 이름 중복은 제외해 재실행 시 중복 append 방지(idempotent)
const EXTRA_NAMES = new Set(EXTRA.map((e) => e.name));
const baseChildren = existing.filter((x) => x.config.parent_id && !EXTRA_NAMES.has(x.name));

// ── 확장 자식(EXTRA) → 시드 자식 형태로 변환 ──
const extraChildren = EXTRA.map((e, i) => ({
  mode: 'product', vertical: 'producthero', category: 'Hero', name: e.name,
  output_type: 'image_set', credit_cost: 2, sort_order: baseChildren.length + 2 + i,
  rationale: (e.rationale || '').slice(0, 200),
  meta: { parent_fit: e.fit, fit: e.fit }, // fit = 제품궁합 태그(빈 배열=범용)
  config: {
    schema_version: 1, mode: 'product', parent_id: 'product-hero',
    look: e.look,
    shot_strategy: 'list',
    shots: e.shots,
  },
}));

const allChildren = [...baseChildren, ...extraChildren];

// ── 부모(기존 보존 + cuts 갱신) ──
const newParent = JSON.parse(JSON.stringify(parent));
newParent.sort_order = 1;
newParent.rationale = 'One product photo into a clean, premium hero shot for your PDP and ads — no studio. Pick a mood style filtered by your product type (skincare, color makeup, fragrance, body & bath). The product is the hero; the exact packaging is locked to your reference.';
newParent.meta.cuts = allChildren.map((c) => slug(c.name));
newParent.meta.render_notes = 'Parent = shared base + default Dewy Glass. Style children override look + shots. meta.fit tags drive the product-fit filter in the picker (skincare/color/fragrance/luxury/set/body).';

const recipes = [newParent, ...allChildren];

const header = `/* ⚠️ AUTO-GENERATED — node scripts/build_producthero_seed.js\n * Cosmetics "Product Hero" 파라미터형(부모1 + 스타일 자식N). look/shots=beauty Hero 이식 10 + 확장 9(색조·향수·바디).\n * 자식 meta.fit = 제품궁합 태그(picker 필터). productcut과 동일 nesting(config.parent_id).\n */\n`;
const out = path.join(ROOT, 'src/recipes/seeds/recipes.producthero.v2.js');
fs.writeFileSync(out, header + 'module.exports = ' + JSON.stringify(recipes, null, 2) + ';\n');
console.log('생성:', recipes.length, '항목 (부모1 + 자식' + (recipes.length - 1) + ')');
console.log('스타일:', recipes.slice(1).map((r) => r.name + '[' + (r.meta.fit.join(',') || '범용') + ']').join(' · '));
