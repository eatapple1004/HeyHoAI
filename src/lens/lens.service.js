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

const CATEGORIES = ['product', 'on-model', 'beauty', 'fashion', 'food', 'video'];
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
];

const newSlug = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, '').slice(0, 7).toLowerCase() || crypto.randomUUID().slice(0, 7);

let officialDone = false;
async function ensureOfficial() {
  if (officialDone) return;
  for (const o of OFFICIAL) {
    await query(
      `INSERT INTO lenses (slug, owner_id, title, description, category, config, visibility, is_official)
       VALUES ($1, NULL, $2, $3, $4, $5, 'public', true)
       ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, category=EXCLUDED.category, config=EXCLUDED.config, updated_at=now()
       WHERE lenses.is_official = true`,
      [o.slug, o.title, o.description, o.category, JSON.stringify(o.config)]
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
  };
}

/** 응답용 — 남의 렌즈면 제작 방식(prompt·negative·refs·shots 프롬프트)을 숨긴다 */
function publicView(row, userId, isAdmin) {
  const c = row.config || {};
  const mine = !!(userId && row.owner_id === userId) || (row.is_official && isAdmin);
  const tool = getTool(c.engine);
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description, category: row.category,
    visibility: row.visibility, isOfficial: row.is_official, mine, coverUrl: row.cover_url, uses: row.uses_count,
    creator: row.is_official ? 'Doppia' : (row.creator_handle ? `@${row.creator_handle}` : null), createdAt: row.created_at,
    kind: c.kind, engine: c.engine, engineLabel: tool ? tool.label : c.engine, aspect: c.aspect, count: c.count, duration: c.duration,
    inputs: c.inputs || [], shots: (c.shots || []).map((s) => (mine ? s : { name: s.name })), refsCount: (c.refs || []).length,
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
    `INSERT INTO lenses (slug, owner_id, title, description, category, config, visibility, cover_url, from_result_idx)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [newSlug(), userId, String(data.title).slice(0, 60), String(data.description || '').slice(0, 240), CATEGORIES.includes(data.category) ? data.category : 'product',
      JSON.stringify(config), VIS.includes(data.visibility) ? data.visibility : 'private', data.coverUrl && /^\/images\//.test(data.coverUrl) ? data.coverUrl : null, parseInt(data.fromResultIdx, 10) || null]
  );
  return r.rows[0];
}

async function update(userId, isAdmin, slug, data) {
  const row = await getRow(slug);
  if (!row || !(row.owner_id === userId || (row.is_official && isAdmin))) throw Object.assign(new Error('Not your lens'), { statusCode: 403 });
  const config = data.config ? cleanConfig({ ...row.config, ...data.config }) : row.config;
  const r = await query(
    `UPDATE lenses SET title=$2, description=$3, category=$4, config=$5, visibility=$6, cover_url=$7, updated_at=now() WHERE id=$1 RETURNING *`,
    [row.id, data.title != null ? String(data.title).slice(0, 60) : row.title, data.description != null ? String(data.description).slice(0, 240) : row.description,
      CATEGORIES.includes(data.category) ? data.category : row.category, JSON.stringify(config),
      row.is_official ? 'public' : (VIS.includes(data.visibility) ? data.visibility : row.visibility),
      data.coverUrl !== undefined ? (data.coverUrl && /^\/images\//.test(data.coverUrl) ? data.coverUrl : null) : row.cover_url]
  );
  return r.rows[0];
}

async function remove(userId, slug) {
  const r = await query(`UPDATE lenses SET status='deleted', updated_at=now() WHERE slug=$1 AND owner_id=$2 AND is_official=false RETURNING id`, [slug, userId]);
  if (!r.rowCount) throw Object.assign(new Error('Not your lens'), { statusCode: 403 });
}

async function bumpUse(row, firstUrl, userId) {
  await query(`UPDATE lenses SET uses_count = uses_count + 1 WHERE id=$1`, [row.id]);
  // 커버가 없으면 만든 사람이 처음 돌린 결과로(남의 결과는 커버로 쓰지 않는다 — 개인 사진 노출 방지)
  if (!row.cover_url && firstUrl && row.owner_id && row.owner_id === userId) await query(`UPDATE lenses SET cover_url=$2 WHERE id=$1 AND cover_url IS NULL`, [row.id, firstUrl]);
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

module.exports = { CATEGORIES, OFFICIAL, ensureOfficial, list, getRow, canView, create, update, remove, bumpUse, publicView, buildImagePrompt, videoEngine, imageEngine, cleanConfig };
