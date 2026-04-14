const { buildVideoPrompt } = require('./videoPrompt.builder');
const { validateMotionPromptSafety } = require('./video.validator');
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
  const {
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

  // 2) 소스 이미지 확인 (지정이 없으면 master image 사용)
  let sourceImage;
  if (sourceImageId) {
    sourceImage = await imageAssetRepo.findById(sourceImageId);
    if (!sourceImage || sourceImage.character_id !== characterId) {
      throw Object.assign(new Error('Source image not found for this character'), { statusCode: 404 });
    }
  } else {
    const images = await imageAssetRepo.findByCharacterId(characterId, { status: 'master' });
    sourceImage = images[0];
    if (!sourceImage) {
      throw Object.assign(
        new Error('No master image found. Generate images first.'),
        { statusCode: 400 }
      );
    }
  }

  const provider = getProvider(providerName);

  // 3) Motion prompt 조립
  const promptResult = buildVideoPrompt({
    persona: character.persona,
    videoStyle,
    userPrompt,
  });

  // 4) prompt 안전성 검증
  const safety = validateMotionPromptSafety(promptResult.motionPrompt);
  if (!safety.safe) {
    throw Object.assign(
      new Error(`Unsafe motion prompt: ${safety.violations.join('; ')}`),
      { statusCode: 422 }
    );
  }

  // duration: 사용자 지정 > style 기본값, provider 최대치 이하로 클램핑
  const durationSec = Math.min(
    userDuration || promptResult.durationSec,
    provider.maxDurationSec
  );

  // Reels 규격: 9:16 (1080x1920)
  const width = 1080;
  const height = 1920;

  // 5) Job 생성
  const job = await videoJobRepo.insert({
    characterId,
    sourceImageId: sourceImage.id,
    provider: providerName,
    videoStyle,
    motionPrompt: promptResult.motionPrompt,
  });

  try {
    const video = await withRetry(async (attempt) => {
      // Job 상태 업데이트
      await videoJobRepo.updateStatus(job.id, {
        status: 'submitting',
        attempt: attempt + 1,
      });

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

      await videoJobRepo.updateStatus(job.id, {
        status: 'generating',
        providerJobId: submitResult.providerJobId,
      });

      // 7) 완료까지 폴링
      const pollResult = await pollUntilDone(provider, submitResult.providerJobId);

      // 8) 결과 저장
      const asset = await videoAssetRepo.insert({
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

      return asset;
    });

    // 9) Job 완료
    const completedJob = await videoJobRepo.updateStatus(job.id, {
      status: 'completed',
      videoAssetId: video.id,
    });

    return { job: completedJob, video };
  } catch (err) {
    await videoJobRepo.updateStatus(job.id, {
      status: 'failed',
      error: err.message,
    }).catch(() => {});

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
