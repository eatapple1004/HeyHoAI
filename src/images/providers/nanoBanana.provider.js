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
function refList(ns) {
  return ns.length === 1 ? `Image ${ns[0]}`
    : ns.length === 2 ? `Images ${ns[0]} and ${ns[1]}`
      : `Images ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}
/**
 * 레퍼런스 지시문 — **종류별로 묶어서** 말한다.
 *
 * ⚠️ 전엔 장마다 `Image N is the EXACT product`를 따로 붙였다. 그래서 제품 다각도 2장을 넣으면
 *    "이게 **그** 제품이다"가 두 번 선언돼 모델이 **제품이 둘**이라고 읽었다 — 같은 제품의 다른
 *    각도라는 말이 어디에도 없었다. 코드 주석("동일 제품 다각도")도 화면("add more angles for
 *    accuracy")도 다각도라고 하는데 **정작 모델에게만 그 말을 안 하고 있었다.**
 *    → 사진을 더 넣을수록 좋아져야 하는데 오히려 나빠지던 원인.
 *
 * 제품은 항상 **하나**다(여러 제품은 미지원 — 그건 씬별 제품 라우팅이 필요한 별개 기능이고,
 * 스키마의 scene.subject가 product|model뿐이라 지목할 수단이 없다).
 * @param {{path:string,kind?:string}[]} refs 이미지 파트와 **같은 순서**(번호 1..N이 그 순서다)
 */
function refClauses(refs) {
  const prod = [], model = [];
  refs.forEach((r, i) => ((r.kind === 'product') ? prod : model).push(i + 1));
  const out = [];
  if (model.length) {
    out.push(`${refList(model)} ${model.length > 1 ? 'show' : 'is'} the SAME AI-generated fictional model (not a real person) — keep the SAME face, hair and features.`);
  }
  if (prod.length === 1) {
    out.push(`Image ${prod[0]} is the EXACT product to feature — keep its identity, shape, color, label and details unchanged.`);
  } else if (prod.length > 1) {
    out.push(`${refList(prod)} are ONE SINGLE product shot from different angles — NOT several different products. Read them together to understand that one product's full shape and details, then feature that same product with its identity, shape, color, label and details unchanged.`);
  }
  return out;
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
      // ⚠️ 경로가 안 풀리면 건너뛴다 → refs와 실제 실린 이미지가 어긋난다. 설명문의 "Image N"은
      //    imageParts 순서를 가리켜야 하므로, **실제로 실린 것(used)**으로만 번호를 매긴다.
      //    hasProduct/hasModel도 used 기준 — refs로 보면 제품 경로가 유실됐는데도 "제품을 모델에게 입혀라"가 붙는다.
      const used = [];
      for (const r of refs) {
        const abs = resolveRefPath(r.path);
        if (!abs) continue;
        imageParts.push({ inlineData: { mimeType: guessMime(abs), data: fs.readFileSync(abs).toString('base64') } });
        used.push(r);
      }
      if (imageParts.length) {
        const hasProduct = used.some((r) => r.kind === 'product');
        const hasModel = used.some((r) => r.kind && r.kind !== 'product');
        const combine = (imageParts.length > 1 && hasProduct && hasModel)
          ? 'Dress/place the product on the model naturally so the model is wearing or using that exact product. '
          : '';
        const instruction = `${refClauses(used).join(' ')}\n${combine}Generate this new scene:\n\n${fullPrompt}`;
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
