/**
 * apply_official_thumbs.js — 오피셜 템플릿 대표이미지 지정 + Store 정합 (멱등)
 * ------------------------------------------------------------------------------
 * "완전 정합" 스코프(사용자 승인 2026-07-11):
 *   ① 누락된 현재 오피셜 5행(product-hero + jewelry-*) 생성 + 테마 배선
 *   ② 오피셜 recipe 7종 preview_media = 큐레이션된 정적 /img/ 대표이미지
 *   ③ 네일 갭(신부 컨셉 네일) preview_media 채움(비어있을 때만)
 *   ④ 옛 슬러그 6행 은퇴(visibility='private', 비파괴·가역)
 *
 * 대표이미지 = 전부 git 커밋된 정적 public/img/ 에셋(영속 — tmp/images R2 이슈 무관).
 * 이름/이모지는 recipes.generated.js에서 동적으로 읽어 프론트와 항상 일치.
 *
 * 사용:
 *   node scripts/apply_official_thumbs.js            # DRY-RUN (트랜잭션 열고 실행→상태리포트→ROLLBACK, prod 무변경)
 *   node scripts/apply_official_thumbs.js --apply     # 실제 반영(COMMIT)
 *   DATABASE_URL=...doppia_local node ... [--apply]    # DB 오버라이드(로컬 검증용)
 */
require('dotenv').config();
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { Pool } = require('pg');

// ── recipe 카드 메타(name·emoji) 단일소스 ─────────────────────────────
const CARDS = require(path.join(ROOT, 'public/js/recipes.generated.js')).cards;
const CARD = {};
for (const v of Object.keys(CARDS)) (CARDS[v] || []).forEach((c) => (CARD[c.id] = c));
const nameOf = (rid) => (CARD[rid] && CARD[rid].name) || rid;
const emojiOf = (rid) => (CARD[rid] && CARD[rid].emoji) || '🎨';

// ── 현재 오피셜 recipe → 정적 대표이미지 (studio.html preview 컨벤션과 동일) ──
const THUMB = {
  'product-cut': '/img/productcut/product-cut.png',
  'product-hero': '/img/producthero/dewy-glass.jpg',
  'model-cut': '/img/studiomodel/model-cut.png',
  'jewelry-product-cut': '/img/accessories/jewelry-product-cut.png',
  'jewelry-worn-cut': '/img/accessories/jewelry-worn-cut.png',
  'jewelry-on-model': '/img/accessories/jewelry-on-model.png',
};
// ①에서 새로 만들 행(현재 오피셜인데 prod DB 행 없음) + 테마 배선
const NEW_ROWS = [
  { rid: 'product-hero', theme: 'beauty' },
  { rid: 'jewelry-product-cut', theme: 'accessories' },
  { rid: 'jewelry-worn-cut', theme: 'accessories' },
  { rid: 'jewelry-on-model', theme: 'accessories' },
];
// ④ 은퇴할 옛 슬러그(현재 recipe 세트에 없음). 비파괴 — visibility만 private.
//   jewelry-hero·bodywear-hero = 2026-07-20 폐기(행은 삭제됨). 여기 남겨두는 건 이 스크립트가
//   되살리지 않게 하려는 것 — 위 THUMB/NEW_ROWS에서 빠졌으니 재생성도 안 된다.
const RETIRE = ['ring-editorial-campaign', 'bracelet-editorial-campaign', 'top-down-hero', 'void-hero-cut', 'pet-product-hero', 'studio-model-cut', 'jewelry-hero', 'bodywear-hero'];
// ③ 네일 갭
const NAIL_GAP = { name: '신부 컨셉 네일', thumb: '/img/nail/bridal-concept-nail.png' };

async function report(db, label) {
  const q = await db.query(`
    SELECT recipe_id, name, (preview_media->>0) pm0, visibility,
           (SELECT array_agg(th.slug) FROM template_themes tt JOIN themes th ON th.id=tt.theme_id WHERE tt.template_id=marketplace_templates.id) themes
    FROM marketplace_templates WHERE is_official=true ORDER BY visibility DESC, name`);
  const active = q.rows.filter((r) => r.visibility === 'public');
  const priv = q.rows.filter((r) => r.visibility !== 'public');
  console.log(`\n──── ${label} ────`);
  console.log(`활성(Store 노출) ${active.length} · 은퇴(private) ${priv.length} · preview_media 빔 ${q.rows.filter((r) => !r.pm0 && r.visibility === 'public').length}`);
  for (const r of active) console.log(`  ✅ ${(r.name || '').padEnd(24)} recipe=${(r.recipe_id || '∅').padEnd(20)} pm0=${r.pm0 ? r.pm0.slice(0, 42) : '—EMPTY—'} themes=${(r.themes || []).join(',')}`);
  for (const r of priv) console.log(`  🚫 ${(r.name || '').padEnd(24)} recipe=${(r.recipe_id || '∅').padEnd(20)} (retired)`);
}

