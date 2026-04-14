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
    // 1) prediction 생성
    const createRes = await fetch(`${REPLICATE_API}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.REPLICATE_MODEL || 'black-forest-labs/flux-1.1-pro',
        input: {
          prompt: req.prompt,
          negative_prompt: req.negativePrompt,
          width: req.width,
          height: req.height,
          ...(req.seed != null && { seed: req.seed }),
          num_outputs: 1,
          output_format: 'png',
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
      url: result.output[0],
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
