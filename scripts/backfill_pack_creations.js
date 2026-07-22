/**
 * 일회성 백필 — 구 Product Pack 결과(content_packs/pack_assets)를 공유 크리에이션(generation_results)으로 소급 적재.
 *
 * 왜: pack 크리에이션 dual-write(각 자산 → generation_results)는 나중에 추가됐다. 그 전에 만든 팩은
 *   pack_assets 에만 있어 내 크리에이션·라이브러리에 안 뜬다(Shots·Ad Video 는 생성 시점부터 적재돼 과거 것도 뜸).
 *   이 스크립트가 과거 팩을 팩당 prompt 1행 + 자산별 generation_results 로 채운다.
 *
 * 안전: 멱등(pack_share_id로 이미 백필된 팩은 스킵) · 기본 visibility='private'(제품컷 보호) ·
 *   team_id 는 소유자의 활성 팀으로(정상 경로 동일) · 과금 없음. 팩 하나가 실패해도 나머지는 계속.
 *
 * 실행(prod .env 가 로드되는 서버 환경에서): node scripts/backfill_pack_creations.js
 *   미리보기(쓰기 없이 집계만):                node scripts/backfill_pack_creations.js --dry
 */
const { query } = require('../src/db/client');
const promptRepo = require('../src/generate/prompt.repository');
const resultRepo = require('../src/generate/result.repository');
const teamCredit = require('../src/teams/team.credit');

const PACK_MODEL = 'Nano Banana';

/** pack_assets.url('/images/<name>') → generation_results.file_path('tmp/images/<name>'). 피드가 basename→/images/ 로 서빙. */
function filePathFromUrl(url) {
  const name = String(url || '').split('/').pop();
  return name ? `tmp/images/${name}` : null;
}

async function run({ dry = false } = {}) {
  const packs = (await query(
    `SELECT cp.id, cp.share_id, cp.user_id, cp.product
       FROM content_packs cp
      WHERE cp.user_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM pack_assets pa WHERE pa.pack_id = cp.id AND pa.url IS NOT NULL)
      ORDER BY cp.id`
  )).rows;

  let packsDone = 0, created = 0, skipped = 0, failed = 0;
  for (const p of packs) {
    try {
      // 멱등: 이미 백필/적재된 팩이면 스킵
      const exists = (await query(
        `SELECT 1 FROM generation_results WHERE metadata->>'pack_share_id' = $1 LIMIT 1`, [p.share_id]
      )).rowCount;
      if (exists) { skipped++; continue; }

      const assets = (await query(
        `SELECT kind, cut_key, label, url FROM pack_assets WHERE pack_id = $1 AND url IS NOT NULL ORDER BY id`, [p.id]
      )).rows;
      if (!assets.length) { skipped++; continue; }

      if (dry) { packsDone++; created += assets.length; continue; }

      let teamId = null;
      try { teamId = await teamCredit.activeTeamId(p.user_id); } catch (_) {}
      const prompt = await promptRepo.insert({
        userId: p.user_id, teamId, promptText: p.product || '콘텐츠 팩', model: PACK_MODEL, tags: ['pack'],
      });
      for (const a of assets) {
        const fp = filePathFromUrl(a.url);
        if (!fp) continue;
        await resultRepo.insert({
          promptIdx: prompt.idx, filePath: fp, model: PACK_MODEL,
          metadata: { source: 'pack', kind: a.kind, cut_key: a.cut_key, cut: a.label || null, pack_share_id: p.share_id, backfill: true },
          visibility: 'private', templateSource: 'pack', templateName: a.label || '콘텐츠 팩',
        });
        created++;
      }
      packsDone++;
    } catch (e) {
      failed++;
      console.error(`  pack ${p.id} (${p.share_id}) 실패: ${e.message}`);
    }
  }
  return { totalPacks: packs.length, packsDone, created, skipped, failed, dry };
}

if (require.main === module) {
  run({ dry: process.argv.includes('--dry') })
    .then((r) => { console.log('backfill_pack_creations:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error('BACKFILL FAIL:', e.stack || e.message); process.exit(1); });
}

module.exports = { run, filePathFromUrl };
