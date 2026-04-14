const { buildImagePrompts, buildSinglePrompt } = require('./imagePrompt.builder');
const { validatePromptSafety } = require('./image.validator');
const imageAssetRepo = require('./imageAsset.repository');
const jobRepo = require('./generationJob.repository');
const characterRepo = require('../characters/character.repository');

// ─── Provider Registry ───

const replicateProvider = require('./providers/replicate.provider');
const falProvider = require('./providers/fal.provider');
const nanoBananaProvider = require('./providers/nanoBanana.provider');

const providers = {
  replicate: replicateProvider,
  fal: falProvider,
  'nano-banana': nanoBananaProvider,
};

function getProvider(name) {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown image provider: ${name}`);
  return provider;
}

// ─── 재시도 유틸 ───

const MAX_RETRIES = 2;

async function withRetry(fn, retries = MAX_RETRIES) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = 2000 * (attempt + 1);
        console.warn(`[ImageGen] Retry ${attempt + 1}/${retries} after ${delay}ms:`, err.message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ─── 대표 이미지 선택 ───

/**
 * 후보 이미지 중 대표(master) 이미지를 선택한다.
 *
 * 선택 기준 (우선순위):
 *  1. scene_2 (studio headshot) 가 있으면 우선 — 프로필 대표로 적합
 *  2. 해상도 충족 (width >= 요청 width)
 *  3. 가장 먼저 생성된 이미지 (안정적 결과일 가능성)
 *
 * @param {object[]} candidates - image_assets rows
 * @param {{ preferredVariation?: string }} [opts]
 * @returns {object|null} 선택된 이미지 row
 */
function selectMasterImage(candidates, opts = {}) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const preferred = opts.preferredVariation || 'scene_2'; // studio headshot

  // 1순위: preferred variation
  const preferredCandidate = candidates.find((c) => c.variation_label === preferred);
  if (preferredCandidate) return preferredCandidate;

  // 2순위: 첫 번째 성공 이미지
  return candidates[0];
}

// ─── 메인 서비스 ───

/**
 * 캐릭터 프로필을 기반으로 후보 이미지들을 생성한다.
 *
 * @param {string} characterId
 * @param {{
 *   provider?: string;
 *   count?: number;
 *   width?: number;
 *   height?: number;
 *   customScenes?: Array<{scene: string; pose: string}>;
 * }} opts
 * @returns {Promise<{ job: object; candidates: object[]; master: object|null }>}
 */
async function generateForCharacter(characterId, opts = {}) {
  const {
    provider: providerName = 'replicate',
    count = 4,
    width = 1080,
    height = 1350,
    customScenes,
  } = opts;

  // 1) 캐릭터 조회
  const character = await characterRepo.findById(characterId);
  if (!character) {
    throw Object.assign(new Error(`Character ${characterId} not found`), { statusCode: 404 });
  }

  const persona = character.persona;
  const provider = getProvider(providerName);

  // 2) Job 생성
  const job = await jobRepo.insert({
    characterId,
    provider: providerName,
    candidateCount: count,
  });

  try {
    // 3) 프롬프트 생성
    const promptSpecs = buildImagePrompts(persona, { count, customScenes });

    // 4) 프롬프트 안전성 검증
    for (const spec of promptSpecs) {
      const safety = validatePromptSafety(spec.prompt);
      if (!safety.safe) {
        throw Object.assign(
          new Error(`Unsafe prompt detected: ${safety.violations.join('; ')}`),
          { statusCode: 422 }
        );
      }
    }

    // 5) Reference image 확인 (캐릭터에 대표 이미지가 있으면 사용)
    const referenceImagePath = character.reference_image_url || null;

    // 6) Provider 호출 (개별 재시도 포함)
    const results = await Promise.allSettled(
      promptSpecs.map((spec) =>
        withRetry(() =>
          provider.generate({
            prompt: spec.prompt,
            negativePrompt: spec.negativePrompt,
            width,
            height,
            referenceImagePath,
          })
        ).then((result) => ({ spec, result }))
      )
    );

    // 6) 성공한 결과를 DB에 저장
    const candidates = [];

    for (const entry of results) {
      if (entry.status === 'rejected') {
        console.error('[ImageGen] Candidate generation failed:', entry.reason?.message);
        continue;
      }

      const { spec, result } = entry.value;

      const asset = await imageAssetRepo.insert({
        characterId,
        jobId: job.id,
        prompt: spec.prompt,
        negativePrompt: spec.negativePrompt,
        provider: providerName,
        providerJobId: result.providerJobId,
        imageUrl: result.url,
        width,
        height,
        seed: result.seed,
        variationLabel: spec.variationLabel,
        metadata: result.metadata,
      });

      candidates.push(asset);
    }

    if (candidates.length === 0) {
      await jobRepo.updateStatus(job.id, {
        status: 'failed',
        error: 'All candidate generations failed',
      });
      throw Object.assign(
        new Error('All image generation attempts failed'),
        { statusCode: 502 }
      );
    }

    // 7) 대표 이미지 선택
    const master = selectMasterImage(candidates);
    if (master) {
      await imageAssetRepo.setMaster(characterId, master.id);
      master.status = 'master';
    }

    // 8) Job 완료 처리
    const completedJob = await jobRepo.updateStatus(job.id, {
      status: 'completed',
      masterImageId: master?.id,
    });

    return {
      job: completedJob,
      candidates,
      master,
    };
  } catch (err) {
    // Job 실패 처리
    await jobRepo.updateStatus(job.id, {
      status: 'failed',
      error: err.message,
    }).catch(() => {}); // 업데이트 실패는 무시

    throw err;
  }
}

/**
 * 수동으로 대표 이미지를 변경한다.
 *
 * @param {string} characterId
 * @param {string} imageId
 */
async function setMasterImage(characterId, imageId) {
  const image = await imageAssetRepo.findById(imageId);
  if (!image || image.character_id !== characterId) {
    throw Object.assign(new Error('Image not found for this character'), { statusCode: 404 });
  }
  await imageAssetRepo.setMaster(characterId, imageId);
  return imageAssetRepo.findById(imageId);
}

module.exports = { generateForCharacter, setMasterImage, selectMasterImage };
