/**
 * (2026-10-16) 예전 결과물에 metadata.origin(기능·작업·엔진) 채우기 — 새 결과물은 result.repository.insert 가 자동으로 남긴다.
 *   규칙 = src/generate/resultOrigin.js deriveOrigin(저장 때와 같음). origin 이 이미 있는 행은 건드리지 않는다(멱등).
 *   실행: NODE_ENV=development node scripts/backfill_result_origin.js [--dry]
 */
const { query } = require('../src/db/client');
const { deriveOrigin } = require('../src/generate/resultOrigin');

(async () => {
  const dry = process.argv.includes('--dry');
  const rows = (await query(`SELECT idx, model, metadata, template_source, template_name, file_path
    FROM generation_results WHERE status='success' AND (metadata IS NULL OR NOT (metadata ? 'origin')
      OR (model = 'video-editor' AND metadata->'origin'->>'feature' = 'editor')) ORDER BY idx`)).rows; // 2번째 = 10-16 첫 백필의 오분류(영상 편집기 내보내기 → Editor) 정정
  const tally = {};
  for (const r of rows) {
    const origin = deriveOrigin({ model: r.model, metadata: r.metadata || {}, templateSource: r.template_source, templateName: r.template_name, filePath: r.file_path });
    tally[origin.feature] = (tally[origin.feature] || 0) + 1;
    if (!dry) await query(`UPDATE generation_results SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('origin', $2::jsonb) WHERE idx=$1`, [r.idx, JSON.stringify(origin)]);
  }
  console.log(`${dry ? '[dry] ' : ''}${rows.length} rows`, JSON.stringify(tally));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
