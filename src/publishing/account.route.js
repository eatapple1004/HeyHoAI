const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const accountRepo = require('./account.repository');
const mediaRepo = require('./accountMedia.repository');
const zernio = require('./zernio.client');
const logger = require('../lib/logger');
const { assertAccountOwned, assertAccountResourceOwned } = require('../middleware/ownership');
const mediaStore = require('../storage/mediaStore');
const log = logger('Account');

const router = Router();

// 모든 /:id/... 라우트에서 계정 소유권 자동 검증
router.param('id', async (req, _res, next, id) => {
  try {
    await assertAccountOwned(id, req.user.id);
    next();
  } catch (err) {
    next(err);
  }
});

const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

/**
 * GET /api/accounts/sync
 * Zernio에서 연결된 계정 목록을 가져와 DB에 동기화
 */
const syncHandler = async (req, res, next) => {
  try {
    const accounts = await zernio.listAccounts();
    const synced = [];

    for (const acc of accounts) {
      const saved = await accountRepo.insert({
        userId: req.user.id,
        platform: acc.platform,
        accountId: acc._id,
        username: acc.username,
        displayName: acc.displayName || acc.username,
        profileImage: acc.profileImage || null,
        followers: acc.followers || 0,
        metadata: acc,
      });
      synced.push(saved);
    }

    log.info(`Synced ${synced.length} accounts from Zernio`);
    res.json({ success: true, data: synced, synced: synced.length });
  } catch (err) {
    log.error('Sync failed:', err.message);
    next(err);
  }
};

/**
 * GET /api/accounts
 * 저장된 계정 목록 조회
 */
const listHandler = (req, res, next) => sendRead(res, next, () => reads.list(req.user.id, req.query));

/**
 * GET /api/accounts/:id
 */
const getAccountHandler = (req, res, next) => sendRead(res, next, () => reads.account(req.params.id));

/**
 * PATCH /api/accounts/:id/status
 */
const patchStatusHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const account = await accountRepo.updateStatus(req.params.id, status);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/accounts/:id/default-captions
 */
const patchDefaultCaptionsHandler = async (req, res, next) => {
  try {
    const { defaultImageCaption, defaultReelCaption } = req.body;
    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const metadata = account.metadata || {};
    if (defaultImageCaption !== undefined) metadata.defaultImageCaption = defaultImageCaption;
    if (defaultReelCaption !== undefined) metadata.defaultReelCaption = defaultReelCaption;

    const { query: dbQuery } = require('../db/client');
    await dbQuery('UPDATE social_accounts SET metadata = $1, updated_at = now() WHERE id = $2', [JSON.stringify(metadata), req.params.id]);

    log.info(`Default captions saved for account ${req.params.id}`);
    res.json({ success: true, data: metadata });
  } catch (err) { next(err); }
};

// ── Analytics ──

const getAnalyticsDetailHandler = (req, res, next) => sendRead(res, next, () => reads.analyticsDetail(req.params.id));

const getAnalyticsPostsHandler = (req, res, next) => sendRead(res, next, () => reads.analyticsPosts(req.params.id));

/**
 * DELETE /api/accounts/:id
 */
