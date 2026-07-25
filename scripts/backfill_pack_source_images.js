/**
 * Product Pack 크리에이션의 "원본 사진 썸네일" 정합 — metadata.product_image(s) 를 팩의 **실제 업로드 원본**
 * (pack_assets.kind='source') 로 맞춘다.
 *
 * 왜: 크리에이션 카드/상세의 썸네일은 metadata.product_image 를 본다. 이게 비었거나(구 팩) 옛 단수만 있으면
 *   ①여러 장 올려도 하나만 보이고 ②사용자가 "이거 내가 올린 게 맞나(생성 이미지 아냐?)" 확인이 어렵다.
 *   이 스크립트가 각 팩의 source 자산을 찾아 product_image(첫 장)+product_images(전부)를 다시 박는다.
 *
 * 🔎 진단도 겸한다(--dry): 현재 product_image 가 source 자산을 가리키는지, 아니면 **엉뚱한(생성) URL**인지
 *   행마다 리포트한다 → "생성 이미지가 레퍼런스로 뜬다"는 관찰의 진위를 prod 데이터로 확인.
 *
 * 멱등·기본 비공개 무변경·과금 0. 이미지 파일은 안 만든다(이미 있는 source 자산의 url 만 metadata 에 반영).
 *   미리보기(쓰기 없음): node scripts/backfill_pack_source_images.js --dry
 *   실행(prod 서버 앱 루트): node scripts/backfill_pack_source_images.js
 *   특정 팩만:               node scripts/backfill_pack_source_images.js --share=<share_id> [--dry]
 */
const { query } = require('../src/db/client');

const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : null; };
const DRY = process.argv.includes('--dry');
const ONLY_SHARE = arg('share');

/** pack_assets.url 은 '/images/<name>'. source 자산 URL 목록을 source_0..N 순으로. */
async function sourceUrlsForPack(packId) {
  const r = await query(
    `SELECT url, cut_key FROM pack_assets WHERE pack_id=$1 AND kind='source' AND url IS NOT NULL
      ORDER BY NULLIF(regexp_replace(cut_key,'\\D','','g'),'')::int NULLS LAST, id`,
    [packId]
  );
  return r.rows.map((x) => x.url);
}

async function run() {
  // pack 크리에이션 = generation_results 중 metadata.source='pack'. 팩 조인은 pack_share_id 로.
  const where = ONLY_SHARE ? `AND gr.metadata->>'pack_share_id' = $1` : '';
  const params = ONLY_SHARE ? [ONLY_SHARE] : [];
  const rows = (await query(
    `SELECT gr.idx, gr.metadata, cp.id AS pack_id, cp.share_id
       FROM generation_results gr
       JOIN content_packs cp ON cp.share_id = gr.metadata->>'pack_share_id'
      WHERE gr.metadata->>'source' = 'pack' ${where}
      ORDER BY gr.idx`, params
  )).rows;

  const srcCache = new Map();  // packId → [urls]
  const getSrcs = async (packId) => { if (!srcCache.has(packId)) srcCache.set(packId, await sourceUrlsForPack(packId)); return srcCache.get(packId); };

  const s = { rows: rows.length, fixed: 0, alreadyOk: 0, noSources: 0, wasWrong: 0, wasMissing: 0, wasSingle: 0 };
  const samples = [];
  for (const r of rows) {
    const md = r.metadata || {};
    const srcs = await getSrcs(r.pack_id);
    if (!srcs.length) { s.noSources++; continue; }        // 원본 저장 전 팩 — 고칠 재료가 없음(스킵)

    const curImg = md.product_image || null;
    const curArr = Array.isArray(md.product_images) ? md.product_images : null;
    const isSourceUrl = (u) => srcs.includes(u);
    // 진단: 현재 product_image 가 source 가 아니면 = "엉뚱한(생성 가능성) URL"
    if (!curImg) s.wasMissing++;
    else if (!isSourceUrl(curImg)) { s.wasWrong++; if (samples.length < 12) samples.push({ idx: r.idx, share: r.share_id, cur: curImg, shouldBe: srcs[0] }); }
    else if (!curArr || curArr.length < srcs.length) s.wasSingle++;

    const okAlready = curImg === srcs[0] && curArr && curArr.length === srcs.length && curArr.every((u, i) => u === srcs[i]);
    if (okAlready) { s.alreadyOk++; continue; }

    if (!DRY) {
      // metadata 에 product_image(첫 장) + product_images(전부) 병합(다른 키 보존).
      await query(
        `UPDATE generation_results
            SET metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('product_image', $2::text, 'product_images', $3::jsonb)
          WHERE idx = $1`,
        [r.idx, srcs[0], JSON.stringify(srcs)]
      );
    }
    s.fixed++;
  }

  console.log(`\n=== pack 원본 썸네일 정합 ${DRY ? '(DRY — 쓰기 없음)' : ''} ===`);
  console.log(`  스캔 행:        ${s.rows}`);
  console.log(`  이미 정상:      ${s.alreadyOk}`);
  console.log(`  ${DRY ? '고칠 것' : '고침'}:        ${s.fixed}`);
  console.log(`  ├ 단수→다중:    ${s.wasSingle}  (product_images 가 없거나 짧음)`);
  console.log(`  ├ 누락:         ${s.wasMissing} (product_image 자체가 없던 구 팩)`);
  console.log(`  └ 🔴엉뚱한 URL: ${s.wasWrong}  (source 아닌 것 = 생성 이미지 의심 — 관찰과 일치하면 여기 잡힘)`);
  console.log(`  소스 없음(스킵): ${s.noSources} (원본 저장 전 팩 — 재료 없음)`);
  if (samples.length) {
    console.log(`\n  🔴 엉뚱한 URL 표본(현재 → 올바른 source):`);
    for (const x of samples) console.log(`   · idx=${x.idx} share=${x.share}\n       현재:   ${x.cur}\n       고칠것: ${x.shouldBe}`);
  }
  console.log('');
  process.exit(0);
}
run().catch((e) => { console.error('실패:', e.message); process.exit(1); });
