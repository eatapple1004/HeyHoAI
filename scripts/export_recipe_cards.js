#!/usr/bin/env node
/**
 * export_recipe_cards.js — FE 카드 소비 메커니즘 (핸드오프 게이트 A4)
 * ============================================================================
 * 목적: 카드 계약(_card_contract.proposed.json)을 studio가 소비할 단일 산출물
 *       public/js/recipes.generated.js 로 변환. 템플릿이 78→~93 재export하면
 *       (템플릿: recipe_card_contract.js → 계약 JSON) 이 스크립트만 다시 돌리면
 *       studio 카드그리드가 자동 갱신된다(데이터드리븐, 하드코딩 제거).
 *
 * 도메인 경계:
 *   - 템플릿 도메인: src/recipes/seeds → scripts/recipe_card_contract.js → _card_contract.proposed.json
 *   - FE 도메인(여기):  _card_contract.proposed.json → public/js/recipes.generated.js
 *   계약 JSON이 시드의 결정론적 산물(id=slug·is_new·resolvedGuards 해소)이므로
 *   FE는 src/recipes 내부(죽은 가드데이터·emoji/grad 부재)에 의존하지 않는다.
 *
 * 카드 cost = 시드 credit_cost 단일원 (pricing.js 아님 — 플랜/팩 가격과 무관, A3).
 * emoji/grad = 소스 of record 없음(A2c) → FE 결정론 파생(id 해시 → grad, 키워드 → emoji).
 *   재export 시 같은 id는 항상 같은 emoji/grad (round-trip 안정).
 *
 * 실행: node scripts/export_recipe_cards.js   (exit 1 = drift/오류)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CONTRACT = path.join(ROOT, 'docs/섹션명령서/_card_contract.proposed.json');
const CATALOG = path.join(ROOT, 'docs/섹션명령서/_CATALOG.json');
const STATUS = path.join(ROOT, 'docs/섹션명령서/_STATUS.md');
const OUT = path.join(ROOT, 'public/js/recipes.generated.js');

// studio.html의 GRAD 팔레트와 동일 (g1..g8) — 산출물이 standalone이도록 풀 CSS 문자열로 방출
const GRAD = {
  g1: 'linear-gradient(150deg,#ffce7a,#ff7eb6)', g2: 'linear-gradient(150deg,#7c6cff,#5ee0d6)',
  g3: 'linear-gradient(150deg,#ff7eb6,#7c6cff)', g4: 'linear-gradient(150deg,#5ee0d6,#7c6cff)',
  g5: 'linear-gradient(150deg,#ffce7a,#ff5f8f)', g6: 'linear-gradient(150deg,#a99bff,#ff7eb6)',
  g7: 'linear-gradient(150deg,#5ee0d6,#9b7bff)', g8: 'linear-gradient(150deg,#ff9a6b,#ffce7a)',
};
const GKEYS = Object.keys(GRAD);

// djb2 — id → 안정적 grad 인덱스 (카운트가 78→93로 바뀌어도 같은 id는 같은 grad)
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
function pickGrad(id) { return GRAD[GKEYS[hash(id) % GKEYS.length]]; }

// 키워드 → emoji (name+cat 스캔). 미스매치는 type 기본값. 결정론적.
const EMOJI_RULES = [
  [/spokes|testimonial|talking-head|street interview|talking pet|skit/, '🗣️'],
  [/grwm|dewy|glow|routine|swatch|cosmet|serum|lipstick/, '💄'],
  [/headshot|linkedin|executive|team page|authority|about-page|speaking|approachable/, '💼'],
  [/unbox|asmr/, '🎁'],
  [/360|spin/, '🔄'],
  [/macro|texture|tactile|crunch|detail|surface/, '🔬'],
  [/menu|price|spec|callout|claim|info|dimension|scale & spec|overlay/, '🔖'],
  [/flat.?lay|flat-lay/, '🧩'],
  [/packaging/, '📦'],
  [/hero|void/, '✨'],
  [/on-?model|fit|wrist|hand|neck|ear|try-on|on-?body|on-?pet/, '🧍'],
  [/lifestyle|shelfie|cafe|room|warmth|cuddle|desk|scene|table|serving/, '🛋️'],
  [/travel|golden hour/, '🌅'],
  [/reel|sizzle|reveal|zoomies|demo|pov|reaction|discovery|hook|haul|day-in-life|outfit|teaser|lumen|light/, '🎬'],
  [/photo dump|candid|feed|editorial|studio|lookbook|styl/, '📸'],
];
function pickEmoji(card) {
  const s = (card.name + ' ' + card.cat).toLowerCase();
  for (const [re, e] of EMOJI_RULES) if (re.test(s)) return e;
  return card.type === 'reel' ? '🎬' : '🖼️';
}

// ── 입력 로드 ──
let contract;
try { contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8')); }
catch (e) { console.error('✗ 계약 JSON 읽기 실패:', CONTRACT, e.message); process.exit(1); }
if (!contract.cards) { console.error('✗ 계약 JSON에 .cards 없음'); process.exit(1); }

// ── 카드 변환 (계약 필드 보존 + emoji/grad 파생) ──
const FE_VERTICALS = ['influencer', 'fashion', 'beauty', 'jewelry', 'food', 'home', 'tech', 'pet', 'ugc', 'general', 'headshot'];
const cards = {};
let total = 0, newCount = 0, overlayCount = 0, guardCount = 0, provCount = 0, idSet = new Set(), collisions = [];
const provVerts = new Set(); // 계약 per-card provisional 기반(확장 로스터) — 하드코딩 아님, 데이터에서 파생
for (const v of FE_VERTICALS) {
  const src = contract.cards[v] || [];
  cards[v] = src.map((r) => {
    if (idSet.has(r.id)) collisions.push(r.id); else idSet.add(r.id);
    total++; if (r.new) newCount++; if (r.text_overlay) overlayCount++; if (r.guards && r.guards.length) guardCount++;
    if (r.provisional) { provCount++; provVerts.add(v); }
    return {
      id: r.id, cat: r.cat, name: r.name, type: r.type === 'reel' ? 'reel' : 'image',
      cost: r.cost,                          // 시드 credit_cost 단일원
      new: !!r.new,
      status: r.status || 'held',            // 출시 라이프사이클 held|testing|confirmed (보류 UI 배지용)
      provisional: r.provisional === true,   // 계약 per-card(확장 로스터) — '프리뷰/의도'만, 영구 마케팅카피 금지
      flags: r.flags || [],                  // experimental / needs_human_review / oversize
      text_overlay: r.text_overlay === true, // top-level (A5 혼합중첩 규약)
      guards: r.guards || [],                // PREVIEW 전용 (resolver L148 미착지 — '보장' 카피 금지)
      emoji: pickEmoji(r), grad: pickGrad(r.id),
    };
  });
}

// ── drift-guard: 계약 total vs _CATALOG 합 vs _STATUS 헤더 ──
let catalogTotal = null, statusTotal = null;
try { catalogTotal = JSON.parse(fs.readFileSync(CATALOG, 'utf8')).reduce((s, x) => s + (x.count || 0), 0); } catch (e) {}
try { const m = fs.readFileSync(STATUS, 'utf8').match(/총\s*(\d+)\s*개/); statusTotal = m ? +m[1] : null; } catch (e) {}
const driftOK = total === (contract.total || total) && (catalogTotal == null || catalogTotal === total) && (statusTotal == null || statusTotal === total);

// ── 산출물 방출 ──
const banner = `/* ⚠️ AUTO-GENERATED — DO NOT EDIT BY HAND.
 * 생성: node scripts/export_recipe_cards.js
 * 소스: docs/섹션명령서/_card_contract.proposed.json (카드 계약 · 시드 credit_cost 단일원)
 * 카드 cost=시드 credit_cost (pricing.js 아님). emoji/grad=FE 결정론 파생(A2c). guards=PREVIEW 전용(resolver L148 미착지 → '보장' 카피 금지).
 * 템플릿이 ${total}→~93 재export하면 이 파일만 재생성하면 studio가 자동 반영.
 */`;
const payload = {
  generatedFrom: '_card_contract.proposed.json',
  total, new_count: newCount, overlay_count: overlayCount, guarded_count: guardCount, provisional_count: provCount,
  provisional_verticals: [...provVerts],
  drift_guard: { fe_total: total, contract_total: contract.total, catalog_total: catalogTotal, status_total: statusTotal, ok: driftOK },
  cards,
};
const body = `${banner}\n(function(){\n  var R = ${JSON.stringify(payload, null, 2)};\n  if (typeof window !== 'undefined') window.RECIPES = R;\n  if (typeof module !== 'undefined' && module.exports) module.exports = R;\n})();\n`;
fs.writeFileSync(OUT, body);

// ── 콘솔 요약 ──
console.log('\nexport_recipe_cards — recipes.generated.js 생성');
console.log(`총 ${total}개 · 신규 ${newCount} · provisional ${provCount} (${[...provVerts].join(',')}) · text_overlay ${overlayCount} · 가드보유 ${guardCount} · id충돌 ${collisions.length}`);
console.log(`drift-guard: FE ${total} / 계약 ${contract.total} / _CATALOG ${catalogTotal} / _STATUS ${statusTotal} → ${driftOK ? 'OK ✓' : 'MISMATCH ✗'}`);
console.log('버티컬별:', FE_VERTICALS.map((v) => `${v}:${cards[v].length}`).join(' '));
console.log('→ ' + path.relative(ROOT, OUT));
process.exit((collisions.length || !driftOK) ? 1 : 0);
