/**
 * 시드 레시피(src/recipes/seeds/*.v2.js) → DB `recipes` 테이블 재적재(수동).
 *   node scripts/seed_recipes_to_db.js
 *
 * 시드를 고친 뒤 전체 migrate 없이 recipes 테이블만 빠르게 동기화할 때 사용. 멱등(upsert).
 * 테이블 생성도 포함하므로 단독 실행 가능. 정본은 여전히 시드 JS(recipeStore 런타임 로드).
 */
const { pool } = require('../src/db/client');
const { RECIPES_TABLE_SQL, seedRecipes } = require('../src/recipes/recipeDbSeed');

(async () => {
  try {
    await pool.query(RECIPES_TABLE_SQL);
    const n = await seedRecipes(pool);
    const { rows } = await pool.query('SELECT count(*)::int AS c FROM recipes');
    console.log(`✅ recipes 적재 완료: ${n}개 upsert · 테이블 총 ${rows[0].c}개`);
    process.exit(0);
  } catch (e) {
    console.error('❌ 적재 실패:', e.message);
    process.exit(1);
  }
})();
