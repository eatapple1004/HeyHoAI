// 기존 tmp/images 로컬 파일을 R2로 일괄 백업(누락분만) — cleanup cron 켜기 전 1회 실행용.
//
// 배경: R2 dual-write는 env 적용 시점부터 동작 → 그 이전 생성 파일은 로컬에만 존재.
//       cron으로 로컬을 지우기 전에, 아직 R2에 없는 파일을 전부 올려 유실을 막는다.
//
// 특징
//  - mediaStore.keyFor/contentTypeFor 재사용 → 서빙 라우트가 기대하는 키와 100% 일치.
//  - HeadObject로 "이미 R2에 있는" 최신 파일은 skip → 재업로드/과금 최소화.
//  - 소량 동시성(8)으로 처리. best-effort(개별 실패는 카운트만, 전체 중단 안 함).
//
// 실행(서버, ~/HeyHoAI 에서):
//   node -r @dotenvx/dotenvx/config scripts/backfill_r2.js
const fs = require('fs');
const path = require('path');
const { env } = require('../src/config');
const mediaStore = require('../src/storage/mediaStore');
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

async function mapLimit(items, limit, fn) {
  const ret = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const cur = idx++;
      ret[cur] = await fn(items[cur], cur);
    }
  });
  await Promise.all(workers);
  return ret;
}

(async () => {
  if (!mediaStore.isRemote()) {
    console.error('❌ R2 미설정(isRemote=false) — MEDIA_S3_BUCKET 확인 후 재실행. 중단.');
    process.exit(1);
  }
  const dir = path.join(process.cwd(), 'tmp', 'images');
  if (!fs.existsSync(dir)) { console.error(`❌ 폴더 없음: ${dir}`); process.exit(1); }

  const client = new S3Client({
    region: env.MEDIA_S3_REGION,
    ...(env.MEDIA_S3_ENDPOINT ? { endpoint: env.MEDIA_S3_ENDPOINT, forcePathStyle: true } : {}),
  });

  const files = fs.readdirSync(dir).filter((f) => {
    try { return fs.statSync(path.join(dir, f)).isFile(); } catch { return false; }
  });
  console.log(`총 ${files.length}개 파일 검사 시작 (버킷=${env.MEDIA_S3_BUCKET})`);

  let uploaded = 0, skipped = 0, failed = 0, done = 0;
  await mapLimit(files, 8, async (f) => {
    const key = mediaStore.keyFor(f);
    try {
      try {
        await client.send(new HeadObjectCommand({ Bucket: env.MEDIA_S3_BUCKET, Key: key }));
        skipped++; // 이미 R2에 존재
      } catch (_) {
        const body = fs.readFileSync(path.join(dir, f));
        await client.send(new PutObjectCommand({
          Bucket: env.MEDIA_S3_BUCKET, Key: key, Body: body,
          ContentType: mediaStore.contentTypeFor(f),
        }));
        uploaded++;
      }
    } catch (e) {
      failed++;
      console.error(`  실패 ${f}: ${e.message}`);
    }
    if (++done % 200 === 0) {
      console.log(`  진행 ${done}/${files.length} — 업로드 ${uploaded} · 스킵 ${skipped} · 실패 ${failed}`);
    }
  });

  console.log(`\n✅ 완료: 업로드 ${uploaded} · 스킵(이미존재) ${skipped} · 실패 ${failed} / 총 ${files.length}`);
  if (failed > 0) { console.error('⚠️ 실패가 있으니 cleanup 전 재실행 권장.'); process.exit(2); }
})().catch((e) => { console.error('치명 오류:', e); process.exit(3); });
