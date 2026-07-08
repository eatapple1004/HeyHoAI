/**
 * harness_ugc_v1.js — v1 UGC 영상 엔진 격리 검증 (스튜디오 인증 前 CLI 단발)
 * ============================================================================
 * 대본 → broll 클립(이미지→모션) → RenderPlan 트랙스택 → ffmpeg 조립 → 최종 mp4.
 *
 * 사용:
 *   node scripts/harness_ugc_v1.js                         # 기본 예시, dry-run(정지이미지, Kling 생략)
 *   node scripts/harness_ugc_v1.js --live                  # Kling image2video 실제 모션 (키 필요)
 *   node scripts/harness_ugc_v1.js --type model-editorial --ref tmp/images/<model>.png
 *   node scripts/harness_ugc_v1.js --product "레드 립스틱" --concept "데일리 데이트룩"
 */
const { generateUgcScript } = require('../src/ugc/ugcScript.service');
const { renderClips } = require('../src/ugc/clipPipeline.service');
const { buildRenderPlan, activeTracks } = require('../src/ugc/renderPlan');
const { assemble } = require('../src/ugc/assembler/ffmpeg.assembler');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const has = (name) => process.argv.includes(`--${name}`);
const log = (m) => console.log(m);

(async () => {
  const product = arg('product', '레드 매트 립스틱');
  const concept = arg('concept', '데일리 데이트룩을 완성하는 원 컬러');
  const outputType = arg('type', 'product-ad');
  const referenceImagePath = arg('ref', null);
  const live = has('live');

  console.log('━━━ UGC v1 harness ━━━');
  console.log(`outputType=${outputType} product="${product}" concept="${concept}" ${live ? '[LIVE Kling]' : '[dry-run 정지이미지]'}`);

  // 1) 대본
  log('\n[1] 대본 생성(opus)…');
  const script = await generateUgcScript({ product, concept, outputType });
  console.log(`  title="${script.title}" | scenes=${script.scenes.length} | hook="${script.hook}"`);
  script.scenes.forEach((s) => console.log(`   #${s.n} [${s.type}] ${s.durationSec}s | on="${s.onScreenText}" | broll="${(s.brollPrompt || '').slice(0, 60)}"`));

  // 2) 클립 (이미지 → 모션)
  log('\n[2] 클립 렌더…');
  const clips = await renderClips(script, { dryRunVideo: !live, referenceImagePath, concurrency: 2, log });
  clips.forEach((c) => console.log(`   #${c.sceneN} ${c.error ? '❌ ' + c.error : (c.isStill ? '🖼  still' : '🎬 motion') + ' ' + (c.clipUrl || '').slice(0, 50)}`));

  // 3) RenderPlan 트랙스택
  log('\n[3] RenderPlan 조립…');
  const plan = buildRenderPlan(script, clips);
  console.log(`  video=${plan.tracks.video.length}클립 subtitle=${plan.tracks.subtitle.length} | active=[${activeTracks(plan).join(', ')}] | dur=${(plan.meta.durationMs / 1000).toFixed(1)}s`);
  console.log(`  slots: music=${plan.tracks.music} vo=${plan.tracks.vo} presenter=${plan.tracks.presenter} (후속 배선)`);

  // 4) ffmpeg 조립
  log('\n[4] ffmpeg 조립…');
  const out = await assemble(plan, { log });

  console.log('\n✅ 완료');
  console.log(`   최종본: ${out.videoPath}`);
  console.log(`   작업폴더: ${out.workDir} | 세그먼트 ${out.segments}개 | 트랙 [${out.activeTracks.join(', ')}] | 자막=${out.subtitleMode}${out.subtitleFile ? ' (' + out.subtitleFile + ')' : ''}`);
  console.log(`   캡션: ${script.caption}`);
  console.log(`   해시태그: ${script.hashtags.map((h) => '#' + h).join(' ')}`);
})().catch((err) => { console.error('\n❌ harness 실패:', err.message); process.exit(1); });
