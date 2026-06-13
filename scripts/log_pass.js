#!/usr/bin/env node
/**
 * log_pass.js — 워커 검증 통과 보고 누적 (브랜치 독립 저장)
 * ============================================================================
 * 저장소: docs/섹션명령서/_pass_log.json (entries[]). 보류 라이프사이클 원장과 별개 — 유실 0.
 * 워커 보고는 ① 템플릿 이름 ② 테마(vertical) ③ 통과 만 있으면 됨. 이름→id(slug)는 자동.
 *
 * 사용:
 *   node scripts/log_pass.js "<template name>" <vertical> ["note"]   통과 1건 기록
 *      예) node scripts/log_pass.js "Top-Down Hero" food "워커A 1차 통과"
 *   node scripts/log_pass.js --list            현황(테마별 통과 수 + 목록)
 *   node scripts/log_pass.js --sync            _template_status.json 있으면 통과분을 confirmed로 일괄 반영
 *
 * 검증: 보고된 이름이 해당 vertical 시드에 실재하는지 확인(오타·잘못된 테마 차단).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SEEDS = path.join(ROOT, 'src/recipes/seeds');
const LOG = path.join(ROOT, 'docs/섹션명령서/_pass_log.json');
const LEDGER = path.join(ROOT, 'docs/섹션명령서/_template_status.json');

// recipe_card_contract.js 와 동일한 slug (id 일치 보장)
const slug = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const VERTS = ['influencer', 'fashion', 'beauty', 'jewelry', 'food', 'home', 'tech', 'pet', 'ugc', 'general', 'headshot'];

function loadLog() { try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch (e) { return { _note: '워커 통과 누적 로그', lifecycle_target: 'docs/섹션명령서/_template_status.json', updated: today(), entries: [] }; } }
function saveLog(l) { l.updated = today(); fs.writeFileSync(LOG, JSON.stringify(l, null, 2) + '\n'); }
function seedNames(v) { try { delete require.cache[require.resolve(path.join(SEEDS, `recipes.${v}.v2.js`))]; return require(path.join(SEEDS, `recipes.${v}.v2.js`)).map((r) => r.name); } catch (e) { return null; } }

const args = process.argv.slice(2);
const log = loadLog();

if (args[0] === '--list') {
  const byV = {};
  log.entries.forEach((e) => { (byV[e.vertical] = byV[e.vertical] || []).push(e.name); });
  console.log(`\n통과 누적: ${log.entries.length}건  (updated ${log.updated})`);
  for (const v of VERTS) if (byV[v]) console.log(`  ${v.padEnd(11)}${byV[v].length} — ${byV[v].join(' · ')}`);
  if (!log.entries.length) console.log('  (아직 없음 — 워커 보고 대기)');
  process.exit(0);
}

if (args[0] === '--sync') {
  if (!fs.existsSync(LEDGER)) { console.error('✗ 원장 없음:', LEDGER, '\n  → PR #64가 main에 머지된 뒤 --sync 하세요.'); process.exit(1); }
  const led = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  led.overrides = led.overrides || {};
  let n = 0;
  for (const e of log.entries) { led.overrides[e.id] = { status: 'confirmed', tested_at: e.tested_at, note: e.note || 'worker pass' }; n++; }
  led.updated = today();
  fs.writeFileSync(LEDGER, JSON.stringify(led, null, 2) + '\n');
  console.log(`✓ 원장 반영: ${n}건 confirmed. 다음: node scripts/export_recipe_cards.js (보류 배지 해제 반영).`);
  process.exit(0);
}

// ── 통과 1건 기록 ──
const [name, vertical, note] = args;
if (!name || !vertical) { console.error('사용: node scripts/log_pass.js "<template name>" <vertical> ["note"]\n  또는 --list / --sync'); process.exit(1); }
if (!VERTS.includes(vertical)) { console.error('✗ 알 수 없는 테마:', vertical, '\n  허용:', VERTS.join(', ')); process.exit(1); }
const names = seedNames(vertical);
if (!names) { console.error('✗ 시드 로드 실패:', vertical); process.exit(1); }
if (!names.includes(name)) {
  console.error(`✗ "${name}" 가 ${vertical} 시드에 없음. 이름 확인 필요.`);
  const near = names.filter((x) => x.toLowerCase().includes(name.toLowerCase().slice(0, 5)));
  if (near.length) console.error('  비슷한 이름:', near.join(' · '));
  process.exit(1);
}
const id = slug(name);
if (log.entries.some((e) => e.id === id)) { console.log(`(이미 기록됨) ${name} [${id}]`); process.exit(0); }
log.entries.push({ id, name, vertical, result: 'pass', tested_at: today(), note: note || '' });
saveLog(log);
console.log(`✓ 통과 기록: ${name} [${id}] · ${vertical} (누적 ${log.entries.length}건)`);
