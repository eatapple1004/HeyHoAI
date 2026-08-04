const { GoogleGenAI } = require('@google/genai');
const { env } = require('../../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mediaStore = require('../../storage/mediaStore');
const logger = require('../../lib/logger');

let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * ⏱ 하드 타임아웃 + 재시도 — 예전엔 **둘 다 없었다**.
 *
 * `ai.models.generateContent`가 응답 없이 매달리면 그 await는 **영원히** 안 끝난다.
 * 호출부의 try/catch는 *던져진* 에러만 잡으므로 hang은 못 넘긴다 — 던져줄 에러 자체가 안 생긴다.
 * Pack은 컷을 **순차**로 돌아서 한 컷이 매달리면 그 뒤 전부 정지했다(실측: 6장 생성 후 21분 스피너).
 *
 * 2중 방어:
 *   ① SDK `abortSignal` → 소켓까지 끊어 자원을 회수한다.
 *   ② `Promise.race` 백스톱 → abort가 SDK 내부 어딘가에 안 닿아도 우리 promise는 **반드시** settle한다.
 *      (hang의 정의상 "이론상 abort가 닿는다"를 믿으면 안 된다 — 못 닿는 지점이 hang의 원인일 수 있다.)
 *
 * ⚠️ 이 provider는 pack 전용이 아니다(pack·ugc clipPipeline·imageGeneration.service·scripts 공유).
 *    imageGeneration.service는 자체 withRetry(2회)가 이미 있어 그 경로만 시도가 곱해진다 —
 *    그래도 상한이 생긴 것이라 무한 대기보다 낫다.
 */
const GEN_TIMEOUT_MS = Number(process.env.IMAGE_GEN_TIMEOUT_MS) || 180000;  // 시도 1회 상한(adminRefine 생성 타임아웃과 동일 근거)
// 추가 시도 수(총 1+N). 0 허용, 오타/빈값이면 기본값 — NaN이 들어가면 루프가 한 번도 안 돌아 조용히 망가진다.
const GEN_RETRIES = Number.isFinite(Number(process.env.IMAGE_GEN_RETRIES)) ? Math.max(0, Number(process.env.IMAGE_GEN_RETRIES)) : 2;
const GEN_TOTAL_MS = Number(process.env.IMAGE_GEN_TOTAL_MS) || 420000;     // 재시도 포함 총 상한
const TIMEOUT_ATTEMPTS_MAX = 2;   // hang은 대개 체계적 → 3분씩 계속 태우지 않는다(싼 429/5xx는 끝까지 재시도).

/** 재시도해도 결과가 달라질 수 있는 실패인가 — **전송 계층만**.
 *  400(잘못된 요청)·안전 차단·"이미지 없음"은 다시 보내도 같은 값을 내고 크레딧만 태운다. */
function isRetryable(e) {
  const msg = String((e && e.message) || e || '');
  const status = e && (e.status || e.statusCode || (e.response && e.response.status));
  if (status === 429 || (status >= 500 && status < 600)) return true;
  if (/\b(429|500|502|503|504)\b/.test(msg)) return true;
  if (/timed? ?out|timeout|abort/i.test(msg)) return true;
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|socket hang up|fetch failed|network|terminated/i.test(msg)) return true;
  return false;
}

