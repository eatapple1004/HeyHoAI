#!/usr/bin/env node
/**
 * recipe_card_contract.js — 템플릿 도메인 참조 도구 (PROPOSAL 생성기, FE 계약 동결 아님)
 * ============================================================================
 * 목적(핸드오프 게이트 A2 일부, 🟢 템플릿 내부 한정):
 *   ① is_new 정규화 — 11개 v2 시드 중 meta.change는 influencer/headshot만 보유.
 *      → "v1 시드에 같은 name이 없으면 신규" 라는 결정론적 단일 소스로 통일(net-new 카탈로그=전부 신규).
 *   ② resolvedGuards(vertical)를 카드에 부착 — product.guards.v2.js를 실제 import·호출(죽은 데이터 해소 증명).
 *   ③ 카드 6필드 매핑 + 카운트 drift-guard(_STATUS.md/시드 합).
 *
 * ⚠️ 산출물(_card_contract.proposed.json)은 **제안**이다. id 포맷·카드스키마·studio 소비방식은
 *    FE/backend/Chief 비준 대상(게이트 A2a/A4/A5). 이 스크립트는 studio.html을 건드리지 않는다.
 * 실행: node scripts/recipe_card_contract.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SEEDS = path.join(ROOT, 'src/recipes/seeds');
const guards = require(path.join(SEEDS, 'product.guards.v2.js')); // ← resolvedGuards 실호출
// 출시 라이프사이클 원장(held→testing→confirmed). overrides에 없으면 default=held.
const ledger = (() => { try { return require(path.join(ROOT, 'docs/섹션명령서/_template_status.json')); } catch (e) { return { default: 'held', overrides: {} }; } })();
const lifecycleStatus = (id) => (ledger.overrides && ledger.overrides[id] && ledger.overrides[id].status) || ledger.default || 'held';

const VERTICALS = ['influencer', 'fashion', 'beauty', 'jewelry', 'food', 'home', 'tech', 'pet', 'ugc', 'general', 'headshot'];
const PRODUCT = new Set(['fashion', 'beauty', 'jewelry', 'food', 'home', 'tech', 'pet', 'general']);

const slug = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function loadArr(p) { try { delete require.cache[require.resolve(p)]; const m = require(p); return Array.isArray(m) ? m : []; } catch (e) { return null; } }

const out = {};
let total = 0, newCount = 0, idSet = new Set(), idCollisions = [];
for (const v of VERTICALS) {
  const v2 = loadArr(path.join(SEEDS, `recipes.${v}.v2.js`));
  if (!v2) { console.error('MISSING v2:', v); continue; }
  const v1 = loadArr(path.join(SEEDS, `recipes.${v}.js`));       // null = net-new 카탈로그(general/headshot)
  const v1names = new Set((v1 || []).map((r) => (r.name || '').trim().toLowerCase()));
  const netNew = v1 === null;                                    // v1 시드 없음 = 전부 신규

  out[v] = v2.map((r) => {
    const isNew = netNew || !v1names.has((r.name || '').trim().toLowerCase());
    const id = slug(r.name);                                     // ⚠ 파생 id (게이트 A2a: FE/backend 비준 대상)
    if (idSet.has(id)) idCollisions.push(id); else idSet.add(id);
    if (isNew) newCount++;
    total++;
    const card = {
      id,                                                        // PROVISIONAL
      cat: r.category,
      name: r.name,
      type: (r.output_type === 'reel' ? 'reel' : 'image'),
      cost: r.credit_cost,                                       // 시드 credit_cost 단일원(pricing.js 아님)
      new: isNew,
      provisional: !!(r.meta && r.meta.provisional),       // Chief: 확장분 provisional 표기
      status: lifecycleStatus(id),                         // held | testing | confirmed (출시 라이프사이클)
      flags: (r.meta && r.meta.flags) || [],
      text_overlay: r.text_overlay === true,                     // top-level (consolidate와 동일 경로)
    };
    if (PRODUCT.has(v)) card.guards = guards.resolvedGuards(v);   // ← resolvedGuards 실소비
    return card;
  });
}

// drift-guard: 시드 합 vs _STATUS 헤더
const status = fs.readFileSync(path.join(ROOT, 'docs/섹션명령서/_STATUS.md'), 'utf8');
const m = status.match(/총\s*(\d+)\s*개/);
const statusCount = m ? +m[1] : null;
const driftOK = statusCount === total;

// 출력(제안 아티팩트)
const artifact = {
  _note: 'PROPOSAL — FE/backend 비준 전. id/카드스키마/소비방식 미동결(게이트 A2a/A4/A5).',
  generated_rule: { is_new: 'name이 recipes.<v>.js(v1)에 없으면 true; v1 없는 카탈로그=전부 true', id: 'slug(name) — PROVISIONAL' },
  total, new_count: newCount,
  provisional_count: Object.values(out).flat().filter((c) => c.provisional).length,
  drift_guard: { seed_total: total, status_total: statusCount, ok: driftOK },
  id_collisions: idCollisions,
  cards: out,
};
const outPath = path.join(ROOT, 'docs/섹션명령서/_card_contract.proposed.json');
fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));

// 콘솔 요약
console.log(`\nrecipe_card_contract — PROPOSAL 생성`);
console.log(`총 ${total}개 · 신규(is_new) ${newCount}개 · id 충돌 ${idCollisions.length}건`);
console.log(`drift-guard: 시드합 ${total} vs _STATUS ${statusCount} → ${driftOK ? 'OK ✓' : 'MISMATCH ✗'}`);
console.log('\nresolvedGuards 실호출 검증 (제품 8버티컬):');
for (const v of VERTICALS) if (PRODUCT.has(v)) console.log('  ' + v.padEnd(9) + (guards.resolvedGuards(v) || []).join(', '));
console.log('\n버티컬별 신규 카드:');
for (const v of VERTICALS) { const n = out[v] ? out[v].filter((c) => c.new).map((c) => c.name) : []; if (n.length) console.log('  ' + v.padEnd(9) + n.join(' · ')); }
console.log('\n→ 제안 아티팩트: docs/섹션명령서/_card_contract.proposed.json');
process.exit(idCollisions.length || !driftOK ? 1 : 0);
