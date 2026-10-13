/**
 * ─── fal.ai 범용 이미지 프로바이더 ───
 *
 * (2026-10-13) FLUX dev 전용이던 것을 registry 가 주는 model/editModel/sizing 으로 돌아가게 넓혔다.
 *   · req.model      = fal 엔드포인트 경로(없으면 FAL_MODEL, 기본 fal-ai/flux/dev)
 *   · req.editModel  = 레퍼런스가 있을 때 쓰는 편집 엔드포인트(image_urls). 없으면 텍스트 전용으로 레퍼런스를 무시한다.
 *   · req.sizing     = 'aspect' 면 aspect_ratio + resolution('1k'|'2k'|'4k') 스키마(FLUX 3), 아니면 image_size:{width,height}(FLUX·Recraft·Z-Image)
 *   · req.negative   = 스키마에 negative_prompt 가 있을 때만 true(registry controls.negative) — 없는 필드를 보내면 422
 * 큐 규약은 submit 이 돌려주는 status_url/response_url 을 그대로 따라간다(seedream.provider 와 동일 — 경로 규칙이 바뀌어도 안 깨진다).
 * Seedream 은 image_size 범위 규칙이 달라 seedream.provider 에 그대로 둔다.
 */
const { env } = require('../../config');

const FAL_QUEUE = 'https://queue.fal.run';

const authHeaders = () => ({
  Authorization: `Key ${env.FAL_API_KEY}`,
  'Content-Type': 'application/json',
});

/** imageSize 티어(1K/2K/4K) → FLUX 3 resolution 값 */
function toResolution(imageSize) {
  const s = String(imageSize || '1K').toUpperCase();
  return s === '4K' ? '4k' : s === '2K' ? '2k' : '1k';
}

async function submitAndWait(model, input, maxWaitMs = 180_000) {
  const submitRes = await fetch(`${FAL_QUEUE}/${model}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(input),
  });
  if (!submitRes.ok) {
    const body = await submitRes.text();
    throw new Error(`fal submit failed (${model}, ${submitRes.status}): ${body.slice(0, 400)}`);
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
      if (!r.ok) throw new Error(`fal result fetch failed (${model}, ${r.status})`);
      return { result: await r.json(), requestId: queued.request_id };
    }
    if (status.status === 'FAILED') {
      throw new Error(`fal 생성 실패 (${model}): ${JSON.stringify(status).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`fal 타임아웃 (${model}, ${maxWaitMs}ms)`);
}

/** @type {import('./types').ImageProvider} */
const falProvider = {
  name: 'fal',

  isConfigured() { return !!env.FAL_API_KEY; },

  /**
   * @param {import('./types').ImageGenerationRequest & {
   *   model?: string, editModel?: string, sizing?: 'aspect', negative?: boolean,
   *   aspectRatio?: string, imageSize?: string, referenceImageUrls?: string[]
   * }} req
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    if (!env.FAL_API_KEY) {
      throw Object.assign(new Error('fal: FAL_API_KEY not configured'), { statusCode: 503 });
    }
    const refs = (req.referenceImageUrls || []).filter(Boolean);
    const useEdit = refs.length > 0 && !!req.editModel;
    const model = useEdit ? req.editModel : (req.model || env.FAL_MODEL || 'fal-ai/flux/dev');

    const input = {
      prompt: req.prompt,
      num_images: 1,
      ...(req.seed != null && { seed: req.seed }),
      ...(req.negative && req.negativePrompt && { negative_prompt: req.negativePrompt }),
      ...(useEdit && { image_urls: refs }),
    };
    if (req.sizing === 'aspect') {
      input.aspect_ratio = req.aspectRatio || '1:1';
      input.resolution = toResolution(req.imageSize);
    } else {
      input.image_size = { width: req.width, height: req.height };
    }

    const { result, requestId } = await submitAndWait(model, input);
    const image = (result.images || [])[0];
    if (!image || !image.url) {
      throw new Error(`fal 응답에 이미지가 없습니다 (${model}) — ${JSON.stringify(result).slice(0, 300)}`);
    }
    return {
      url: image.url,
      seed: result.seed ?? null,
      providerJobId: requestId,
      metadata: { model, timings: result.timings, edited: useEdit, referenceCount: useEdit ? refs.length : 0 },
    };
  },
};

module.exports = falProvider;