async function apply(db) {
  // ⓪ accessories 테마 보장(THEME_SEED에 없던 것 — 프론트 CAT_THEMES/OFFICIAL_ONLY_THEMES가 기대)
  await db.query(`INSERT INTO themes (slug, name, is_official, sort_order) VALUES ('accessories','Accessories',true,12) ON CONFLICT (slug) DO NOTHING`);

  // ① 누락된 현재 오피셜 행 생성(멱등: recipe_id 미존재 시만). free-official 패턴(product-cut/model-cut 미러).
  for (const { rid } of NEW_ROWS) {
    await db.query(
      `INSERT INTO marketplace_templates
         (creator_handle, name, category, type, style, emoji, price_credits, use_price_credits, is_official, visibility, status, recipe_id, prompt, origin)
       SELECT '@doppia', $1, 'Shopping', 'image', 'Natural', $2, 0, 0, true, 'public', 'active', $3, $4, 'manual'
       WHERE NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE recipe_id = $3)`,
      [nameOf(rid), emojiOf(rid), rid, `Included official template — ${nameOf(rid)}`]
    );
    // 혹시 옛 배포가 price>0(◈8 프리미엄)로 만들었으면 무료로 보정(멱등)
    await db.query(`UPDATE marketplace_templates SET price_credits=0, use_price_credits=0 WHERE recipe_id=$1 AND is_official=true`, [rid]);
  }

  // ② 새 행 테마 배선(멱등)
  for (const { rid, theme } of NEW_ROWS) {
    await db.query(
      `INSERT INTO template_themes (template_id, theme_id)
       SELECT mt.id, th.id FROM marketplace_templates mt, themes th
        WHERE mt.recipe_id=$1 AND mt.is_official=true AND th.slug=$2
       ON CONFLICT DO NOTHING`,
      [rid, theme]
    );
  }

  // ③ 오피셜 recipe 7종 preview_media = 큐레이션 정적 대표이미지(@doppia 공식이라 권위값으로 덮어씀)
  for (const [rid, thumb] of Object.entries(THUMB)) {
    await db.query(`UPDATE marketplace_templates SET preview_media = jsonb_build_array($2::text) WHERE recipe_id=$1 AND is_official=true`, [rid, thumb]);
  }

  // ③b 네일 갭 — 비어있을 때만 채움(기존 /images 썸네일 있는 네일은 안 건드림)
  await db.query(
    `UPDATE marketplace_templates SET preview_media = jsonb_build_array($2::text)
     WHERE name=$1 AND is_official=true AND (preview_media IS NULL OR preview_media='[]'::jsonb OR (preview_media->>0) IS NULL)`,
    [NAIL_GAP.name, NAIL_GAP.thumb]
  );

  // ④ 옛 슬러그 은퇴 — visibility='private'(비파괴·가역, owns/generation 참조 보존)
  await db.query(`UPDATE marketplace_templates SET visibility='private' WHERE recipe_id = ANY($1) AND is_official=true`, [RETIRE]);
}

async function main() {
  const doApply = process.argv.includes('--apply');
  const url = process.env.DATABASE_URL;
  const isLocal = /(@|\/\/)(localhost|127\.0\.0\.1)([:\/]|$)/.test(url || '');
  const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
  const target = isLocal ? 'LOCAL(' + url.split('/').pop() + ')' : 'PROD(RDS)';
  console.log(`대상 DB = ${target} · 모드 = ${doApply ? 'APPLY(COMMIT)' : 'DRY-RUN(ROLLBACK)'}`);
  const db = await pool.connect();
  try {
    await report(db, 'BEFORE');
    await db.query('BEGIN');
    await apply(db);
    await report(db, doApply ? 'AFTER (applying…)' : 'AFTER (dry-run, will ROLLBACK)');
    if (doApply) { await db.query('COMMIT'); console.log('\n✅ COMMITTED — prod 반영 완료.'); }
    else { await db.query('ROLLBACK'); console.log('\n↩️  ROLLBACK — prod 무변경(검증만).'); }
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('\n✗ ERROR (rolled back):', e.message);
    process.exitCode = 1;
  } finally {
    db.release();
    await pool.end();
  }
}
main();