const deleteAccountHandler = async (req, res, next) => {
  try {
    const account = await accountRepo.remove(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════
// Workflow: Base Photo, Outfits, Reels
// ══════════════════════════════════════
const reelTemplateRepo = require('./reelTemplate.repository');
const outfitPromptRepo = require('./outfitPrompt.repository');

/**
 * POST /api/accounts/:id/base-photo
 * 기본 사진 설정
 */
const postBasePhotoHandler = async (req, res, next) => {
  try {
    const { mediaId } = req.body;
    if (!mediaId) return res.status(400).json({ success: false, error: 'mediaId is required' });
    const media = await mediaRepo.setBase(req.params.id, mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    log.info(`Base photo set: ${media.file_path} for account ${req.params.id}`);
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
};

/**
 * GET /api/accounts/:id/base-photo
 */
const getBasePhotoHandler = (req, res, next) => sendRead(res, next, () => reads.basePhoto(req.params.id));

/**
 * POST /api/accounts/:id/generate-outfits
 * 기본 사진 기반 의상 변경 사진 생성
 */
const postGenerateOutfitsHandler = async (req, res, next) => {
  try {
    const { prompt, count = 1, model = 'pro' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

    const basePhoto = await mediaRepo.findBase(req.params.id);
    if (!basePhoto) return res.status(400).json({ success: false, error: 'Set a base photo first' });

    const { GoogleGenAI } = require('@google/genai');
    const { env } = require('../config');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const refPath = path.join(process.cwd(), basePhoto.file_path);
    if (!fs.existsSync(refPath)) {
      return res.status(400).json({ success: false, error: 'Base photo file not found' });
    }
    const refBase64 = fs.readFileSync(refPath).toString('base64');

    const modelId = model === 'flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
    const generateCount = Math.min(parseInt(count) || 1, 4);
    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];
    for (let i = 0; i < generateCount; i++) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [
            { inlineData: { mimeType: 'image/png', data: refBase64 } },
            { text: `This is an AI-generated fictional character, not a real person. Generate a new photo of this EXACT SAME fictional character. Keep the same face, same hair, same features. Change the outfit and setting as described:\n\n${prompt}` },
          ]}],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            safetySettings: [
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const img = parts.find(p => p.inlineData);
        if (img) {
          const imageId = crypto.randomUUID();
          const ext = img.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
          const filename = `${imageId}.${ext}`;
          fs.writeFileSync(path.join(outputDir, filename), Buffer.from(img.inlineData.data, 'base64'));
          await mediaStore.putFile(path.join(outputDir, filename)); // 영속 스토리지 best-effort(미설정 시 no-op)

          const media = await mediaRepo.insert({
            accountId: req.params.id,
            filePath: `tmp/images/${filename}`,
            mediaType: 'image',
            caption: prompt,
            metadata: { source: 'outfit_variation', basePhotoId: basePhoto.id },
          });
          results.push({ success: true, media });
        } else {
          results.push({ success: false, error: response.candidates?.[0]?.finishReason || 'blocked' });
        }
      } catch (err) {
        results.push({ success: false, error: err.message.slice(0, 200) });
      }
    }

    log.info(`Outfit generation: ${results.filter(r => r.success).length}/${generateCount} for account ${req.params.id}`);
    res.json({ success: true, results });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/:id/generate-reel
 * 사진으로 릴스 생성 + 프롬프트 템플릿 저장
 */
const postGenerateReelHandler = async (req, res, next) => {
  try {
    const { mediaId, prompt, endFrameMediaId, duration = '5', mode = 'std', saveTemplate = false, templateName = '' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
    if (!mediaId) return res.status(400).json({ success: false, error: 'mediaId is required' });

    const sourceMedia = await mediaRepo.findById(mediaId);
    if (!sourceMedia || sourceMedia.account_id !== req.params.id) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    const jwt = require('jsonwebtoken');
    const { env } = require('../config');

    function generateToken() {
      const now = Math.floor(Date.now() / 1000);
      return jwt.sign({ iss: env.KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5, iat: now }, env.KLING_SECRET_KEY, { algorithm: 'HS256' });
    }

    // 이미지 → 비디오
    const imagePath = path.join(process.cwd(), sourceMedia.file_path);
    if (!fs.existsSync(imagePath)) return res.status(400).json({ success: false, error: 'Source image file not found' });

    const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const token = generateToken();

    // End Frame
    const klingBody = {
      model_name: 'kling-v3', image: imageBase64, prompt,
      negative_prompt: 'ugly, deformed, blurry, static',
      duration, mode, aspect_ratio: '9:16',
    };
    if (endFrameMediaId) {
      const endMedia = await mediaRepo.findById(endFrameMediaId);
      if (endMedia && endMedia.account_id === req.params.id) {
        const endPath = path.join(process.cwd(), endMedia.file_path);
        if (fs.existsSync(endPath)) {
          klingBody.image_tail = fs.readFileSync(endPath).toString('base64');
          log.info(`End frame attached: ${endFrameMediaId}`);
        }
      }
    }

    log.info(`Reel generation started for media ${mediaId}`);
    const submitRes = await fetch('https://api.klingai.com/v1/videos/image2video', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(klingBody),
    });
    const submitData = await submitRes.json();
    if (!submitData.data?.task_id) {
      return res.status(400).json({ success: false, error: `Kling failed: ${submitData.message || 'Unknown'}` });
    }

    const taskId = submitData.data.task_id;
    log.info(`Reel task: ${taskId}`);

    // 폴링
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 10000));
      const pollToken = generateToken();
      const pollRes = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
        headers: { 'Authorization': 'Bearer ' + pollToken },
      });
      const pollData = await pollRes.json();
      const status = pollData.data?.task_status;

      if (status === 'succeed') {
        const videoUrl = pollData.data.task_result?.videos?.[0]?.url;
        const videoResFetch = await fetch(videoUrl);
        const videoBuf = Buffer.from(await videoResFetch.arrayBuffer());
        const videoId = crypto.randomUUID();
        const outputDir = path.join(process.cwd(), 'tmp', 'images');
        const filename = `${videoId}.mp4`;
        fs.writeFileSync(path.join(outputDir, filename), videoBuf);
        await mediaStore.putFile(path.join(outputDir, filename)); // 영속 스토리지 best-effort(미설정 시 no-op)

        const media = await mediaRepo.insert({
          accountId: req.params.id,
          filePath: `tmp/images/${filename}`,
          mediaType: 'video',
          caption: prompt,
          metadata: { source: 'reel', sourceMediaId: mediaId, taskId },
        });

        // 템플릿 저장
        let template = null;
        if (saveTemplate) {
          template = await reelTemplateRepo.insert({
            accountId: req.params.id,
            name: templateName || `Reel ${new Date().toLocaleDateString('ko-KR')}`,
            prompt, duration, mode,
            sourceMediaId: mediaId,
          });
          log.info(`Reel template saved: ${template.name}`);
        }

        // 자동 Post Queue 등록 (image + reel 묶음, 기본 캡션 적용)
        const accForCaption = await accountRepo.findById(req.params.id);
        const accMeta = accForCaption?.metadata || {};
        const queueItem = await postQueueRepo.insert({
          accountId: req.params.id,
          imageMediaId: mediaId,
          reelMediaId: media.id,
          imageCaption: accMeta.defaultImageCaption || null,
          reelCaption: accMeta.defaultReelCaption || null,
        });
        log.info(`Auto-queued: image=${mediaId} + reel=${media.id}`);

        log.info(`Reel complete: ${filename}`);
        return res.json({ success: true, media, template, queueItem });
      }

      if (status === 'failed') {
        return res.json({ success: false, error: pollData.data?.task_status_msg || 'Failed' });
      }
    }

    res.json({ success: false, error: 'Timeout after 10min' });
  } catch (err) { next(err); }
};

