/**
 * ─── Doppia Lens (2026-10-16) ───
 *
 * "AI 콘텐츠의 제작 방식과 설정을 재사용 가능한 템플릿으로 묶어, 내 제품·인물 이미지만 넣으면
 *  원하는 콘셉트의 콘텐츠를 반복 제작·공유" — 힉스필드 Apps(REA 캡처: 검색·카테고리·카드 → 앱 안 Upload→Generate→Pick) 구성을 따른다.
 *
 * 렌즈 1개 = { kind(image|video), engine(registry tool id), prompt(콘셉트), negative, aspect, imageSize, count,
 *            shots[{name,prompt}](있으면 컷마다 1장), inputs[{key:'product'|'person', label, required}],
 *            refs[/images/..](스타일 참고 — 결과에 복사 금지), extras, duration(영상) }
 * 생성은 기존 파이프라인 재사용: 이미지 = POST /api/generate 핸들러, 영상 = videoJob.submit — 과금·저장·Library 그대로.
 * 공개범위: private(나만) · link(링크 아는 사람) · public(갤러리). 공식 렌즈(owner 없음)는 코드 시드(ensureOfficial).
 * 남의 렌즈를 쓸 땐 프롬프트·참고 이미지를 내려주지 않는다(제작 방식 = 만든 사람의 자산, 마켓 블랙박스와 같은 원칙).
 */
const crypto = require('crypto');
const { query } = require('../db/client');
const { getTool, isToolAvailable } = require('../tools/registry');

const CATEGORIES = ['product', 'on-model', 'beauty', 'fashion', 'jewelry', 'tech', 'food', 'video'];
const VIS = ['private', 'link', 'public'];

