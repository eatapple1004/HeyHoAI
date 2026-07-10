/**
 * ABCD D단계 격리 검증 — commitDraft(미굽힌 편집 bake→commit, 이탈 시 유실 방지).
 * doppia_local 실 DB. 클립 파일이 없어 bake(reRender)는 실패하도록 구성 → commitDraft의 복원력
 * (bake 실패해도 마지막 완성본으로 커밋)을 검증. 해피패스 bake는 reRender 경로(편집·Save가 이미 사용)라 별도.
 * 실행: DATABASE_URL=doppia_local ... node scripts/harness_abcd_D_commitdraft.js
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (!/doppia_local/.test(process.env.DATABASE_URL || '')) { console.error('✋ DATABASE_URL이 doppia_local 아님 — 중단'); process.exit(1); }
const { query } = require('../src/db/client');
const svc = require('../src/ugc/ugcVideo.service');

const USER = '7d267588-7ef8-4468-aa75-55b6f1056a77'; // admin@heyhoai.local
let pass = 0, fail = 0;
function ok(n, c, x) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${x ? ' :: ' + x : ''}`); } }

async function insertJob() {
  const script = {
    language: 'ko',
    scenes: [
      { n: 1, type: 'broll', onScreenText: '첫', spoken: '' },
      { n: 2, type: 'broll', onScreenText: '둘', spoken: '' },
    ],
    _render: { audio: { voice: false, music: false }, aspect: '9:16', composites: [], durationMs: 6000,
      caption: { timings: [], style: {}, w: 1080, h: 1920 } },
  };
  const sceneClips = { 1: { clip: 'nonexist_d1.mp4', durationMs: 3000 }, 2: { clip: 'nonexist_d2.mp4', durationMs: 3000 } };
  const r = await query(
    `INSERT INTO ugc_jobs (user_id, output_type, status, result_url, duration_sec, script, scene_clips, visibility)
     VALUES ($1,'product-ad','succeeded','/images/d_fake.mp4',6,$2,$3,'private') RETURNING id`,
    [USER, JSON.stringify(script), JSON.stringify(sceneClips)]
  );
  return r.rows[0].id;
}
async function jobRow(id) { return (await query(`SELECT status, result_idx, result_url FROM ugc_jobs WHERE id=$1`, [id])).rows[0]; }
async function cleanup(id, resultIdx) {
  if (resultIdx) {
    const pr = (await query(`SELECT prompt_idx FROM generation_results WHERE idx=$1`, [resultIdx])).rows[0];
    await query(`DELETE FROM reviews WHERE result_idx=$1`, [resultIdx]).catch(() => {});
    await query(`DELETE FROM generation_results WHERE idx=$1`, [resultIdx]).catch(() => {});
    if (pr && pr.prompt_idx) await query(`DELETE FROM prompts WHERE idx=$1`, [pr.prompt_idx]).catch(() => {});
  }
  await query(`DELETE FROM ugc_jobs WHERE id=$1`, [id]).catch(() => {});
}

async function main() {
  const id = await insertJob();
  let resultIdx = null;
  try {
    // 미굽힌 편집(재배치 [2,1] + 버전) 전달 → bake는 클립 없어 실패하지만 커밋은 되어야(복원력)
    const res = await svc.commitDraft({ user: { id: USER }, jobId: id, order: [2, 1], removed: [], edits: {}, setVersions: {} });
    console.log('D commitDraft(재배치, 클립없음):');
    ok('커밋 성공(bake 실패에도 유실 없음)', !!(res && res.resultIdx), JSON.stringify(res));
    resultIdx = res && res.resultIdx;
    const j = await jobRow(id);
    ok('job.result_idx 세팅됨', j.result_idx != null && String(j.result_idx) === String(resultIdx), `result_idx=${j.result_idx}`);
    ok('job.status=succeeded(processing에 안 갇힘)', j.status === 'succeeded', `status=${j.status}`);
    const gr = (await query(`SELECT idx, metadata FROM generation_results WHERE idx=$1`, [resultIdx])).rows[0];
    ok('generation_results 행 생성(갤러리 저장)', !!gr);
    ok('metadata.source=ugc', gr && gr.metadata && gr.metadata.source === 'ugc', gr && JSON.stringify(gr.metadata));

    // 멱등: 두 번째 commitDraft → already
    const res2 = await svc.commitDraft({ user: { id: USER }, jobId: id, order: [2, 1], removed: [], edits: {}, setVersions: {} });
    ok('멱등: 두 번째 커밋 already=true', !!(res2 && res2.already), JSON.stringify(res2));
    ok('멱등: 같은 resultIdx', res2 && String(res2.resultIdx) === String(resultIdx));

    // 편집 없는 커밋 경로(비-dirty)와 동일해야 — 다른 잡으로 plain commitJob도 정상
    const id2 = await insertJob();
    const rc = await svc.commitJob(id2, USER);
    ok('plain commitJob(비-dirty)도 커밋', !!(rc && rc.resultIdx));
    await cleanup(id2, rc && rc.resultIdx);
  } finally {
    await cleanup(id, resultIdx);
  }
  console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('harness error:', e); process.exit(1); });
