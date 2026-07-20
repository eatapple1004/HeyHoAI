/**
 * audit_official_templates.js — 크리에이션 상세페이지의 "이 템플릿 쓰기" 카드가 안 뜨는 레시피 찾기.
 *
 * 왜: 상세페이지는 marketplace_templates에서 recipe_id로 공식 템플릿을 찾아 썸네일 + Use/View 버튼을
 *     그린다(generate.route의 relTemplate). 그 행이 없으면 **템플릿 이름만** 나오고 카드가 통째로 빠진다.
 *     실제로 Model Cut은 카드가 뜨는데 Bodywear On Model은 안 떴다 — 등록이 버티컬별 스코프 스크립트로
 *     이뤄져 왔고(seed_productcut_prod.js가 product-cut을 넣은 식) 새로 추가된 것들이 누락됐다.
 *
 * 기본 = **조회만** (아무것도 안 바꾼다). 실제 삽입은 --apply 를 줘야 한다.
 *   node scripts/audit_official_templates.js            → 누락 목록만 출력
 *   node scripts/audit_official_templates.js --apply    → 누락분 삽입(멱등)
 *   DATABASE_URL=... node scripts/audit_official_templates.js   → 대상 DB override
 *
 * 삽입 형식은 기존 공식 템플릿과 동일: @doppia · price 0 · is_official · public.
 * 전 구문 멱등(NOT EXISTS 가드) — 재실행 안전, 기존 행 변경/삭제 없음.
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/client');
const { env } = require('../src/config');

const APPLY = process.argv.includes('--apply');

// 프론트 카드 목록(= 사용자가 실제로 고르는 진입점). 자식 컷은 부모로 귀속되므로 제외된다.
function loadCards() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public/js/recipes.generated.js'), 'utf8');
  const g = {};
  new Function('window', src)(g);
  const out = [];
  const cards = (g.RECIPES && g.RECIPES.cards) || {};
  Object.keys(cards).forEach((sec) => {
    if (Array.isArray(cards[sec])) cards[sec].forEach((r) => out.push({ section: sec, ...r }));
  });
  return out;
}

async function main() {
  const u = new URL(env.DATABASE_URL);
  console.log(`\n대상 DB host=${u.hostname} db=${u.pathname}  모드=${APPLY ? '⚠️ APPLY(삽입)' : '조회만'}\n`);

  const cards = loadCards();
  const { rows } = await pool.query(
    `SELECT recipe_id FROM marketplace_templates WHERE recipe_id IS NOT NULL AND is_official = true AND status = 'active'`);
  const have = new Set(rows.map((r) => r.recipe_id));

  const missing = cards.filter((c) => !have.has(c.id));
  console.log(`카드 ${cards.length}개 · 공식 등록됨 ${cards.length - missing.length}개 · 누락 ${missing.length}개`);

  if (!missing.length) { console.log('\n누락 없음 ✓'); return; }

  const bySec = missing.reduce((m, c) => { (m[c.section] = m[c.section] || []).push(c); return m; }, {});
  console.log('\n=== 상세페이지에 템플릿 카드가 안 뜨는 레시피 ===');
  Object.keys(bySec).forEach((s) => {
    console.log(`  [${s}] ` + bySec[s].map((c) => `${c.id}(${c.name})`).join(', '));
  });

  if (!APPLY) {
    console.log('\n조회만 했다. 삽입하려면 --apply 를 붙여 다시 실행.');
    return;
  }

  let n = 0;
  for (const c of missing) {
    const res = await pool.query(
      `INSERT INTO marketplace_templates
         (creator_handle, name, category, type, style, emoji, price_credits, use_price_credits,
          is_official, visibility, recipe_id, prompt)
       SELECT '@doppia', $1, $2, 'image', 'Natural', $3, 0, 0, true, 'public', $4, $5
       WHERE NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE recipe_id = $4)
       RETURNING id`,
      [String(c.name).slice(0, 120), c.cat || 'Shopping', c.emoji || '🎨', c.id,
       `Included official template — ${String(c.name).slice(0, 100)}`]);
    if (res.rowCount) { n++; console.log(`  + ${c.id}`); }
  }
  console.log(`\n삽입 ${n}개 완료(나머지는 이미 존재).`);
}

main().then(() => pool.end()).catch((e) => { console.error('실패:', e.message); pool.end(); process.exit(1); });
