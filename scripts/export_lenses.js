/**
 * 공식 Doppia Lens 시드(src/lens/lens.service.js OFFICIAL) → docs/exports/lenses.official.csv
 * 규칙: 프롬프트/템플릿은 시드(JS)와 구조화 export를 함께 갱신한다(추후 DB 적재용).
 * 실행: node scripts/export_lenses.js
 */
const fs = require('fs');
const path = require('path');

// lens.service.js 는 DB 클라이언트를 불러오므로, OFFICIAL 배열만 소스에서 떼어 평가한다(DB·env 불필요).
const src = fs.readFileSync(path.join(__dirname, '../src/lens/lens.service.js'), 'utf8');
const m = src.match(/const OFFICIAL = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error('OFFICIAL 배열을 찾지 못했다');
const OFFICIAL = Function(`return ${m[1]}`)();

const cols = ['slug', 'title', 'folder', 'category', 'description', 'kind', 'engine', 'aspect', 'count', 'duration', 'recipeId', 'inputs', 'shots', 'source', 'prompt'];
const cell = (v) => {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = OFFICIAL.map((o) => {
  const c = o.config || {};
  return [o.slug, o.title, o.folder || '', o.category, o.description, c.kind, c.engine, c.aspect, c.count, c.duration, c.recipeId,
    (c.inputs || []).map((i) => i.key).join('+'), c.shots || '', c.source, c.prompt].map(cell).join(',');
});
const out = path.join(__dirname, '../docs/exports/lenses.official.csv');
fs.writeFileSync(out, '﻿' + [cols.join(','), ...rows].join('\n') + '\n');
console.log(`${OFFICIAL.length} lenses → ${path.relative(process.cwd(), out)}`);
