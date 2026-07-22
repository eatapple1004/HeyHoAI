/**
 * Product Pack 크리에이션 정합 — 구 팩을 공유 크리에이션(generation_results)에 맞춘다.
 *
 * 왜: pack 크리에이션 dual-write 는 나중에 붙었고, 초기엔 prompt.team_id 를 안 달았다. 그 결과 팩이 세 상태로 나뉜다:
 *   (A) dual-write 이전 팩            → generation_results 행이 아예 없음        → pack_assets 에서 생성
 *   (B) dual-write O + team_id 없던 팩 → 행은 있으나 prompt.team_id=null (팀 계정이면 My creations 피드서 가려짐) → team_id 리페어
 *   (C) team_id 까지 있는 팩          → 정상                                     → 스킵
 * Shots·Ad Video 는 생성 시점부터 team_id 포함 적재돼 과거 것도 뜨는데 팩만 (A)(B) 때문에 안 떴다.
 *
 * 이 스크립트가 (A) 생성 + (B) 리페어를 한 번에 한다. 멱등·기본 비공개·과금 없음.
 *   실행(prod .env 로드되는 서버 앱 루트): node scripts/backfill_pack_creations.js
 *   미리보기(쓰기 없이 현재 상태만 리포트):   node scripts/backfill_pack_creations.js --dry
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

  const s = { totalPacks: packs.length, created: 0, createdPacks: 0, repairedPrompts: 0, repairedRows: 0, alreadyOk: 0, ownersInTeam: 0, ownersPersonal: 0, failed: 0, dry };
  for (const p of packs) {
    try {
      let targetTeam = null;
      try { targetTeam = await teamCredit.activeTeamId(p.user_id); } catch (_) {}
      targetTeam ? s.ownersInTeam++ : s.ownersPersonal++;

      // 이 팩의 기존 크리에이션 행 + 그 prompt 의 현재 team_id
      const existing = (await query(
        `SELECT gr.idx AS gr_idx, gr.prompt_idx, pr.team_id
           FROM generation_results gr JOIN prompts pr ON pr.idx = gr.prompt_idx
          WHERE gr.metadata->>'pack_share_id' = $1`, [p.share_id]
      )).rows;

      if (existing.length === 0) {
        // (A) 행 없음 → pack_assets 에서 생성
        const assets = (await query(
          `SELECT kind, cut_key, label, url FROM pack_assets WHERE pack_id = $1 AND url IS NOT NULL ORDER BY id`, [p.id]
        )).rows;
        if (!assets.length) { s.alreadyOk++; continue; }
        if (dry) { s.createdPacks++; s.created += assets.length; continue; }
        const prompt = await promptRepo.insert({ userId: p.user_id, teamId: targetTeam, promptText: p.product || '콘텐츠 팩', model: PACK_MODEL, tags: ['pack'] });
        for (const a of assets) {
          const fp = filePathFromUrl(a.url);
          if (!fp) continue;
          await resultRepo.insert({
            promptIdx: prompt.idx, filePath: fp, model: PACK_MODEL,
            metadata: { source: 'pack', kind: a.kind, cut_key: a.cut_key, cut: a.label || null, pack_share_id: p.share_id, backfill: true },
            visibility: 'private', templateSource: 'pack', templateName: a.label || '콘텐츠 팩',
          });
          s.created++;
        }
        s.createdPacks++;
      } else {
        // (B)/(C) 행 있음 → prompt.team_id 가 소유자 현재 팀과 다르면 리페어(팀 유저의 피드에서 가려지던 것 해소)
        const promptIdxs = [...new Set(existing.map((r) => r.prompt_idx))];
        let repairedThisPack = false;
        for (const pi of promptIdxs) {
          const cur = existing.find((r) => r.prompt_idx === pi).team_id || null;
          if (cur !== (targetTeam || null)) {
            if (!dry) await query(`UPDATE prompts SET team_id = $2 WHERE idx = $1`, [pi, targetTeam]);
            s.repairedPrompts++;
            repairedThisPack = true;
          }
        }
        if (repairedThisPack) s.repairedRows += existing.length; else s.alreadyOk++;
      }
    } catch (e) {
      s.failed++;
      console.error(`  pack ${p.id} (${p.share_id}) 실패: ${e.message}`);
    }
  }
  return s;
}

if (require.main === module) {
  run({ dry: process.argv.includes('--dry') })
    .then((r) => { console.log('backfill_pack_creations:', JSON.stringify(r, null, 2)); process.exit(0); })
    .catch((e) => { console.error('BACKFILL FAIL:', e.stack || e.message); process.exit(1); });
}

module.exports = { run, filePathFromUrl };
