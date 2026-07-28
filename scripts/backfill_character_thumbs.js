#!/usr/bin/env node
/**
 * backfill_character_thumbs.js — 기존 캐릭터(제품) 레퍼런스 이미지의 목록용 썸네일 백필.
 *
 * DB에는 아무것도 쓰지 않는다(SELECT만) — 썸네일은 파일 이름 규약(/images/thumb_<fn>.jpg)이 전부라
 * 파일 생성 + R2 업로드만 하면 프런트가 즉시 집어간다. 로컬-prod 격리 규칙과 충돌 없음.
 *
 * 실행: 배포 서버에서 `node scripts/backfill_character_thumbs.js`
 *   (로컬 테스트는 doppia_local .env로 그대로 실행 — 원본이 R2에만 있으면 R2에서 복원 후 생성)
 */
require('dotenv').config();
const { query } = require('../src/db/client');
const { makeRefThumb } = require('../src/characters/refThumb.service');

(async () => {
  const { rows } = await query(
    `SELECT DISTINCT reference_image_url FROM characters
     WHERE reference_image_url LIKE '/images/%' AND status != 'archived'`
  );
  console.log(`대상 ${rows.length}개`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const done = await makeRefThumb(r.reference_image_url);
    if (done) { ok++; process.stdout.write('.'); }
    else { fail++; process.stdout.write('x'); }
  }
  console.log(`\n완료 — 생성 ${ok} · 실패(원본 유실 등) ${fail}`);
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
