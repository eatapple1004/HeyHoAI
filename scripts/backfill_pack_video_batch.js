/**
 * Product Pack 소급 백필 — 옛 팩 영상을 ①내 크리에이션에 뜨게 커밋 + ②팩 이미지와 같은 배치로 묶기.
 *
 * 왜: autoCommit(0a1e1ab)·배치 묶기(f246ff6) 이전에 만든 팩은 소급이 안 된다.
 *   - 옛 영상이 draft로 남아 내 크리에이션에 안 뜬다(commitJob이 안 불렸음).
 *   - 옛 팩 이미지·영상에 metadata.batch_id가 없어 피드에서 따로 논다(묶음 기준 = batch_id||prompt_idx).
 *   이 스크립트가 각 팩의 config.videoJobId로 영상을 찾아, 미커밋이면 커밋(batch_id=share_id),
 *   이미 커밋됐으면 batch_id만 소급한다. 이미지 행에도 batch_id=pack_share_id를 소급한다.
 *
 * 🔑 재생성 0 · 과금 0 — commitJob은 **이미 렌더된 mp4**를 가리키는 DB 행을 추가할 뿐(Kling/ElevenLabs/
 *   Anthropic/Gemini 호출 없음), batch_id는 metadata UPDATE. 멱등(재실행해도 중복/재작업 없음).
 *
 *   미리보기(쓰기 없음): node scripts/backfill_pack_video_batch.js --dry
 *   실행(prod 앱 루트):   node scripts/backfill_pack_video_batch.js
 *   특정 팩만:            node scripts/backfill_pack_video_batch.js --share=<share_id> [--dry]
 */
const { query } = require('../src/db/client');
const ugc = require('../src/ugc/ugcVideo.service');

const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : null; };
const DRY = process.argv.includes('--dry');
const ONLY_SHARE = arg('share');

async function run() {
  // ── 1) 팩 이미지 batch_id 소급 — source='pack'인데 batch_id 없는 행에 그 행의 pack_share_id를 넣는다.
  //      (영상은 source='ugc'라 여기 안 잡힘 → 아래 개별 처리)
  const imgWhere = ONLY_SHARE ? `AND metadata->>'pack_share_id' = $1` : '';
  const imgParams = ONLY_SHARE ? [ONLY_SHARE] : [];
  const imgTargets = (await query(
    `SELECT count(*)::int AS n FROM generation_results
      WHERE metadata->>'source'='pack' AND metadata->>'pack_share_id' IS NOT NULL
        AND (metadata->>'batch_id') IS NULL ${imgWhere}`, imgParams)).rows[0].n;
  if (!DRY && imgTargets) {
    await query(
      `UPDATE generation_results
          SET metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('batch_id', metadata->>'pack_share_id')
        WHERE metadata->>'source'='pack' AND metadata->>'pack_share_id' IS NOT NULL
          AND (metadata->>'batch_id') IS NULL ${imgWhere}`, imgParams);
  }

  // ── 2) 팩 영상 — config.videoJobId가 있는 팩마다.
  const pkWhere = ONLY_SHARE ? `AND share_id = $1` : '';
  const pkParams = ONLY_SHARE ? [ONLY_SHARE] : [];
  const packs = (await query(
    `SELECT id, share_id, user_id, config->>'videoJobId' AS jid
       FROM content_packs
      WHERE config->>'videoJobId' IS NOT NULL ${pkWhere}
      ORDER BY id`, pkParams)).rows;

  const s = { imgFixed: imgTargets, packsWithVideo: packs.length, committed: 0, tagged: 0, alreadyOk: 0, notReady: 0, missing: 0 };
  const samples = [];
  for (const p of packs) {
    const jr = (await query(`SELECT id, user_id, status, result_url, result_idx FROM ugc_jobs WHERE id=$1`, [p.jid])).rows[0];
    if (!jr) { s.missing++; continue; }                          // 잡이 사라짐(테스트 정리 등)
    if (jr.result_idx != null) {
      // 이미 커밋됨 → batch_id만 소급(없거나 다르면).
      const gr = (await query(`SELECT metadata->>'batch_id' AS b FROM generation_results WHERE idx=$1`, [jr.result_idx])).rows[0];
      if (gr && gr.b === p.share_id) { s.alreadyOk++; continue; }
      if (!DRY) await query(
        `UPDATE generation_results SET metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('batch_id', $2::text) WHERE idx=$1`,
        [jr.result_idx, p.share_id]);
      s.tagged++;
      if (samples.length < 10) samples.push({ share: p.share_id, jid: p.jid, kind: `기존 커밋본 태그(idx=${jr.result_idx})` });
    } else if (jr.status === 'succeeded' && jr.result_url) {
      // 미커밋 draft → 커밋(batch_id=share_id). commitJob이 이미 렌더된 mp4로 result 행 추가(멱등).
      if (!DRY) { try { await ugc.commitJob(p.jid, jr.user_id, p.share_id); } catch (e) { console.warn(`  ⚠ 커밋 실패 job=${p.jid}: ${e.message}`); continue; } }
      s.committed++;
      if (samples.length < 10) samples.push({ share: p.share_id, jid: p.jid, kind: 'draft 커밋(내 크리에이션에 새로 뜸)' });
    } else {
      s.notReady++;                                              // 아직 생성 중/실패 — 대상 아님
    }
  }

  console.log(`\n=== 팩 영상 소급 백필 ${DRY ? '(DRY — 쓰기 없음)' : ''} ===`);
  console.log(`  이미지 batch_id ${DRY ? '넣을 것' : '넣음'}:            ${s.imgFixed}`);
  console.log(`  영상 있는 팩:                     ${s.packsWithVideo}`);
  console.log(`  ├ ${DRY ? '커밋할' : '커밋한'} draft(→ 크리에이션 신규): ${s.committed}`);
  console.log(`  ├ ${DRY ? '태그할' : '태그한'} 기존 커밋본(batch_id):    ${s.tagged}`);
  console.log(`  ├ 이미 정상:                      ${s.alreadyOk}`);
  console.log(`  ├ 아직 생성 중/실패(대상 아님):    ${s.notReady}`);
  console.log(`  └ 잡 사라짐:                      ${s.missing}`);
  if (samples.length) { console.log(`\n  표본:`); for (const x of samples) console.log(`   · share=${x.share} job=${x.jid} — ${x.kind}`); }
  console.log('');
  process.exit(0);
}
run().catch((e) => { console.error('실패:', e.message); process.exit(1); });
