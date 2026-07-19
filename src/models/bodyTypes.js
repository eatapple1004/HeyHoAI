/**
 * bodyTypes.js — body_type → {크로키, stage-1 볼륨텍스트, 얼굴 빌드형용사} 단일소스.
 * 정본 규칙: docs/로스터_몸매얼굴_시스템_규칙_2026-07-20.md
 *
 * ⚠️ 핵심 규칙: 크로키(이미지 ref)만 넣으면 gemini가 볼륨을 정규화해 깎는다.
 *    → 그 크로키를 만든 **볼륨텍스트를 stage-1에 반드시 co-inject**해야 체형이 유지된다.
 * 얼굴 생성엔 크로키를 쓰지 않는다 — `faceBuild`(빌드 형용사 한 줄)만 넣어 목·어깨·살집을 몸과 맞춘다.
 */

// ── 여성 ──
const F_CORE = `The model's body is a BOLD slim-thick hourglass, matching the body-shape guide image — do NOT copy its pose. She is EXTREMELY LEAN and slim everywhere (slim arms, a tiny corset-cinched wasp waist, slim thighs with a thigh gap, slim calves) EXCEPT a dramatically FULL rounded bust and dramatically WIDE curvy hips, a strong S-line. Follow the guide's proportions closely.`;
const F_SLENDER = `The model's body matches the body-shape guide image — do NOT copy its pose — but she is EXTREMELY THIN: a size-0 runway body with very low body fat, twig-thin arms and legs, a flat small chest, a narrow flat torso, visible collarbones and hip bones, a wide thigh gap. She keeps a wide shoulder frame and prominent collarbones (thin but framed).`;
const F_WX3 = `The model's body is the curviest voluptuous Western bombshell — an enormous full bust, a defined hourglass waist (strong S-curve), huge wide round hips and a full rear, full thighs, abundant maximized volume with a cinched waist. Follow the body-shape guide image (do NOT copy its pose).`;
const F_WX5 = `The model's body is a glamour bombshell — a huge full bust, a snatched defined waist, very wide voluptuous hips and full thighs, maximum curves and volume, a bold S-line hourglass. Follow the body-shape guide image (do NOT copy its pose).`;

// ── 남성 ──
const M_SLENDER = `The model's body matches the body-shape guide image — do NOT copy its pose. He is EXTREMELY THIN: a size-0 runway body with very low body fat, twig-thin arms and legs, a flat narrow chest, narrow hips, a thigh gap, a straight lean silhouette.`;
const M_FIT = `The model's body matches the body-shape guide image — do NOT copy its pose. He has a fit V-taper: broad shoulders tapering to a narrow waist, a defined chest and abs, on a TALL long-limbed model frame (very broad shoulders, long arms, very long legs). He is lean and fit with clearly visible defined six-pack abs and fairly low body fat, a natural athletic fit-model look (not contest-shredded, not vascular, not bodybuilder-huge).`;

const CROQUIS_DIR = '/img/croquis'; // public 기준 (서버는 public/img/croquis 로 읽음)

/** body_type 정의. croquis[]는 버킷 내 순환 배정(결정론적). */
/** 사용자 노출용 그룹 — 내부 body_type(크로키 변형)과 분리.
 *  남성 fit_v6f/fit_v3f는 크로키만 다른 같은 체형이라 픽커엔 "Fit" 하나로 보여야 한다(칩 중복 방지). */
const BODY_GROUP = {
  'female:ideal':   { group: 'ideal',   label: 'Ideal' },
  'female:slender': { group: 'slender', label: 'Slender' },
  'female:western': { group: 'curvy',   label: 'Curvy' },
  'male:slender':   { group: 'slender', label: 'Slender' },
  'male:fit_v6f':   { group: 'fit',     label: 'Fit' },
  'male:fit_v3f':   { group: 'fit',     label: 'Fit' },
};

