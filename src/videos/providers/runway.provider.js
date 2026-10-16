const { env } = require('../../config');

const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
const RATIO = { '16:9': '1280:720', '9:16': '720:1280', '1:1': '960:960', '4:3': '1104:832', '3:4': '832:1104', '21:9': '1584:672' };

/** @type {import('./types').VideoProvider} */
const runwayProvider = {
  name: 'runway',
  maxDurationSec: 10,

  isConfigured() { return !!env.RUNWAY_API_KEY; },

  async submit(req) {
    if (!env.RUNWAY_API_KEY) {
      throw Object.assign(
        new Error('Runway API key not configured (set RUNWAY_API_KEY in .env)'),
        { statusCode: 503 }
      );
    }
    const res = await fetch(`${RUNWAY_API}/image_to_video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: env.RUNWAY_MODEL || 'gen4_turbo',
        promptImage: req.sourceImageUrl,
        promptText: req.motionPrompt,
        duration: req.durationSec,
        // (2026-10-13) Runway 검증 실측 허용값 6종 — 비율에서 고른다(전엔 width:height 를 그대로 보내 1:1 이 1024:1024 로 거절됐다)
        ratio: RATIO[req.aspectRatio] || (Number(req.width) >= Number(req.height) ? '1280:720' : '720:1280'),
        ...(req.seed != null && { seed: req.seed }),
        ...(req.extras && req.extras.seed != null && { seed: Number(req.extras.seed) }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Runway submit failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    return { providerJobId: data.id };
  },

  async poll(providerJobId) {
    const res = await fetch(`${RUNWAY_API}/tasks/${providerJobId}`, {
      headers: { Authorization: `Bearer ${env.RUNWAY_API_KEY}` },
    });

    if (!res.ok) {
      throw new Error(`Runway poll failed (${res.status})`);
    }

    const data = await res.json();

    const statusMap = {
      PENDING: 'queued',
      THROTTLED: 'queued',
      RUNNING: 'processing',
      SUCCEEDED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'failed',
    };

    const result = {
      status: statusMap[data.status] || 'processing',
    };

    if (data.status === 'SUCCEEDED') {
      result.videoUrl = data.output?.[0];
      result.metadata = { createdAt: data.createdAt, progress: data.progress };
    }

    if (data.status === 'FAILED') {
      result.error = data.failure || 'Unknown Runway error';
    }

    return result;
  },
};

module.exports = runwayProvider;
