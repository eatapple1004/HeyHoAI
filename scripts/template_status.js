#!/usr/bin/env node
/**
 * template_status.js — 출시 라이프사이클 리포트 (held → testing → confirmed)
 * ============================================================================
 * 사용자 결정(2026-06-13): 전 템플릿 출시 보류, 1:1 테스트 거쳐 확정.
 * 원장 = docs/섹션명령서/_template_status.json (overrides에 없으면 default=held).
 * 카드 = docs/섹션명령서/_card_contract.proposed.json (id 단일원).
 *
 * 상태 변경: _template_status.json 의 overrides에
 *   "<id>": { "status": "testing"|"confirmed", "tested_at": "YYYY-MM-DD", "note": "..." } 추가.
 * 실행: node scripts/template_status.js   (exit 0)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const cards = require(path.join(ROOT, 'docs/섹션명령서/_card_contract.proposed.json')).cards;
const ledger = require(path.join(ROOT, 'docs/섹션명령서/_template_status.json'));
const def = ledger.default || 'held';
const ov = ledger.overrides || {};

const byStatus = { held: 0, testing: 0, confirmed: 0 };
const perCat = {};
const nonHeld = [];
let total = 0;
for (const [vert, list] of Object.entries(cards)) {
  perCat[vert] = { held: 0, testing: 0, confirmed: 0 };
  for (const c of list) {
    const s = (ov[c.id] && ov[c.id].status) || def;
    byStatus[s] = (byStatus[s] || 0) + 1;
    perCat[vert][s] = (perCat[vert][s] || 0) + 1;
    if (s !== 'held') nonHeld.push(`${vert}/${c.name} → ${s}${ov[c.id] && ov[c.id].note ? ' (' + ov[c.id].note + ')' : ''}`);
    total++;
  }
}

const prov = Object.values(cards).flat().filter((c) => c.provisional).length;
console.log(`\n템플릿 출시 라이프사이클 (총 ${total})`);
console.log(`  held(보류) ${byStatus.held} · testing(테스트중) ${byStatus.testing} · confirmed(확정) ${byStatus.confirmed}`);
console.log(`  → 출시 가능(confirmed): ${byStatus.confirmed} / ${total}   ${byStatus.confirmed === 0 ? '(출시 0 — 전부 보류)' : ''}`);
console.log(`  참고: provisional(로스터 미승인) ${prov} — held와 별개 축(둘 다 충족해야 confirmed 가능).`);
if (nonHeld.length) { console.log('\n  held 아닌 템플릿:'); nonHeld.forEach((x) => console.log('   • ' + x)); }
console.log('\n카탈로그별 (held/testing/confirmed):');
for (const v of Object.keys(perCat)) { const p = perCat[v]; console.log('  ' + v.padEnd(11) + `${p.held}/${p.testing}/${p.confirmed}`); }
console.log('\n원장: docs/섹션명령서/_template_status.json (overrides 편집으로 상태 승격)');
