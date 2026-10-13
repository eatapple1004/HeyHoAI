/**
 * ─── fal.ai 범용 영상 프로바이더 (image-to-video) ───
 *
 * (2026-10-13) Seedance 2.5 · Wan 3.0 · Hailuo 2.3 · MiniMax H3 · Grok Imagine Video · HappyHorse · FLUX.3 Video · Gemini Omni Flash 가
 *   전부 fal 큐 API 한 규약(submit → status_url → response_url, 결과 video.url)이라 어댑터 하나로 돌린다.
 *   엔드포인트마다 필드 이름·타입이 달라서 registry 의 `falInput` 이 모양을 정한다:
 *     image:'image_url'|'start_image_url'   duration:'str'|'int'|null   aspect:bool   resolution:bool
 *     audio:'generate_audio'|'audio'|null    endImage:'end_image_url'|null   extra:{고정 필드}
 *   허용값(길이·비율·해상도 enum)은 10-13 에 fal 검증 오류로 실측해 registry controls 에 적었다 — 여기선 검사하지 않는다.
 * 시작 프레임은 data URL 로 받는다(videoJob.sourceFor 기본 경로). 검증은 비동기라 잘못된 값은 poll 에서 failed 로 온다.
 */
const { env } = require('../../config');

const FAL_QUEUE = 'https://queue.fal.run';

const authHeaders = () => ({
  Authorization: `Key ${env.FAL_API_KEY}`,
  'Content-Type': 'application/json',
});

/** @type {import('./types').VideoProvider} */
const falVideoProvider = {
  name: 'fal',
  maxDurationSec: 30, // 실제 상한은 registry controls.duration 이 정한다(submitExternal 이 그걸 쓴다)

  isConfigured() { return !!env.FAL_API_KEY; },

  /**
   * @param {import('./types').VideoGenerationRequest & { model: string, falInput: object, endImageUrl?: string, resolution?: string, audio?: boolean }} req
   */
  async submit(req) {
    if (!env.FAL_API_KEY) {
      throw Object.assign(new Error('fal: FAL_API_KEY not configured'), { statusCode: 503 });
    }
    if (!req.model) throw Object.assign(new Error('fal video: registry model(엔드포인트) 없음'), { statusCode: 400 });
    const f = req.falInput || {};
    const body = {
      prompt: req.motionPrompt,
      [f.image || 'image_url']: req.sourceImageUrl,
      ...(f.extra || {}),
    };
    if (f.duration === 'str') body.duration = String(req.durationSec);
    else if (f.duration === 'int') body.duration = parseInt(req.durationSec, 10);
    if (f.aspect && req.aspectRatio) body.aspect_ratio = req.aspectRatio;
    if (f.resolution && req.resolution) body.resolution = req.resolution;
    if (f.audio) body[f.audio] = req.audio === true;
    if (f.endImage && req.endImageUrl) body[f.endImage] = req.endImageUrl;
    if (req.seed != null) body.seed = req.seed;

    const res = await fetch(`${FAL_QUEUE}/${req.model}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) {
      throw new Error(`fal video submit failed (${req.model}, ${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    if (!data.request_id) throw new Error(`fal video submit: request_id 없음 (${req.model})`);
    return {
      providerJobId: data.request_id,
      metadata: { model: req.model, statusUrl: data.status_url, responseUrl: data.response_url },
    };
  },

  /**
   * @param {string} providerJobId
   * @param {{ model?: string, statusUrl?: string, responseUrl?: string }} [ctx] submit 이 돌려준 metadata
   */
  async poll(providerJobId, ctx = {}) {
    const base = `${FAL_QUEUE}/${ctx.model}/requests/${providerJobId}`;
    const st = await fetch(ctx.statusUrl || `${base}/status`, { headers: authHeaders() });
    if (!st.ok) throw new Error(`fal video poll failed (${st.status})`);
    const s = await st.json();
    const map = { IN_QUEUE: 'queued', IN_PROGRESS: 'processing', COMPLETED: 'completed' };
    const status = map[s.status] || (s.status === 'FAILED' ? 'failed' : 'processing');
    if (status === 'failed') return { status: 'failed', error: s.error || 'fal video job failed' };
    if (status !== 'completed') return { status };

    const rr = await fetch(ctx.responseUrl || base, { headers: authHeaders() });
    if (!rr.ok) {
      // 본문에만 사유가 있다(검증 422 · content_policy 등) — seedance.provider 와 같은 이유로 반드시 싣는다.
      const body = await rr.text().catch(() => '');
      return { status: 'failed', error: `fal result (${rr.status}): ${body.slice(0, 400)}` };
    }
    const out = await rr.json();
    const video = out.video || (out.videos || [])[0];
    if (!video || !video.url) return { status: 'failed', error: `fal 응답에 video 가 없습니다 — ${JSON.stringify(out).slice(0, 300)}` };
    return { status: 'completed', videoUrl: video.url, metadata: { model: ctx.model, seed: out.seed ?? null } };
  },
};

module.exports = falVideoProvider;
