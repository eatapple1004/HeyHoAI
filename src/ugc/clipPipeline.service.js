/**
 * clipPipeline.service.js — 대본 broll 씬 → 모션 클립
 * ============================================================================
 * 씬별로: brollPrompt → nanoBanana(Gemini) 제품/모델 이미지 렌더 → Kling image2video 모션.
 *   - product-render: reference 없이 제품 히어로/매크로 렌더
 *   - model-render:   referenceImagePath(모델 로스터) 주입해 on-model 렌더 [[doppia_virtual_models]]
 *   - dryRunVideo:    Kling 생략, 렌더된 정지 이미지를 클립으로 사용(벤더/키 없이 v1 검증)
 * 반환: [{ sceneN, clipUrl, durationMs, isStill?, imageUrl }]
 */
const nanoBanana = require('../images/providers/nanoBanana.provider');
const klingProvider = require('../videos/providers/kling.provider');

const REELS_W = 1080;
const REELS_H = 1920;

// broll 렌더용 기본 네거티브(사람 얼굴/저품질 방어). 제품컷은 인물 배제.
const BROLL_NEGATIVE = [
  'human face', 'people', 'hands', 'text', 'watermark', 'logo',
  'low quality', 'blurry', 'deformed', 'extra limbs',
].join(', ');

/** provider.poll을 완료까지 폴링(videoGeneration.service.pollUntilDone 미러). */
async function pollUntilDone(provider, providerJobId, { maxWaitMs = 600_000, intervalMs = 5_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await provider.poll(providerJobId);
    if (result.status === 'completed') return result;
    if (result.status === 'failed') throw new Error(`Kling failed: ${result.error || 'unknown'}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Kling timed out after ${maxWaitMs}ms`);
}

/** 동시성 제한 map (Kling 부하/레이트 방어). */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 단일 broll 씬 → 클립.
 * @returns {Promise<{ sceneN:number, clipUrl:string|null, durationMs:number, isStill:boolean, imageUrl:string|null, error?:string }>}
 */
async function renderSceneClip(scene, opts) {
  const { referenceImagePath = null, referenceKind = 'person', dryRunVideo = false, videoStyle = 'natural', log = () => {} } = opts;
  const durationMs = Math.round((scene.durationSec || 3) * 1000);
  const prompt = scene.brollPrompt || scene.direction || '';

  if (!prompt) {
    return { sceneN: scene.n, clipUrl: null, durationMs, isStill: false, imageUrl: null, error: 'empty brollPrompt' };
  }

  // 1) 이미지 렌더 (nanoBanana / Gemini)
  log(`  [scene ${scene.n}] 이미지 렌더…`);
  const image = await nanoBanana.generate({
    prompt,
    negativePrompt: BROLL_NEGATIVE,
    width: REELS_W,
    height: REELS_H,
    ...(referenceImagePath ? { referenceImagePath, referenceKind } : {}),
  });
  const imageUrl = image.url;

  // 2) dry-run: 정지 이미지를 클립으로
  if (dryRunVideo) {
    log(`  [scene ${scene.n}] dry-run: 정지 이미지 클립`);
    return { sceneN: scene.n, clipUrl: imageUrl, durationMs, isStill: true, imageUrl };
  }

  // 3) Kling image2video 모션
  log(`  [scene ${scene.n}] Kling 모션…`);
  const durationSec = Math.min(Math.max(Math.round(durationMs / 1000), 5), klingProvider.maxDurationSec);
  const submit = await klingProvider.submit({
    sourceImageUrl: imageUrl,
    motionPrompt: scene.direction || prompt,
    negativePrompt: BROLL_NEGATIVE,
    durationSec,
    width: REELS_W,
    height: REELS_H,
    style: videoStyle,
  });
  const poll = await pollUntilDone(klingProvider, submit.providerJobId);

  return {
    sceneN: scene.n,
    clipUrl: poll.videoUrl,
    durationMs: poll.durationMs || durationSec * 1000,
    isStill: false,
    imageUrl,
  };
}

/**
 * 대본 → broll 씬별 클립 배열.
 * @param {object} script  ugcScript.service 산출 대본
 * @param {{ referenceImagePath?:string, dryRunVideo?:boolean, videoStyle?:string, concurrency?:number, log?:Function }} [opts]
 * @returns {Promise<Array>}
 */
async function renderClips(script, opts = {}) {
  const { concurrency = 2, log = () => {} } = opts;
  const brollScenes = (script.scenes || []).filter((s) => s.type === 'broll');

  if (!brollScenes.length) {
    throw Object.assign(new Error('No broll scenes to render (v1 supports broll-only output types)'), { statusCode: 422 });
  }

  log(`broll 씬 ${brollScenes.length}개 렌더 시작 (동시성 ${concurrency}${opts.dryRunVideo ? ', dry-run' : ''})`);
  const clips = await mapLimit(brollScenes, concurrency, (scene) =>
    renderSceneClip(scene, opts).catch((err) => ({
      sceneN: scene.n, clipUrl: null, durationMs: Math.round((scene.durationSec || 3) * 1000),
      isStill: false, imageUrl: null, error: err.message,
    }))
  );

  const ok = clips.filter((c) => c.clipUrl);
  log(`클립 완료: ${ok.length}/${brollScenes.length} 성공`);
  return clips;
}

module.exports = { renderClips, renderSceneClip };
