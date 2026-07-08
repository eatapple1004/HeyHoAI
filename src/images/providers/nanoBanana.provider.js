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

// 레퍼런스 경로 → 실제 파일 절대경로(로스터 /img/, tmp/images, 절대경로 모두 해석)
function resolveRefPath(p) {
  if (!p) return null;
  const clean = p.replace('file://', '');
  if (path.isAbsolute(clean) && fs.existsSync(clean)) return clean;
  if (clean.startsWith('/img/')) { const pub = path.join(process.cwd(), 'public', clean); if (fs.existsSync(pub)) return pub; }
  const inTmp = path.join(process.cwd(), 'tmp', 'images', clean.split('/').pop());
  if (fs.existsSync(inTmp)) return inTmp;
  if (fs.existsSync(clean)) return clean;
  return null;
}
function guessMime(fp) {
  const e = fp.toLowerCase().split('.').pop();
  return e === 'jpg' || e === 'jpeg' ? 'image/jpeg' : e === 'webp' ? 'image/webp' : 'image/png';
}
// 레퍼런스 종류별 지시문(제품=정체성 고정, person/model=동일 인물 유지)
function refClause(kind, idx) {
  return kind === 'product'
    ? `Image ${idx} is the EXACT product to feature — keep its identity, shape, color, label and details unchanged.`
    : `Image ${idx} is an AI-generated fictional model (not a real person) — keep the SAME face, hair and features.`;
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

    // 레퍼런스 정규화: req.references([{path,kind}]) 우선, 없으면 단일 referenceImagePath(하위호환)
    const refs = (Array.isArray(req.references) && req.references.length)
      ? req.references
      : (req.referenceImagePath ? [{ path: req.referenceImagePath, kind: req.referenceKind || 'person' }] : []);

    if (refs.length) {
      const imageParts = [];
      const clauses = [];
      let n = 0;
      for (const r of refs) {
        const abs = resolveRefPath(r.path);
        if (!abs) continue;
        n += 1;
        imageParts.push({ inlineData: { mimeType: guessMime(abs), data: fs.readFileSync(abs).toString('base64') } });
        clauses.push(refClause(r.kind || 'person', n));
      }
      if (imageParts.length) {
        const hasProduct = refs.some((r) => r.kind === 'product');
        const hasModel = refs.some((r) => r.kind && r.kind !== 'product');
        const combine = (imageParts.length > 1 && hasProduct && hasModel)
          ? 'Dress/place the product on the model naturally so the model is wearing or using that exact product. '
          : '';
        const instruction = `${clauses.join(' ')}\n${combine}Generate this new scene:\n\n${fullPrompt}`;
        contents = [{ role: 'user', parts: [...imageParts, { text: instruction }] }];
      } else {
        contents = fullPrompt;
      }
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
        usedReference: !!(req.referenceImagePath || (Array.isArray(req.references) && req.references.length)),
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
