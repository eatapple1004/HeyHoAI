const contentRepo = require('./content.repository');
const characterRepo = require('../characters/character.repository');
const imageAssetRepo = require('../images/imageAsset.repository');
const videoAssetRepo = require('../videos/videoAsset.repository');
const { generateCaption } = require('./caption.service');

/**
 * 콘텐츠를 생성한다.
 *
 * 1. 캐릭터 조회
 * 2. 미디어 에셋 존재 확인
 * 3. 캡션 생성 (수동 입력이 없으면 Claude로 자동 생성)
 * 4. DB 저장 (status: draft)
 *
 * @param {{
 *   characterId: string;
 *   mediaType: 'image' | 'video' | 'carousel';
 *   mediaAssetIds: string[];
 *   mediaContext: string;
 *   theme?: string;
 *   mood?: string;
 *   language?: string;
 *   manualCaption?: string;
 *   manualHashtags?: string[];
 * }} input
 */
async function createContent(input) {
  // 1) 캐릭터 조회
  const character = await characterRepo.findById(input.characterId);
  if (!character) {
    throw Object.assign(new Error('Character not found'), { statusCode: 404 });
  }

  // 2) 미디어 에셋 존재 확인
  await validateMediaAssets(input.mediaType, input.mediaAssetIds, input.characterId);

  // 3) 캡션 생성
  let captionData;

  if (input.manualCaption) {
    // 수동 입력
    captionData = {
      caption: input.manualCaption,
      hashtags: input.manualHashtags || [],
      callToAction: '',
      altText: '',
    };
  } else {
    // Claude 자동 생성
    captionData = await generateCaption({
      persona: character.persona,
      mediaType: input.mediaType,
      mediaContext: input.mediaContext,
      theme: input.theme,
      mood: input.mood,
      language: input.language,
    });
  }

  // 4) DB 저장
  const content = await contentRepo.insert({
    characterId: input.characterId,
    mediaType: input.mediaType,
    mediaAssetIds: input.mediaAssetIds,
    caption: captionData.caption,
    hashtags: captionData.hashtags,
    callToAction: captionData.callToAction,
    altText: captionData.altText,
    mediaContext: input.mediaContext,
  });

  return content;
}

/**
 * 콘텐츠 캡션/해시태그를 수정한다 (draft 또는 approved 상태에서만).
 */
async function updateContent(contentId, fields) {
  const content = await contentRepo.findById(contentId);
  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404 });
  }
  if (!['draft', 'approved'].includes(content.status)) {
    throw Object.assign(
      new Error(`Cannot edit content in "${content.status}" status`),
      { statusCode: 400 }
    );
  }

  return contentRepo.update(contentId, fields);
}

/**
 * 콘텐츠 캡션을 재생성한다.
 */
async function regenerateCaption(contentId) {
  const content = await contentRepo.findById(contentId);
  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404 });
  }
  if (!['draft', 'approved'].includes(content.status)) {
    throw Object.assign(
      new Error(`Cannot regenerate caption in "${content.status}" status`),
      { statusCode: 400 }
    );
  }

  const character = await characterRepo.findById(content.character_id);

  const captionData = await generateCaption({
    persona: character.persona,
    mediaType: content.media_type,
    mediaContext: content.media_context,
  });

  return contentRepo.update(contentId, {
    caption: captionData.caption,
    hashtags: captionData.hashtags,
    call_to_action: captionData.callToAction,
    alt_text: captionData.altText,
    status: 'draft', // 재생성하면 draft로 되돌림
  });
}

/**
 * 콘텐츠를 승인한다 (draft → approved).
 */
async function approveContent(contentId) {
  const content = await contentRepo.findById(contentId);
  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404 });
  }
  if (content.status !== 'draft') {
    throw Object.assign(
      new Error(`Cannot approve content in "${content.status}" status`),
      { statusCode: 400 }
    );
  }

  return contentRepo.updateStatus(contentId, 'approved');
}

/**
 * 콘텐츠를 거부한다 (draft → rejected).
 */
async function rejectContent(contentId) {
  const content = await contentRepo.findById(contentId);
  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404 });
  }
  if (!['draft', 'approved'].includes(content.status)) {
    throw Object.assign(
      new Error(`Cannot reject content in "${content.status}" status`),
      { statusCode: 400 }
    );
  }

  return contentRepo.updateStatus(contentId, 'rejected');
}

/**
 * 캐릭터의 콘텐츠 목록 조회
 */
async function listContents(characterId, opts) {
  return contentRepo.findByCharacterId(characterId, opts);
}

/**
 * 콘텐츠 단건 조회
 */
async function getContent(contentId) {
  const content = await contentRepo.findById(contentId);
  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404 });
  }
  return content;
}

// ─── 내부 헬퍼 ───

async function validateMediaAssets(mediaType, assetIds, characterId) {
  for (const assetId of assetIds) {
    let asset;

    if (mediaType === 'video') {
      asset = await videoAssetRepo.findById(assetId);
    } else {
      asset = await imageAssetRepo.findById(assetId);
    }

    if (!asset) {
      throw Object.assign(new Error(`Media asset ${assetId} not found`), { statusCode: 404 });
    }
    if (asset.character_id !== characterId) {
      throw Object.assign(
        new Error(`Media asset ${assetId} does not belong to character ${characterId}`),
        { statusCode: 400 }
      );
    }
  }
}

module.exports = {
  createContent,
  updateContent,
  regenerateCaption,
  approveContent,
  rejectContent,
  listContents,
  getContent,
};
