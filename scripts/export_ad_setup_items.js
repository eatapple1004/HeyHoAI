#!/usr/bin/env node
/**
 * 훅·장소·스타일 시드 → CSV (DB 적재용 구조화 파일).
 * CLAUDE.md 📊 규칙: 시드(JS)를 고치면 이 export도 같이 갱신한다.
 *   실행: node scripts/export_ad_setup_items.js
 */
const fs = require('fs');
const path = require('path');
const { rows } = require('../src/ad-studio/setupItems.seed');

const OUT = path.join(__dirname, '..', 'docs', 'exports', 'ad_setup_items.csv');
// meta는 style 전용(카메라 유무·기본 연출) — 열을 빼면 CSV만 보고 DB를 재현할 수 없다.
const COLS = ['type', 'slug', 'name', 'prompt', 'locale', 'sort_order', 'meta'];

/** 쉼표·따옴표·줄바꿈이 들어간 프롬프트가 많아 RFC4180대로 감싼다. */
const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const lines = [COLS.join(',')];
for (const r of rows()) {
  lines.push(COLS.map((c) => esc(c === 'meta' && r.meta ? JSON.stringify(r.meta) : r[c])).join(','));
}
fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
const n = (t) => rows().filter((r) => r.type === t).length;
console.log(`✅ ${path.relative(process.cwd(), OUT)} — ${rows().length}행 (훅 ${n('hook')} · 장소 ${n('setting')} · 스타일 ${n('style')})`);
