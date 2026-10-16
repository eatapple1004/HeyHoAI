/**
 * ─── xAI Grok Imagine 이미지 프로바이더 ───
 *
 * (2026-10-13) POST https://api.x.ai/v1/images/generations (OpenAI 호환 모양, 동기 응답).
 *   모델 id 는 registry(model: grok-imagine-image-2.0). 비율은 aspect_ratio 문자열, 해상도는 resolution '1k'|'2k'.
 *   레퍼런스가 있으면 POST /v1/images/edits — (10-13 실측) 멀티파트가 아니라 JSON `images:[{url}]`(여러 장) 또는 `image_url`(한 장). 최대 5장.
 *   (10-13) generations 실생성 OK.
 */
const { env } = require('../../config');

const API = 'https://api.x.ai/v1';

/** @type {import('./types').ImageProvider} */
const xaiProvider = {
  name: 'xai',

  isConfigured() { return !!env.XAI_API_KEY; },

  /**
   * @param {import('./types').ImageGenerationRequest & { model?: string, aspectRatio?: string, imageSize?: string }} req
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    if (!env.XAI_API_KEY) {
      throw Object.assign(new Error('xAI: XAI_API_KEY not configured'), { statusCode: 503 });
    }
    const model = req.model || 'grok-imagine-image-2.0';
    const refs = (req.referenceImageUrls || []).filter(Boolean).slice(0, 5);
    const body = {
      model,
      prompt: req.prompt,
      n: 1,
      aspect_ratio: req.aspectRatio || '1:1',
      resolution: String(req.imageSize || '1K').toUpperCase() === '2K' ? '2k' : '1k',
      response_format: 'url',
      ...(req.extras && req.extras.quality && { quality: req.extras.quality }),
      ...(refs.length && { images: refs.map((url) => ({ url })) }),
    };
    const res = await fetch(`${API}/images/${refs.length ? 'edits' : 'generations'}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`xAI generate failed (${res.status}): ${text.slice(0, 400)}`);
    }
    const data = await res.json();
    const first = (data.data || [])[0];
    if (!first || !first.url) {
      throw new Error(`xAI 응답에 이미지가 없습니다 — ${JSON.stringify(data).slice(0, 300)}`);
    }
    return {
      url: first.url,
      seed: null,
      providerJobId: data.id || null,
      metadata: { model, usage: data.usage || null, edited: refs.length > 0, referenceCount: refs.length },
    };
  },
};

module.exports = xaiProvider;