// 공식 렌즈 — 한국 커머스(스마트스토어·쿠팡·인스타) 기준 자주 쓰는 콘셉트. 커버는 dev 에서 실제로 돌린 결과로 채운다(cover_url).
const OFFICIAL = [
  { slug: 'clean-studio', title: 'Clean Studio', category: 'product', description: 'White seamless packshot — the default for detail pages and marketplaces.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '1:1', count: 2, inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: 'Premium e-commerce packshot of the product on a pure white seamless studio background. Soft large softbox from the front-left, gentle fill, a soft natural contact shadow under the product. Product centered, filling about 70% of the frame, perfectly sharp, true-to-life colors. No props, no text.' } },
  { slug: 'marble-vanity', title: 'Marble Vanity', category: 'beauty', description: 'Bright bathroom counter, morning window light — skincare & cosmetics.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', count: 2, inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: 'The product standing on a white marble bathroom vanity, soft morning window light from the side, blurred bright bathroom background with a hint of greenery, a few water droplets on the marble, fresh and clean premium skincare mood. Editorial beauty photography, shallow depth of field.' } },
  { slug: 'in-hand', title: 'In-Hand Lifestyle', category: 'product', description: 'A hand holding your product outdoors — feels real, great for Instagram.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', count: 2, inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: 'A woman\'s hand with natural neutral nails holding the product toward the camera outdoors on a sunny city street, background softly blurred with warm bokeh, natural daylight, candid lifestyle smartphone-style photo, the product label clearly readable and facing the camera.' } },
  { slug: 'flat-lay', title: 'Flat Lay Story', category: 'product', description: 'Top-down styled flat lay with matching props.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '1:1', count: 2, inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: 'Top-down flat lay of the product on a soft beige linen background, styled with a few complementary props that match its colors and category (e.g. dried flowers, a ceramic dish, a folded card), balanced editorial composition with breathing room, soft even daylight, no harsh shadows.' } },
  { slug: 'detail-page-set', title: 'Detail Page Set', category: 'product', description: '4 cuts for a Coupang/Smartstore detail page: hero, angle, macro, scale.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '1:1', count: 1, inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: 'Clean commercial product photography for an online store detail page, light grey studio background, soft even lighting, true-to-life colors, crisp focus.',
      shots: [{ name: 'Hero', prompt: 'Front hero shot, product centered and upright.' }, { name: 'Angle', prompt: 'Three-quarter angle view showing depth and side.' },
        { name: 'Macro', prompt: 'Extreme close-up macro of the most distinctive texture or detail of the product.' }, { name: 'Scale', prompt: 'The product held in an adult hand to show its real size.' }] } },
  { slug: 'street-snap', title: 'Street Snap', category: 'fashion', description: 'Your model wearing/holding your product — Seoul street snap.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '3:4', count: 2, inputs: [{ key: 'person', label: 'Model photo', required: true }, { key: 'product', label: 'Your product', required: true }],
      prompt: 'Candid Seoul street-style fashion snap: the model walks on a stylish Seongsu-dong street wearing or carrying the product naturally, golden afternoon light, 35mm lens, shallow depth of field, editorial magazine look.' } },
  { slug: 'holiday-gift', title: 'Holiday Gift', category: 'product', description: 'Festive gift-giving scene for seasonal promos.',
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', count: 2, inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: 'The product presented as a holiday gift on a cozy wooden table, with ribbon, wrapping paper and warm fairy-light bokeh in the background, soft warm tungsten light, festive but premium mood.' } },
  { slug: 'reveal-reel', title: 'Product Reveal Reel', category: 'video', description: '5-second 9:16 reel — slow orbit and light sweep across your product.',
    config: { kind: 'video', engine: 'seedance-2.5', engineFallbacks: ['kling', 'wan-3'], aspect: '9:16', duration: 5, inputs: [{ key: 'product', label: 'Product photo (start frame)', required: true }],
      prompt: 'Slow cinematic camera orbit around the product with a soft light sweep gliding across its surface, subtle floating dust particles, premium commercial reveal, the product stays exactly the same.' } },
  // (10-16) 이미 시장에 나간 Doppia 템플릿(레시피) 기반 — recipeId 로 실행 시점에 레시피를 풀어 컷 목록을 만든다(정본 = recipes, 중복 금지).
  //   사용량 상위: product-cut 44 · stone-plinth-luxe 13 · jewelry-product-cut 8 · dewy-glass-hero 7 · void-hero-cut(공식 마켓 1위)
  { folder: 'Templates', slug: 'tpl-product-cut', title: 'Product Cut', category: 'fashion', description: 'Our best-selling template — 4 editorial product cuts for fashion items.',
    config: { kind: 'image', engine: 'nano-banana-pro', recipeId: 'product-cut', aspect: '4:5', inputs: [{ key: 'product', label: 'Your product', required: true }] } },
  { folder: 'Templates', slug: 'tpl-stone-plinth-luxe', title: 'Stone Plinth Luxe', category: 'beauty', description: 'Quiet-luxury travertine plinths — front, 3/4, macro and styled hero.',
    config: { kind: 'image', engine: 'nano-banana-pro', recipeId: 'stone-plinth-luxe', aspect: '4:5', inputs: [{ key: 'product', label: 'Your product', required: true }] } },
  { folder: 'Templates', slug: 'tpl-jewelry-product-cut', title: 'Jewelry Product Cut', category: 'jewelry', description: 'Grey seamless jewelry set — hero, 3/4, setting detail and full silhouette.',
    config: { kind: 'image', engine: 'nano-banana-pro', recipeId: 'jewelry-product-cut', aspect: '4:5', inputs: [{ key: 'product', label: 'Your jewelry', required: true }] } },
  { folder: 'Templates', slug: 'tpl-dewy-glass-hero', title: 'Dewy Glass Hero', category: 'beauty', description: 'Wet glass, frosted risers and a hanging drop — serum & skincare hero set.',
    config: { kind: 'image', engine: 'nano-banana-pro', recipeId: 'dewy-glass-hero', aspect: '4:5', inputs: [{ key: 'product', label: 'Your product', required: true }] } },
  { folder: 'Templates', slug: 'tpl-void-hero-cut', title: 'Void Hero Cut', category: 'tech', description: 'Matte-black void, one sharp highlight, levitation — gadgets & devices.',
    config: { kind: 'image', engine: 'nano-banana-pro', recipeId: 'void-hero-cut', aspect: '4:5', inputs: [{ key: 'product', label: 'Your product', required: true }] } },
  // (10-16) 외부 트렌드 조사 기반 5 — 출처는 config.source(렌즈 화면에 표시)
  { folder: 'Trending', slug: "trend-glacier-ice", title: "Glacier Ice", category: "beauty", description: "Clear ice blocks and frosted blue light — crisp, cold, refreshing.",
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', source: "Higgsfield Marketing Studio presets “Ice Cube Hover”, “Chilled Can” · Pinterest Predicts 2026 “Cool Blue” (frosted makeup +150%)", inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: "The product stands upright on a cluster of crystal-clear sculpted ice blocks. Small ice shards and fine frost crystals lie around the base, with a thin cold mist low in the frame. Smooth background gradient from glacier blue to pale icy white. A cool backlight shines through the ice for luminous caustics and refractions, with soft frontal fill keeping the product's true colors accurate. 100mm macro lens, f/5.6, eye level, product tack-sharp, ice softly defocused. Fresh, cold, clean, premium mood. No text.",
      shots: [{"name": "Hero", "prompt": "The main composition exactly as described."}, {"name": "Variation 1", "prompt": "Hovering a few centimeters above a single ice cube with a soft shadow below."}, {"name": "Variation 2", "prompt": "Half-embedded in crushed ice, top-down 45 degrees."}] } },
  { folder: 'Trending', slug: "trend-gummy-jelly", title: "Gummy Jelly", category: "beauty", description: "Glossy, bouncy jelly cubes in candy colors — playful Gen-Z texture.",
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', source: "Pinterest Predicts 2026 “Gimme Gummy” — jelly blush +130%, jelly candy aesthetic +100%", inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: "The product sits on a wobbly translucent jelly slab in a soft candy color that matches the product's palette. Glossy gummy cubes and jelly drops are scattered around, some squished, a few clear jelly spheres catching light. Seamless pastel background matching the jelly hue. Bright soft key light from above gives wet specular highlights and translucent glow through the jelly. 85mm lens, f/4, slightly high angle, product sharp. Playful, juicy, tactile mood. No text.",
      shots: [{"name": "Hero", "prompt": "The main composition exactly as described."}, {"name": "Variation 1", "prompt": "Product pressed into a jelly block, top-down."}, {"name": "Variation 2", "prompt": "Product balanced on a stack of gummy cubes."}] } },
  { folder: 'Trending', slug: "trend-sky-high", title: "Sky High", category: "fashion", description: "Low angle against a vivid open blue sky in hard summer sun.",
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', source: "Higgsfield Marketing Studio presets “Blue Sky Cap”, “Sky High Chili” · Squareshot 2026 trends: cinematic directional light", inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: "The product is lifted into frame against a saturated cloudless cerulean summer sky, shot from a dramatic low angle so it looms large and heroic. A few soft cumulus wisps at the frame edge, a hint of sun flare in one corner. Hard midday sunlight casts crisp highlights and deep clean shadows, colors punchy and true. 35mm lens, f/8, everything crisp. Optimistic, airy, summery campaign mood. No text, no faces.",
      shots: [{"name": "Hero", "prompt": "The main composition exactly as described."}, {"name": "Variation 1", "prompt": "Product balanced on a white rooftop ledge with sky behind."}, {"name": "Variation 2", "prompt": "A hand reaching up holding the product into the sky, cropped at the wrist."}] } },
  { folder: 'Trending', slug: "trend-surreal-scale", title: "Surreal Scale", category: "product", description: "Giant product in a miniature world with tiny figures — witty, scroll-stopping.",
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', source: "Adobe Creative Trends 2026 “Surreal Silliness” (playful, dreamlike AI visuals)", inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: "The product appears monumentally oversized, standing like a landmark in a miniature diorama world. Tiny anonymous figurines about one centimeter tall walk around its base, set up ladders and picnic in its shadow, with miniature trees and a little path. Soft pastel horizon backdrop. Bright even tabletop lighting with a gentle top-left key and a slight tilt-shift feel. 50mm lens, f/11, tilt-shift falloff at the edges, product fully sharp. Whimsical, witty mood. No text.",
      shots: [{"name": "Hero", "prompt": "The main composition exactly as described."}, {"name": "Variation 1", "prompt": "Tiny workers polishing the product on scaffolding."}, {"name": "Variation 2", "prompt": "Tiny hikers climbing the product like a mountain."}] } },
  { folder: 'Trending', slug: "trend-sunlit-linen", title: "Sunlit Linen", category: "food", description: "Warm window light and leaf shadows on soft linen — calm Korean lifestyle mood.",
    config: { kind: 'image', engine: 'nano-banana-pro', aspect: '4:5', source: "Higgsfield Marketing Studio preset “Linen Lid Lift” · Squareshot 2026: texture & warmth, natural shadows", inputs: [{ key: 'product', label: 'Your product', required: true }],
      prompt: "The product sits on softly creased oatmeal linen cloth over a pale wooden tabletop. Warm early-morning sunlight streams through a window, casting crisp leaf and window-frame shadows diagonally across the scene and partly over the product. Minimal props: a small ceramic dish and a sprig of greenery, out of focus. Warm neutral palette. 50mm lens, f/2.8, 30-degree high angle, slight natural film grain. Calm, slow-living, homey mood. No text.",
      shots: [{"name": "Hero", "prompt": "The main composition exactly as described."}, {"name": "Variation 1", "prompt": "Top-down flat with long window shadows."}, {"name": "Variation 2", "prompt": "Close crop with a leaf shadow falling across the label."}] } },
];

