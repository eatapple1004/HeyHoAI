/**
 * Google Veo 3.1 (Gemini API) — image-to-video.
 *
 * 왜 붙였나: 우리에게 없던 것 중 **오디오를 영상과 함께 네이티브로 생성**하는 유일한 모델이다.
 *   kling·runway는 무음 영상만 주고 우리가 ElevenLabs로 따로 붙인다.
 *
 * 키는 이미 있다 — nano-banana(이미지)가 쓰는 `GEMINI_API_KEY`와 같은 키다. 별도 발급이 필요 없다.
 *
 * ⚠️ 다른 provider와 두 가지가 다르다:
 *   ① 소스 이미지를 **URL이 아니라 base64 바이트**(inlineData)로 넣어야 한다.
 *   ② 결과 `video.uri`는 **API 키를 실어야만** 받아진다 → 그대로 두면 프론트가 못 연다.
 *      그래서 poll에서 받아 우리 저장소로 옮기고 `/images/...`를 돌려준다(persistVideo 참고).
 */
const { env } = require('../../config');
const { fetchAndPersist, imageToBase64, snapDuration } = require('./persistVideo');

const API = 'https://generativelanguage.googleapis.com/v1beta';
/** Veo가 허용하는 길이. 1080p·4k나 참조이미지 사용 시 8초만 가능하다(구글 제약). */
const ALLOWED_SEC = [4, 6, 8];

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

/** 가로세로에서 Veo가 받는 두 값 중 하나로. 그 사이 비율은 가까운 쪽으로 붙인다. */
function aspectOf(width, height) {
  return Number(width) >= Number(height) ? '16:9' : '9:16';
}

/** @type {import('./types').VideoProvider} */
const veoProvider = {
  name: 'veo',
  maxDurationSec: 8,

  isConfigured() { return !!env.GEMINI_API_KEY; },

  async submit(req) {
    if (!env.GEMINI_API_KEY) {
      throw fail('Gemini API key not configured (set GEMINI_API_KEY in .env)', 503);
    }
    const model = env.VEO_MODEL || 'veo-3.1-generate-preview';
    const image = req.sourceImageUrl ? await imageToBase64(req.sourceImageUrl) : null;

    const res = await fetch(`${API}/models/${encodeURIComponent(model)}:predictLongRunning`, {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt: req.motionPrompt,
          // ⚠️ `inlineData`(generateContent 형식)가 아니다 — Veo는 predict 계열이라
          //   `bytesBase64Encoded` + `mimeType`을 쓴다. inlineData로 보내면 400:
          //   "`inlineData` isn't supported by this model" (실측 2026-09-10).
          ...(image && { image: { bytesBase64Encoded: image.data, mimeType: image.mimeType } }),
        }],
        parameters: {
          aspectRatio: aspectOf(req.width, req.height),
          durationSeconds: String(snapDuration(req.durationSec, ALLOWED_SEC)),
          ...(env.VEO_RESOLUTION && { resolution: env.VEO_RESOLUTION }),
          ...(req.negativePrompt && { negativePrompt: req.negativePrompt }),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Veo submit failed (${res.status}): ${body.slice(0, 400)}`);
    }
    const data = await res.json();
    // operation name이 곧 폴링 경로다 — 그대로 job id로 쓴다.
    if (!data.name) throw new Error(`Veo submit: operation name 없음 — ${JSON.stringify(data).slice(0, 200)}`);
    return { providerJobId: data.name };
  },

  async poll(providerJobId) {
    const res = await fetch(`${API}/${providerJobId}`, {
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY },
    });
    if (!res.ok) throw new Error(`Veo poll failed (${res.status})`);
    const op = await res.json();

    if (!op.done) return { status: 'processing' };

    // done=true 여도 실패일 수 있다 — error가 실려 온다.
    if (op.error) {
      return { status: 'failed', error: op.error.message || JSON.stringify(op.error).slice(0, 300) };
    }

    const sample = op.response?.generateVideoResponse?.generatedSamples?.[0];
    const uri = sample?.video?.uri;
    if (!uri) {
      return { status: 'failed', error: `Veo 응답에 영상 URI가 없습니다 — ${JSON.stringify(op.response || {}).slice(0, 300)}` };
    }

    // ⚠️ 이 URI는 키가 있어야 열린다 → 받아서 우리 저장소로 옮긴다.
    const videoUrl = await fetchAndPersist(uri, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
    return {
      status: 'completed',
      videoUrl,
      metadata: { model: env.VEO_MODEL || 'veo-3.1-generate-preview', operation: providerJobId, nativeAudio: true },
    };
  },
};

module.exports = veoProvider;
