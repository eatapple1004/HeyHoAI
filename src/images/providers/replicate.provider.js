const { env } = require('../../config');

const REPLICATE_API = 'https://api.replicate.com/v1';

/** @type {import('./types').ImageProvider} */
const replicateProvider = {
  name: 'replicate',

  /**
   * Replicate API(FLUX 모델)로 이미지를 생성한다.
   * @param {import('./types').ImageGenerationRequest} req
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    // 1) prediction 생성 — (2026-10-13 실측) `/predictions` 에 model 을 넣으면 422 "version is required" 라
    //    공식 모델 경로 `/models/{owner}/{name}/predictions` 로 보낸다. FLUX 1.1 Pro 는 width/height 대신 aspect_ratio 를 받는다.
    const model = req.model || env.REPLICATE_MODEL || 'black-forest-labs/flux-1.1-pro';
    const createRes = await fetch(`${REPLICATE_API}/models/${model}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: req.prompt,
          aspect_ratio: req.aspectRatio || '1:1',
          ...(req.seed != null && { seed: req.seed }),
          output_format: 'png',
          ...(req.referenceImageUrls && req.referenceImageUrls[0] && { image_prompt: req.referenceImageUrls[0] }), // (10-13) FLUX Redux — 첫 레퍼런스 한 장
          ...(req.extras && typeof req.extras === 'object' ? req.extras : {}), // registry extras(safety_tolerance · prompt_upsampling · seed)
        },
      }),
    });

    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`Replicate create failed (${createRes.status}): ${body}`);
    }

    const prediction = await createRes.json();

    // 2) 완료까지 폴링 (최대 120초)
    const result = await pollPrediction(prediction.id);

    return {
      url: Array.isArray(result.output) ? result.output[0] : result.output, // 공식 모델(flux-1.1-pro)은 output 이 문자열 한 개
      seed: result.input?.seed ?? null,
      providerJobId: result.id,
      metadata: {
        model: result.model,
        metrics: result.metrics,
      },
    };
  },
};

async function pollPrediction(id) {
  const maxWait = 120_000;
  const interval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const res = await fetch(`${REPLICATE_API}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${env.REPLICATE_API_TOKEN}` },
    });
    const data = await res.json();

    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate prediction ${id} ${data.status}: ${data.error || 'unknown'}`);
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Replicate prediction ${id} timed out after ${maxWait}ms`);
}

module.exports = replicateProvider;
