const { buildVideoPrompt } = require('./videoPrompt.builder');
const videoAssetRepo = require('./videoAsset.repository');
const videoJobRepo = require('./videoGenerationJob.repository');
const imageAssetRepo = require('../images/imageAsset.repository');
const characterRepo = require('../characters/character.repository');

// ─── Provider Registry ───

const runwayProvider = require('./providers/runway.provider');
const klingProvider = require('./providers/kling.provider');
const minimaxProvider = require('./providers/minimax.provider');

const providers = {
  runway: runwayProvider,
  kling: klingProvider,
  minimax: minimaxProvider,
};

function getProvider(name) {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown video provider: ${name}`);
  return provider;
}

// ─── Polling 유틸 ───

/**
 * provider의 비동기 job을 완료될 때까지 폴링한다.
 *
 * @param {import('./providers/types').VideoProvider} provider
 * @param {string} providerJobId
 * @param {{ maxWaitMs?: number; intervalMs?: number }} [opts]
 * @returns {Promise<import('./providers/types').VideoPollResult>}
 */
async function pollUntilDone(provider, providerJobId, opts = {}) {
  const { maxWaitMs = 600_000, intervalMs = 5_000 } = opts; // 기본 10분, 5초 간격
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const result = await provider.poll(providerJobId);

    if (result.status === 'completed') return result;
    if (result.status === 'failed') {
      throw new Error(`Video generation failed: ${result.error || 'unknown'}`);
    }

    // queued / processing → 대기
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxWaitMs}ms`);
}

// ─── 재시도 유틸 ───

const MAX_RETRIES = 2;

