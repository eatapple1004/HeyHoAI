const fs = require('fs');
const path = require('path');
const { env } = require('../../config');

/**
 * ─── Seedance (ByteDance) provider — fal.ai 경유 ───
 *
 * URL to Ad(광고 스튜디오)용 **단일패스** 엔진. 한 번의 호출로 모션·오디오·립싱크·멀티샷을
 * 함께 만든다(우리 기존 조립식 파이프라인과 대비되는 지점).
 *
 * ⚠️ Kling과 성격이 다르다 —
 *   · negative_prompt 없음(모델이 지원하지 않는다). 금지 지시는 프롬프트 본문에 넣어야 한다.
 *   · duration 4~15초(Kling은 5·10 고정)
 *   · generate_audio=true면 음악·SFX·대사가 영상에 **구워져** 나온다. 우리 TTS·음악 트랙과
 *     겹치므로 조립식 경로에서는 반드시 false로 둘 것.
 *
 * fal 큐 API 규약: submit이 status_url·response_url을 돌려주므로 **그 URL을 그대로 따라간다**
 *   (엔드포인트 경로 규칙이 바뀌어도 깨지지 않는다).
 */

const FAL_QUEUE = 'https://queue.fal.run';

/** 티어별 모델 경로. fast는 720p까지, standard는 1080p까지. */
const MODELS = {
  standard: 'bytedance/seedance-2.0/image-to-video',
  fast: 'bytedance/seedance-2.0/fast/image-to-video',
  /** 제품+아바타를 동시에 넣는 경로 — URL to Ad의 본체 */
  reference: 'bytedance/seedance-2.0/reference-to-video',
};

const ALLOWED_RESOLUTION = ['480p', '720p', '1080p'];
const ALLOWED_ASPECT = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
const MIN_DURATION = 4;
const MAX_DURATION = 15;

function modelPath(tier) {
  return MODELS[tier] || MODELS.standard;
}

