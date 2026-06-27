/**
 * recipeDbSeed — 시드 레시피(src/recipes/seeds/*.v2.js)를 DB `recipes` 테이블로 적재.
 *
 * 정본 = 여전히 시드 JS(recipeStore가 런타임 로드). 이 테이블은 시드의 DB 사본(정본·적재용)으로,
 * config(JSONB) 전체를 손실 없이 보존한다. 멱등(ON CONFLICT id DO UPDATE) — 시드 변경 후 재실행하면 동기화.
 *
 * 사용처:
 *   - src/db/migrate.js (배포 시 자동: 테이블 생성 + 시드 적재)
 *   - scripts/seed_recipes_to_db.js (시드 수정 후 수동 재적재)
 *
 * 스키마/함수 export 패턴은 src/studio/costMeter.js(GENERATION_COSTS_SQL/logCost)와 동일.
 */
const recipeStore = require('./recipeStore');

const RECIPES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS recipes (
  id            TEXT PRIMARY KEY,                 -- slug(name) — recipeStore/FE 카드 id와 1:1
  name          VARCHAR(120) NOT NULL,
  section       VARCHAR(30) NOT NULL,             -- influencer/fashion/... (recipeStore 섹션 키)
  mode          VARCHAR(10),                      -- face | product
  vertical      VARCHAR(30),
  category      VARCHAR(40),
  output_type   VARCHAR(20),                      -- image_set | reel
  credit_cost   INT,
  sort_order    INT,
  tool          VARCHAR(40),
  rationale     TEXT,
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
  config        JSONB NOT NULL,                   -- 전체 config(프롬프트·shots·look·reel 모션 등)
  text_overlay  JSONB,
  is_official   BOOLEAN NOT NULL DEFAULT true,
  source        VARCHAR(20) NOT NULL DEFAULT 'seed',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_section ON recipes(section);
CREATE INDEX IF NOT EXISTS idx_recipes_mode ON recipes(mode);`;

/** 시드 JS 전체를 recipes 테이블에 upsert. db = pg pool/client. 적재 건수 반환.
 *  ⚠️ listSeed()로 항상 시드 파일에서 읽는다(런타임 DB 로드와 무관 — DB→DB 순환 방지). */
async function seedRecipes(db) {
  const seeds = recipeStore.listSeed();
  let upserted = 0;
  for (const r of seeds) {
    if (!r || !r.config) continue; // config 없으면 생성 불가 → 스킵
    await db.query(
      `INSERT INTO recipes
         (id, name, section, mode, vertical, category, output_type, credit_cost, sort_order,
          tool, rationale, meta, config, text_overlay, is_official, source, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,'seed',now())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, section=EXCLUDED.section, mode=EXCLUDED.mode, vertical=EXCLUDED.vertical,
         category=EXCLUDED.category, output_type=EXCLUDED.output_type, credit_cost=EXCLUDED.credit_cost,
         sort_order=EXCLUDED.sort_order, tool=EXCLUDED.tool, rationale=EXCLUDED.rationale,
         meta=EXCLUDED.meta, config=EXCLUDED.config, text_overlay=EXCLUDED.text_overlay, updated_at=now()`,
      [
        r.id, r.name, r.section, r.mode || null, r.vertical || null, r.category || null,
        r.output_type || null, r.credit_cost ?? null, r.sort_order ?? null, r.tool || null,
        r.rationale || null, JSON.stringify(r.meta || {}), JSON.stringify(r.config),
        r.text_overlay ? JSON.stringify(r.text_overlay) : null,
      ]
    );
    upserted++;
  }
  return upserted;
}

module.exports = { RECIPES_TABLE_SQL, seedRecipes };