/**
 * GET /api/accounts/:id/reel-templates
 */
const getReelTemplatesHandler = (req, res, next) => sendRead(res, next, () => reads.reelTemplates(req.params.id));

/**
 * DELETE /api/accounts/reel-templates/:templateId
 */
const deleteReelTemplatesHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('reel_templates', req.params.templateId, req.user.id);
    const t = await reelTemplateRepo.remove(req.params.templateId);
    if (!t) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: t });
  } catch (err) { next(err); }
};

// ── Outfit Prompts ──

const getOutfitPromptsHandler = (req, res, next) => sendRead(res, next, () => reads.outfitPrompts(req.params.id));

const postOutfitPromptsHandler = async (req, res, next) => {
  try {
    const { name, prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
    const saved = await outfitPromptRepo.insert({
      accountId: req.params.id,
      name: name || prompt.slice(0, 60),
      prompt,
    });
    res.status(201).json({ success: true, data: saved });
  } catch (err) { next(err); }
};

const patchOutfitPromptsHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('outfit_prompts', req.params.promptId, req.user.id);
    const { name, prompt } = req.body;
    const updated = await outfitPromptRepo.update(req.params.promptId, { name, prompt });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

const deleteOutfitPromptsHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('outfit_prompts', req.params.promptId, req.user.id);
    const deleted = await outfitPromptRepo.remove(req.params.promptId);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: deleted });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/:id/batch-reels
 * 저장된 템플릿으로 여러 사진에 릴스 배치 생성
 */