const newSlug = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, '').slice(0, 7).toLowerCase() || crypto.randomUUID().slice(0, 7);

let officialDone = false;
async function ensureOfficial() {
  if (officialDone) return;
  for (const o of OFFICIAL) {
    await query(
      `INSERT INTO lenses (slug, owner_id, title, description, category, config, visibility, is_official, folder)
       VALUES ($1, NULL, $2, $3, $4, $5, 'public', true, $6)
       ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, category=EXCLUDED.category, config=EXCLUDED.config, folder=EXCLUDED.folder, updated_at=now()
       WHERE lenses.is_official = true`,
      [o.slug, o.title, o.description, o.category, JSON.stringify(o.config), o.folder || ''] // 공식 folder = 컬렉션('Templates' 시장 템플릿 · 'Trending' 외부 트렌드)
    );
  }
  officialDone = true;
}

/** 저장 전 정리 — 모르는 엔진·잘못된 값은 걸러 낸다 */
function cleanConfig(c) {
  const kind = c.kind === 'video' ? 'video' : 'image';
  const tool = getTool(String(c.engine || ''));
  const engine = tool && tool.type === kind ? tool.id : (kind === 'video' ? 'seedance-2.5' : 'nano-banana-pro');
  const inputs = (Array.isArray(c.inputs) ? c.inputs : []).filter((i) => ['product', 'person'].includes(i && i.key)).slice(0, 2)
    .map((i) => ({ key: i.key, label: String(i.label || (i.key === 'person' ? 'Model photo' : 'Your product')).slice(0, 40), required: i.required !== false }));
  const shots = (Array.isArray(c.shots) ? c.shots : []).filter((s) => s && String(s.prompt || '').trim()).slice(0, 8)
    .map((s, i) => ({ name: String(s.name || `Shot ${i + 1}`).slice(0, 30), prompt: String(s.prompt).slice(0, 600) }));
  return {
    kind, engine,
    prompt: String(c.prompt || '').slice(0, 3000),
    negative: String(c.negative || '').slice(0, 800),
    aspect: /^\d+:\d+$/.test(c.aspect || '') ? c.aspect : (kind === 'video' ? '9:16' : '4:5'),
    imageSize: ['1K', '2K', '4K'].includes(c.imageSize) ? c.imageSize : undefined,
    count: Math.max(1, Math.min(4, parseInt(c.count, 10) || 1)),
    duration: kind === 'video' ? Math.max(4, Math.min(15, parseInt(c.duration, 10) || 5)) : undefined,
    shots, inputs: inputs.length ? inputs : [{ key: 'product', label: 'Your product', required: true }],
    refs: (Array.isArray(c.refs) ? c.refs : []).filter((u) => /^\/images\/[\w.-]+\.(png|jpe?g|webp)$/i.test(u)).slice(0, 4),
    extras: c.extras && typeof c.extras === 'object' ? c.extras : {},
    ...(Array.isArray(c.engineFallbacks) ? { engineFallbacks: c.engineFallbacks.slice(0, 3) } : {}),
    ...(c.recipeId && /^[a-z0-9-]{2,60}$/.test(c.recipeId) ? { recipeId: c.recipeId } : {}),
    ...(c.source ? { source: String(c.source).slice(0, 300) } : {}),
  };
}

