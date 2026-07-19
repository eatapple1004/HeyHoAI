/**
 * build_model_roster.js — Doppia 성인 버추얼 모델 로스터 빌더 (v2, 2026-07-20 재구축)
 * ------------------------------------------------------------------------------
 * 입력(단일소스): src/models/personas.v2.json  (여100 + 남100, 페르소나 레코드)
 *               src/models/bodyTypes.js       (body_type → 크로키·볼륨텍스트·빌드형용사)
 * 산출: src/models/roster.v1.js (데이터) · public/js/models.roster.js (픽커 슬림) · docs/models/roster.v1.csv
 * 실행: node scripts/build_model_roster.js
 *
 * 규칙 정본: docs/로스터_몸매얼굴_시스템_규칙_2026-07-20.md
 * - 페르소나 레코드 = single source of truth. 프롬프트는 레코드에서 코드로 파생(손 타이핑 금지).
 * - body_type 비율: 여 ideal50/slender30/western20 · 남 slender30/fit_v6f40/fit_v3f30.
 * - 크로키는 버킷 내 순환 배정(결정론적). 얼굴엔 크로키 대신 faceBuild(형용사)만 쓴다.
 * - ⚠️ kids 로스터는 완전 별도(scripts/build_kids_roster.js) — 이 빌더가 건드리지 않는다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const bodyTypes = require(path.join(ROOT, 'src/models/bodyTypes.js'));

const personas = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/models/personas.v2.json'), 'utf8'));

const GROUP_LABEL = {
  east_asian: 'East Asian',
  southeast_asian: 'Southeast Asian',
  south_asian: 'South Asian',
  black_african: 'Black / African',
  white_european: 'White / European',
  hispanic_latino: 'Hispanic / Latino',
  mena: 'Middle Eastern / North African',
  mixed: 'Mixed / Multiracial',
};

// 버킷별 크로키 순환 카운터(결정론적)
const bucketIdx = {};
function nextBody(gender, body_type) {
  const k = `${gender}:${body_type}`;
  bucketIdx[k] = (bucketIdx[k] || 0);
  const info = bodyTypes.assign(gender, body_type, bucketIdx[k]);
  bucketIdx[k] += 1;
  return info;
}

const roster = [];
let seq = 0;
for (const p of [...personas.female, ...personas.male]) {
  seq += 1;
  const b = nextBody(p.gender, p.body_type);
  if (!b) throw new Error(`unknown body_type ${p.gender}:${p.body_type} (${p.id})`);
  roster.push({
    id: p.id,
    seq: String(seq).padStart(3, '0'),
    name: p.name,
    gender: p.gender,
    ethnicity_group: GROUP_LABEL[p.group] || p.group,
    ethnicity_key: p.group,
    descent: p.descent,
    age: p.age,
    // ── 몸 ──
    body_type: p.body_type,        // 내부(크로키 변형까지 구분)
    body_label: b.label,
    body_group: b.group,           // 사용자 노출용(픽커 필터 축) — 남 fit_v6f/v3f는 같은 'fit'
    body_group_label: b.groupLabel,
    croquis: b.croquis,            // 파일명 (public/img/croquis/)
    croquis_path: b.croquisPath,   // /img/croquis/xxx.png
    body_text: b.bodyText,         // stage-1 볼륨텍스트 (크로키와 반드시 co-inject)
    build: b.faceBuild,            // 얼굴/일반 주입용 빌드 형용사(짧은 서술)
    // ── 얼굴 ──
    face_shape: p.faceShape,
    eyes: p.eyes,
    lips: p.lips || null,          // 남성은 없음
    mark: p.mark || '',
    makeup: p.makeup || null,      // 여성만
    vibe: p.vibe,
    // ── 표면 ──
    skin: p.skin,
    hair: p.hair,
    // ── 자산/재현 ──
    img: `/img/models/${p.id}.jpg`,
    face_prompt: p.face_prompt,
    isMinor: false,
  });
}

// ── 산출 1: 데이터 시드 ──
const outDir = path.join(ROOT, 'src/models');
fs.mkdirSync(outDir, { recursive: true });
const header = `/* ⚠️ AUTO-GENERATED — node scripts/build_model_roster.js\n * Doppia 성인 로스터 v2 (여100 + 남100, 8인종). 입력=src/models/personas.v2.json + bodyTypes.js\n * 규칙 정본: docs/로스터_몸매얼굴_시스템_규칙_2026-07-20.md\n * kids 로스터는 별도(src/models/roster.kids.v1.js).\n */\n`;
fs.writeFileSync(path.join(outDir, 'roster.v1.js'), header + 'module.exports = ' + JSON.stringify(roster, null, 2) + ';\n');

// ── 산출 2: 픽커 슬림 (window.MODELS) — body_type 필터용 필드 포함 ──
const slim = roster.map((p) => ({
  id: p.id, name: p.name, gender: p.gender, group: p.ethnicity_group, descent: p.descent,
  age: p.age, body_type: p.body_type, body_group: p.body_group, body_group_label: p.body_group_label, img: p.img,
}));
fs.writeFileSync(path.join(ROOT, 'public/js/models.roster.js'),
  `/* AUTO-GENERATED — node scripts/build_model_roster.js · window.MODELS(${slim.length}) */\n(function(){ window.MODELS = ${JSON.stringify(slim)}; })();\n`);

// ── 산출 3: CSV export (DB 적재/검토용) ──
const docsDir = path.join(ROOT, 'docs/models');
fs.mkdirSync(docsDir, { recursive: true });
const cols = ['id', 'seq', 'name', 'gender', 'ethnicity_group', 'descent', 'age', 'body_type', 'croquis', 'build', 'face_shape', 'eyes', 'lips', 'mark', 'makeup', 'vibe', 'skin', 'hair', 'img'];
const csv = [cols.join(',')].concat(roster.map((p) => cols.map((c) => `"${String(p[c] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
fs.writeFileSync(path.join(docsDir, 'roster.v1.csv'), csv + '\n');

// ── 요약 ──
const by = (k) => roster.reduce((m, p) => { m[p[k]] = (m[p[k]] || 0) + 1; return m; }, {});
console.log(`build_model_roster v2 — ${roster.length}명`);
console.log('성별:', by('gender'));
console.log('body_type:', by('body_type'));
console.log('인종군:', by('ethnicity_group'));
console.log('크로키 배정:', by('croquis'));
console.log('→ src/models/roster.v1.js · public/js/models.roster.js · docs/models/roster.v1.csv');
