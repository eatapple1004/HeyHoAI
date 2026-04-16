const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { env } = require('../config');
const characterRepo = require('../characters/character.repository');
const promptRepo = require('./prompt.repository');
const resultRepo = require('./result.repository');
const reviewRepo = require('./review.repository');
const styleRepo = require('./stylePreset.repository');

const router = Router();

// 업로드 설정
const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/generate
 */
router.post('/', upload.single('referenceImage'), async (req, res, next) => {
  try {
    const { characterId, prompt, model = 'pro', count = '1', style = 'none' } = req.body;
    const generateCount = Math.min(parseInt(count, 10) || 1, 4);

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // 스타일 프리셋 적용
    const styled = await styleRepo.applyStyle(style, prompt);
    const finalPrompt = styled.prompt;

    // Reference 이미지 결정
    let referenceBase64 = null;
    let referenceSource = 'none';
    let referenceImagePath = null;

    if (req.file) {
      const fileData = fs.readFileSync(req.file.path);
      referenceBase64 = fileData.toString('base64');
      referenceSource = 'upload';
      referenceImagePath = `tmp/uploads/${path.basename(req.file.path)}`;
    }

    if (!referenceBase64 && characterId) {
      const character = await characterRepo.findById(characterId);
      if (character?.reference_image_url) {
        const filename = character.reference_image_url.split('/').pop();
        const refPath = path.join(process.cwd(), 'tmp', 'images', filename);
        if (fs.existsSync(refPath)) {
          referenceBase64 = fs.readFileSync(refPath).toString('base64');
          referenceSource = 'character';
          referenceImagePath = `tmp/images/${filename}`;
        }
      }
    }

    const modelId = model === 'flash'
      ? 'gemini-2.5-flash-image'
      : 'gemini-3-pro-image-preview';

    // ─── 프롬프트 DB 저장 ───
    const savedPrompt = await promptRepo.insert({
      characterId: characterId || null,
      promptText: finalPrompt,
      model: modelId,
      referenceImagePath,
      tags: [referenceSource, model, styled.styleName].filter(Boolean),
    });

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    for (let i = 0; i < generateCount; i++) {
      try {
        let contents;
        if (referenceBase64) {
          contents = [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/png', data: referenceBase64 } },
                {
                  text: `Generate a new photo of this EXACT SAME person. Keep the same face, same hair, same body type, same features. This person must be clearly recognizable as the same individual.\n\n${finalPrompt}`,
                },
              ],
            },
          ];
        } else {
          contents = finalPrompt;
        }

        const response = await ai.models.generateContent({
          model: modelId,
          contents,
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const finishReason = response.candidates?.[0]?.finishReason;
        const img = parts.find((p) => p.inlineData);

        if (img) {
          const imageId = crypto.randomUUID();
          const ext = img.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
          const filename = `${imageId}.${ext}`;
          const filePath = path.join(outputDir, filename);
          const buffer = Buffer.from(img.inlineData.data, 'base64');
          fs.writeFileSync(filePath, buffer);

          const textPart = parts.find((p) => p.text);

          // ─── 결과물 DB 저장 ───
          const savedResult = await resultRepo.insert({
            promptIdx: savedPrompt.idx,
            characterId: characterId || null,
            filePath: `tmp/images/${filename}`,
            fileSizeKb: Math.round(buffer.length / 1024),
            model: modelId,
            metadata: { description: textPart?.text || '', finishReason },
          });

          // ─── 리뷰 기본값 생성 ───
          const savedReview = await reviewRepo.insert({
            resultIdx: savedResult.idx,
            promptIdx: savedPrompt.idx,
          });

          results.push({
            success: true,
            filename,
            url: `/images/${filename}`,
            size: Math.round(buffer.length / 1024) + 'KB',
            description: textPart?.text || '',
            resultIdx: savedResult.idx,
            reviewIdx: savedReview.idx,
          });
        } else {
          results.push({
            success: false,
            error: `Blocked: ${finishReason || 'unknown'}`,
          });
        }
      } catch (err) {
        results.push({ success: false, error: err.message.slice(0, 200) });
      }
    }

    res.json({
      success: true,
      promptIdx: savedPrompt.idx,
      model: modelId,
      style: styled.styleName,
      referenceSource,
      characterId: characterId || null,
      prompt: finalPrompt,
      results,
    });
  } catch (err) {
    next(err);
  }
});

// ─── 스타일 프리셋 목록 ───
router.get('/styles', async (_req, res, next) => {
  try {
    const data = await styleRepo.findAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 프롬프트 목록 ───
router.get('/prompts', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await promptRepo.findAll({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 프롬프트 상세 + 결과물 ───
router.get('/prompts/:idx', async (req, res, next) => {
  try {
    const prompt = await promptRepo.findByIdx(req.params.idx);
    if (!prompt) return res.status(404).json({ success: false, error: 'Prompt not found' });
    const results = await resultRepo.findByPromptIdx(prompt.idx);
    res.json({ success: true, data: { prompt, results } });
  } catch (err) { next(err); }
});

// ─── 결과물 목록 ───
router.get('/results', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await resultRepo.findAll({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 리뷰 목록 ───
router.get('/reviews', async (req, res, next) => {
  try {
    const { posted, sort, limit, offset } = req.query;
    const data = await reviewRepo.findAll({
      posted: posted !== undefined ? posted === 'true' : undefined,
      sort: sort || 'newest',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 리뷰 수정 ───
router.patch('/reviews/:idx', async (req, res, next) => {
  try {
    const { naturalScore, sexualScore, postRate, posted, memo } = req.body;
    const review = await reviewRepo.update(parseInt(req.params.idx), {
      naturalScore, sexualScore, postRate, posted, memo,
    });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, data: review });
  } catch (err) { next(err); }
});

// ─── 생성된 이미지 목록 (파일 기반) ───
router.get('/images', (_req, res) => {
  const outputDir = path.join(process.cwd(), 'tmp', 'images');
  if (!fs.existsSync(outputDir)) return res.json({ success: true, data: [] });

  const files = fs.readdirSync(outputDir)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(outputDir, f));
      return {
        filename: f,
        url: `/images/${f}`,
        size: Math.round(stat.size / 1024) + 'KB',
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, data: files });
});

module.exports = router;