/** 응답용 — 남의 렌즈면 제작 방식(prompt·negative·refs·shots 프롬프트)을 숨긴다 */
function publicView(row, userId, isAdmin) {
  const c = row.config || {};
  const mine = !!(userId && row.owner_id === userId) || (row.is_official && isAdmin);
  const tool = getTool(c.engine);
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description, category: row.category,
    visibility: row.visibility, isOfficial: row.is_official, mine, coverUrl: row.cover_url, uses: row.uses_count, folder: row.folder || '', fromTemplate: c.recipeId || null, source: c.source || null,
    creator: row.is_official ? 'Doppia' : (row.creator_handle ? `@${row.creator_handle}` : null), createdAt: row.created_at,
    kind: c.kind, engine: c.engine, engineLabel: tool ? tool.label : c.engine, aspect: c.aspect, count: c.count, duration: c.duration,
    inputs: c.inputs || [], shots: (c.shots && c.shots.length ? c.shots : (c.recipeShots || [])).map((s) => (mine ? s : { name: s.name })), refsCount: (c.refs || []).length,
    ...(mine ? { prompt: c.prompt, negative: c.negative, refs: c.refs || [], imageSize: c.imageSize } : {}),
  };
}

const SELECT = `SELECT l.*, split_part(u.email, '@', 1) AS creator_handle FROM lenses l LEFT JOIN users u ON u.id = l.owner_id`;

