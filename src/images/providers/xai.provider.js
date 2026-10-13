/**
 * ─── xAI Grok Imagine 이미지 프로바이더 ───
 *
 * (2026-10-13) POST https://api.x.ai/v1/images/generations (OpenAI 호환 모양, 동기 응답).
 *   모델 id 는 registry(model: grok-imagine-image-2.0). 비율은 aspect_ratio 문자열, 해상도는 resolution '1k'|'2k'.
 *   ⚠️ 텍스트 전용으로만 연결했다 — /v1/images/edits(멀티파트 레퍼런스)는 키가 생긴 뒤 실측하고 붙인다.
 *   ⚠️ 키 없는 상태에서 문서 기준으로 작성(10-13). 첫 실생성에서 필드명이 어긋나면 여기만 고친다.
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
    const body = {
      model,
      prompt: req.prompt,
      n: 1,
      aspect_ratio: req.aspectRatio || '1:1',
      resolution: String(req.imageSize || '1K').toUpperCase() === '2K' ? '2k' : '1k',
      response_format: 'url',
      ...(req.extras && req.extras.quality && { quality: req.extras.quality }),
    };
    const res = await fetch(`${API}/images/generations`, {
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
      metadata: { model, usage: data.usage || null },
    };
  },
};

module.exports = xaiProvider;
