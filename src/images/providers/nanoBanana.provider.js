const { GoogleGenAI } = require('@google/genai');
const { env } = require('../../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mediaStore = require('../../storage/mediaStore');

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

      // referenceKind: 'product'=제품 정체성 고정(라벨·형태·색), 'person'(기본)=동일 인물 유지
      const refInstruction = req.referenceKind === 'product'
        ? `Use the product shown in the reference image as the EXACT product to feature. Keep its identity, shape, color, label and details unchanged. Place it in this new scene:\n\n${fullPrompt}`
        : `This is an AI-generated fictional character, not a real person. Generate a new photo of this EXACT SAME fictional character. Keep the same face, same hair, same features.\n\n${fullPrompt}`;
      contents = [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: refInstruction },
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
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
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
    await mediaStore.put(path.basename(filePath), buffer); // 영속 스토리지 best-effort 업로드(미설정 시 no-op)

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