const postBatchReelsHandler = async (req, res, next) => {
  try {
    const { templateId, mediaIds } = req.body;
    if (!templateId || !mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({ success: false, error: 'templateId and mediaIds[] are required' });
    }

    await assertAccountResourceOwned('reel_templates', templateId, req.user.id);
    const template = await reelTemplateRepo.findById(templateId);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    const jwt = require('jsonwebtoken');
    const { env } = require('../config');

    function generateToken() {
      const now = Math.floor(Date.now() / 1000);
      return jwt.sign({ iss: env.KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5, iat: now }, env.KLING_SECRET_KEY, { algorithm: 'HS256' });
    }

    const results = [];
    for (const mId of mediaIds) {
      try {
        const sourceMedia = await mediaRepo.findById(mId);
        if (!sourceMedia || sourceMedia.account_id !== req.params.id) {
          results.push({ mediaId: mId, success: false, error: 'Not found' });
          continue;
        }

        const imagePath = path.join(process.cwd(), sourceMedia.file_path);
        if (!fs.existsSync(imagePath)) { results.push({ mediaId: mId, success: false, error: 'File not found' }); continue; }

        const imageBase64 = fs.readFileSync(imagePath).toString('base64');
        const token = generateToken();

        const submitRes = await fetch('https://api.klingai.com/v1/videos/image2video', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_name: 'kling-v3', image: imageBase64, prompt: template.prompt,
            negative_prompt: 'ugly, deformed, blurry, static',
            duration: template.duration, mode: template.mode, aspect_ratio: '9:16',
          }),
        });
        const submitData = await submitRes.json();
        if (!submitData.data?.task_id) {
          results.push({ mediaId: mId, success: false, error: submitData.message || 'Submit failed' });
          continue;
        }

        const taskId = submitData.data.task_id;
        log.info(`Batch reel submitted: ${taskId} for media ${mId}`);

        // 폴링
        let done = false;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 10000));
          const pollToken = generateToken();
          const pollRes = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
            headers: { 'Authorization': 'Bearer ' + pollToken },
          });
          const pollData = await pollRes.json();
          const status = pollData.data?.task_status;

          if (status === 'succeed') {
            const videoUrl = pollData.data.task_result?.videos?.[0]?.url;
            const videoResFetch = await fetch(videoUrl);
            const videoBuf = Buffer.from(await videoResFetch.arrayBuffer());
            const videoId = crypto.randomUUID();
            const filename = `${videoId}.mp4`;
            fs.writeFileSync(path.join(process.cwd(), 'tmp', 'images', filename), videoBuf);
            await mediaStore.putFile(path.join(process.cwd(), 'tmp', 'images', filename)); // 영속 스토리지 best-effort(미설정 시 no-op)

            const media = await mediaRepo.insert({
              accountId: req.params.id,
              filePath: `tmp/images/${filename}`,
              mediaType: 'video',
              caption: template.prompt,
              metadata: { source: 'batch_reel', templateId, sourceMediaId: mId, taskId },
            });

            // 자동 Post Queue 등록 (기본 캡션 적용)
            const batchAcc = await accountRepo.findById(req.params.id);
            const batchMeta = batchAcc?.metadata || {};
            await postQueueRepo.insert({
              accountId: req.params.id,
              imageMediaId: mId,
              reelMediaId: media.id,
              imageCaption: batchMeta.defaultImageCaption || null,
              reelCaption: batchMeta.defaultReelCaption || null,
            });

            results.push({ mediaId: mId, success: true, media });
            done = true;
            break;
          }
          if (status === 'failed') {
            results.push({ mediaId: mId, success: false, error: pollData.data?.task_status_msg || 'Failed' });
            done = true;
            break;
          }
        }
        if (!done) results.push({ mediaId: mId, success: false, error: 'Timeout' });
      } catch (err) {
        results.push({ mediaId: mId, success: false, error: err.message.slice(0, 200) });
      }
    }

    log.info(`Batch reels: ${results.filter(r => r.success).length}/${mediaIds.length}`);
    res.json({ success: true, results });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════
