/**
 * build_model_roster.js — Doppia 버추얼 모델 로스터 빌더 (on-model용)
 * ------------------------------------------------------------------
 * 8개 인종군 × (남 5 + 여 5) = 80명. 전원 "모델핏"(장신·균형·에디토리얼).
 * 산출: src/models/roster.v1.js (데이터 단일소스) + docs/models/roster.v1.csv (구조화 export).
 * 이미지 생성은 별도: scripts/generate_model_images.js (nano-banana).
 * 실행: node scripts/build_model_roster.js
 *
 * 결정론적(랜덤 없음) — 인덱스 기반으로 build/hair/age를 순환 배정해 재실행 시 동일 결과.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── 8 인종군: 각 group에 남/여 이름 5개 + descent(구체 혈통) 5개 ──
const GROUPS = [
  {
    key: 'east_asian', label: 'East Asian',
    descents: ['Korean', 'Japanese', 'Chinese', 'Mongolian', 'Taiwanese'],
    m: ['Jinho', 'Haruki', 'Wei', 'Batu', 'Cheng'],
    f: ['Yerin', 'Aoi', 'Lian', 'Sarnai', 'Mei'],
    skin: 'fair-to-warm ivory skin with soft neutral undertones, a smooth even luminous complexion and a natural satin finish',
  },
  {
    key: 'southeast_asian', label: 'Southeast Asian',
    descents: ['Filipino', 'Thai', 'Indonesian', 'Vietnamese', 'Malaysian'],
    m: ['Mateo', 'Anon', 'Bayu', 'Minh', 'Faiz'],
    f: ['Liwayway', 'Kanya', 'Ayu', 'Linh', 'Nurul'],
    skin: 'warm golden-tan skin with sun-kissed honey undertones, a smooth even complexion and a soft natural glow',
  },
  {
    key: 'south_asian', label: 'South Asian',
    descents: ['Indian', 'Pakistani', 'Sri Lankan', 'Bangladeshi', 'Nepali'],
    m: ['Arjun', 'Zain', 'Ravindu', 'Rahim', 'Bibek'],
    f: ['Isha', 'Ayesha', 'Tharushi', 'Nabila', 'Sadhana'],
    skin: 'warm deep-brown skin with rich golden undertones, a smooth even complexion and a soft radiant sheen',
  },
  {
    key: 'black_african', label: 'Black / African',
    descents: ['Nigerian', 'Ethiopian', 'Ghanaian', 'Kenyan', 'African-American'],
    m: ['Chidi', 'Dawit', 'Kwame', 'Jomo', 'Marcus'],
    f: ['Amara', 'Sena', 'Efua', 'Zawadi', 'Imani'],
    skin: 'rich deep-brown skin with warm mahogany undertones, a smooth even complexion and a soft natural sheen',
  },
  {
    key: 'white_european', label: 'White / European',
    descents: ['Scandinavian', 'Slavic', 'Italian', 'British', 'German'],
    m: ['Lukas', 'Ivan', 'Matteo', 'Oliver', 'Jonas'],
    f: ['Freya', 'Katya', 'Giulia', 'Amelia', 'Lena'],
    skin: 'fair porcelain skin with cool rosy undertones, a smooth even complexion and a soft matte finish',
  },
  {
    key: 'hispanic_latino', label: 'Hispanic / Latino',
    descents: ['Mexican', 'Brazilian', 'Colombian', 'Argentine', 'Puerto Rican'],
    m: ['Diego', 'Rafael', 'Santiago', 'Tomas', 'Javier'],
    f: ['Valentina', 'Beatriz', 'Camila', 'Sofia', 'Lucia'],
    skin: 'warm olive-tan skin with golden bronze undertones, a smooth even complexion and a soft natural glow',
  },
  {
    key: 'mena', label: 'Middle Eastern / North African',
    descents: ['Lebanese', 'Iranian', 'Turkish', 'Moroccan', 'Egyptian'],
    m: ['Karim', 'Darius', 'Emre', 'Youssef', 'Omar'],
    f: ['Layla', 'Roya', 'Elif', 'Salma', 'Nadia'],
    skin: 'warm light-olive skin with soft golden undertones, a smooth even complexion and a natural satin finish',
  },
  {
    key: 'mixed', label: 'Mixed / Multiracial',
    descents: ['Afro-European', 'Eurasian', 'Afro-Asian', 'Latino-Asian', 'MENA-European'],
    m: ['Elias', 'Kai', 'Andre', 'Noah', 'Sami'],
    f: ['Nia', 'Maya', 'Zoe', 'Elena', 'Yara'],
    skin: 'warm caramel skin with golden-honey undertones, a smooth even complexion and a soft radiant glow',
  },
];

const BUILD_F = [
  'tall and slender editorial runway build',
  'tall athletic lean build with long limbs',
  'willowy high-fashion build',
  'toned commercial model build',
  'statuesque elegant build with balanced proportions',
];
const BUILD_M = [
  'tall lean editorial runway build',
  'tall athletic build with broad shoulders and defined jaw',
  'slim high-fashion build with long limbs',
  'toned commercial model build',
  'statuesque classic build with balanced proportions',
];
const HAIR_F = [
  'long sleek straight dark hair with a soft center part, falling well past the shoulders with a smooth healthy sheen',
  'shoulder-length loose wavy dark hair with soft natural volume and gentle face-framing pieces',
  'dark hair pulled back into a sleek polished low bun with a clean center part and smooth edges',
  'a chin-length dark textured bob with soft natural movement and a light tousled finish',
  'natural voluminous dark curls with defined springy coils and soft volume framing the face',
];
const HAIR_M = [
  'a short neat crop with clean tapered sides and a lightly textured top, natural dark color',
  'medium-length dark hair with natural texture swept back off the forehead, soft matte finish',
  'a tight skin fade with short dark curls on top and crisp clean edges',
  'short natural dark curls with defined texture and a neat rounded shape',
  'longer dark hair slicked back smoothly with a glossy finish and a clean hairline',
];
const AGES = [22, 24, 25, 27, 29]; // 모델 연령대 (군 내 5명에 분산)

// 중립 톤 의상 풀 — 무채색/중립 계열, 단순한 넥라인만(통일감 유지 + 그리드 단조로움 방지)
const OUTFITS = [
  'a plain white crew-neck t-shirt',
  'a light grey crew-neck t-shirt',
  'a beige crew-neck t-shirt',
  'a charcoal crew-neck t-shirt',
  'a black crew-neck t-shirt',
  'a soft cream fine-knit crew sweater',
  'a stone-grey henley top',
  'a plain off-white crew-neck sweater',
];

function promptFor(p) {
  return `upper-body studio casting portrait of a ${p.age}-year-old ${p.descent} ${p.gender} fashion model, ${p.build}, ${p.skin}, ${p.hair}, clean well-groomed model look with defined features, natural relaxed neutral expression looking straight into the camera, head-and-shoulders to chest framing, centered, the full top of the head in frame with headroom, wearing ${p.outfit}, soft light grey seamless studio background, soft even softbox lighting with a gentle catchlight in the eyes, shot on 85mm f/2.8, sharp focus on the eyes, realistic natural skin texture and pores, professional model casting portrait`;
}
const NEGATIVE = 'deformed or extra fingers, malformed hands, distorted face, asymmetric eyes, exaggerated or unrealistic proportions, heavy glamour makeup, dramatic pose, cropped or cut-off top of head, tight extreme close-up, multiple people, cluttered background, props, logos, text, watermark, plastic over-retouched skin, low resolution';

const roster = [];
for (const g of GROUPS) {
  for (let i = 0; i < 5; i++) {
    for (const gender of ['female', 'male']) {
      const isF = gender === 'female';
      const seq = String(roster.length + 1).padStart(2, '0');
      const p = {
        id: `${isF ? 'f' : 'm'}-${g.key}-${i + 1}`,
        seq,
        name: (isF ? g.f : g.m)[i],
        gender,
        ethnicity_group: g.label,
        ethnicity_key: g.key,
        descent: g.descents[i],
        age: AGES[i],
        build: (isF ? BUILD_F : BUILD_M)[i],
        hair: (isF ? HAIR_F : HAIR_M)[i],
        skin: g.skin,
        // 중립 의상 배정 — stride로 인접 타일이 안 겹치게 분산(결정론적)
        outfit: OUTFITS[(roster.length * 3) % OUTFITS.length],
      };
      p.prompt = promptFor(p);
      p.negative = NEGATIVE;
      roster.push(p);
    }
  }
}

// ── EXTRAS (2026-07-19) — 아이돌급 미모 + 자연 글래스스킨 소스 얼굴 4종(테스트 추가).
//   이미지는 gemini-3-pro-image로 별도 생성 후 public/img/models/에 직접 배치(자연 피부결 프롬프트).
//   skin 서술을 "smooth even complexion" 대신 자연 텍스처로 → stage-1 바디도 덜 에어브러시(밝은 피부 AI티 완화).
const EXTRAS = [
  { id: 'f-east_asian-6', name: 'Seoyeon', gender: 'female', ethnicity_group: 'East Asian', ethnicity_key: 'east_asian', descent: 'Korean', age: 24,
    build: 'toned commercial model build',
    hair: 'dark hair smoothly pulled back off the face with a clean center part and soft baby hairs',
    skin: 'fair-to-warm ivory skin with a luminous dewy glass-skin glow, visible natural pores and fine real skin micro-texture, an unretouched natural finish',
    outfit: 'a plain white crew-neck t-shirt' },
  { id: 'f-white_european-6', name: 'Sofie', gender: 'female', ethnicity_group: 'White / European', ethnicity_key: 'white_european', descent: 'Danish', age: 25,
    build: 'willowy high-fashion build',
    hair: 'long loose wavy blonde hair with natural volume and soft face-framing pieces',
    skin: 'fair skin with natural real texture, visible pores and subtle soft freckling, a healthy luminous glow, unretouched',
    outfit: 'a light grey crew-neck t-shirt' },
  { id: 'f-hispanic_latino-6', name: 'Mariana', gender: 'female', ethnicity_group: 'Hispanic / Latino', ethnicity_key: 'hispanic_latino', descent: 'Colombian', age: 24,
    build: 'toned commercial model build',
    hair: 'long dark wavy hair with soft natural volume and gentle face-framing pieces',
    skin: 'warm tan skin with golden undertones, natural pores and fine real skin texture, a dewy luminous glow, unretouched',
    outfit: 'a beige crew-neck t-shirt' },
  { id: 'f-southeast_asian-6', name: 'Ploy', gender: 'female', ethnicity_group: 'Southeast Asian', ethnicity_key: 'southeast_asian', descent: 'Thai', age: 23,
    build: 'willowy high-fashion build',
    hair: 'dark hair smoothly pulled back with a clean center part and a sleek finish',
    skin: 'warm golden-tan skin with a dewy glass-skin glow, visible natural pores and fine real skin texture, unretouched',
    outfit: 'a soft cream fine-knit crew sweater' },
];
let _seq = roster.length;
for (const e of EXTRAS) {
  _seq += 1;
  e.seq = String(_seq).padStart(2, '0');
  e.prompt = `beauty campaign casting portrait of a breathtakingly beautiful idol-level ${e.age}-year-old ${e.descent} female fashion model, ${e.build}, ${e.skin}, ${e.hair}, gorgeous refined symmetrical features with large luminous eyes and soft glam makeup, natural relaxed confident expression looking straight into the camera, head-and-shoulders to chest framing, centered, the full top of the head in frame with headroom, wearing ${e.outfit}, plain light grey seamless studio background, soft flattering beauty light with a gentle eye catchlight, shot on 85mm f/2.0, fine film grain, tack-sharp on the eyes, real luminous human skin that still shows subtle pores and micro-texture, NOT airbrushed, NOT plastic-smooth, professional beauty casting portrait`;
  e.negative = NEGATIVE;
  roster.push(e);
}

// 정렬: 성별 그룹핑 (여자 40 → 남자 40)로 보기 편하게
roster.sort((a, b) => (a.gender === b.gender ? a.id.localeCompare(b.id) : a.gender === 'female' ? -1 : 1));

// ── 산출 1: 데이터 시드 ──
const outDir = path.join(ROOT, 'src/models');
fs.mkdirSync(outDir, { recursive: true });
const header = `/* ⚠️ AUTO-GENERATED — node scripts/build_model_roster.js\n * Doppia 버추얼 모델 로스터 v1 — on-model용 (남 40 + 여 40, 8인종군, 전원 모델핏).\n * 이미지 생성: scripts/generate_model_images.js (nano-banana) → public/img/models/<id>.png\n */\n`;
fs.writeFileSync(path.join(outDir, 'roster.v1.js'), header + 'module.exports = ' + JSON.stringify(roster, null, 2) + ';\n');

// ── 산출 1b: 프론트 노출용 슬림 JS (window.MODELS) — 모델 픽커가 소비 ──
const slim = roster.map(p => ({ id: p.id, name: p.name, gender: p.gender, group: p.ethnicity_group, descent: p.descent, age: p.age, img: `/img/models/${p.id}.jpg` }));
const pubDir = path.join(ROOT, 'public/js');
fs.writeFileSync(path.join(pubDir, 'models.roster.js'),
  `/* AUTO-GENERATED — node scripts/build_model_roster.js · window.MODELS(${slim.length}) */\n(function(){ window.MODELS = ${JSON.stringify(slim)}; })();\n`);

// ── 산출 2: CSV export (DB 적재/검토용) ──
const docsDir = path.join(ROOT, 'docs/models');
fs.mkdirSync(docsDir, { recursive: true });
const cols = ['id', 'seq', 'name', 'gender', 'ethnicity_group', 'descent', 'age', 'build', 'hair', 'skin', 'outfit'];
const csv = [cols.join(',')].concat(roster.map(p => cols.map(c => `"${String(p[c]).replace(/"/g, '""')}"`).join(','))).join('\n');
fs.writeFileSync(path.join(docsDir, 'roster.v1.csv'), csv + '\n');

// ── 요약 ──
const byGender = { female: 0, male: 0 };
const byGroup = {};
roster.forEach(p => { byGender[p.gender]++; byGroup[p.ethnicity_group] = (byGroup[p.ethnicity_group] || 0) + 1; });
console.log(`build_model_roster — ${roster.length}명 생성`);
console.log('성별:', byGender);
console.log('인종군:', byGroup);
console.log('→ src/models/roster.v1.js, docs/models/roster.v1.csv');
