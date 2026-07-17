/**
 * build_kids_roster.js — Doppia 아동 모델 로스터 빌더 (아동복 on-model용)
 * ------------------------------------------------------------------
 * build_model_roster.js(성인 80명)의 미러. 8개 인종군 × (남 5 + 여 5) = 80명, 나이 4~12.
 * 산출: src/models/roster.kids.v1.js (단일소스) + public/js/models.kids.roster.js (픽커용)
 *       + docs/models/roster.kids.v1.csv (구조화 export — CLAUDE.md 필수 규칙)
 * 이미지 생성은 별도: node scripts/generate_model_images.js --kids --all
 *   → public/img/models/kids/<id>.jpg
 * 실행: node scripts/build_kids_roster.js
 *
 * 결정론적(랜덤 없음) — 인덱스 기반 순환 배정이라 재실행 시 동일 결과.
 *
 * ⚠️ 왜 성인 로스터와 별도 파일인가: 성인 80명은 이미 라이브다. 한 파일에 섞으면 아동 작업이
 *    성인 로스터를 회귀시킬 수 있다. 경로도 /img/models/kids/ 로 갈라 두면, 서버의 로스터 화이트리스트
 *    정규식(generate.route.js: /^\/img\/models\/[\w-]+\.../)이 슬래시를 안 받아 **기본이 차단**이다.
 *    → 그 정규식 확장이 곧 의도적인 개방 스위치가 된다(별도 작업).
 *
 * ⚠️ 실제 아동 사진은 이 시스템에 들어올 수 없다 — 인물 레퍼런스는 서버가 로스터 경로만 통과시키고,
 *    고객 업로드(productImage)는 전부 kind='product'이며 7e1f8dc가 "업로드본의 인물은 절대 재현하지
 *    않는다"를 명시한다. 즉 화면에 나오는 아이는 **오직 이 로스터에서만** 온다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── 8 인종군: 성인 로스터와 동일한 군·혈통·피부. 이름만 아동용으로 교체(성인 풀과 중복 없음) ──
const GROUPS = [
  {
    key: 'east_asian', label: 'East Asian',
    descents: ['Korean', 'Japanese', 'Chinese', 'Mongolian', 'Taiwanese'],
    m: ['Minjun', 'Souta', 'Haoran', 'Temujin', 'Yuhan'],
    f: ['Seoyun', 'Hina', 'Xinyi', 'Nomin', 'Yuqi'],
    skin: 'fair-to-warm ivory skin',
  },
  {
    key: 'southeast_asian', label: 'Southeast Asian',
    descents: ['Filipino', 'Thai', 'Indonesian', 'Vietnamese', 'Malaysian'],
    m: ['Andres', 'Nattapong', 'Rizky', 'Duc', 'Aiman'],
    f: ['Marisol', 'Ploy', 'Sari', 'Mai', 'Aisyah'],
    skin: 'warm golden-tan skin',
  },
  {
    key: 'south_asian', label: 'South Asian',
    descents: ['Indian', 'Pakistani', 'Sri Lankan', 'Bangladeshi', 'Nepali'],
    m: ['Aarav', 'Ali', 'Sahan', 'Tanvir', 'Prakash'],
    f: ['Anaya', 'Fatima', 'Dilini', 'Rumana', 'Sita'],
    skin: 'warm deep-brown skin',
  },
  {
    key: 'black_african', label: 'Black / African',
    descents: ['Nigerian', 'Ethiopian', 'Ghanaian', 'Kenyan', 'African-American'],
    m: ['Emeka', 'Yonas', 'Kofi', 'Juma', 'Elijah'],
    f: ['Adaeze', 'Rahel', 'Abena', 'Neema', 'Aaliyah'],
    skin: 'rich deep-brown skin',
  },
  {
    key: 'white_european', label: 'White / European',
    descents: ['Scandinavian', 'Slavic', 'Italian', 'British', 'German'],
    m: ['Emil', 'Milan', 'Luca', 'Harry', 'Finn'],
    f: ['Astrid', 'Mila', 'Chiara', 'Poppy', 'Johanna'],
    skin: 'fair porcelain skin',
  },
  {
    key: 'hispanic_latino', label: 'Hispanic / Latino',
    descents: ['Mexican', 'Brazilian', 'Colombian', 'Argentine', 'Puerto Rican'],
    m: ['Emiliano', 'Pedro', 'Nicolas', 'Benicio', 'Julian'],
    f: ['Isabela', 'Clara', 'Antonia', 'Renata', 'Ximena'],
    skin: 'warm olive-tan skin',
  },
  {
    key: 'mena', label: 'Middle Eastern / North African',
    descents: ['Lebanese', 'Iranian', 'Turkish', 'Moroccan', 'Egyptian'],
    m: ['Rami', 'Kian', 'Deniz', 'Adil', 'Hassan'],
    f: ['Yasmin', 'Anahita', 'Defne', 'Amina', 'Farida'],
    skin: 'warm light-olive skin',
  },
  {
    key: 'mixed', label: 'Mixed / Multiracial',
    descents: ['Afro-European', 'Eurasian', 'Afro-Asian', 'Latino-Asian', 'MENA-European'],
    m: ['Theo', 'Ren', 'Malik', 'Levi', 'Yusuf'],
    f: ['Aria', 'Suki', 'Noor', 'Lia', 'Sana'],
    skin: 'warm caramel skin',
  },
];

// ⚠️ 성인 풀의 'tall and slender editorial runway build' 같은 어휘를 그대로 쓰면 안 된다 —
//    아이에게 런웨이·하이패션 체형을 요구하는 셈이라 결과가 어색해지고(성인 비율의 아이) 부적절하다.
//    아동은 자연스러운 또래 체형으로.
const BUILD_KID = [
  'slight, naturally slim build for their age',
  'average healthy build for their age',
  'sturdy, solid build for their age',
  'petite and small for their age',
  'tall for their age with long legs',
];
const HAIR_F = [
  'long straight hair', 'shoulder-length hair with a soft fringe', 'two braided pigtails',
  'short rounded bob', 'natural voluminous curls',
];
const HAIR_M = [
  'short neat crop', 'tousled medium hair', 'short fade',
  'natural short curls', 'straight hair with a soft fringe',
];
// ── 나이: 정확한 숫자가 아니라 **밴드**로 분류한다 (2026-07-17 실측 후 결정) ──
// 왜: 프롬프트 나이와 렌더된 겉보기 나이가 **엔트리마다 다르게** 어긋난다. 실측:
//   · 프롬프트 4세 → 6~7세로 보임 · 프롬프트 8세·12세 → 대체로 맞음
//   · 같은 "6세"인데 남아(Emil)는 6~7세, 여아(Seoyun)는 9~10세로 보임 = 균일한 오프셋이 아니다
// 정확한 숫자를 맞추려면 80명을 개별로 눈 검증·재조정해야 하고, 그래도 재생성마다 흔들린다(비결정적).
// 게다가 합성 아이의 정확한 나이는 **사람도 못 맞춘다** — 위 "9~10세"도 샘플 1장에 대한 눈대중 추정이다.
// → 라벨이 감당 못 할 정밀도를 주장하지 않는다. 밴드는 그 불확실성까지 정직하게 담고,
//   구매 맥락(아동복 사이즈)과도 밴드가 더 가깝다.
// ⚠️ age는 **프롬프트용 내부 근사치**다. 화면·필터·대본 빌더는 반드시 ageBand를 쓸 것.
const AGES = [6, 7, 8, 10, 12]; // Kids(6·7·8) 3명 + Junior(10·12) 2명 — 군·성별당 5명
const BANDS = [
  { key: 'kids', label: 'Kids (6–8)', low: 6, high: 8 },
  { key: 'junior', label: 'Junior (9–12)', low: 9, high: 12 },
];
const bandFor = (age) => BANDS.find((b) => age >= b.low && age <= b.high) || BANDS[BANDS.length - 1];

// 중립 톤 의상 — 성인 로스터와 동일 풀(무채색·단순 넥라인). 아동복 제품이 씬에서 덮어씌우므로 캐스팅컷은 중립이어야 한다.
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

// 성인 promptFor와 같은 문법(캐스팅 포트레이트) — 프레이밍·조명·렌즈를 맞춰야 씬에서 성인/아동이 같은 톤으로 붙는다.
function promptFor(p) {
  const kid = p.gender === 'female' ? 'girl' : 'boy';
  return `upper-body studio casting portrait of a ${p.age}-year-old ${p.descent} ${kid}, ${p.build}, ${p.skin}, ${p.hair}, natural healthy child's face with age-appropriate proportions, relaxed friendly neutral expression looking straight into the camera, head-and-shoulders to chest framing, centered, the full top of the head in frame with headroom, wearing ${p.outfit}, soft light grey seamless studio background, soft even softbox lighting with a gentle catchlight in the eyes, shot on 85mm f/2.8, sharp focus on the eyes, realistic natural skin texture, professional child model casting portrait for a children's clothing catalogue`;
}
// 성인 NEGATIVE + 아동 전용 방어(성인화·메이크업·연출 포즈·노출). 캐스팅컷은 담백해야 한다.
const NEGATIVE = 'adult proportions, adult facial features, aged-up or mature face, makeup, glamour makeup, dramatic or sultry pose, revealing or tight clothing, swimwear, bare torso, '
  + 'deformed or extra fingers, malformed hands, distorted face, asymmetric eyes, exaggerated or unrealistic proportions, cropped or cut-off top of head, tight extreme close-up, '
  + 'multiple people, cluttered background, props, logos, text, watermark, plastic over-retouched skin, low resolution';

const roster = [];
for (const g of GROUPS) {
  for (let i = 0; i < 5; i++) {
    for (const gender of ['female', 'male']) {
      const isF = gender === 'female';
      const seq = String(roster.length + 1).padStart(2, '0');
      const band = bandFor(AGES[i]);
      const p = {
        id: `kid-${isF ? 'f' : 'm'}-${g.key}-${i + 1}`, // kid- 접두사 = 성인 id와 절대 충돌 없음
        seq,
        name: (isF ? g.f : g.m)[i],
        gender,
        isMinor: true, // 다운스트림(대본 빌더·모델 픽커)이 이 플래그로 라우팅한다
        ageBand: band.key,        // ← 화면·필터·대본 빌더가 쓰는 값(주장할 수 있는 정밀도)
        ageBandLabel: band.label,
        ethnicity_group: g.label,
        ethnicity_key: g.key,
        descent: g.descents[i],
        age: AGES[i], // ⚠️ 프롬프트용 내부 근사치. 렌더된 겉보기 나이는 ±3까지 흔들린다 — 라벨로 쓰지 말 것
        build: BUILD_KID[i],
        hair: (isF ? HAIR_F : HAIR_M)[i],
        skin: g.skin,
        outfit: OUTFITS[(roster.length * 3) % OUTFITS.length], // stride 분산(결정론적)
      };
      p.prompt = promptFor(p);
      p.negative = NEGATIVE;
      roster.push(p);
    }
  }
}

// 정렬: 성인 로스터와 동일(여자 40 → 남자 40)
roster.sort((a, b) => (a.gender === b.gender ? a.id.localeCompare(b.id) : a.gender === 'female' ? -1 : 1));

// ── 산출 1: 데이터 시드 ──
const outDir = path.join(ROOT, 'src/models');
fs.mkdirSync(outDir, { recursive: true });
const header = `/* ⚠️ AUTO-GENERATED — node scripts/build_kids_roster.js\n * Doppia 아동 모델 로스터 v1 — 아동복 on-model용 (남 40 + 여 40, 8인종군, 나이 4~12).\n * 이미지 생성: node scripts/generate_model_images.js --kids --all → public/img/models/kids/<id>.jpg\n * 화면에 나오는 아이는 오직 이 로스터에서만 온다(고객 업로드는 kind='product'이고 인물은 재현하지 않음 — 7e1f8dc).\n */\n`;
fs.writeFileSync(path.join(outDir, 'roster.kids.v1.js'), header + 'module.exports = ' + JSON.stringify(roster, null, 2) + ';\n');

// ── 산출 1b: 프론트 노출용 슬림 JS (window.MODELS_KIDS) — 모델 픽커가 소비 ──
// ⚠️ age를 일부러 뺐다(성인 슬림엔 있다). 화면에 "6세"라고 쓰면 거짓말이 된다 —
//    렌더된 겉보기 나이가 라벨과 ±3까지 어긋난다(위 AGES 주석의 실측). 화면은 밴드까지만 주장한다.
const slim = roster.map(p => ({ id: p.id, name: p.name, gender: p.gender, group: p.ethnicity_group, descent: p.descent, ageBand: p.ageBand, ageBandLabel: p.ageBandLabel, isMinor: true, img: `/img/models/kids/${p.id}.jpg` }));
const pubDir = path.join(ROOT, 'public/js');
fs.writeFileSync(path.join(pubDir, 'models.kids.roster.js'),
  `/* AUTO-GENERATED — node scripts/build_kids_roster.js · window.MODELS_KIDS(${slim.length}) */\n(function(){ window.MODELS_KIDS = ${JSON.stringify(slim)}; })();\n`);

// ── 산출 2: CSV export (DB 적재/검토용 — CLAUDE.md 필수 규칙) ──
const docsDir = path.join(ROOT, 'docs/models');
fs.mkdirSync(docsDir, { recursive: true });
const cols = ['id', 'seq', 'name', 'gender', 'ageBand', 'ageBandLabel', 'ethnicity_group', 'descent', 'age', 'build', 'hair', 'skin', 'outfit'];
const csv = [cols.join(',')].concat(roster.map(p => cols.map(c => `"${String(p[c]).replace(/"/g, '""')}"`).join(','))).join('\n');
fs.writeFileSync(path.join(docsDir, 'roster.kids.v1.csv'), csv + '\n');

// ── 요약 ──
const byGender = { female: 0, male: 0 };
const byGroup = {};
const byBand = {};
roster.forEach(p => { byGender[p.gender]++; byGroup[p.ethnicity_group] = (byGroup[p.ethnicity_group] || 0) + 1; byBand[p.ageBandLabel] = (byBand[p.ageBandLabel] || 0) + 1; });
console.log(`build_kids_roster — ${roster.length}명 생성`);
console.log('성별:', byGender);
console.log('나이 밴드:', byBand);
console.log('인종군:', byGroup);
console.log('→ src/models/roster.kids.v1.js, public/js/models.kids.roster.js, docs/models/roster.kids.v1.csv');