// Post Queue
// ══════════════════════════════════════
const postQueueRepo = require('./postQueue.repository');

const getPostQueueHandler = (req, res, next) => sendRead(res, next, () => reads.postQueue(req.params.id, req.query));

const postPostQueueHandler = async (req, res, next) => {
  try {
    const { imageMediaId, reelMediaId, imageCaption, reelCaption, hashtags, bgmMediaId } = req.body;
    if (!imageMediaId && !reelMediaId) {
      return res.status(400).json({ success: false, error: 'At least imageMediaId or reelMediaId is required' });
    }
    const item = await postQueueRepo.insert({
      accountId: req.params.id, imageMediaId, reelMediaId, imageCaption, reelCaption, hashtags, bgmMediaId,
    });
    log.info(`Post queue added: image=${imageMediaId}, reel=${reelMediaId}`);
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const patchPostQueueHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
    const { imageCaption, reelCaption, hashtags, status, bgmMediaId } = req.body;
    const item = await postQueueRepo.update(req.params.queueId, { imageCaption, reelCaption, hashtags, status, bgmMediaId });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/:id/publish-now
 * 수동으로 즉시 업로드 트리거
 */
const postPublishNowHandler = async (req, res, next) => {
  try {
    const { publishConfirmedItems } = require('./scheduler');
    await publishConfirmedItems();
    res.json({ success: true, message: 'Publish triggered' });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/post-queue/:queueId/publish
 * 개별 Queue 아이템 즉시 업로드
 */
const postPostQueuePublishHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
    const { publishSingleItem } = require('./scheduler');
    const result = await publishSingleItem(req.params.queueId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/post-queue/:queueId/duplicate
 * Queue 아이템 복제 (pending 상태로)
 */
const postPostQueueDuplicateHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
    const original = await postQueueRepo.findById(req.params.queueId);
    if (!original) return res.status(404).json({ success: false, error: 'Not found' });

    const copy = await postQueueRepo.insert({
      accountId: original.account_id,
      imageMediaId: original.image_media_id,
      reelMediaId: original.reel_media_id,
      imageCaption: original.image_caption,
      reelCaption: original.reel_caption,
      hashtags: original.hashtags,
      bgmMediaId: original.bgm_media_id,
    });
    log.info(`Queue duplicated: ${req.params.queueId} → ${copy.id}`);
    res.status(201).json({ success: true, data: copy });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/post-queue/:queueId/reupload
 * posted 상태를 리셋하고 다시 업로드
 */
const postPostQueueReuploadHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
    // 상태 리셋
    await postQueueRepo.update(req.params.queueId, {
      status: 'confirmed',
      postedAt: null,
      imagePostUrl: null,
      reelPostUrl: null,
    });
    // 즉시 업로드
    const { publishSingleItem } = require('./scheduler');
    const result = await publishSingleItem(req.params.queueId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

const deletePostQueueHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('post_queue', req.params.queueId, req.user.id);
    const item = await postQueueRepo.remove(req.params.queueId);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════
// Account Media
// ══════════════════════════════════════

/**
 * GET /api/accounts/:id/media
 */
const getMediaHandler = (req, res, next) => sendRead(res, next, () => reads.media(req.params.id, req.query), (o) => ({ success: true, data: o.data, total: o.total }));

/**
 * POST /api/accounts/:id/media/upload
 * 이미지 직접 업로드
 */
const postMediaUploadHandler = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File is required' });
    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const filename = req.file.filename;
    const mediaType = req.file.mimetype.startsWith('video') ? 'video'
      : req.file.mimetype.startsWith('audio') ? 'audio' : 'image';
    const { caption, hashtags } = req.body;

    const media = await mediaRepo.insert({
      accountId: req.params.id,
      filePath: `tmp/images/${filename}`,
      mediaType,
      caption: caption || null,
      hashtags: hashtags ? JSON.parse(hashtags) : [],
    });

    log.info(`Media uploaded: ${filename} → account ${account.username}`);
    res.status(201).json({ success: true, data: media });
  } catch (err) { next(err); }
};

/**
 * POST /api/accounts/:id/media/register
 * Generate 페이지에서 기존 이미지를 계정에 등록
 */
const postMediaRegisterHandler = async (req, res, next) => {
  try {
    const { filePath, mediaType, caption, hashtags } = req.body;
    if (!filePath) return res.status(400).json({ success: false, error: 'filePath is required' });

    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const media = await mediaRepo.insert({
      accountId: req.params.id,
      filePath,
      mediaType: mediaType || 'image',
      caption: caption || null,
      hashtags: hashtags || [],
    });

    log.info(`Media registered: ${filePath} → account ${account.username}`);
    res.status(201).json({ success: true, data: media });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/accounts/media/:mediaId
 */
const patchMediaHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('account_media', req.params.mediaId, req.user.id);
    const { caption, hashtags, status } = req.body;
    const media = await mediaRepo.update(req.params.mediaId, { caption, hashtags, status });
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/accounts/media/:mediaId
 */
const deleteMediaHandler = async (req, res, next) => {
  try {
    await assertAccountResourceOwned('account_media', req.params.mediaId, req.user.id);
    const media = await mediaRepo.remove(req.params.mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
};

// ── 조회 API (reads) — 레거시 라우트와 Nest(nest/accounts)가 함께 쓰는 단일소스 ──
//   응답 객체를 만들지 않고 **데이터만 반환**한다(= Spring @Service). 404는 statusCode 에러로 throw.
//   ⚠️ 계정 소유권 검증은 호출측(레거시 router.param / Nest 컨트롤러)이 이미 끝낸 뒤 들어온다.
function readError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

const reads = {
  /** 내 소셜 계정 목록(platform·status 필터) */
  list(userId, { platform, status } = {}) {
    return accountRepo.findAll({ userId, platform: platform || undefined, status: status || undefined });
  },

  /** 계정 단건 */
  async account(accountId) {
    const account = await accountRepo.findById(accountId);
    if (!account) throw readError(404, 'Account not found');
    return account;
  },

  /** Zernio 계정 지표 */
  async analyticsDetail(accountId) {
    const account = await this.account(accountId);
    return zernio.getAccountDetail(account.account_id);
  },

  /** Zernio 게시물 지표 */
  async analyticsPosts(accountId) {
    const account = await this.account(accountId);
    return zernio.getPosts(account.account_id);
  },

  /** 기본 사진(없으면 null) */
  basePhoto(accountId) {
    return mediaRepo.findBase(accountId);
  },

  /** 릴스 프롬프트 템플릿 */
  reelTemplates(accountId) {
    return reelTemplateRepo.findByAccountId(accountId);
  },

  /** 의상 프롬프트 */
  outfitPrompts(accountId) {
    return outfitPromptRepo.findByAccountId(accountId);
  },

  /** 발행 큐(status 필터) */
  postQueue(accountId, { status } = {}) {
    return postQueueRepo.findByAccountId(accountId, { status: status || undefined });
  },

  /** 계정 미디어 목록 + 총 개수(total은 응답 최상위 필드) */
  async media(accountId, { status, limit, offset } = {}) {
    const items = await mediaRepo.findByAccountId(accountId, {
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    const total = await mediaRepo.countByAccountId(accountId);
    return { data: items, total };
  },
};

// 조회 라우트용 얇은 어댑터 — statusCode 에러는 레거시 형식으로, 나머지는 errorHandler로.
function sendRead(res, next, run, wrap) {
  Promise.resolve()
    .then(run)
    .then((out) => res.json(wrap ? wrap(out) : { success: true, data: out }))
    .catch((err) => {
      if (err && err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
      next(err);
    });
}

// ── 라우트 등록 ── (핸들러는 위에 이름으로 분리 — Nest가 같은 핸들러를 그대로 재사용한다)
router.post('/sync', syncHandler);
router.get('/', listHandler);
router.get('/:id', getAccountHandler);
router.patch('/:id/status', patchStatusHandler);
router.patch('/:id/default-captions', patchDefaultCaptionsHandler);
router.get('/:id/analytics/detail', getAnalyticsDetailHandler);
router.get('/:id/analytics/posts', getAnalyticsPostsHandler);
router.delete('/:id', deleteAccountHandler);
router.post('/:id/base-photo', postBasePhotoHandler);
router.get('/:id/base-photo', getBasePhotoHandler);
router.post('/:id/generate-outfits', postGenerateOutfitsHandler);
router.post('/:id/generate-reel', postGenerateReelHandler);
router.get('/:id/reel-templates', getReelTemplatesHandler);
router.delete('/reel-templates/:templateId', deleteReelTemplatesHandler);
router.get('/:id/outfit-prompts', getOutfitPromptsHandler);
router.post('/:id/outfit-prompts', postOutfitPromptsHandler);
router.patch('/outfit-prompts/:promptId', patchOutfitPromptsHandler);
router.delete('/outfit-prompts/:promptId', deleteOutfitPromptsHandler);
router.post('/:id/batch-reels', postBatchReelsHandler);
router.get('/:id/post-queue', getPostQueueHandler);
router.post('/:id/post-queue', postPostQueueHandler);
router.patch('/post-queue/:queueId', patchPostQueueHandler);
router.post('/:id/publish-now', postPublishNowHandler);
router.post('/post-queue/:queueId/publish', postPostQueuePublishHandler);
router.post('/post-queue/:queueId/duplicate', postPostQueueDuplicateHandler);
router.post('/post-queue/:queueId/reupload', postPostQueueReuploadHandler);
router.delete('/post-queue/:queueId', deletePostQueueHandler);
router.get('/:id/media', getMediaHandler);
router.post('/:id/media/upload', upload.single('file'), postMediaUploadHandler);
router.post('/:id/media/register', postMediaRegisterHandler);
router.patch('/media/:mediaId', patchMediaHandler);
router.delete('/media/:mediaId', deleteMediaHandler);

module.exports = router;
// Nest(nest/accounts)가 라우팅만 가져가고 파이프라인(Zernio 동기화·Gemini 의상생성·Kling 릴스·
// 발행 큐·미디어 업로드)은 이 핸들러를 그대로 재사용한다 — 로직 이중화 금지.
//   ⚠️ router.param('id')로 걸던 계정 소유권 검증은 Nest에선 컨트롤러가 assertAccountOwned로 직접 수행한다.
module.exports.handlers = {
  sync: syncHandler,
  list: listHandler,
  getAccount: getAccountHandler,
  patchStatus: patchStatusHandler,
  patchDefaultCaptions: patchDefaultCaptionsHandler,
  getAnalyticsDetail: getAnalyticsDetailHandler,
  getAnalyticsPosts: getAnalyticsPostsHandler,
  deleteAccount: deleteAccountHandler,
  postBasePhoto: postBasePhotoHandler,
  getBasePhoto: getBasePhotoHandler,
  postGenerateOutfits: postGenerateOutfitsHandler,
  postGenerateReel: postGenerateReelHandler,
  getReelTemplates: getReelTemplatesHandler,
  deleteReelTemplates: deleteReelTemplatesHandler,
  getOutfitPrompts: getOutfitPromptsHandler,
  postOutfitPrompts: postOutfitPromptsHandler,
  patchOutfitPrompts: patchOutfitPromptsHandler,
  deleteOutfitPrompts: deleteOutfitPromptsHandler,
  postBatchReels: postBatchReelsHandler,
  getPostQueue: getPostQueueHandler,
  postPostQueue: postPostQueueHandler,
  patchPostQueue: patchPostQueueHandler,
  postPublishNow: postPublishNowHandler,
  postPostQueuePublish: postPostQueuePublishHandler,
  postPostQueueDuplicate: postPostQueueDuplicateHandler,
  postPostQueueReupload: postPostQueueReuploadHandler,
  deletePostQueue: deletePostQueueHandler,
  getMedia: getMediaHandler,
  postMediaUpload: postMediaUploadHandler,
  postMediaRegister: postMediaRegisterHandler,
  patchMedia: patchMediaHandler,
  deleteMedia: deleteMediaHandler,
};
module.exports.upload = upload;
// 조회 API — Nest 컨트롤러가 @Res() 위임 없이 직접 호출해 데이터만 받아간다.
module.exports.reads = reads;