const BODY_TYPES = {
  // 여성 — 이상형 50% / 슬랜더 30% / 서구형 20%
  'female:ideal': {
    label: 'Ideal (slim-thick)', share: 0.50,
    faceBuild: 'a slim-thick curvy build — a slim frame with a full bust and a delicate slim neck',
    croquis: [
      { file: 'ideal_p_h.png', text: `${F_CORE} Wide hips from a wide pelvis while the thighs stay slim; a full high bust.` },
      { file: 'ideal_p_i.png', text: `${F_CORE} An exaggerated thicc hourglass — oversized full bust and oversized wide curvy hips on a skinny waist and slim limbs.` },
      { file: 'ideal_r4.png',  text: `${F_CORE} Maximum bust and hip volume, minimum waist, skinny limbs.` },
      { file: 'ideal_t3.png',  text: `${F_CORE} A very large high full bust, a snatched tiny waist, huge wide curvy hips and full upper thighs, but slim lower legs.` },
    ],
  },
  'female:slender': {
    label: 'Slender (framed)', share: 0.30,
    faceBuild: 'an extremely slender thin build — narrow shoulders and a thin delicate neck',
    croquis: [
      { file: 'slender_sf5.png', text: F_SLENDER },
      { file: 'slender_sf6.png', text: F_SLENDER },
    ],
  },
  'female:western': {
    label: 'Western (voluptuous)', share: 0.20,
    faceBuild: 'a voluptuous full curvy build — a fuller frame and full décolletage',
    croquis: [
      { file: 'western_wx3.png', text: F_WX3 },
      { file: 'western_wx5.png', text: F_WX5 },
    ],
  },
  // 남성 — 슬랜더 30% / fit_v6f 40% / fit_v3f 30%
  'male:slender': {
    label: 'Slender', share: 0.30,
    faceBuild: 'an extremely slender thin build — narrow bony shoulders and a thin neck',
    croquis: [{ file: 'm_slender_slx4.png', text: M_SLENDER }],
  },
  'male:fit_v6f': {
    label: 'Fit V-taper (A)', share: 0.40,
    faceBuild: 'a fit muscular V-taper build — broad wide shoulders, a strong neck and a defined upper chest',
    croquis: [{ file: 'm_ideal_v6f.png', text: M_FIT }],
  },
  'male:fit_v3f': {
    label: 'Fit V-taper (B)', share: 0.30,
    faceBuild: 'a fit muscular V-taper build — broad wide shoulders, a strong neck and a defined upper chest',
    croquis: [{ file: 'm_ideal_v3f.png', text: M_FIT }],
  },
};

const key = (gender, body_type) => `${gender}:${body_type}`;

/** 모델 인덱스로 크로키를 결정론적으로 배정(버킷 내 순환). */
function assign(gender, body_type, idx) {
  const def = BODY_TYPES[key(gender, body_type)];
  if (!def) return null;
  const c = def.croquis[idx % def.croquis.length];
  const g = BODY_GROUP[key(gender, body_type)] || { group: body_type, label: def.label };
  return { body_type, label: def.label, group: g.group, groupLabel: g.label, faceBuild: def.faceBuild, croquis: c.file, croquisPath: `${CROQUIS_DIR}/${c.file}`, bodyText: c.text };
}

/** 로스터 모델 레코드로 stage-1 몸 정보 조회(생성 시 사용). */
function forModel(m) {
  if (!m) return null;
  const def = BODY_TYPES[key(m.gender, m.body_type)];
  if (!def) return null;
  const file = m.croquis || def.croquis[0].file;
  const c = def.croquis.find((x) => x.file === file) || def.croquis[0];
  const g = BODY_GROUP[key(m.gender, m.body_type)] || { group: m.body_type, label: def.label };
  return { body_type: m.body_type, label: def.label, group: g.group, groupLabel: g.label, faceBuild: def.faceBuild, croquis: c.file, croquisPath: `${CROQUIS_DIR}/${c.file}`, bodyText: c.text };
}

module.exports = { BODY_TYPES, BODY_GROUP, CROQUIS_DIR, assign, forModel };
