const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const accountRepo = require('./account.repository');
const mediaRepo = require('./accountMedia.repository');
const zernio = require('./zernio.client');
const logger = require('../lib/logger');
const log = logger('Account');

const router = Router();

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
router.post('/sync', async (_req, res, next) => {
  try {
    const accounts = await zernio.listAccounts();
    const synced = [];

    for (const acc of accounts) {
      const saved = await accountRepo.insert({
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
});

/**
 * GET /api/accounts
 * 저장된 계정 목록 조회
 */
router.get('/', async (req, res, next) => {
  try {
    const { platform, status } = req.query;
    const accounts = await accountRepo.findAll({
      platform: platform || undefined,
      status: status || undefined,
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/accounts/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/accounts/:id/status
 */
router.patch('/:id/status', async (req, res, next) => {
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
});

/**
 * PATCH /api/accounts/:id/default-captions
 */
router.patch('/:id/default-captions', async (req, res, next) => {
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
});

/**
 * DELETE /api/accounts/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const account = await accountRepo.remove(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════
// Workflow: Base Photo, Outfits, Reels
// ══════════════════════════════════════
const reelTemplateRepo = require('./reelTemplate.repository');
const outfitPromptRepo = require('./outfitPrompt.repository');

/**
 * POST /api/accounts/:id/base-photo
 * 기본 사진 설정
 */
router.post('/:id/base-photo', async (req, res, next) => {
  try {
    const { mediaId } = req.body;
    if (!mediaId) return res.status(400).json({ success: false, error: 'mediaId is required' });
    const media = await mediaRepo.setBase(req.params.id, mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    log.info(`Base photo set: ${media.file_path} for account ${req.params.id}`);
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

/**
 * GET /api/accounts/:id/base-photo
 */
router.get('/:id/base-photo', async (req, res, next) => {
  try {
    const media = await mediaRepo.findBase(req.params.id);
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/:id/generate-outfits
 * 기본 사진 기반 의상 변경 사진 생성
 */
router.post('/:id/generate-outfits', async (req, res, next) => {
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
});

/**
 * POST /api/accounts/:id/generate-reel
 * 사진으로 릴스 생성 + 프롬프트 템플릿 저장
 */
router.post('/:id/generate-reel', async (req, res, next) => {
  try {
    const { mediaId, prompt, duration = '5', mode = 'std', saveTemplate = false, templateName = '' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
    if (!mediaId) return res.status(400).json({ success: false, error: 'mediaId is required' });

    const sourceMedia = await mediaRepo.findById(mediaId);
    if (!sourceMedia) return res.status(404).json({ success: false, error: 'Media not found' });

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

    log.info(`Reel generation started for media ${mediaId}`);
    const submitRes = await fetch('https://api.klingai.com/v1/videos/image2video', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_name: 'kling-v3', image: imageBase64, prompt,
        negative_prompt: 'ugly, deformed, blurry, static',
        duration, mode, aspect_ratio: '9:16',
      }),
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
});

/**
 * GET /api/accounts/:id/reel-templates
 */
router.get('/:id/reel-templates', async (req, res, next) => {
  try {
    const templates = await reelTemplateRepo.findByAccountId(req.params.id);
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/accounts/reel-templates/:templateId
 */
router.delete('/reel-templates/:templateId', async (req, res, next) => {
  try {
    const t = await reelTemplateRepo.remove(req.params.templateId);
    if (!t) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: t });
  } catch (err) { next(err); }
});

// ── Outfit Prompts ──

router.get('/:id/outfit-prompts', async (req, res, next) => {
  try {
    const prompts = await outfitPromptRepo.findByAccountId(req.params.id);
    res.json({ success: true, data: prompts });
  } catch (err) { next(err); }
});

router.post('/:id/outfit-prompts', async (req, res, next) => {
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
});

router.patch('/outfit-prompts/:promptId', async (req, res, next) => {
  try {
    const { name, prompt } = req.body;
    const updated = await outfitPromptRepo.update(req.params.promptId, { name, prompt });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.delete('/outfit-prompts/:promptId', async (req, res, next) => {
  try {
    const deleted = await outfitPromptRepo.remove(req.params.promptId);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: deleted });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/:id/batch-reels
 * 저장된 템플릿으로 여러 사진에 릴스 배치 생성
 */
router.post('/:id/batch-reels', async (req, res, next) => {
  try {
    const { templateId, mediaIds } = req.body;
    if (!templateId || !mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({ success: false, error: 'templateId and mediaIds[] are required' });
    }

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
        if (!sourceMedia) { results.push({ mediaId: mId, success: false, error: 'Not found' }); continue; }

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
});

// ══════════════════════════════════════
// Post Queue
// ══════════════════════════════════════
const postQueueRepo = require('./postQueue.repository');

router.get('/:id/post-queue', async (req, res, next) => {
  try {
    const { status } = req.query;
    const items = await postQueueRepo.findByAccountId(req.params.id, { status: status || undefined });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/:id/post-queue', async (req, res, next) => {
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
});

router.patch('/post-queue/:queueId', async (req, res, next) => {
  try {
    const { imageCaption, reelCaption, hashtags, status, bgmMediaId } = req.body;
    const item = await postQueueRepo.update(req.params.queueId, { imageCaption, reelCaption, hashtags, status, bgmMediaId });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/:id/publish-now
 * 수동으로 즉시 업로드 트리거
 */
router.post('/:id/publish-now', async (req, res, next) => {
  try {
    const { publishConfirmedItems } = require('./scheduler');
    await publishConfirmedItems();
    res.json({ success: true, message: 'Publish triggered' });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/post-queue/:queueId/publish
 * 개별 Queue 아이템 즉시 업로드
 */
router.post('/post-queue/:queueId/publish', async (req, res, next) => {
  try {
    const { publishSingleItem } = require('./scheduler');
    const result = await publishSingleItem(req.params.queueId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.delete('/post-queue/:queueId', async (req, res, next) => {
  try {
    const item = await postQueueRepo.remove(req.params.queueId);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════
// Account Media
// ══════════════════════════════════════

/**
 * GET /api/accounts/:id/media
 */
router.get('/:id/media', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const media = await mediaRepo.findByAccountId(req.params.id, {
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    const count = await mediaRepo.countByAccountId(req.params.id);
    res.json({ success: true, data: media, total: count });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/:id/media/upload
 * 이미지 직접 업로드
 */
router.post('/:id/media/upload', upload.single('file'), async (req, res, next) => {
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
});

/**
 * POST /api/accounts/:id/media/register
 * Generate 페이지에서 기존 이미지를 계정에 등록
 */
router.post('/:id/media/register', async (req, res, next) => {
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
});

/**
 * PATCH /api/accounts/media/:mediaId
 */
router.patch('/media/:mediaId', async (req, res, next) => {
  try {
    const { caption, hashtags, status } = req.body;
    const media = await mediaRepo.update(req.params.mediaId, { caption, hashtags, status });
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/accounts/media/:mediaId
 */
router.delete('/media/:mediaId', async (req, res, next) => {
  try {
    const media = await mediaRepo.remove(req.params.mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

module.exports = router;
