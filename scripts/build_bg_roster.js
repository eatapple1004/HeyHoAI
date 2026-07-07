/**
 * build_bg_roster.js — Doppia 배경(씬) 로스터 빌더 (on-model용)
 * ------------------------------------------------------------------
 * 8 카테고리 × 5 = 40개 다양한 씬. 각 씬 = on-model 생성에 주입할 환경/조명 서술 + 프리뷰 프롬프트.
 * 산출: src/backgrounds/roster.v1.js + docs/backgrounds/roster.v1.csv.
 * 프리뷰 이미지: scripts/generate_bg_images.js (nano-banana) → public/img/backgrounds/<id>.jpg
 * 실행: node scripts/build_bg_roster.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// [name, scene(환경), light(조명)]  — mood는 카테고리에서 상속
const CATS = [
  { key: 'studio', label: 'Studio', mood: 'minimal editorial', items: [
    ['Shadow Play', 'a clean studio with a warm-grey seamless backdrop and soft venetian-blind shadow patterns across it', 'soft directional light casting defined shadow shapes'],
    ['Color Pop', 'a studio with a smooth solid soft-coral seamless backdrop', 'bright even softbox light'],
    ['Paper Sweep', 'a studio with an off-white paper cyclorama sweeping into the floor', 'soft graduated studio light'],
    ['Spotlight', 'a dark moody studio with a single pool of light and deep falloff', 'dramatic single hard spotlight'],
    ['Gradient Dusk', 'a studio with a smooth blue-to-blush gradient backdrop', 'soft even light with a subtle glow'],
  ]},
  { key: 'home', label: 'Home / Lifestyle', mood: 'warm lived-in', items: [
    ['Sunlit Loft', 'a bright minimalist loft apartment with warm wood floors and tall industrial windows', 'warm daylight streaming through the windows'],
    ['Reading Nook', 'a cozy reading nook with a linen armchair, a full bookshelf and a soft floor lamp', 'warm low ambient lamp light'],
    ['Scandi Living', 'a neutral Scandinavian living room with pale wood, soft textiles and a few plants', 'soft diffused overcast daylight'],
    ['Morning Kitchen', 'a bright modern kitchen with a white marble counter and matte cabinetry', 'clean cool morning daylight'],
    ['Linen Bedroom', 'a serene bedroom with soft linen bedding and sheer white curtains', 'gentle backlit morning light through the curtains'],
  ]},
  { key: 'venue', label: 'Cafe / Retail / Venue', mood: 'refined ambient', items: [
    ['Corner Cafe', 'a cozy corner cafe interior with a marble table, warm wood and soft background bokeh', 'warm tungsten ambient light'],
    ['Concept Boutique', 'a minimalist concept boutique with softly blurred clothing racks and pale walls', 'clean even retail lighting'],
    ['Art Gallery', 'a bright white-walled art gallery with a light oak floor', 'soft even gallery light'],
    ['Hotel Lobby', 'a luxe hotel lobby with marble, brass accents and low velvet seating', 'warm layered ambient light'],
    ['Old Bookstore', 'a vintage bookstore with warm wooden shelves stacked with books', 'warm cozy interior light'],
  ]},
  { key: 'urban', label: 'Urban / Street', mood: 'candid street', items: [
    ['City Street', 'a daytime city sidewalk with softly blurred storefronts behind', 'bright natural overcast daylight'],
    ['Shaded Alley', 'a narrow European alley with cobblestones and weathered walls', 'soft shaded ambient light'],
    ['Rooftop View', 'an urban rooftop with a hazy city skyline behind', 'warm golden-hour light'],
    ['Crosswalk', 'a busy urban crosswalk with motion-blurred traffic behind', 'crisp daylight'],
    ['Subway Platform', 'a clean modern subway platform with tiled walls', 'cool even fluorescent light'],
  ]},
  { key: 'architectural', label: 'Architectural / Minimal', mood: 'sculptural minimal', items: [
    ['Concrete Minimal', 'a raw brutalist concrete wall with clean negative space', 'hard directional light with crisp shadow'],
    ['Marble Hall', 'a grand marble hall with tall columns', 'soft diffused daylight from high windows'],
    ['Spiral Staircase', 'a sculptural white spiral staircase', 'bright soft architectural light'],
    ['Arched Corridor', 'a sunlit arched colonnade with warm stone', 'warm raking sunlight through the arches'],
    ['Glass Atrium', 'a modern glass atrium with clean lines and greenery', 'bright airy natural light'],
  ]},
  { key: 'nature', label: 'Nature / Outdoor', mood: 'natural fresh', items: [
    ['Garden Green', 'a lush green garden with soft foliage', 'soft dappled daylight'],
    ['Forest Path', 'a quiet forest path with tall trees', 'dappled light filtering through leaves'],
    ['Wild Meadow', 'an open meadow of tall grass swaying', 'soft breezy afternoon light'],
    ['Coastal Cliff', 'a Mediterranean coastal cliff with deep blue sea behind', 'bright coastal sunlight'],
    ['Autumn Park', 'a park path covered in golden autumn leaves', 'warm soft autumn light'],
  ]},
  { key: 'golden', label: 'Golden / Editorial Light', mood: 'cinematic', items: [
    ['Golden Field', 'a golden-hour wheat field stretching to the horizon', 'warm backlit golden-hour glow'],
    ['Sunset Terrace', 'a warm rooftop terrace at sunset', 'soft orange sunset light'],
    ['Backlit Window', 'a room with a large bright window behind the subject', 'strong backlight creating a soft rim'],
    ['Neon Night', 'a moody city street at night with colorful neon signage', 'mixed neon and streetlight glow'],
    ['Poolside', 'a bright poolside with turquoise water and clean loungers', 'high-key summer sunlight'],
  ]},
  { key: 'seasonal', label: 'Seasonal / Mood', mood: 'atmospheric', items: [
    ['Snowy Street', 'a quiet snow-covered street with soft falling snow', 'soft cool overcast winter light'],
    ['Rainy Window', 'indoors beside a rain-streaked window', 'soft moody diffused daylight'],
    ['Spring Blossom', 'under blooming cherry-blossom trees', 'soft pastel spring light'],
    ['Tropical Palm', 'a bright tropical setting with palm leaves', 'vivid warm tropical sunlight'],
    ['Desert Dune', 'warm minimal desert dunes under a clear sky', 'warm directional desert light'],
  ]},
];

function previewPrompt(scene, light, mood) {
  return `full-body fashion lookbook photograph of a fashion model wearing plain neutral basics, ${scene}, ${light}, ${mood} mood, natural realistic editorial photography, sharp focus on the model, full body in frame, shot on 50mm f/2.8, professional fashion photo`;
}
const NEGATIVE = 'distorted face, deformed or extra fingers, malformed hands, warped anatomy, oversaturated, cluttered composition, text, logos, watermark, low resolution, cropped head';

const roster = [];
for (const c of CATS) {
  c.items.forEach((it, i) => {
    const [name, scene, light] = it;
    const p = {
      id: `bg-${c.key}-${i + 1}`,
      seq: String(roster.length + 1).padStart(2, '0'),
      name,
      category: c.label,
      category_key: c.key,
      scene,          // on-model 생성 시 주입할 환경 서술
      light,          // 조명 서술
      mood: c.mood,
    };
    p.preview_prompt = previewPrompt(scene, light, c.mood);
    p.negative = NEGATIVE;
    roster.push(p);
  });
}

// 산출 1: 데이터 시드
const outDir = path.join(ROOT, 'src/backgrounds');
fs.mkdirSync(outDir, { recursive: true });
const header = `/* ⚠️ AUTO-GENERATED — node scripts/build_bg_roster.js\n * Doppia 배경(씬) 로스터 v1 — on-model용 (40씬, 8카테고리).\n * scene/light = on-model 생성에 주입할 환경/조명. 프리뷰: scripts/generate_bg_images.js → public/img/backgrounds/<id>.jpg\n */\n`;
fs.writeFileSync(path.join(outDir, 'roster.v1.js'), header + 'module.exports = ' + JSON.stringify(roster, null, 2) + ';\n');

// 산출 2: CSV
const docsDir = path.join(ROOT, 'docs/backgrounds');
fs.mkdirSync(docsDir, { recursive: true });
const cols = ['id', 'seq', 'name', 'category', 'scene', 'light', 'mood'];
const csv = [cols.join(',')].concat(roster.map(p => cols.map(c => `"${String(p[c]).replace(/"/g, '""')}"`).join(','))).join('\n');
fs.writeFileSync(path.join(docsDir, 'roster.v1.csv'), csv + '\n');

const byCat = {};
roster.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
console.log(`build_bg_roster — ${roster.length}개 씬 생성`);
console.log('카테고리:', byCat);
console.log('→ src/backgrounds/roster.v1.js, docs/backgrounds/roster.v1.csv');
