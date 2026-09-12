/**
 * clipPipeline.service.js — 대본 broll 씬 → 모션 클립
 * ============================================================================
 * 씬별로: brollPrompt → nanoBanana(Gemini) 제품/모델 이미지 렌더 → image2video 모션.
 *   - product-render: reference 없이 제품 히어로/매크로 렌더
 *   - model-render:   referenceImagePath(모델 로스터) 주입해 on-model 렌더 [[doppia_virtual_models]]
 *   - dryRunVideo:    모션 생략, 렌더된 정지 이미지를 클립으로 사용(벤더/키 없이 v1 검증)
 * 반환: [{ sceneN, clipUrl, durationMs, isStill?, imageUrl, engine }]
 *
 * ── 모션 엔진 2종 (motionEngine / UGC_MOTION_ENGINE) ──
 *   kling(기본)  : 5s·10s 네이티브만 → 씬 길이를 양자화해 뽑고 assembler가 트림한다.
 *   seedance     : 4~15초를 **네이티브로** 지원 → 씬 길이를 그대로 뽑아 트림 손실이 없다.
 *
 * ⚠️ Seedance의 인물 정책은 "사람 금지"가 아니라 **실존 인물의 초상 금지**다(partner_validation_failed).
 *    실제 사람 사진은 422로 거부되지만, **nanoBanana가 만든 합성 인물은 통과한다**(2026-09-12 실측).
 *    UGC의 모델 씬은 후자라서 사전 차단하면 안 된다 — 한동안 인물 씬을 전부 kling으로 흘려보내
 *    정작 Seedance를 써야 할 씬을 놓치고 있었다.
 *    그래서 **추측으로 미리 가르지 않고**, Seedance가 실제로 정책 거부를 돌려줄 때만 그 씬을 kling으로 재시도한다.
 */
const nanoBanana = require('../images/providers/nanoBanana.provider');
const klingProvider = require('../videos/providers/kling.provider');
const seedanceProvider = require('../videos/providers/seedance.provider');

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

/**
 * provider.poll을 완료까지 폴링(videoGeneration.service.pollUntilDone 미러).
 * ⚠️ ctx(submit metadata)를 반드시 넘긴다 — seedance는 fal이 준 status_url·response_url을
 *   여기서 받아 쓴다. 안 넘기면 경로를 standard 티어로 조립해 fast 잡의 폴링이 엉뚱한 곳을 친다.
 *   ctx를 안 쓰는 provider는 두 번째 인자를 무시하므로 kling 동작은 그대로다.
 */
