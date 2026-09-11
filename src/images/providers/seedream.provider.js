/**
 * ─── Seedream (ByteDance) provider — fal.ai 경유 ───
 *
 * 생성과 **편집**이 한 모델에 들어 있는 게 특징이다. 참조 이미지를 최대 10장까지 받아
 * 여러 소스를 합성할 수 있어, 제품 사진 + 모델 + 배경을 동시에 물리는 우리 용례와 맞는다.
 * (기존 fal.provider는 Flux 전용 파라미터라 여기서 재사용하지 않는다 — image_size 규칙부터 다르다.)
 *
 * ⚠️ image_size 규칙이 Flux와 다르다:
 *   · 프리셋 문자열(square_hd·portrait_16_9·auto_2K …) 또는 {width,height}
 *   · **커스텀 크기는 각 변이 1920~4096**이어야 한다. 우리 기본값(1024 등)을 그대로 넣으면 거부된다.
 *     그래서 범위를 벗어나면 프리셋으로 떨어뜨린다(비율은 유지).
 */
const { env } = require('../../config');

const FAL_QUEUE = 'https://queue.fal.run';
const T2I = 'fal-ai/bytedance/seedream/v4.5/text-to-image';
const EDIT = 'fal-ai/bytedance/seedream/v4.5/edit';

/** 커스텀 크기가 허용되는 범위. 이 밖이면 프리셋으로 바꾼다. */
const MIN_SIDE = 1920;
const MAX_SIDE = 4096;

/**
 * 요청 크기를 Seedream이 받는 형태로.
 * 1920~4096 안이면 그대로 쓰고, 아니면 **비율만 지켜** 프리셋으로 떨어뜨린다.
 * (임의로 1920까지 늘리면 사용자가 요청하지 않은 해상도로 과금된다 — 프리셋이 더 정직하다.)
 */
function toImageSize(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const inRange = (n) => n >= MIN_SIDE && n <= MAX_SIDE;
  if (inRange(w) && inRange(h)) return { width: w, height: h };

  if (!w || !h) return 'square_hd';
  const ratio = w / h;
  if (ratio > 1.55) return 'landscape_16_9';
  if (ratio > 1.1) return 'landscape_4_3';
  if (ratio < 0.65) return 'portrait_16_9';
  if (ratio < 0.9) return 'portrait_4_3';
  return 'square_hd';
}

const authHeaders = () => ({
  Authorization: `Key ${env.FAL_API_KEY}`,
  'Content-Type': 'application/json',
});

/** fal 큐: submit이 준 status_url·response_url을 그대로 따라간다(경로 규칙이 바뀌어도 안 깨진다). */
async function submitAndWait(model, input, maxWaitMs = 180_000) {
  const submitRes = await fetch(`${FAL_QUEUE}/${model}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(input),
  });
  if (!submitRes.ok) {
    const body = await submitRes.text();
    throw new Error(`Seedream submit failed (${submitRes.status}): ${body.slice(0, 400)}`);
  }
  const queued = await submitRes.json();
  const statusUrl = queued.status_url || `${FAL_QUEUE}/${model}/requests/${queued.request_id}/status`;
  const responseUrl = queued.response_url || `${FAL_QUEUE}/${model}/requests/${queued.request_id}`;

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const st = await fetch(statusUrl, { headers: authHeaders() });
    const status = await st.json().catch(() => ({}));
    if (status.status === 'COMPLETED') {
      const r = await fetch(responseUrl, { headers: authHeaders() });
      if (!r.ok) throw new Error(`Seedream result fetch failed (${r.status})`);
      return { result: await r.json(), requestId: queued.request_id };
    }
    if (status.status === 'FAILED') {
      throw new Error(`Seedream 생성 실패: ${JSON.stringify(status).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Seedream 타임아웃 (${maxWaitMs}ms)`);
}

/** @type {import('./types').ImageProvider} */
const seedreamProvider = {
  name: 'seedream',

  isConfigured() { return !!env.FAL_API_KEY; },

  /**
   * @param {import('./types').ImageGenerationRequest & {
   *   referenceImageUrls?: string[]  // 있으면 edit 경로(최대 10장 합성)
   * }} req
   */
  async generate(req) {
    if (!env.FAL_API_KEY) {
      throw Object.assign(new Error('Seedream: FAL_API_KEY not configured'), { statusCode: 503 });
    }
    const refs = (req.referenceImageUrls || []).filter(Boolean).slice(0, 10);
    const model = refs.length ? EDIT : (env.SEEDREAM_MODEL || T2I);

    const input = {
      prompt: req.prompt,
      image_size: toImageSize(req.width, req.height),
      num_images: 1,
      ...(req.seed != null && { seed: req.seed }),
      ...(refs.length && { image_urls: refs }),
    };
    // ⚠️ negative_prompt는 보내지 않는다 — Seedream 스키마에 없다.
    //   금지 지시는 프롬프트 본문에 녹여야 한다(Seedance와 같은 제약).

    const { result, requestId } = await submitAndWait(model, input);
    const image = (result.images || [])[0];
    if (!image || !image.url) {
      throw new Error(`Seedream 응답에 이미지가 없습니다 — ${JSON.stringify(result).slice(0, 300)}`);
    }

    return {
      url: image.url,
      seed: result.seed ?? null,
      providerJobId: requestId,
      metadata: {
        model,
        width: image.width,
        height: image.height,
        edited: refs.length > 0,
        referenceCount: refs.length,
      },
    };
  },
};

module.exports = seedreamProvider;
module.exports.MODELS = { T2I, EDIT };
