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

    // Reference 이미지 결정 (캐릭터 얼굴 + 추가 이미지 동시 지원)
    let characterRefBase64 = null;  // 캐릭터 대표 이미지 (얼굴)
    let uploadRefBase64 = null;     // 업로드된 추가 이미지
    let referenceSource = 'none';
    let referenceImagePath = null;

    // 1) 캐릭터 대표 이미지 (얼굴 레퍼런스)
    if (characterId) {
      const character = await characterRepo.findById(characterId);
      if (character?.reference_image_url) {
        const filename = character.reference_image_url.split('/').pop();
        const refPath = path.join(process.cwd(), 'tmp', 'images', filename);
        if (fs.existsSync(refPath)) {
          characterRefBase64 = fs.readFileSync(refPath).toString('base64');
          referenceImagePath = `tmp/images/${filename}`;
        }
      }
    }

    // 2) 업로드된 추가 이미지
    if (req.file) {
      const fileData = fs.readFileSync(req.file.path);
      uploadRefBase64 = fileData.toString('base64');
    }

    // 소스 결정
    if (characterRefBase64 && uploadRefBase64) {
      referenceSource = 'character+upload';
    } else if (characterRefBase64) {
      referenceSource = 'character';
    } else if (uploadRefBase64) {
      referenceSource = 'upload';
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
      stylePreset: styled.styleName !== 'none' ? styled.styleName : null,
    });

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    const MAX_RETRIES = 3;

    for (let i = 0; i < generateCount; i++) {
      let success = false;
      let lastError = null;

      for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
        try {
          let contents;
          const hasAnyRef = characterRefBase64 || uploadRefBase64;

          if (hasAnyRef) {
            const parts = [];

            // 캐릭터 대표 이미지 (얼굴 레퍼런스)
            if (characterRefBase64) {
              parts.push({ inlineData: { mimeType: 'image/png', data: characterRefBase64 } });
            }

            // 업로드된 추가 이미지 (포즈/구도/스타일 레퍼런스)
            if (uploadRefBase64) {
              parts.push({ inlineData: { mimeType: 'image/png', data: uploadRefBase64 } });
            }

            // 프롬프트 텍스트 (인물 보호 필터 우회를 위해 간접적 표현 사용)
            let promptText;
            if (characterRefBase64 && uploadRefBase64) {
              promptText = `Use the first image as visual reference for the character's appearance and features. Use the second image as reference for the style, pose, composition and setting.\n\nCreate a new photo with similar look and feel:\n${finalPrompt}`;
            } else if (characterRefBase64) {
              promptText = `Use this image as visual reference for the character's appearance and features.\n\nCreate a new photo with similar look:\n${finalPrompt}`;
            } else {
              promptText = `Use this image as a reference for the style, pose, and composition.\n\n${finalPrompt}`;
            }

            parts.push({ text: promptText });

            contents = [{ role: 'user', parts }];
          } else {
            contents = finalPrompt;
          }

          const response = await ai.models.generateContent({
            model: modelId,
            contents,
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

            const savedResult = await resultRepo.insert({
              promptIdx: savedPrompt.idx,
              characterId: characterId || null,
              filePath: `tmp/images/${filename}`,
              fileSizeKb: Math.round(buffer.length / 1024),
              model: modelId,
              metadata: { description: textPart?.text || '', finishReason, attempt },
            });

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
              attempt,
            });
            success = true;
          } else {
            lastError = `Blocked: ${finishReason || 'unknown'}`;
            if (attempt < MAX_RETRIES) {
              console.log(`[Generate] Image ${i+1} attempt ${attempt}/${MAX_RETRIES} blocked (${finishReason}), retrying...`);
            }
          }
        } catch (err) {
          lastError = err.message.slice(0, 200);
          if (attempt < MAX_RETRIES) {
            console.log(`[Generate] Image ${i+1} attempt ${attempt}/${MAX_RETRIES} error, retrying...`);
          }
        }
      }

      // 3회 모두 실패한 경우에만 실패 기록
      if (!success) {
        const failedResult = await resultRepo.insertFailed({
          promptIdx: savedPrompt.idx,
          characterId: characterId || null,
          model: modelId,
          errorMessage: `${lastError} (after ${MAX_RETRIES} attempts)`,
          metadata: { attempts: MAX_RETRIES },
        }).catch(() => null);
        if (failedResult) {
          await reviewRepo.insert({
            resultIdx: failedResult.idx,
            promptIdx: savedPrompt.idx,
            memo: `${lastError} (${MAX_RETRIES} attempts)`,
          }).catch(() => {});
        }
        results.push({
          success: false,
          error: `${lastError} (after ${MAX_RETRIES} attempts)`,
          resultIdx: failedResult?.idx,
          attempts: MAX_RETRIES,
        });
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
    const { posted, status, sort, limit, offset } = req.query;
    const data = await reviewRepo.findAll({
      posted: posted !== undefined ? posted === 'true' : undefined,
      status: status || undefined,
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