/** generateContent를 타임아웃·재시도로 감싼다. 성공 응답을 그대로 반환, 최종 실패는 마지막 에러를 던진다. */
async function generateContentGuarded(ai, params) {
  const started = Date.now();
  let timeouts = 0;
  let lastErr;
  for (let attempt = 1; attempt <= GEN_RETRIES + 1; attempt++) {
    const ctrl = new AbortController();
    let abortTimer, hardTimer, timedOut = false;
    try {
      return await Promise.race([
        ai.models.generateContent({ ...params, config: { ...params.config, abortSignal: ctrl.signal } }),
        new Promise((_, reject) => {
          abortTimer = setTimeout(() => { timedOut = true; ctrl.abort(); }, GEN_TIMEOUT_MS);
          hardTimer = setTimeout(() => reject(new Error(`image generation timeout after ${GEN_TIMEOUT_MS}ms`)), GEN_TIMEOUT_MS + 5000);
        }),
      ]);
    } catch (e) {
      lastErr = timedOut ? new Error(`image generation timeout after ${GEN_TIMEOUT_MS}ms`) : e;
      if (timedOut) timeouts++;
      const spent = Date.now() - started;
      const canRetry = attempt <= GEN_RETRIES
        && (timedOut || isRetryable(e))
        && !(timedOut && timeouts >= TIMEOUT_ATTEMPTS_MAX)
        && spent < GEN_TOTAL_MS;
      logger.warn?.(`[nano-banana] 시도 ${attempt}/${GEN_RETRIES + 1} 실패(${spent}ms): ${lastErr.message}${canRetry ? ' → 재시도' : ''}`);
      if (!canRetry) throw lastErr;
      await new Promise((r) => setTimeout(r, Math.min(8000, 1000 * 2 ** (attempt - 1))));
    } finally {
      clearTimeout(abortTimer); clearTimeout(hardTimer);
    }
  }
  throw lastErr || new Error('image generation failed with no attempts');   // 도달 불가여야 정상(방어)
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
 * ⚠️ "different angles"로만 말해도 안 된다 — 유저가 넣는 건 각도만이 아니다: 상태(립스틱 뚜껑
 *    닫힘/열림), 스케일(전체/클로즈업)도 흔하다. 각도라고 못박으면 두 상태를 **하나로 융합**하려
 *    하거나(뚜껑이 닫힌 동시에 열린?) 어느 쪽을 그릴지 헷갈린다.
 *    → "같은 제품의 여러 모습"으로 넓히고, **어느 상태를 그릴지는 씬 프롬프트가 정한다**고 명시한다.
 *
 * ⚠️ **"제품 하나"는 물리적 개수가 아니라 "사진들이 같은 대상에 합의하는가"다.**
 *    3색 세트를 한 컷에 찍은 사진은 **세트 전체가 그 하나**이고 지금도 잘 된다(세트를 파니 세트가 상품).
 *    안 되는 건 사진1=A, 사진2=B처럼 **사진마다 대상이 바뀌는 것** — 모델은 판단하지 않고 "하나다"라고
 *    듣고 융합하므로, 모순된 증거를 받으면 혼종을 만들거나 하나만 고르고 나머지를 버린다(조용히·비결정적).
 *    그래서 세트도 하나로 친다고 **명시**한다 — 안 그러면 "ONE SINGLE product"가 세트 사진과 모순돼 보인다.
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
    out.push(`${refList(prod)} all show the SAME single product — the one being advertised. They are NOT different products to pick between. They may differ in angle, in state (e.g. cap on vs off, folded vs opened) or in closeness; and if the product is a set or bundle of several items, the WHOLE set is that one product. Read them together to understand it, then feature it exactly as the scene below describes — including which state it is in — keeping its identity, shape, color, label and details unchanged.`);
  }
  // 제품 사진 속 사람은 제품이 아니다 — 마네킹이다.
  //   착용컷은 정상 제품컷이다(귀걸이는 귀에, 옷은 몸에 있다. accessories 시드의 3패밀리 중 하나가 Worn Cut).
  //   그런데 위 문장은 "keep its identity ... unchanged"라고만 해서, 착용컷이면 **그 사람 얼굴까지 그대로 그리라는 말**로
  //   읽혔다. 판매자가 계약한 모델이지 우리가 계약한 게 아닌데 그 얼굴을 새 장면에 재현하고 있었다(초상권).
  //   → 사람은 오직 로스터에서만 온다. 업로드본에서는 제품만 가져온다.
  //   이건 막는 게 아니라 **범위를 말해주는 것**이다: 착용컷은 계속 쓰되 인물만 안 베낀다(오탐 0, 거절 0).
  if (prod.length) {
    const those = prod.length > 1 ? 'those photos' : 'that photo';
    out.push(`A person may be wearing, holding or modelling the product in ${those} — if so, take ONLY the product from ${prod.length > 1 ? 'them' : 'it'}. That person is a mannequin, not part of the product: never reproduce their face, body, gender, age or identity.${model.length ? ` The only person in the output is the model from ${refList(model)} — if the product photo's mannequin is a different gender or age than the model, the MODEL wins.` : ''}`);
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
   * @param {import('./types').ImageGenerationRequest & { referenceImagePath?: string, model?: string, imageSize?: '1K'|'2K' }} req
   *   model 미지정 시 env.GEMINI_IMAGE_MODEL(기본 flash). imageSize '2K'는 Pro 모델에서만 적용된다.
   * @returns {Promise<import('./types').ImageGenerationResult>}
   */
  async generate(req) {
    const ai = getClient();

    // 모델은 **호출부가 고를 수 있다**. 예전엔 env 고정이라 Pack이 flash에 묶여 있었다
    //   (studio는 자체 클라이언트로 pro, adminRefine도 pro인데 provider를 쓰는 Pack만 flash였다).
    const model = req.model || env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    // 🔍 2K = 라벨 글자에 배정되는 픽셀이 2배. 워드마크가 살아남는 데 가장 직접적인 레버다.
    //   ⚠️ **Pro 전용**(flash는 1K 고정) — 모델이 pro가 아니면 조용히 무시한다(보내면 거부당한다).
    //   studio는 이미 이 옵션을 쓰는데 provider엔 없어서, Pack이 pro로 올라가고도 1K로 뽑고 있었다.
    const reqSize = String(req.imageSize || '').toUpperCase();
    const imageSize = ((reqSize === '2K' || reqSize === '4K') && /pro/i.test(model)) ? reqSize : null;

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

    const response = await generateContentGuarded(ai, {
      model,
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
          ...(imageSize ? { imageSize } : {}),
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
        model,
        mimeType: imagePart.inlineData.mimeType,
        description: textPart?.text || '',
        localPath: filePath,
        usedReference: !!(req.referenceImagePath || (Array.isArray(req.references) && req.references.length)),
      },
    };
  },
};

/**
 * w×h → Gemini가 받는 비율 중 **가장 가까운 것**.
 *
 * 🔴 예전 구간 판정에는 경계 버그가 있었다: `ratio < 0.8` 이라 **정확히 0.8(=4:5)** 이 어느 구간에도
 *    안 걸려 `1:1`로 떨어졌다. 그런데 4:5(768×960)는 이 코드베이스에서 가장 흔한 요청이다 —
 *    pack 플래너가 `ASPECT_DIMS['4:5']=[768,960]`로 못박고, 베이크 프롬프트도 "4:5"로 끝나고,
 *    스크립트들도 `// 4:5` 주석을 달아 넣는다. **그게 전부 정사각으로 생성돼 왔다.**
 *
 * 지원 10종은 studio가 이미 라이브로 쓰는 목록과 동일(`ASPECT_ALLOW`, flash·pro 공통) → 새 API 표면 없음.
 * 거리는 log 비율로 잰다(2배 위/아래를 대칭으로 봄). 구간 판정보다 경계에서 안 틀린다.
 *   달라지는 값: 0.8→`1:1`이던 것이 `4:5`(의도대로), 1.2 부근이 `4:3`→`5:4` 등 **더 가까운 쪽**으로.
 */
const GEMINI_ASPECTS = [
  ['21:9', 21 / 9], ['16:9', 16 / 9], ['3:2', 3 / 2], ['4:3', 4 / 3], ['5:4', 5 / 4],
  ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['2:3', 2 / 3], ['9:16', 9 / 16],
];
function getAspectRatio(width, height) {
  const ratio = (width > 0 && height > 0) ? width / height : 1;
  let best = '1:1', bestDist = Infinity;
  for (const [name, value] of GEMINI_ASPECTS) {
    const dist = Math.abs(Math.log(ratio / value));
    if (dist < bestDist) { bestDist = dist; best = name; }
  }
  return best;
}

module.exports = nanoBananaProvider;
// 베이크가 **소스 비율을 그대로 따라가려고** 쓴다(레퍼는 중간 산출물이라 4:5로 고정할 이유가 없다).
//   목록을 refBake 쪽에 복사하면 드리프트하므로 여기서 하나만 노출한다.
module.exports.getAspectRatio = getAspectRatio;
