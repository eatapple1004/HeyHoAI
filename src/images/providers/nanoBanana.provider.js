const { GoogleGenAI } = require('@google/genai');
const { env } = require('../../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

/** @type {import('./types').ImageProvider} */
const nanoBananaProvider = {
  name: 'nano-banana',

  /**
   * Nano Banana (Gemini) 로 이미지를 생성한다.
   * referenceImagePath가 있으면 해당 이미지를 reference로 사용하여 동일 인물을 유지한다.
   *
   * @param {import('./types').ImageGenerationRequest & { referenceImagePath?: string }} req
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    const ai = getClient();

    const fullPrompt = req.negativePrompt
      ? `${req.prompt}\n\nAvoid: ${req.negativePrompt}`
      : req.prompt;

    const aspectRatio = getAspectRatio(req.width, req.height);

    // Reference image가 있으면 멀티모달 요청, 없으면 텍스트만
    let contents;

    if (req.referenceImagePath) {
      // 절대 경로에서 파일명 추출 → 현재 서버의 tmp/images/에서 찾기
      const filename = req.referenceImagePath.replace('file://', '').split('/').pop();
      const refPath = path.join(process.cwd(), 'tmp', 'images', filename);
      const imageData = fs.readFileSync(refPath);
      const base64 = imageData.toString('base64');

      contents = [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: `Generate a new photo of this EXACT SAME person. Keep the same face, same hair, same body type, same features. This person must be clearly recognizable as the same individual.\n\n${fullPrompt}` },
          ],
        },
      ];
    } else {
      contents = fullPrompt;
    }

    const response = await ai.models.generateContent({
      model: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio,
        },
      },
    });

    // 응답에서 이미지 파트 추출
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error('Nano Banana returned no content');
    }

    const imagePart = parts.find((p) => p.inlineData);
    if (!imagePart) {
      throw new Error('Nano Banana returned no image');
    }

    // base64 이미지를 로컬 파일로 저장
    const imageId = crypto.randomUUID();
    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const ext = imagePart.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
    const filePath = path.join(outputDir, `${imageId}.${ext}`);
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const textPart = parts.find((p) => p.text);

    return {
      url: `file://${filePath}`,
      seed: null,
      providerJobId: imageId,
      metadata: {
        model: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
        mimeType: imagePart.inlineData.mimeType,
        description: textPart?.text || '',
        localPath: filePath,
        usedReference: !!req.referenceImagePath,
      },
    };
  },
};

function getAspectRatio(width, height) {
  const ratio = width / height;
  if (ratio > 1.5) return '16:9';
  if (ratio > 1.1) return '4:3';
  if (ratio < 0.6) return '9:16';
  if (ratio < 0.8) return '3:4';
  return '1:1';
}

module.exports = nanoBananaProvider;