/** fal은 data URI를 받는다. 로컬 파일·비공개 경로는 인라인으로 보낸다. */
async function toImageUrl(src) {
  const s = String(src || '');
  if (!s) return null;
  if (s.startsWith('data:')) return s;

  // 공개 URL이면 그대로 — fal이 직접 받아간다(업로드 비용·지연 절약)
  if (/^https?:\/\//i.test(s)) return s;

  // 우리 서빙 경로 `/images/<file>` 규약 — 실제 파일은 tmp/images에 있다(kling.provider와 동일 처리).
  //   이걸 빼먹으면 시작 프레임 보정(frameFit)이 만든 경로를 못 읽는다.
  const served = s.match(/^\/images\/([^/?#]+)$/);
  const abs = served
    ? path.join(process.cwd(), 'tmp', 'images', served[1])
    : (path.isAbsolute(s) ? s : path.join(process.cwd(), s));
  if (!fs.existsSync(abs)) throw new Error(`Seedance: source image not found — ${s}`);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
}

/**
 * fal 인증 헤더. 공식 스킴은 `Key <token>`이지만 일부 경로가 Bearer만 받는 사례가 있어
 * 401이면 한 번 바꿔 재시도한다(설정 실수와 스킴 차이를 구분하기 위함).
 */
function authHeaders(scheme = 'Key') {
  return {
    Authorization: `${scheme} ${env.FAL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function falFetch(url, init = {}) {
  let res = await fetch(url, { ...init, headers: { ...authHeaders('Key'), ...(init.headers || {}) } });
  if (res.status === 401) {
    res = await fetch(url, { ...init, headers: { ...authHeaders('Bearer'), ...(init.headers || {}) } });
  }
  return res;
}

const seedanceProvider = {
  name: 'seedance',
  maxDurationSec: MAX_DURATION,

  isConfigured() { return !!env.FAL_API_KEY; },

  /**
   * @param {object} req
   * @param {string} req.sourceImageUrl   첫 프레임(공개 URL 또는 로컬 경로)
   * @param {string} req.motionPrompt     컴파일된 프롬프트(샷 리스트 포함 가능)
   * @param {number} [req.durationSec=8]  4~15
   * @param {string} [req.aspectRatio]    기본 9:16
   * @param {string} [req.resolution]     기본 720p
   * @param {boolean} [req.generateAudio] 기본 false — 조립식과 오디오가 겹치지 않게
   * @param {string} [req.endImageUrl]    끝 프레임
   * @param {string} [req.tier]           standard|fast|reference
   * @param {string[]} [req.referenceImageUrls] tier=reference일 때 제품·아바타 등
   */
  async submit(req) {
    if (!env.FAL_API_KEY) {
      throw Object.assign(new Error('Seedance: FAL_API_KEY not configured'), { statusCode: 503 });
    }

    const tier = req.tier || env.SEEDANCE_TIER || 'standard';
    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, parseInt(req.durationSec, 10) || 8));
    const resolution = ALLOWED_RESOLUTION.includes(req.resolution) ? req.resolution : '720p';
    const aspect = ALLOWED_ASPECT.includes(req.aspectRatio) ? req.aspectRatio : '9:16';

    if (tier === 'fast' && resolution === '1080p') {
      throw new Error('Seedance fast 티어는 1080p를 지원하지 않는다 — standard를 쓸 것');
    }

    const body = {
      prompt: req.motionPrompt,
      duration: String(duration),
      resolution,
      aspect_ratio: aspect,
      // 기본 false: true면 오디오가 영상에 구워져 우리 TTS·음악 트랙과 충돌한다.
      generate_audio: req.generateAudio === true,
      ...(req.seed != null && { seed: req.seed }),
    };

    if (tier === 'reference') {
      const refs = req.referenceImageUrls || [];
      if (!refs.length) throw new Error('Seedance reference 티어는 referenceImageUrls가 필요하다');
      body.reference_image_urls = await Promise.all(refs.map(toImageUrl));
    } else {
      body.image_url = await toImageUrl(req.sourceImageUrl);
      if (req.endImageUrl) body.end_image_url = await toImageUrl(req.endImageUrl);
    }

    const res = await falFetch(`${FAL_QUEUE}/${modelPath(tier)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Seedance submit failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }

    const data = await res.json();
    if (!data.request_id) throw new Error('Seedance submit: request_id 없음');
    // status_url·response_url을 그대로 보관 — 경로 규칙 변화에 영향받지 않는다.
    return {
      providerJobId: data.request_id,
      metadata: { tier, statusUrl: data.status_url, responseUrl: data.response_url },
    };
  },

  /**
   * @param {string} providerJobId
   * @param {object} [ctx] submit이 돌려준 metadata(statusUrl·responseUrl·tier). 없으면 경로를 조립한다.
   */
  async poll(providerJobId, ctx = {}) {
    const base = `${FAL_QUEUE}/${modelPath(ctx.tier)}/requests/${providerJobId}`;
    const statusUrl = ctx.statusUrl || `${base}/status`;

    const res = await falFetch(statusUrl);
    if (!res.ok) throw new Error(`Seedance poll failed (${res.status})`);
    const s = await res.json();

    const statusMap = { IN_QUEUE: 'queued', IN_PROGRESS: 'processing', COMPLETED: 'completed' };
    const status = statusMap[s.status] || (s.status === 'FAILED' ? 'failed' : 'processing');

    if (status !== 'completed') {
      return status === 'failed'
        ? { status: 'failed', error: s.error || 'Seedance job failed' }
        : { status };
    }

    // 완료 — 결과 본문은 별도 URL에서 받는다.
    const rr = await falFetch(ctx.responseUrl || base);
    if (!rr.ok) throw new Error(`Seedance result fetch failed (${rr.status})`);
    const out = await rr.json();
    const video = out.video || {};

    return {
      status: 'completed',
      videoUrl: video.url,
      durationMs: undefined,          // fal 응답에 길이가 없다 — 필요하면 ffprobe로 실측
      metadata: { requestId: providerJobId, seed: out.seed, fileSize: video.file_size },
    };
  },
};

module.exports = seedanceProvider;
module.exports.MODELS = MODELS;
