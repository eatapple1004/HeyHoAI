const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { env } = require('../../config');

const KLING_API = 'https://api.klingai.com/v1';

/**
 * sourceImage가 URL이면 그 콘텐츠를 받아 base64 문자열로 반환한다.
 * 이미 base64거나 data:URL이면 그대로 반환.
 * 같은 서버의 /images/... 경로는 디스크에서 직접 읽어 외부 fetch 호출을 아낀다.
 */
async function toBase64IfUrl(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.startsWith('data:')) return src.split(',').pop();
  // base64 문자열은 보통 매우 길고 http로 시작하지 않음
  if (!/^https?:\/\//i.test(src) && src.length > 200 && !src.includes('/')) return src;

  // 동일 서버의 /images/<file> 경로면 디스크에서 직접 읽기
  const imagesPathMatch = src.match(/\/images\/([^/?#]+)$/);
  if (imagesPathMatch) {
    const filename = imagesPathMatch[1];
    const localPath = path.join(process.cwd(), 'tmp', 'images', filename);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath).toString('base64');
    }
  }

  // 그 외엔 fetch
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch source image (${res.status}) at ${src}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * Kling API JWT 토큰 생성
 * Access Key + Secret Key → JWT 토큰 (30분 유효)
 */
function generateToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.KLING_ACCESS_KEY,
    exp: now + 1800, // 30분
    nbf: now - 5,
    iat: now,
  };
  return jwt.sign(payload, env.KLING_SECRET_KEY, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' },
  });
}

/** @type {import('./types').VideoProvider} */
const klingProvider = {
  name: 'kling',
  maxDurationSec: 10,

  isConfigured() { return !!(env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY); },

  async submit(req) {
    if (!env.KLING_ACCESS_KEY || !env.KLING_SECRET_KEY) {
      throw Object.assign(
        new Error('Kling API keys not configured (set KLING_ACCESS_KEY and KLING_SECRET_KEY)'),
        { statusCode: 503 }
      );
    }
    const token = generateToken();

    // Kling이 외부 URL을 fetch하려면 서버가 public이어야 하는데, 보통 안 그러니
    // 우리가 미리 받아 base64로 보낸다 (Generate 페이지 경로가 쓰는 방식과 동일).
    const imageField = await toBase64IfUrl(req.sourceImageUrl);

    const res = await fetch(`${KLING_API}/videos/image2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: env.KLING_MODEL || 'kling-v3',
        image: imageField,
        prompt: req.motionPrompt,
        negative_prompt: req.negativePrompt,
        duration: String(req.durationSec),
        mode: req.style === 'cinematic' ? 'pro' : 'std',
        aspect_ratio: ['9:16', '1:1', '16:9'].includes(req.aspectRatio) ? req.aspectRatio : '9:16',
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
    const token = generateToken();

    const res = await fetch(`${KLING_API}/videos/image2video/${providerJobId}`, {
      headers: { Authorization: `Bearer ${token}` },
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
