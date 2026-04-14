const { env } = require('../../config');

const RUNWAY_API = 'https://api.dev.runwayml.com/v1';

/** @type {import('./types').VideoProvider} */
const runwayProvider = {
  name: 'runway',
  maxDurationSec: 10,

  async submit(req) {
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
        ratio: `${req.width}:${req.height}`,
        ...(req.seed != null && { seed: req.seed }),
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
