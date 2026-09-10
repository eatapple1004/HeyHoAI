/**
 * OpenAI Sora 2 — image-to-video.
 *
 * 키는 이미 있다 — `OPENAI_API_KEY`(기존 용도와 공유).
 *
 * ⚠️ 다른 provider와 다른 점 셋:
 *   ① 요청이 JSON이 아니라 **multipart/form-data**다(참조 이미지를 파일로 올린다).
 *   ② **참조 이미지 해상도가 `size`와 정확히 같아야 한다**(OpenAI 제약). 우리 마스터 이미지가
 *      다른 비율이면 400이 난다 — 그래서 size를 req의 가로세로로 만들되 지원 목록으로 스냅한다.
 *      그래도 소스 이미지 자체가 그 크기가 아니면 실패하므로, 에러 원문을 그대로 올려 보낸다.
 *   ③ 결과가 URL이 아니라 **`/content` 의 MP4 바이너리**다 → 받아서 우리 저장소로 옮긴다.
 */
const { env } = require('../../config');
const { persistBuffer, imageToBlob, snapDuration } = require('./persistVideo');

const API = 'https://api.openai.com/v1';

/**
 * 지원 해상도. sora-2는 720p 계열, sora-2-pro가 1080p 계열까지 받는다.
 * 임의 해상도를 보내면 400이라 **가장 가까운 지원값으로 스냅**한다.
 */
const SIZES = {
  'sora-2':     [[1280, 720], [720, 1280]],
  'sora-2-pro': [[1280, 720], [720, 1280], [1920, 1080], [1080, 1920]],
};
/**
 * 허용 길이 — 문서가 개정되며 값이 바뀌어 왔다(4/8/12 ↔ 16/20). 그래서 상수로 박지 않고
 * `SORA_SECONDS`로 덮을 수 있게 둔다. 목록에 없는 값은 가장 가까운 쪽으로 스냅한다.
 */
function allowedSeconds() {
  const raw = String(env.SORA_SECONDS || '4,8,12');
  return raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
}

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

/** 요청 가로세로를 모델이 받는 크기로. 비율이 맞는 것 중 면적이 가까운 것을 고른다. */
function snapSize(model, width, height) {
  const list = SIZES[model] || SIZES['sora-2'];
  const portrait = Number(height) > Number(width);
  const pool = list.filter(([w, h]) => (h > w) === portrait);
  const candidates = pool.length ? pool : list;
  const want = Number(width) * Number(height) || 1280 * 720;
  const [w, h] = candidates.reduce((best, c) =>
    Math.abs(c[0] * c[1] - want) < Math.abs(best[0] * best[1] - want) ? c : best, candidates[0]);
  return `${w}x${h}`;
}

/** @type {import('./types').VideoProvider} */
const soraProvider = {
  name: 'sora',
  get maxDurationSec() { return Math.max(...allowedSeconds()); },

  isConfigured() { return !!env.OPENAI_API_KEY; },

  async submit(req) {
    if (!env.OPENAI_API_KEY) {
      throw fail('OpenAI API key not configured (set OPENAI_API_KEY in .env)', 503);
    }
    const model = env.SORA_MODEL || 'sora-2';

    const form = new FormData();
    form.append('model', model);
    form.append('prompt', req.motionPrompt || '');
    form.append('size', snapSize(model, req.width, req.height));
    form.append('seconds', String(snapDuration(req.durationSec, allowedSeconds())));
    if (req.sourceImageUrl) {
      const { blob, type } = await imageToBlob(req.sourceImageUrl);
      const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      form.append('input_reference', blob, `reference.${ext}`);
    }

    const res = await fetch(`${API}/videos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, // Content-Type은 FormData가 boundary와 함께 설정
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sora submit failed (${res.status}): ${body.slice(0, 400)}`);
    }
    const data = await res.json();
    if (!data.id) throw new Error(`Sora submit: id 없음 — ${JSON.stringify(data).slice(0, 200)}`);
    return { providerJobId: data.id };
  },

  async poll(providerJobId) {
    const res = await fetch(`${API}/videos/${encodeURIComponent(providerJobId)}`, {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });
    if (!res.ok) throw new Error(`Sora poll failed (${res.status})`);
    const data = await res.json();

    const statusMap = { queued: 'queued', in_progress: 'processing', completed: 'completed', failed: 'failed' };
    const status = statusMap[data.status] || 'processing';

    if (status === 'failed') {
      return { status: 'failed', error: data.error?.message || `Sora 생성 실패 (${data.status})` };
    }
    if (status !== 'completed') {
      return { status, metadata: { progress: data.progress } };
    }

    // 완료 — 별도 URL이 없다. 바이너리를 받아 우리 저장소로 옮긴다.
    const dl = await fetch(`${API}/videos/${encodeURIComponent(providerJobId)}/content`, {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });
    if (!dl.ok) {
      const body = await dl.text().catch(() => '');
      throw new Error(`Sora content 다운로드 실패 (${dl.status}) ${body.slice(0, 200)}`);
    }
    const videoUrl = await persistBuffer(Buffer.from(await dl.arrayBuffer()));

    return {
      status: 'completed',
      videoUrl,
      metadata: { model: data.model, size: data.size, seconds: data.seconds },
    };
  },
};

module.exports = soraProvider;
