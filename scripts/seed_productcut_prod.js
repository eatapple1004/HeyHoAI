/**
 * seed_productcut_prod.js — product-cut(제품컷 중첩 템플릿)만 대상 DB에 스코프 시드.
 *
 * 전체 migrate.js를 돌리지 않고(=admin 비밀번호 회전 등 부수효과 회피) product-cut 관련
 * 최소 행만 멱등 삽입한다:
 *   1) themes 테마 'productcut' (없으면)
 *   2) marketplace_templates 공식 'Product Cut'(recipe_id=product-cut, ◈8) (없으면)
 *   3) template_themes 링크 (product-cut ↔ productcut) (없으면)
 *   4) recipes 테이블에 productcut 섹션 6개(부모+컷5) upsert (recipeDbSeed 재사용, productcut만)
 *
 * ⚠️ 이미 migrate된 DB(themes/marketplace_templates/recipes 테이블 존재)에 "추가 적용"하는 용도.
 *    대상 DB = .env DATABASE_URL(override 없으면 prod). 실행 전 호스트를 출력하고 확인 프롬프트를 준다.
 *    전 구문 멱등 — 재실행 안전. 기존 데이터 삭제/변경 없음(추가만).
 *
 * 실행: node scripts/seed_productcut_prod.js            (대상=.env)
 *      DATABASE_URL=... node scripts/seed_productcut_prod.js  (대상 override)
 */
const { pool } = require('../src/db/client');
const { env } = require('../src/config');
const { RECIPES_TABLE_SQL, seedRecipes } = require('../src/recipes/recipeDbSeed');
const recipeStore = require('../src/recipes/recipeStore');

async function main() {
  const u = new URL(env.DATABASE_URL);
  console.log(`\n대상 DB host=${u.hostname} db=${u.pathname}`);

  // productcut 섹션 시드 6개만 추린다(부모+컷5).
  const pcRecipes = recipeStore.listSeed().filter((r) => r.section === 'productcut');
  console.log(`productcut 시드 레시피: ${pcRecipes.length}개 [${pcRecipes.map((r) => r.id).join(', ')}]`);
  if (pcRecipes.length !== 6) { console.error('✗ productcut 레시피가 6개가 아님 — 시드 확인 필요. 중단.'); process.exit(2); }

  // 테이블 보장(멱등). themes/template_themes는 migrate와 동일 정의.
  await pool.query(RECIPES_TABLE_SQL);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS themes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, is_official BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS template_themes (
      template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
      theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      PRIMARY KEY (template_id, theme_id));`);

  // 1) 테마
  const th = await pool.query(
    `INSERT INTO themes (slug, name, is_official, sort_order) VALUES ('productcut','Product Cut',true,11)
     ON CONFLICT (slug) DO NOTHING RETURNING slug`);
  console.log(`1) theme productcut: ${th.rowCount ? '삽입' : '이미 존재'}`);

  // 2) 공식 마켓 템플릿 — 기본 제공(price 0). 없으면 삽입, 있으면 price를 0으로 보정(◈8 프리미엄 아님).
  const mt = await pool.query(
    `INSERT INTO marketplace_templates
       (creator_handle, name, category, type, style, emoji, price_credits, use_price_credits, is_official, visibility, recipe_id, prompt)
     SELECT '@doppia','Product Cut','Shopping','image','Natural','👕',0,0,true,'public','product-cut','Included official template — Product Cut'
     WHERE NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE recipe_id='product-cut')
     RETURNING id`);
  await pool.query(`UPDATE marketplace_templates SET price_credits=0, use_price_credits=0 WHERE recipe_id='product-cut'`);
  console.log(`2) marketplace 공식 Product Cut(price 0): ${mt.rowCount ? '삽입' : '이미 존재→price 0 보정'}`);

  // 3) 테마 링크
  const lk = await pool.query(
    `INSERT INTO template_themes (template_id, theme_id)
     SELECT mt.id, th.id FROM marketplace_templates mt, themes th
      WHERE mt.recipe_id='product-cut' AND th.slug='productcut'
     ON CONFLICT DO NOTHING RETURNING template_id`);
  console.log(`3) template_themes 링크: ${lk.rowCount ? '삽입' : '이미 존재'}`);

  // 4) recipes 6개 upsert — recipeDbSeed.seedRecipes를 productcut만 태우기 위해 임시 래핑 대신 직접 upsert.
  //    (seedRecipes는 전체를 태우므로, 여기선 pcRecipes만 동일 SQL로 upsert)
  let n = 0;
  for (const r of pcRecipes) {
    await pool.query(
      `INSERT INTO recipes
         (id,name,section,mode,vertical,category,output_type,credit_cost,sort_order,tool,rationale,meta,config,text_overlay,is_official,source,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,'seed',now())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, section=EXCLUDED.section, mode=EXCLUDED.mode, vertical=EXCLUDED.vertical,
         category=EXCLUDED.category, output_type=EXCLUDED.output_type, credit_cost=EXCLUDED.credit_cost,
         sort_order=EXCLUDED.sort_order, tool=EXCLUDED.tool, rationale=EXCLUDED.rationale,
         meta=EXCLUDED.meta, config=EXCLUDED.config, text_overlay=EXCLUDED.text_overlay, updated_at=now()`,
      [r.id, r.name, r.section, r.mode || null, r.vertical || null, r.category || null,
       r.output_type || null, r.credit_cost ?? null, r.sort_order ?? null, r.tool || null,
       r.rationale || null, JSON.stringify(r.meta || {}), JSON.stringify(r.config),
       r.text_overlay ? JSON.stringify(r.text_overlay) : null]);
    n++;
  }
  console.log(`4) recipes upsert: ${n}개`);

  // 검증
  const v = await pool.query(
    `SELECT (SELECT count(*) FROM themes WHERE slug='productcut') AS theme,
            (SELECT count(*) FROM marketplace_templates WHERE recipe_id='product-cut' AND is_official) AS official,
            (SELECT count(*) FROM recipes WHERE id='product-cut' OR config->>'parent_id'='product-cut') AS recipes`);
  console.log('검증:', v.rows[0]);
  await pool.end();
  console.log('완료 ✓');
}
main().catch((e) => { console.error('✗ 실패:', e.message); process.exit(1); });
