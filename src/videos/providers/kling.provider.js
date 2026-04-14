const { env } = require('../../config');

const KLING_API = 'https://api.klingai.com/v1';

/** @type {import('./types').VideoProvider} */
const klingProvider = {
  name: 'kling',
  maxDurationSec: 10,

  async submit(req) {
    const res = await fetch(`${KLING_API}/videos/image2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.KLING_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: env.KLING_MODEL || 'kling-v2',
        image: req.sourceImageUrl,
        prompt: req.motionPrompt,
        negative_prompt: req.negativePrompt,
        duration: String(req.durationSec),
        mode: req.style === 'cinematic' ? 'pro' : 'std',
        aspect_ratio: '9:16',
        ...(req.seed != null && { seed: req.seed }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Kling submit failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    return { providerJobId: data.data?.task_id };
  },

  async poll(providerJobId) {
    const res = await fetch(`${KLING_API}/videos/image2video/${providerJobId}`, {
      headers: { Authorization: `Bearer ${env.KLING_API_KEY}` },
    });

    if (!res.ok) {
      throw new Error(`Kling poll failed (${res.status})`);
    }

    const data = await res.json();
    const task = data.data;

    const statusMap = {
      submitted: 'queued',
      processing: 'processing',
      succeed: 'completed',
      failed: 'failed',
    };

    const result = {
      status: statusMap[task.task_status] || 'processing',
    };

    if (task.task_status === 'succeed') {
      const video = task.task_result?.videos?.[0];
      result.videoUrl = video?.url;
      result.durationMs = video?.duration ? video.duration * 1000 : undefined;
      result.metadata = { taskId: task.task_id };
    }

    if (task.task_status === 'failed') {
      result.error = task.task_status_msg || 'Unknown Kling error';
    }

    return result;
  },
};

module.exports = klingProvider;