async function pollUntilDone(provider, providerJobId, { maxWaitMs = 600_000, intervalMs = 5_000, ctx } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await provider.poll(providerJobId, ctx);
    if (result.status === 'completed') return result;
    if (result.status === 'failed') throw new Error(`${provider.name} failed: ${result.error || 'unknown'}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`${provider.name} timed out after ${maxWaitMs}ms`);
}

/**
 * 이 씬을 어느 엔진으로 돌릴지. **인물이 있으면 무조건 kling**이다(위 헤더의 정책 제약).
 * @returns {{ name:'kling'|'seedance', reason?:string }}
 */
function pickEngine(motionEngine) {
  const want = String(motionEngine || process.env.UGC_MOTION_ENGINE || 'kling').toLowerCase();
  if (want !== 'seedance') return { name: 'kling' };
  if (!seedanceProvider.isConfigured()) return { name: 'kling', reason: 'FAL_API_KEY 없음 — kling으로 폴백' };
  return { name: 'seedance' };
}

/**
 * Seedance가 **정책상** 못 만드는 건인가(=kling으로 재시도할 가치가 있는가).
 * 네트워크·레이트 같은 일시 오류까지 kling으로 넘기면 Seedance가 조용히 안 쓰이게 되므로 좁게 본다.
 */
function isPolicyRejection(err) {
  const m = String((err && err.message) || '');
  return /content_policy_violation|partner_validation_failed|likenesses of real people/i.test(m);
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
    width = REELS_W, height = REELS_H, aspect = '9:16', dryRunVideo = false, videoStyle = 'natural', quality = 'low',
    motionEngine = null, log = () => {} } = opts;
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
    // 화질 티어: high=Pro 2K 프레임(선명·팩과 통일), low=provider 기본(Flash 1K, 현행). 되돌리려면 UGC_FRAME_MODEL env.
    ...(quality === 'high' ? { model: process.env.UGC_FRAME_MODEL || 'gemini-3-pro-image-preview', imageSize: '2K' } : {}),
    ...(references.length ? { references } : {}),
  });
  const imageUrl = image.url;

  // 2) dry-run: 정지 이미지를 클립으로
  if (dryRunVideo) {
    log(`  [scene ${scene.n}] dry-run: 정지 이미지 클립`);
    return { sceneN: scene.n, clipUrl: imageUrl, durationMs, isStill: true, imageUrl };
  }

  // 3) image2video 모션 — 엔진은 씬 단위로 고른다(인물 씬은 강제 kling).
  const wantSec = Math.round(durationMs / 1000); // 유저 지정 최종 길이
  const engine = pickEngine(motionEngine);
  if (engine.reason) log(`  [scene ${scene.n}] ${engine.reason}`);

  if (engine.name === 'seedance') {
    try {
    // Seedance는 4~15초를 네이티브로 지원한다 → **양자화 없이 씬 길이 그대로** 뽑는다.
    //   fast 티어는 1080p를 지원하지 않으므로 화질에 따라 티어를 함께 고른다.
    const tier = quality === 'high' ? 'standard' : 'fast';
    const resolution = quality === 'high' ? '1080p' : '720p';
    const seedDur = Math.min(15, Math.max(4, wantSec));
    log(`  [scene ${scene.n}] Seedance 모션 (${tier} · ${seedDur}s · ${resolution})…`);
    const sub = await seedanceProvider.submit({
      sourceImageUrl: imageUrl,
      // Seedance에는 negative_prompt가 없다 — 금지 지시를 프롬프트 본문에 붙여 보낸다.
      motionPrompt: `${scene.direction || prompt}. Avoid: ${BROLL_NEGATIVE}.`,
      durationSec: seedDur,
      aspectRatio: aspect,
      resolution,
      // ⚠️ 반드시 false — true면 오디오가 영상에 구워져 assembler의 TTS·음악 트랙과 겹친다.
      generateAudio: false,
      tier,
    });
    const poll = await pollUntilDone(seedanceProvider, sub.providerJobId, { ctx: sub.metadata });
      return {
        sceneN: scene.n,
        clipUrl: poll.videoUrl,
        // 길이를 그대로 뽑았으므로 트림 여지가 거의 없다. 그래도 clamp는 남긴다(4s 하한 때문에 씬이 더 짧을 수 있다).
        durationMs: Math.min(durationMs, seedDur * 1000),
        isStill: false,
        imageUrl,
        engine: 'seedance',
      };
    } catch (e) {
      // 정책 거부만 kling으로 넘긴다(실존 인물 초상 등). 그 외 오류는 그대로 올려 보낸다 —
      //   일시 오류까지 삼키면 Seedance가 조용히 안 쓰이는 상태로 굳는다.
      if (!isPolicyRejection(e)) throw e;
      log(`  [scene ${scene.n}] Seedance 정책 거부 → kling으로 재시도: ${String(e.message).slice(0, 120)}`);
    }
  }

  // Kling은 5s/10s 네이티브만 지원(임의 초 불가)이라 양자화한다.
  log(`  [scene ${scene.n}] Kling 모션…`);
  const klingDur = Math.min((wantSec > 5) ? 10 : 5, klingProvider.maxDurationSec); // Kling 생성 길이(5 or 10). >5s면 10s 뽑아 트림(5s로 못 덮는 갭 방지)
  const submit = await klingProvider.submit({
    sourceImageUrl: imageUrl,
    motionPrompt: scene.direction || prompt,
    negativePrompt: BROLL_NEGATIVE,
    durationSec: klingDur,
    width,
    height,
    aspectRatio: aspect,
    style: quality === 'high' ? 'cinematic' : videoStyle,   // high=Kling Pro(cinematic), low=Std(natural=현행)
  });
  const poll = await pollUntilDone(klingProvider, submit.providerJobId, { ctx: submit.metadata });

  // 최종 길이는 유저 지정(durationMs) — assembler가 Kling 5/10초 클립을 이 길이로 트림(Kling≥최종이라 항상 트림만).
  const klingMs = poll.durationMs || klingDur * 1000;
  return {
    sceneN: scene.n,
    clipUrl: poll.videoUrl,
    durationMs: Math.min(durationMs, klingMs), // 유저 길이로 트림(Kling 실제보다 길게 요구하지 않게 clamp)
    isStill: false,
    imageUrl,
    engine: 'kling',
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

  const engineLabel = String(opts.motionEngine || process.env.UGC_MOTION_ENGINE || 'kling').toLowerCase();
  log(`broll 씬 ${brollScenes.length}개 렌더 시작 (모션 ${engineLabel}, 동시성 ${concurrency}${opts.dryRunVideo ? ', dry-run' : ''})`);
  const clips = await mapLimit(brollScenes, concurrency, (scene) =>
    renderSceneClip(scene, opts).catch((err) => ({
      sceneN: scene.n, clipUrl: null, durationMs: Math.round((scene.durationSec || 3) * 1000),
      isStill: false, imageUrl: null, error: err.message,
    }))
  );

  const ok = clips.filter((c) => c.clipUrl);
  // ⚠️ 실패 사유를 반드시 남긴다. 전엔 개수만 찍어서 "all clips failed to render"만 보이고
  //   **왜** 실패했는지가 사라졌다(실측: Seedance가 file:// 소스를 못 읽어 전멸했는데 로그에 흔적이 없었다).
  for (const c of clips) {
    if (!c.clipUrl && c.error) log(`  [scene ${c.sceneN}] ❌ ${String(c.error).slice(0, 200)}`);
  }
  log(`클립 완료: ${ok.length}/${brollScenes.length} 성공`);
  return clips;
}

module.exports = { renderClips, renderSceneClip };
