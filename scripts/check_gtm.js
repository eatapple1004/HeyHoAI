#!/usr/bin/env node
/**
 * check_gtm.js — 그로스(GTM) 도메인 산출물·마진·진행률 검증 대시보드
 *
 * 검사 항목:
 *   (a) 그로스 산출물 파일 존재 여부
 *   (b) public/*.html 가격 하드코딩 누수 grep
 *   (c) costMeter computeMargin 으로 적자(marginPct<0) SKU 탐지
 *   (d) launch_merchant_checklist / listing_shopify_appstore / deploy_runbook 의
 *       - [ ] / - [x] 체크박스 카운트로 진행률(%)
 *
 * 콘솔에 마크다운 대시보드 출력. 이슈가 하나라도 있으면 exit 1, 없으면 exit 0.
 *
 * 주의:
 *   - docs/세션조직/_STATUS_growth.md 는 절대 건드리지 않는다(총지휘 작성).
 *   - 동적 현재시각 함수(Date.now 등) 사용 금지 — 정적 스냅샷 값만 사용.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// 정적 스냅샷 라벨 (동적 시각 함수 미사용)
const SNAPSHOT = 'snapshot @ verify-run (static)';

const issues = [];

// ── (a) 산출물 존재 여부 ──────────────────────────────────────────
const DELIVERABLES = [
  'src/pricing/pricing.config.js',
  'src/pricing/pricing.route.js',
  'public/js/pricing.js',
  'docs/그로스/pricing_margin_model.md',
  'Dockerfile',
  'render.yaml',
  'docs/그로스/deploy_runbook.md',
  'docs/그로스/launch_merchant_checklist.md',
  'docs/그로스/listing_shopify_appstore.md',
];

const deliverableRows = DELIVERABLES.map((rel) => {
  const exists = fs.existsSync(path.join(ROOT, rel));
  if (!exists) issues.push(`missing deliverable: ${rel}`);
  return { rel, exists };
});

// ── (b) 가격 하드코딩 누수 grep (public/*.html) ───────────────────
const LEAK_RE = /\$(19|39|79|199)|◈\s?(250|600|1,?400)/;
const publicDir = path.join(ROOT, 'public');
const leaks = [];
if (fs.existsSync(publicDir)) {
  for (const f of fs.readdirSync(publicDir)) {
    if (!f.endsWith('.html')) continue;
    const full = path.join(publicDir, f);
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      if (LEAK_RE.test(ln)) {
        leaks.push(`public/${f}:${i + 1}`);
      }
    });
  }
}
if (leaks.length) {
  issues.push(`price hardcode leaks: ${leaks.length} line(s) in public/*.html`);
}

// ── (c) costMeter 적자 SKU ────────────────────────────────────────
const cm = require(path.join(ROOT, 'src/studio/costMeter.js'));
const SKUS = [
  { name: 'photo',         credits: 2, job: { outputType: 'image', count: 1 } },
  { name: 'reel',          credits: 6, job: { outputType: 'reel' } },
  { name: 'UGC',           credits: 8, job: { outputType: 'reel', ugc: true } },
  { name: 'photo+4K',      credits: 2, job: { outputType: 'image', count: 1, quality: '4k' } },
  { name: 'photo+caption', credits: 2, job: { outputType: 'image', count: 1, caption: true } },
];
const marginRows = SKUS.map((s) => {
  const cost = cm.estimateJobCost(s.job);
  const m = cm.computeMargin({ creditsCharged: s.credits, actualCostUsd: cost });
  return { name: s.name, cost: m.costUsd, rev: m.revenueUsd, marginPct: m.marginPct };
});
const lossSkus = marginRows.filter((r) => r.marginPct < 0).map((r) => r.name);
if (lossSkus.length) {
  issues.push(`loss SKUs (marginPct<0): ${lossSkus.join(', ')}`);
}

// ── (d) 체크리스트 진행률 ─────────────────────────────────────────
const CHECKLISTS = [
  'docs/그로스/launch_merchant_checklist.md',
  'docs/그로스/listing_shopify_appstore.md',
  'docs/그로스/deploy_runbook.md',
];
const TOTAL_RE = /^\s*- \[[ xX]\]/;
const DONE_RE = /^\s*- \[[xX]\]/;
const progressRows = CHECKLISTS.map((rel) => {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    return { rel, total: 0, done: 0, pct: 0, missing: true };
  }
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  let total = 0;
  let done = 0;
  for (const ln of lines) {
    if (TOTAL_RE.test(ln)) {
      total += 1;
      if (DONE_RE.test(ln)) done += 1;
    }
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { rel, total, done, pct, missing: false };
});

// ── 마크다운 대시보드 출력 ────────────────────────────────────────
const out = [];
out.push('# GTM Growth Readiness Dashboard');
out.push('');
out.push(`_${SNAPSHOT}_`);
out.push('');

out.push('## (a) Deliverables');
out.push('');
out.push('| file | present |');
out.push('| --- | --- |');
for (const d of deliverableRows) {
  out.push(`| ${d.rel} | ${d.exists ? 'OK' : 'MISSING'} |`);
}
out.push('');

out.push('## (b) Price hardcode leaks (public/*.html)');
out.push('');
if (leaks.length === 0) {
  out.push('_none_');
} else {
  out.push(`Found **${leaks.length}** line(s):`);
  out.push('');
  for (const l of leaks) out.push(`- ${l}`);
}
out.push('');

out.push('## (c) costMeter margins');
out.push('');
out.push('| SKU | cost | revenue | margin% |');
out.push('| --- | --- | --- | --- |');
for (const r of marginRows) {
  out.push(`| ${r.name} | $${r.cost} | $${r.rev} | ${r.marginPct}% |`);
}
out.push('');
out.push(lossSkus.length === 0
  ? '_no loss SKUs_'
  : `**LOSS SKUs:** ${lossSkus.join(', ')}`);
out.push('');

out.push('## (d) Checklist progress');
out.push('');
out.push('| doc | done/total | progress |');
out.push('| --- | --- | --- |');
for (const p of progressRows) {
  if (p.missing) {
    out.push(`| ${p.rel} | MISSING | - |`);
  } else {
    out.push(`| ${p.rel} | ${p.done}/${p.total} | ${p.pct}% |`);
  }
}
out.push('');

out.push('## Issues');
out.push('');
if (issues.length === 0) {
  out.push('_none — all checks passed_');
} else {
  for (const i of issues) out.push(`- ${i}`);
}
out.push('');

console.log(out.join('\n'));

process.exit(issues.length === 0 ? 0 : 1);