async function list({ userId, isAdmin, scope = 'all', category, q }) {
  await ensureOfficial();
  const where = []; const args = [];
  if (scope === 'mine') { args.push(userId); where.push(`l.owner_id = $${args.length}`); }
  else if (scope === 'official') where.push('l.is_official = true');
  else { args.push(userId); where.push(`(l.visibility = 'public' OR l.owner_id = $${args.length})`); }
  if (category && CATEGORIES.includes(category)) { args.push(category); where.push(`l.category = $${args.length}`); }
  if (q) { args.push(`%${String(q).slice(0, 60)}%`); where.push(`(l.title ILIKE $${args.length} OR l.description ILIKE $${args.length})`); }
  where.push("l.status = 'active'");
  const r = await query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY l.is_official DESC, (CASE WHEN l.is_official THEN l.created_at END) ASC, l.uses_count DESC, l.created_at DESC LIMIT 120`, args);
  return r.rows.map((row) => publicView(row, userId, isAdmin));
}

async function getRow(slugOrId) {
  await ensureOfficial();
  const r = await query(`${SELECT} WHERE (l.slug = $1 OR l.id::text = $1) AND l.status = 'active'`, [String(slugOrId || '')]);
  return r.rows[0] || null;
}
/** 볼 수 있는가 — 공개·링크·내 것·공식 */
function canView(row, userId) { return !!row && (row.visibility !== 'private' || row.owner_id === userId || row.is_official); }

async function create(userId, data) {
  const config = cleanConfig(data.config || {});
  if (!String(data.title || '').trim()) throw Object.assign(new Error('Give your lens a name'), { statusCode: 400 });
  if (!config.prompt.trim() && !config.shots.length) throw Object.assign(new Error('Describe the look (prompt) or add shots'), { statusCode: 400 });
  const r = await query(
    `INSERT INTO lenses (slug, owner_id, title, description, category, config, visibility, cover_url, from_result_idx, folder)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [newSlug(), userId, String(data.title).slice(0, 60), String(data.description || '').slice(0, 240), CATEGORIES.includes(data.category) ? data.category : 'product',
      JSON.stringify(config), VIS.includes(data.visibility) ? data.visibility : 'private', data.coverUrl && /^\/images\//.test(data.coverUrl) ? data.coverUrl : null, parseInt(data.fromResultIdx, 10) || null, cleanFolder(data.folder)]
  );
  return r.rows[0];
}

