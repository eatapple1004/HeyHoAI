const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { env } = require('../config');
const characterRepo = require('../characters/character.repository');

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
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

/**
 * POST /api/generate
 * 웹 UI에서 이미지 생성 요청
 *
 * body (multipart/form-data):
 *   - characterId (optional): 캐릭터 ID
 *   - referenceImage (optional): 업로드 파일
 *   - prompt: 프롬프트 텍스트
 *   - model: 'pro' | 'flash' (기본: pro)
 *   - count: 생성 장수 (기본: 1, 최대: 4)
 */
router.post('/', upload.single('referenceImage'), async (req, res, next) => {
  try {
    const { characterId, prompt, model = 'pro', count = '1' } = req.body;
    const generateCount = Math.min(parseInt(count, 10) || 1, 4);

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Reference 이미지 결정
    let referenceBase64 = null;
    let referenceSource = 'none';

    // 1) 업로드된 이미지가 있으면 우선 사용
    if (req.file) {
      const fileData = fs.readFileSync(req.file.path);
      referenceBase64 = fileData.toString('base64');
      referenceSource = 'upload';
    }

    // 2) 캐릭터가 선택되었고 업로드 이미지가 없으면 캐릭터 대표 이미지 사용
    if (!referenceBase64 && characterId) {
      const character = await characterRepo.findById(characterId);
      if (character?.reference_image_url) {
        // 절대 경로 또는 file:// 경로에서 파일명만 추출하여 현재 서버의 tmp/images/ 에서 찾기
        const filename = character.reference_image_url.split('/').pop();
        const refPath = path.join(process.cwd(), 'tmp', 'images', filename);
        if (fs.existsSync(refPath)) {
          referenceBase64 = fs.readFileSync(refPath).toString('base64');
          referenceSource = 'character';
        }
      }
    }

    // 3) 캐릭터 선택 + 업로드 이미지 둘 다 있으면 업로드 이미지 사용 (이미 1에서 처리됨)

    // 모델 선택
    const modelId = model === 'flash'
      ? 'gemini-2.5-flash-image'
      : 'gemini-3-pro-image-preview';

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    for (let i = 0; i < generateCount; i++) {
      try {
        // 프롬프트 조립
        let contents;
        if (referenceBase64) {
          contents = [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/png', data: referenceBase64 } },
                {
                  text: `Generate a new photo of this EXACT SAME person. Keep the same face, same hair, same body type, same features. This person must be clearly recognizable as the same individual.\n\n${prompt}`,
                },
              ],
            },
          ];
        } else {
          contents = prompt;
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

          results.push({
            success: true,
            filename,
            url: `/images/${filename}`,
            size: Math.round(buffer.length / 1024) + 'KB',
            description: textPart?.text || '',
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
      model: modelId,
      referenceSource,
      characterId: characterId || null,
      prompt,
      results,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/generate/images
 * 생성된 이미지 목록
 */
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
