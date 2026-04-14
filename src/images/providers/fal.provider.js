const { env } = require('../../config');

const FAL_API = 'https://queue.fal.run';

/** @type {import('./types').ImageProvider} */
const falProvider = {
  name: 'fal',

  /**
   * fal.ai API로 이미지를 생성한다.
   * @param {import('./types').ImageGenerationRequest} req
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    const model = env.FAL_MODEL || 'fal-ai/flux/dev';

    // 1) 요청 제출
    const submitRes = await fetch(`${FAL_API}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        image_size: { width: req.width, height: req.height },
        ...(req.seed != null && { seed: req.seed }),
        num_images: 1,
      }),
    });

    if (!submitRes.ok) {
      const body = await submitRes.text();
      throw new Error(`fal submit failed (${submitRes.status}): ${body}`);
    }

    const { request_id } = await submitRes.json();

    // 2) 완료까지 폴링
    const result = await pollFalRequest(model, request_id);

    return {
      url: result.images[0].url,
      seed: result.seed ?? null,
      providerJobId: request_id,
      metadata: {
        model,
        timings: result.timings,
      },
    };
  },
};

async function pollFalRequest(model, requestId) {
  const maxWait = 120_000;
  const interval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const statusRes = await fetch(`${FAL_API}/${model}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${env.FAL_API_KEY}` },
    });
    const status = await statusRes.json();

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(`${FAL_API}/${model}/requests/${requestId}`, {
        headers: { Authorization: `Key ${env.FAL_API_KEY}` },
      });
      return resultRes.json();
    }

    if (status.status === 'FAILED') {
      throw new Error(`fal request ${requestId} failed`);
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`fal request ${requestId} timed out after ${maxWait}ms`);
}

module.exports = falProvider;