async function withRetry(fn, retries = MAX_RETRIES) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = 5000 * (attempt + 1);
        console.warn(`[VideoGen] Retry ${attempt + 1}/${retries} after ${delay}ms:`, err.message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ─── 메인 서비스 ───

/**
 * 캐릭터의 master image를 기반으로 Reels 영상을 생성한다.
 *
 * @param {string} characterId
 * @param {{
 *   provider?: string;
 *   videoStyle?: string;
 *   prompt?: string;
 *   durationSec?: number;
 *   sourceImageId?: string;
 * }} opts
 * @returns {Promise<{ job: object; video: object }>}
 */
async function generateForCharacter(characterId, opts = {}) {
  let {
    provider: providerName = 'runway',
    videoStyle = 'natural',
    prompt: userPrompt,
    durationSec: userDuration,
    sourceImageId,
  } = opts;

  // 1) 캐릭터 조회
  const character = await characterRepo.findById(characterId);
  if (!character) {
    throw Object.assign(new Error(`Character ${characterId} not found`), { statusCode: 404 });
  }

  // 2) 소스 이미지 확인
  //    우선순위: sourceImageId → sourceImageUrl(임의 URL) → image_assets master → character.reference_image_url
  let sourceImage;
  const { sourceImageUrl } = opts;
  if (sourceImageId) {
    sourceImage = await imageAssetRepo.findById(sourceImageId);
    if (!sourceImage || sourceImage.character_id !== characterId) {
      throw Object.assign(new Error('Source image not found for this character'), { statusCode: 404 });
    }
  } else if (sourceImageUrl) {
    sourceImage = { id: null, character_id: characterId, image_url: sourceImageUrl };
  } else {
    const images = await imageAssetRepo.findByCharacterId(characterId, { status: 'master' });
    sourceImage = images[0];
    if (!sourceImage && character.reference_image_url) {
      // image_assets에 등록된 master는 없지만 캐릭터 생성 시 등록된 reference 이미지가 있다면 그걸로 진행
      sourceImage = { id: null, character_id: characterId, image_url: character.reference_image_url };
    }
    if (!sourceImage) {
      throw Object.assign(
        new Error('No source image available. Set a reference image for this character or generate one first.'),
        { statusCode: 400 }
      );
    }
  }

  // 요청된 provider에 키가 없으면 키 있는 다른 provider로 폴백
  let provider = getProvider(providerName);
  if (typeof provider.isConfigured === 'function' && !provider.isConfigured()) {
    const fallback = ['kling', 'minimax', 'runway']
      .map((n) => providers[n])
      .find((p) => p && (typeof p.isConfigured !== 'function' || p.isConfigured()) && p.name !== providerName);
    if (!fallback) {
      throw Object.assign(
        new Error(`No video provider is configured. Set RUNWAY_API_KEY or KLING_ACCESS_KEY/KLING_SECRET_KEY or MINIMAX_API_KEY in the server .env`),
        { statusCode: 503 }
      );
    }
    provider = fallback;
    providerName = fallback.name;
  }

  // 3) Motion prompt 조립
  const promptResult = buildVideoPrompt({
    persona: character.persona,
    videoStyle,
    userPrompt,
  });

  // duration: 사용자 지정 > style 기본값, provider 최대치 이하로 클램핑
  const durationSec = Math.min(
    userDuration || promptResult.durationSec,
    provider.maxDurationSec
  );

  // Reels 규격: 9:16 (1080x1920)
  const width = 1080;
  const height = 1920;

  // 5) Job 생성
  //    source_image_id NOT NULL DB 제약을 아직 안 푼 환경에서도 동작하도록,
  //    sourceImage.id가 없으면 DB 잡/에셋 트래킹을 건너뛰고 provider만 호출한다.
  const trackInDb = !!sourceImage.id;
  let job = null;

  if (trackInDb) {
    job = await videoJobRepo.insert({
      characterId,
      sourceImageId: sourceImage.id,
      provider: providerName,
      videoStyle,
      motionPrompt: promptResult.motionPrompt,
    });
  }

  try {
    const video = await withRetry(async (attempt) => {
      if (trackInDb) {
        await videoJobRepo.updateStatus(job.id, {
          status: 'submitting',
          attempt: attempt + 1,
        });
      }

      // 6) Provider에 제출
      const submitResult = await provider.submit({
        sourceImageUrl: sourceImage.image_url,
        motionPrompt: promptResult.motionPrompt,
        negativePrompt: promptResult.negativePrompt,
        durationSec,
        width,
        height,
        style: videoStyle,
      });

      if (trackInDb) {
        await videoJobRepo.updateStatus(job.id, {
          status: 'generating',
          providerJobId: submitResult.providerJobId,
        });
      }

      // 7) 완료까지 폴링
      const pollResult = await pollUntilDone(provider, submitResult.providerJobId);

      // 8) 결과 저장 (DB tracking이 켜진 경우만)
      if (trackInDb) {
        return await videoAssetRepo.insert({
          characterId,
          jobId: job.id,
          sourceImageId: sourceImage.id,
          motionPrompt: promptResult.motionPrompt,
          negativePrompt: promptResult.negativePrompt,
          provider: providerName,
          providerJobId: submitResult.providerJobId,
          videoUrl: pollResult.videoUrl,
          width,
          height,
          durationMs: pollResult.durationMs || durationSec * 1000,
          videoStyle,
          metadata: pollResult.metadata,
        });
      }
      // DB tracking 없으면 응답에 필요한 최소 필드만 합성해서 반환
      return {
        id: null,
        character_id: characterId,
        source_image_id: null,
        video_url: pollResult.videoUrl,
        duration_ms: pollResult.durationMs || durationSec * 1000,
        video_style: videoStyle,
        status: 'ready',
      };
    });

    // 9) Job 완료
    let completedJob = null;
    if (trackInDb) {
      completedJob = await videoJobRepo.updateStatus(job.id, {
        status: 'completed',
        videoAssetId: video.id,
      });
    } else {
      completedJob = {
        id: null,
        status: 'completed',
        provider: providerName,
        attempt: 1,
      };
    }

    return { job: completedJob, video };
  } catch (err) {
    if (trackInDb) {
      await videoJobRepo.updateStatus(job.id, {
        status: 'failed',
        error: err.message,
      }).catch(() => {});
    }

    throw err;
  }
}

/**
 * 캐릭터의 영상 목록 조회
 */
async function listVideos(characterId, opts) {
  return videoAssetRepo.findByCharacterId(characterId, opts);
}

/**
 * 영상 단건 조회
 */
async function getVideo(id) {
  const video = await videoAssetRepo.findById(id);
  if (!video) {
    throw Object.assign(new Error('Video not found'), { statusCode: 404 });
  }
  return video;
}

module.exports = { generateForCharacter, listVideos, getVideo };
