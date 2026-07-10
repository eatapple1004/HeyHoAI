/**
 * ABCD A단계 격리 검증 — getJob 개별 오디오 트랙 노출(voiceUrl/musicUrl/hasMusic).
 * doppia_local 실 DB에 더미 잡 행을 넣고 getJob 반환을 케이스별로 단언(dummy audio, ElevenLabs·Kling 0).
 * 실행: DATABASE_URL=doppia_local ... node scripts/harness_abcd_A_audiotracks.js
 * (심링크 .env의 DATABASE_URL=prod 오버라이드 필수 — 아래 assert로 prod 오접속도 차단)
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (!/doppia_local/.test(process.env.DATABASE_URL || '')) {
  console.error('✋ DATABASE_URL이 doppia_local이 아님 — prod 오접속 방지 위해 중단'); process.exit(1);
}
const { query } = require('../src/db/client');
const svc = require('../src/ugc/ugcVideo.service');

const USER = '7d267588-7ef8-4468-aa75-55b6f1056a77'; // admin@heyhoai.local
let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name} ${extra}`); } }

function scriptWith(render) {
  return { language: 'ko', scenes: [{ n: 1, type: 'broll', spoken: '한 번의 터치로 완성', onScreenText: '벨벳 레드' }], _render: render };
}

async function insert(script) {
  const r = await query(
    `INSERT INTO ugc_jobs (user_id, output_type, status, result_url, duration_sec, script)
     VALUES ($1,'product-ad','succeeded','/images/final.mp4',20,$2) RETURNING id`,
    [USER, JSON.stringify(script)]
  );
  return r.rows[0].id;
}

async function main() {
  const ids = [];
  const base = { previewBase: 'prev.mp4', caption: { timings: [], style: {}, w: 1080, h: 1920 }, durationMs: 20000 };

  // C1 정상: 음성+음악 둘 다
  const c1 = await insert(scriptWith({ ...base, audio: { voice: true, music: true },
    audioAssets: { vo: { key: 'k', segs: [{ sceneN: 0, file: 'voiceA.mp3', startMs: 0 }] }, music: { file: 'musicA.mp3', key: 'm' } } }));
  ids.push(c1);
  let j = await svc.getJob(c1, USER);
  console.log('C1 정상(음성+음악):');
  ok('voiceUrl=/images/voiceA.mp3', j.voiceUrl === '/images/voiceA.mp3', `got ${j.voiceUrl}`);
  ok('musicUrl=/images/musicA.mp3', j.musicUrl === '/images/musicA.mp3', `got ${j.musicUrl}`);
  ok('hasVoice=true', j.hasVoice === true);
  ok('hasMusic=true', j.hasMusic === true);
  ok('previewUrl 회귀유지', j.previewUrl === '/images/prev.mp4', `got ${j.previewUrl}`);
  ok('resultUrl 회귀유지', j.resultUrl === '/images/final.mp4');

  // C2 음성만
  const c2 = await insert(scriptWith({ ...base, audio: { voice: true, music: false },
    audioAssets: { vo: { key: 'k', segs: [{ sceneN: 0, file: 'voiceB.mp3', startMs: 0 }] } } }));
  ids.push(c2);
  j = await svc.getJob(c2, USER);
  console.log('C2 음성만:');
  ok('voiceUrl 노출', j.voiceUrl === '/images/voiceB.mp3');
  ok('musicUrl=null', j.musicUrl === null, `got ${j.musicUrl}`);
  ok('hasMusic=false', j.hasMusic === false);

  // C3 음악만
  const c3 = await insert(scriptWith({ ...base, audio: { voice: false, music: true },
    audioAssets: { music: { file: 'musicC.mp3', key: 'm' } } }));
  ids.push(c3);
  j = await svc.getJob(c3, USER);
  console.log('C3 음악만:');
  ok('voiceUrl=null', j.voiceUrl === null, `got ${j.voiceUrl}`);
  ok('musicUrl 노출', j.musicUrl === '/images/musicC.mp3');
  ok('hasVoice=false', j.hasVoice === false);

  // C4 레거시 멀티세그 → voiceUrl 미노출(단일트랙 모델 불일치)
  const c4 = await insert(scriptWith({ ...base, audio: { voice: true, music: false },
    audioAssets: { vo: { key: 'k', segs: [{ sceneN: 1, file: 's1.mp3', startMs: 0 }, { sceneN: 2, file: 's2.mp3', startMs: 3000 }] } } }));
  ids.push(c4);
  j = await svc.getJob(c4, USER);
  console.log('C4 레거시 멀티세그:');
  ok('voiceUrl=null(멀티세그)', j.voiceUrl === null, `got ${j.voiceUrl}`);
  ok('hasVoice=true(의도는 유지)', j.hasVoice === true);

  // C5 startMs!=0 → 미노출
  const c5 = await insert(scriptWith({ ...base, audio: { voice: true, music: false },
    audioAssets: { vo: { key: 'k', segs: [{ sceneN: 0, file: 'late.mp3', startMs: 500 }] } } }));
  ids.push(c5);
  j = await svc.getJob(c5, USER);
  console.log('C5 startMs!=0:');
  ok('voiceUrl=null(startMs 500)', j.voiceUrl === null, `got ${j.voiceUrl}`);

  // C6 audioAssets 없음(음성·음악 off)
  const c6 = await insert(scriptWith({ ...base, audio: { voice: false, music: false } }));
  ids.push(c6);
  j = await svc.getJob(c6, USER);
  console.log('C6 오디오 없음:');
  ok('voiceUrl=null', j.voiceUrl === null);
  ok('musicUrl=null', j.musicUrl === null);
  ok('크래시 없음', !!j.id);

  // C7 _render 자체 없음(구버전 잡)
  const c7 = await insert({ language: 'ko', scenes: [{ n: 1, type: 'broll', spoken: 'x' }] });
  ids.push(c7);
  j = await svc.getJob(c7, USER);
  console.log('C7 _render 없음(구버전):');
  ok('voiceUrl=null', j.voiceUrl === null);
  ok('musicUrl=null', j.musicUrl === null);
  ok('hasMusic=false', j.hasMusic === false);
  ok('크래시 없음', !!j.id);

  // C8 소유자 게이트(다른 유저는 null)
  j = await svc.getJob(c1, '40873358-23e7-4ed4-8963-95a1dc817653'); // creator@local
  console.log('C8 소유자 게이트:');
  ok('타 유저 접근 차단(null)', j === null);

  // 정리
  await query(`DELETE FROM ugc_jobs WHERE id = ANY($1)`, [ids]);
  console.log(`\n정리: 테스트 잡 ${ids.length}개 삭제`);
  console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('harness error:', e); process.exit(1); });
