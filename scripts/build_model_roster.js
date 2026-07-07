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
    skin: 'fair-to-warm ivory skin',
  },
  {
    key: 'southeast_asian', label: 'Southeast Asian',
    descents: ['Filipino', 'Thai', 'Indonesian', 'Vietnamese', 'Malaysian'],
    m: ['Mateo', 'Anon', 'Bayu', 'Minh', 'Faiz'],
    f: ['Liwayway', 'Kanya', 'Ayu', 'Linh', 'Nurul'],
    skin: 'warm golden-tan skin',
  },
  {
    key: 'south_asian', label: 'South Asian',
    descents: ['Indian', 'Pakistani', 'Sri Lankan', 'Bangladeshi', 'Nepali'],
    m: ['Arjun', 'Zain', 'Ravindu', 'Rahim', 'Bibek'],
    f: ['Isha', 'Ayesha', 'Tharushi', 'Nabila', 'Sadhana'],
    skin: 'warm deep-brown skin',
  },
  {
    key: 'black_african', label: 'Black / African',
    descents: ['Nigerian', 'Ethiopian', 'Ghanaian', 'Kenyan', 'African-American'],
    m: ['Chidi', 'Dawit', 'Kwame', 'Jomo', 'Marcus'],
    f: ['Amara', 'Sena', 'Efua', 'Zawadi', 'Imani'],
    skin: 'rich deep-brown skin',
  },
  {
    key: 'white_european', label: 'White / European',
    descents: ['Scandinavian', 'Slavic', 'Italian', 'British', 'German'],
    m: ['Lukas', 'Ivan', 'Matteo', 'Oliver', 'Jonas'],
    f: ['Freya', 'Katya', 'Giulia', 'Amelia', 'Lena'],
    skin: 'fair porcelain skin',
  },
  {
    key: 'hispanic_latino', label: 'Hispanic / Latino',
    descents: ['Mexican', 'Brazilian', 'Colombian', 'Argentine', 'Puerto Rican'],
    m: ['Diego', 'Rafael', 'Santiago', 'Tomas', 'Javier'],
    f: ['Valentina', 'Beatriz', 'Camila', 'Sofia', 'Lucia'],
    skin: 'warm olive-tan skin',
  },
  {
    key: 'mena', label: 'Middle Eastern / North African',
    descents: ['Lebanese', 'Iranian', 'Turkish', 'Moroccan', 'Egyptian'],
    m: ['Karim', 'Darius', 'Emre', 'Youssef', 'Omar'],
    f: ['Layla', 'Roya', 'Elif', 'Salma', 'Nadia'],
    skin: 'warm light-olive skin',
  },
  {
    key: 'mixed', label: 'Mixed / Multiracial',
    descents: ['Afro-European', 'Eurasian', 'Afro-Asian', 'Latino-Asian', 'MENA-European'],
    m: ['Elias', 'Kai', 'Andre', 'Noah', 'Sami'],
    f: ['Nia', 'Maya', 'Zoe', 'Elena', 'Yara'],
    skin: 'warm caramel skin',
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
  'long straight dark hair', 'shoulder-length wavy hair', 'sleek low bun',
  'short textured bob', 'natural voluminous curls',
];
const HAIR_M = [
  'short neat crop', 'textured medium hair swept back', 'tight fade',
  'natural short curls', 'slicked-back longer hair',
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
