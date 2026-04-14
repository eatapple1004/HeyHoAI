const { env } = require('../../config');

const MINIMAX_API = 'https://api.minimaxi.chat/v1';

/** @type {import('./types').VideoProvider} */
const minimaxProvider = {
  name: 'minimax',
  maxDurationSec: 6,

  async submit(req) {
    const res = await fetch(`${MINIMAX_API}/video_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MINIMAX_MODEL || 'video-01',
        first_frame_image: req.sourceImageUrl,
        prompt: req.motionPrompt,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Minimax submit failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    return { providerJobId: data.task_id };
  },

  async poll(providerJobId) {
    const res = await fetch(`${MINIMAX_API}/query/video_generation?task_id=${providerJobId}`, {
      headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
    });

    if (!res.ok) {
      throw new Error(`Minimax poll failed (${res.status})`);
    }

    const data = await res.json();

    const statusMap = {
      Queueing: 'queued',
      Processing: 'processing',
      Success: 'completed',
      Fail: 'failed',
    };

    const result = {
      status: statusMap[data.status] || 'processing',
    };

    if (data.status === 'Success') {
      result.videoUrl = data.file_id; // Minimax는 file_id를 다운로드 URL로 변환 필요
      result.metadata = { fileId: data.file_id };
    }

    if (data.status === 'Fail') {
      result.error = data.base_resp?.status_msg || 'Unknown Minimax error';
    }

    return result;
  },
};

module.exports = minimaxProvider;
