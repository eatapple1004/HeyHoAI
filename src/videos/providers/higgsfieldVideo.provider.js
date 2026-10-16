/**
 * ─── Higgsfield API 영상 프로바이더 (video-to-video) ───
 *
 * (2026-10-14) fal 에 없는 것만 여기로: Kling Omni Edit(kling-video/omni/video-edit: video_urls+prompt) · Genjutsu(higgsfield/genjutsu/motion-transfer/v1.0: video_url+image_urls+prompt+resolution).
 *   규약은 이미지(higgsfield.provider)와 같다 — submit → status_url 폴링 → completed. 결과 필드는 video.url / videos[0].url 둘 다 받아준다(문서 미기재, 실측으로 확정).
 *   입력 모양은 registry falInput 과 같은 표기(video:'video_url'|'video_urls', image:'image_urls'…) 를 그대로 쓴다.
 *   ⚠️ 입력 파일은 공개 URL 이어야 한다(힉스필드가 받아간다) — videoJob.videoFor 가 PUBLIC_URL 로 노출한다.
 */
const { env } = require('../../config');

const API = 'https://api.higgsfield.ai';
const DONE = new Set(['completed']);
const DEAD = new Set(['failed', 'error', 'cancelled', 'canceled', 'nsfw']);

const authHeaders = () => ({ Authorization: `Key ${env.HIGGSFIELD_API_KEY}`, 'Content-Type': 'application/json' });

/** @type {import('./types').VideoProvider} */
const higgsfieldVideoProvider = {
  name: 'higgsfieldVideo',
  maxDurationSec: 30,

  isConfigured() { return !!env.HIGGSFIELD_API_KEY; },

  async submit(req) {
    if (!env.HIGGSFIELD_API_KEY) throw Object.assign(new Error('Higgsfield: HIGGSFIELD_API_KEY not configured'), { statusCode: 503 });
    if (!req.model) throw Object.assign(new Error('higgsfield video: registry model 없음'), { statusCode: 400 });
    const f = req.falInput || {};
    const body = { prompt: req.motionPrompt, ...(f.extra || {}) };
    if (f.video) body[f.video] = f.video.endsWith('s') ? [req.sourceVideoUrl] : req.sourceVideoUrl;
    const refs = (req.referenceImageUrls || []).filter(Boolean);
    if (f.image) body[f.image] = f.image.endsWith('s') ? (refs.length ? refs : [req.sourceImageUrl]).filter(Boolean) : req.sourceImageUrl;
    if (f.resolution && req.resolution) body.resolution = req.resolution;
    if (req.extras && typeof req.extras === 'object') Object.assign(body, req.extras);

    const res = await fetch(`${API}/${req.model}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Higgsfield video submit failed (${req.model}, ${res.status}): ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    if (!data.request_id) throw new Error(`Higgsfield video submit: request_id 없음 (${req.model})`);
    return { providerJobId: data.request_id, metadata: { model: req.model, statusUrl: data.status_url } };
  },

  async poll(providerJobId, ctx = {}) {
    const st = await fetch(ctx.statusUrl || `${API}/requests/${providerJobId}/status`, { headers: authHeaders() });
    if (!st.ok) throw new Error(`Higgsfield video poll failed (${st.status})`);
    const s = await st.json();
    const state = String(s.status || '').toLowerCase();
    if (DEAD.has(state)) return { status: 'failed', error: s.error || `Higgsfield ${state}` };
    if (!DONE.has(state)) return { status: state === 'queued' ? 'queued' : 'processing' };
    const video = s.video || (s.videos || [])[0] || (s.output && (s.output.video || (s.output.videos || [])[0]));
    const url = video && (video.url || video);
    if (!url || typeof url !== 'string') return { status: 'failed', error: `Higgsfield 응답에 video 가 없습니다 — ${JSON.stringify(s).slice(0, 300)}` };
    return { status: 'completed', videoUrl: url, metadata: { model: ctx.model } };
  },
};

module.exports = higgsfieldVideoProvider;
