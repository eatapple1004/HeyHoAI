/**
 * ─── Higgsfield Soul 이미지 프로바이더 ───
 *
 * (2026-10-13) POST https://api.higgsfield.ai/<model>  (model = registry, 기본 higgsfield-ai/soul/v2/standard)
 *   인증: Authorization: Key <키>  — open.higgsfield.ai 콘솔이 키를 한 줄로 준다(문서의 <id>:<secret> 를 합친 값). env HIGGSFIELD_API_KEY 에 그대로.
 *   비동기: submit → status_url 폴링 → status 'completed' 에 images[].url.
 *   입력: prompt · aspect_ratio('1:1','9:16','16:9','4:3','3:4','2:3','3:2') · resolution('720p'|'1080p') · batch_size 1
 *   ⚠️ 텍스트 전용 — Soul 의 참조는 custom_reference_id(학습해 둔 캐릭터)뿐이라 우리 레퍼런스 슬롯과 뜻이 다르다.
 *   ⚠️ 키 없는 상태에서 문서 기준으로 작성(10-13). 실패 status 값은 문서에 없어 'completed' 외 종료 상태를 보수적으로 잡았다.
 */
const { env } = require('../../config');

const API = 'https://api.higgsfield.ai';
const ASPECTS = new Set(['1:1', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2']);
const DONE = new Set(['completed']);
const DEAD = new Set(['failed', 'error', 'cancelled', 'canceled', 'nsfw']);

const authHeaders = () => ({
  Authorization: `Key ${env.HIGGSFIELD_API_KEY}`,
  'Content-Type': 'application/json',
});

/** @type {import('./types').ImageProvider} */
const higgsfieldProvider = {
  name: 'higgsfield',

  isConfigured() { return !!env.HIGGSFIELD_API_KEY; },

  /**
   * @param {import('./types').ImageGenerationRequest & { model?: string, aspectRatio?: string, imageSize?: string }} req
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    if (!this.isConfigured()) {
      throw Object.assign(new Error('Higgsfield: HIGGSFIELD_API_KEY not configured'), { statusCode: 503 });
    }
    const model = req.model || 'higgsfield-ai/soul/v2/standard';
    const aspect = ASPECTS.has(req.aspectRatio) ? req.aspectRatio : (req.aspectRatio === '4:5' ? '3:4' : '1:1'); // 4:5 는 Soul 에 없음 → 가장 가까운 세로
    const body = {
      prompt: req.prompt,
      aspect_ratio: aspect,
      resolution: String(req.imageSize || '').toLowerCase() === '1080p' ? '1080p' : '720p',
      enhance_prompt: false, // 힉스필드가 프롬프트를 서버에서 재작성한다 — 우리 프롬프트 그대로 가게 끈다
      batch_size: 1,
      ...(req.seed != null && { seed: req.seed }),
    };
    const submit = await fetch(`${API}/${model}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!submit.ok) {
      const text = await submit.text();
      throw new Error(`Higgsfield submit failed (${submit.status}): ${text.slice(0, 400)}`);
    }
    const queued = await submit.json();
    const statusUrl = queued.status_url || `${API}/requests/${queued.request_id}/status`;

    const maxWaitMs = 180_000;
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const st = await fetch(statusUrl, { headers: authHeaders() });
      const status = await st.json().catch(() => ({}));
      const state = String(status.status || '').toLowerCase();
      if (DONE.has(state)) {
        const image = (status.images || [])[0];
        if (!image || !image.url) throw new Error(`Higgsfield 응답에 이미지가 없습니다 — ${JSON.stringify(status).slice(0, 300)}`);
        return { url: image.url, seed: body.seed ?? null, providerJobId: queued.request_id, metadata: { model, resolution: body.resolution } };
      }
      if (DEAD.has(state)) throw new Error(`Higgsfield 생성 실패 (${state}): ${JSON.stringify(status).slice(0, 300)}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error(`Higgsfield 타임아웃 (${maxWaitMs}ms)`);
  },
};

module.exports = higgsfieldProvider;
