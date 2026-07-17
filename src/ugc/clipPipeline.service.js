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

// broll 렌더용 네거티브.
// ⚠️ 인물 배제는 **제품 씬에만** 걸어야 한다. 전엔 모델 씬에도 같이 걸려서 한 요청 안에서 정반대를 말했다:
//    프롬프트="모델이 제품을 착용한 장면" + 레퍼런스="같은 얼굴·머리·이목구비를 유지하라" + 네거티브="human face, people 금지".
//    주석은 "제품컷은 인물 배제"라고 스스로 말하면서 정작 제품컷에만 안 걸고 전부에 걸고 있었다.
const NEG_QUALITY = ['text', 'watermark', 'logo', 'low quality', 'blurry', 'deformed', 'extra limbs'];
const NEG_NO_PERSON = ['human face', 'people', 'hands'];
const BROLL_NEGATIVE = [...NEG_NO_PERSON, ...NEG_QUALITY].join(', '); // 제품 씬(인물 없음)
const BROLL_NEGATIVE_PERSON = NEG_QUALITY.join(', ');                 // 인물 레퍼런스가 있는 씬(모델이 나와야 함)

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
  const { referenceImagePath = null, referenceKind = 'person', productImagePath = null, productImagePaths = null, modelImagePath = null,
    width = REELS_W, height = REELS_H, aspect = '9:16', dryRunVideo = false, videoStyle = 'natural', log = () => {} } = opts;
  const durationMs = Math.round((scene.durationSec || 3) * 1000);
  const prompt = scene.brollPrompt || scene.direction || '';

  if (!prompt) {
    return { sceneN: scene.n, clipUrl: null, durationMs, isStill: false, imageUrl: null, error: 'empty brollPrompt' };
  }

  // 제품 레퍼런스(동일 제품 다각도): 배열 우선, 없으면 단일(하위호환). 전부 kind='product'로 넘겨 구조 파악↑.
  const prodPaths = (Array.isArray(productImagePaths) && productImagePaths.length) ? productImagePaths.filter(Boolean)
    : (productImagePath ? [productImagePath] : []);
  // 씬별 레퍼런스 라우팅: 모델씬(subject:'model')=모델+제품, 그 외=제품(또는 하위호환 단일 ref)
  let references = [];
  if (scene.subject === 'model' && modelImagePath) {
    references.push({ path: modelImagePath, kind: 'person' });
    for (const p of prodPaths) references.push({ path: p, kind: 'product' });
  } else if (prodPaths.length) {
    references = prodPaths.map((p) => ({ path: p, kind: 'product' }));
  } else if (referenceImagePath) {
    references = [{ path: referenceImagePath, kind: referenceKind }];
  }

  // 인물 레퍼런스가 실린 씬은 사람이 나와야 하는 씬이다 → 인물 배제 네거티브를 빼야 한다.
  //   kind!=='product' = 모델씬(위 라우팅) 또는 하위호환 단일 person ref. 둘 다 사람이 결과에 나오는 게 정상.
  const hasPersonRef = references.some((r) => r.kind && r.kind !== 'product');

  // 1) 이미지 렌더 (nanoBanana / Gemini)
  log(`  [scene ${scene.n}] 이미지 렌더${references.length > 1 ? '(모델+제품)' : ''}…`);
  const image = await nanoBanana.generate({
    prompt,
    negativePrompt: hasPersonRef ? BROLL_NEGATIVE_PERSON : BROLL_NEGATIVE,
    width,
    height,
    ...(references.length ? { references } : {}),
  });
  const imageUrl = image.url;

  // 2) dry-run: 정지 이미지를 클립으로
  if (dryRunVideo) {
    log(`  [scene ${scene.n}] dry-run: 정지 이미지 클립`);
    return { sceneN: scene.n, clipUrl: imageUrl, durationMs, isStill: true, imageUrl };
  }

  // 3) Kling image2video 모션 — Kling은 5s/10s 네이티브만 지원(임의 초 불가)이라 양자화.
  log(`  [scene ${scene.n}] Kling 모션…`);
  const wantSec = Math.round(durationMs / 1000); // 유저 지정 최종 길이
  const klingDur = Math.min((wantSec > 5) ? 10 : 5, klingProvider.maxDurationSec); // Kling 생성 길이(5 or 10). >5s면 10s 뽑아 트림(5s로 못 덮는 갭 방지)
  const submit = await klingProvider.submit({
    sourceImageUrl: imageUrl,
    motionPrompt: scene.direction || prompt,
    negativePrompt: BROLL_NEGATIVE,
    durationSec: klingDur,
    width,
    height,
    aspectRatio: aspect,
    style: videoStyle,
  });
  const poll = await pollUntilDone(klingProvider, submit.providerJobId);

  // 최종 길이는 유저 지정(durationMs) — assembler가 Kling 5/10초 클립을 이 길이로 트림(Kling≥최종이라 항상 트림만).
  const klingMs = poll.durationMs || klingDur * 1000;
  return {
    sceneN: scene.n,
    clipUrl: poll.videoUrl,
    durationMs: Math.min(durationMs, klingMs), // 유저 길이로 트림(Kling 실제보다 길게 요구하지 않게 clamp)
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
