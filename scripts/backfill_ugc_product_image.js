/**
 * backfill_ugc_product_image.js — 옛 Ad Video 크리에이션에 "넣은 제품 사진"을 소급 기록.
 *
 * 왜: 영상 결과 삽입에는 character_id가 안 실려(사진 생성과 달리) characters JOIN이 비고,
 *     크리에이션 카드에 제품 사진이 안 떴다. 신규분은 ugcVideo.service가 metadata.product_image에
 *     직접 남기게 고쳤지만, 그 전에 만든 것들은 비어 있다.
 *     다행히 원본은 재렌더용으로 ugc_jobs.script._render.products[].clip 에 그대로 보존돼 있고
 *     (tmp/images 파일명), 웹 서빙 경로가 /images/<파일명>이라 그대로 URL이 된다 → 복원 가능.
 *
 * 기본 = **조회만**. 실제 갱신은 --apply.
 *   node scripts/backfill_ugc_product_image.js
 *   node scripts/backfill_ugc_product_image.js --apply
 *
 * 안전장치: 이미 product_image가 있는 행은 건드리지 않는다(||= 아니라 없는 것만 대상).
 *          metadata는 통째 교체가 아니라 jsonb 병합(`||`)이라 기존 키(type·duration·clips 등) 보존.
 */
const { pool } = require('../src/db/client');
const { env } = require('../src/config');

const APPLY = process.argv.includes('--apply');

function clipOf(scriptRaw) {
  let s = scriptRaw;
  if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { return null; } }
  const R = (s && s._render) || {};
  const p = (Array.isArray(R.products) && R.products[0]) || R.product || null;
  return (p && p.clip) ? String(p.clip) : null;
}

async function main() {
  const u = new URL(env.DATABASE_URL);
  console.log(`\n대상 DB host=${u.hostname} db=${u.pathname}  모드=${APPLY ? '⚠️ APPLY(갱신)' : '조회만'}\n`);

  // 제품 사진이 아직 없는 UGC 결과 + 그 결과를 낳은 잡의 script
  const { rows } = await pool.query(
    `SELECT gr.idx, j.script
       FROM generation_results gr
       JOIN ugc_jobs j ON j.result_idx = gr.idx
      WHERE gr.metadata->>'product_image' IS NULL
      ORDER BY gr.idx DESC`);

  console.log(`제품 사진이 비어 있는 Ad Video 결과: ${rows.length}건`);
  if (!rows.length) { console.log('\n대상 없음 ✓'); return; }

  const targets = [];
  let noClip = 0;
  for (const r of rows) {
    const clip = clipOf(r.script);
    if (clip) targets.push({ idx: r.idx, url: `/images/${clip}` });
    else noClip++;
  }
  console.log(`  복원 가능 ${targets.length}건 · 원본 참조 없음 ${noClip}건(제품 없이 만든 영상 등)`);
  targets.slice(0, 5).forEach((t) => console.log(`   idx=${t.idx} → ${t.url}`));
  if (targets.length > 5) console.log(`   … 외 ${targets.length - 5}건`);

  if (!APPLY) { console.log('\n조회만 했다. 갱신하려면 --apply.'); return; }

  let n = 0;
  for (const t of targets) {
    // jsonb 병합 — 기존 키(type·duration·clips…) 보존, product_image만 추가.
    const res = await pool.query(
      `UPDATE generation_results
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('product_image', $2::text)
        WHERE idx = $1 AND metadata->>'product_image' IS NULL`,
      [t.idx, t.url]);
    n += res.rowCount;
  }
  console.log(`\n갱신 ${n}건 완료.`);
}

main().then(() => pool.end()).catch((e) => { console.error('실패:', e.message); pool.end(); process.exit(1); });