async function update(userId, isAdmin, slug, data) {
  const row = await getRow(slug);
  if (!row || !(row.owner_id === userId || (row.is_official && isAdmin))) throw Object.assign(new Error('Not your lens'), { statusCode: 403 });
  const config = data.config ? cleanConfig({ ...row.config, ...data.config }) : row.config;
  const r = await query(
    `UPDATE lenses SET title=$2, description=$3, category=$4, config=$5, visibility=$6, cover_url=$7, folder=$8, updated_at=now() WHERE id=$1 RETURNING *`,
    [row.id, data.title != null ? String(data.title).slice(0, 60) : row.title, data.description != null ? String(data.description).slice(0, 240) : row.description,
      CATEGORIES.includes(data.category) ? data.category : row.category, JSON.stringify(config),
      row.is_official ? 'public' : (VIS.includes(data.visibility) ? data.visibility : row.visibility),
      data.coverUrl !== undefined ? (data.coverUrl && /^\/images\//.test(data.coverUrl) ? data.coverUrl : null) : row.cover_url,
      row.is_official ? '' : (data.folder !== undefined ? cleanFolder(data.folder) : (row.folder || ''))]
  );
  return r.rows[0];
}

async function remove(userId, slug) {
  const r = await query(`UPDATE lenses SET status='deleted', updated_at=now() WHERE slug=$1 AND owner_id=$2 AND is_official=false RETURNING id`, [slug, userId]);
  if (!r.rowCount) throw Object.assign(new Error('Not your lens'), { statusCode: 403 });
}

async function bumpUse(row, firstUrl, userId, isAdmin) {
  await query(`UPDATE lenses SET uses_count = uses_count + 1 WHERE id=$1`, [row.id]);
  // 커버가 없으면 만든 사람이 처음 돌린 결과로(남의 결과는 커버로 쓰지 않는다 — 개인 사진 노출 방지). 공식 렌즈는 관리자 첫 실행 결과로.
  const owner = (row.owner_id && row.owner_id === userId) || (row.is_official && isAdmin);
  if (!row.cover_url && firstUrl && owner) await query(`UPDATE lenses SET cover_url=$2 WHERE id=$1 AND cover_url IS NULL`, [row.id, firstUrl]);
}

/** 이미지 렌즈 프롬프트 — 입력 이미지(슬롯 순) → 스타일 참고 순서로 들어간다 */
function buildImagePrompt(c, { slots, refCount, shot, note }) {
  const lines = [String(c.prompt || '').trim()];
  if (shot) lines.push(`Shot: ${shot.prompt}`);
  if (note) lines.push(`Extra direction from the user: ${String(note).slice(0, 400)}`);
  const rules = [];
  slots.forEach((key, i) => {
    if (key === 'product') rules.push(`Image ${i + 1} is the customer's PRODUCT. Reproduce it exactly — same shape, proportions, colors, materials, logo and every letter of the label text. Do not redesign, rename or add text to it.`);
    if (key === 'person') rules.push(`Image ${i + 1} is the MODEL, an adult. Keep the same face, identity and hairstyle.`);
  });
  if (refCount) rules.push(`Image${refCount > 1 ? 's' : ''} ${slots.length + 1}${refCount > 1 ? `–${slots.length + refCount}` : ''} ${refCount > 1 ? 'are' : 'is'} STYLE reference only (lighting, composition, color mood). Do not copy any product, person or text from ${refCount > 1 ? 'them' : 'it'}.`);
  return `${lines.filter(Boolean).join('\n\n')}\n\n${rules.join('\n')}`.trim();
}

/** 영상 렌즈 엔진 — 우선 엔진, 없으면 폴백 */
function videoEngine(c) {
  return [c.engine, ...(c.engineFallbacks || []), 'seedance-2.5', 'kling'].map(getTool).find((t) => t && t.type === 'video' && t.enabled && isToolAvailable(t)) || null;
}
function imageEngine(c) {
  return [c.engine, 'nano-banana-pro', 'gpt-image'].map(getTool).find((t) => t && t.type === 'image' && t.enabled && isToolAvailable(t)) || null;
}

/** 폴더 경로 정리 — 'A / B /' → 'A/B', 최대 4단, 각 40자 */
function cleanFolder(f) {
  return String(f || '').split('/').map((x) => x.trim().replace(/[\u0000-\u001f]/g, '').slice(0, 40)).filter(Boolean).slice(0, 4).join('/');
}
async function listFolders(userId) {
  const a = await query('SELECT path FROM lens_folders WHERE owner_id=$1', [userId]);
  const b = await query("SELECT DISTINCT folder AS path FROM lenses WHERE owner_id=$1 AND status='active' AND folder <> ''", [userId]);
  const set = new Set();
  [...a.rows, ...b.rows].forEach((r) => { const parts = r.path.split('/'); for (let i = 1; i <= parts.length; i++) set.add(parts.slice(0, i).join('/')); });
  return [...set].sort((x, y) => x.localeCompare(y));
}
async function addFolder(userId, p) {
  const path = cleanFolder(p);
  if (!path) throw Object.assign(new Error('Folder name required'), { statusCode: 400 });
  await query('INSERT INTO lens_folders (owner_id, path) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, path]);
  return path;
}
/** 폴더 이름 바꾸기·옮기기 — 하위 폴더와 그 안의 렌즈 경로까지 함께 */
async function renameFolder(userId, from, to) {
  const f = cleanFolder(from), t = cleanFolder(to);
  if (!f || !t) throw Object.assign(new Error('Folder name required'), { statusCode: 400 });
  await query(`UPDATE lenses SET folder = $3 || substr(folder, length($2) + 1), updated_at=now() WHERE owner_id=$1 AND (folder=$2 OR folder LIKE $2 || '/%')`, [userId, f, t]);
  await query(`INSERT INTO lens_folders (owner_id, path) SELECT owner_id, $3 || substr(path, length($2) + 1) FROM lens_folders WHERE owner_id=$1 AND (path=$2 OR path LIKE $2 || '/%') ON CONFLICT DO NOTHING`, [userId, f, t]);
  await query(`DELETE FROM lens_folders WHERE owner_id=$1 AND (path=$2 OR path LIKE $2 || '/%')`, [userId, f]);
  return t;
}
/** 폴더 지우기 — 안의 렌즈는 상위 폴더로 */
async function removeFolder(userId, p) {
  const f = cleanFolder(p); if (!f) return;
  const parent = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '';
  await query(`UPDATE lenses SET folder=$3, updated_at=now() WHERE owner_id=$1 AND (folder=$2 OR folder LIKE $2 || '/%')`, [userId, f, parent]);
  await query(`DELETE FROM lens_folders WHERE owner_id=$1 AND (path=$2 OR path LIKE $2 || '/%')`, [userId, f]);
}
/** 템플릿(레시피) 기반 렌즈 → 컷 목록. 레시피가 정본이라 실행 때마다 푼다. 컷 이름은 구도 첫 구절에서 */
async function recipeShots(recipeId, userId) {
  // eslint-disable-next-line global-require
  const svc = require('../recipes/recipe.service');
  const r = await svc.resolve(recipeId, userId, {});
  const nameOf = (p, i) => { const m = /prominently featured, ([^,]+)/.exec(p || ''); let n = (m ? m[1] : `Shot ${i + 1}`).replace(/^the /, ''); if (n.length > 28) n = n.slice(0, 28).replace(/\s+\S*$/, ''); return n.charAt(0).toUpperCase() + n.slice(1); };
  return { shots: (r.jobs || []).map((j, i) => ({ name: nameOf(j.prompt, i), prompt: j.prompt })), negative: (r.jobs && r.jobs[0] && r.jobs[0].negativePrompt) || '', aspect: r.aspect_ratio };
}

module.exports = { cleanFolder, listFolders, addFolder, renameFolder, removeFolder, recipeShots, CATEGORIES, OFFICIAL, ensureOfficial, list, getRow, canView, create, update, remove, bumpUse, publicView, buildImagePrompt, videoEngine, imageEngine, cleanConfig };
