/**
 * ─── Image Editor 엔진 라우팅 (2026-10-15 · 10-16 개정) ───
 *
 * Editor(/image-edit) 의 AI 작업마다 "이 서버에 연결된 엔진 중 그 목적에 맞는 것"을 고른다.
 *   · 엔진 정본은 src/tools/registry.js — 여기선 id 로 고르기만 한다(키 없는 엔진은 isToolAvailable 로 자동 탈락 → 다음 후보).
 *   · 비용도 정본(credit.service IMG_CREDIT)의 해당 엔진 costKey 를 그대로 쓴다(중복 정의 금지).
 *
 * 마스크 원칙(10-16 개정): 진짜 마스크 입력 엔진 = FLUX Fill(fal) · GPT Image(OpenAI images.edit mask).
 *   마스크를 못 받는 엔진(Nano Banana 등)엔 표시 이미지를 보내지 않는다 — 마젠타 표시가 결과에 그대로 그려지는 사고(dev #145)가 있었다.
 *   대신 지우기·채우기는 편집 영역을 주변색으로 흐려 둔 사진을 보내고, 어느 엔진이든 결과를
 *   **원본 위에 마스크 영역만 페더 합성** → 브러시 밖 픽셀(제품·라벨)은 원본 그대로 남는다.
 *   브러시가 없으면(mask 'optional') 사진 전체에 적용 — 프롬프트 편집 엔진(enginesNoMask)으로 간다.
 *
 * 메모리(10-16): dev 는 pm2 700MB 상한 — 큰 사진을 PNG·base64 로 여러 번 들고 있다가 1.5GB 까지 올라 재시작됐다.
 *   AI 에 보내는 사본은 긴 변 2048(JPEG), 원본 크기 작업은 마지막 합성 한 번만.
 *
 * 입력/출력은 Buffer. 저장·과금·DB 는 generate.route 의 postEditHandler 가 한다.
 */
const sharp = require('sharp');
const { env } = require('../config');
const { getTool, isToolAvailable } = require('../tools/registry');

const AI_SIDE = 2048;          // AI 에 보내는 사본의 긴 변
const FILL_SIDE = 1536;        // FLUX Fill 은 MP 당 과금($0.05/MP) — 사본 ≤2.4MP 로 원가 고정(합성은 원본 크기)
const UPSCALE_MAX_SIDE = 16384; // 업스케일 결과 상한(16K) — 그 이상은 저장·전송·메모리가 감당 못 한다

// op 정의 — mask: 'required' | 'optional' | 'none'. engines = 마스크 있을 때 우선순위, enginesNoMask = 브러시 없이 전체 적용할 때.
const EDIT_OPS = {
  replace_bg: {
    label: 'Replace background', mask: 'optional',
    engines: ['nano-banana-pro', 'flux-fill', 'seedream-5-pro', 'gpt-image'],
    enginesNoMask: ['nano-banana-pro', 'seedream-5-pro', 'flux-3', 'gpt-image'],
    why: 'Keeps the product identical and re-lights it to sit naturally in the new scene.',
  },
  inpaint: {
    label: 'Inpaint', mask: 'optional',
    engines: ['flux-fill', 'gpt-image', 'gpt-image-2.5-flare', 'nano-banana-pro'],
    enginesNoMask: ['nano-banana-pro', 'gpt-image', 'flux-3', 'seedream-5-pro'],
    why: 'Brushed: a true mask model repaints only that area. No brush: the whole photo is edited from your words.',
  },
  erase: {
    label: 'Erase object', mask: 'optional',
    // (10-16 dev 실측) FLUX Fill 은 라벨·포장 위를 지우면 가짜 글자를 그린다 → 프롬프트 없는 전용 지우개(Bria) 1순위, Nano(흐린 패치) 다음
    engines: ['bria-eraser', 'nano-banana-pro', 'flux-fill', 'gpt-image'],
    enginesNoMask: ['nano-banana-pro', 'gpt-image', 'flux-3'],
    why: 'Brushed: a dedicated eraser fills the area with background — it never invents text. No brush: removes what you name, anywhere in the photo.',
  },
  expand: {
    label: 'Expand', mask: 'required',
    engines: ['flux-fill', 'gpt-image', 'gpt-image-2.5-flare', 'nano-banana-pro'],
    why: 'Mask fill on the new border only; the original photo is pasted back untouched.',
  },
  relight: {
    label: 'Relight', mask: 'none',
    engines: ['nano-banana-pro', 'flux-3', 'seedream-5-pro'],
    why: 'Strongest at moving light and shadow while holding shape and labels.',
  },
  fix_text: {
    label: 'Fix label text', mask: 'optional',
    // (10-16) 사용자 평가: Nano Banana Pro 결과가 가장 좋다 → 마스크 유무와 상관없이 1순위. 마스크면 라벨 영역만 합성.
    engines: ['nano-banana-pro', 'gpt-image', 'gpt-image-2.5-flare'],
    enginesNoMask: ['nano-banana-pro', 'gpt-image'],
    why: 'Most faithful lettering. Brush the label to lock the rest of the photo.',
  },
  removebg: {
    label: 'Remove background', mask: 'none',
    engines: ['birefnet'],
    why: 'BiRefNet — clean product cut-out as a transparent PNG.',
  },
  upscale: {
    label: 'Upscale', mask: 'none',
    engines: ['topaz'],
    why: 'Topaz — sharpens real detail instead of repainting it. ×8 and ×16 run two passes (max 16K).',
  },
};

const usable = (id) => { const t = getTool(id); return t && t.enabled && isToolAvailable(t) ? t : null; };

/** op 의 후보 엔진(사용 가능한 것만, 우선순위 순) */
function candidates(op, hasMask) {
  const def = EDIT_OPS[op];
  if (!def) return [];
  const order = (!hasMask && def.enginesNoMask) ? def.enginesNoMask : def.engines;
  return order.map(usable).filter(Boolean);
}

/** 엔진 선택 — override 가 후보 안에 있으면 그것, 아니면 첫 후보. 없으면 null. */
function pickEngine(op, { hasMask = false, override = '' } = {}) {
  const list = candidates(op, hasMask);
  if (override && override !== 'auto') {
    const hit = list.find((t) => t.id === override);
    if (hit) return hit;
  }
  return list[0] || null;
}

/** 업스케일 배율 → Topaz 패스(한 번에 최대 ×4) */
function upscalePasses(factor) {
  return { 2: [2], 4: [4], 8: [4, 2], 16: [4, 4] }[factor] || [2];
}

/** tools API 용 공개 카탈로그 — Editor 페이지가 op 별 기본 엔진·대안·단가를 그린다. 비어 있으면 Editor = soon. */
function catalog(imageCost) {
  return Object.entries(EDIT_OPS).map(([op, def]) => {
    const list = candidates(op, true);
    const noMaskList = def.enginesNoMask ? candidates(op, false) : [];
    if (!list.length && !noMaskList.length) return null;
    const pub = (t) => ({ id: t.id, label: t.label, provider: t.provider, perImage: imageCost(t.costKey || 'pro', 1, false) });
    const all = [...list, ...noMaskList.filter((t) => !list.some((x) => x.id === t.id))];
    return {
      id: op, op, label: def.label, mask: def.mask, why: def.why,
      engine: pub(list[0] || noMaskList[0]), engineNoMask: noMaskList[0] ? pub(noMaskList[0]) : null,
      alternatives: all.map(pub),
      ...(op === 'upscale' ? { factors: [2, 4, 8, 16], maxSide: UPSCALE_MAX_SIDE } : {}),
    };
  }).filter(Boolean);
}

// ── 조명(Relight) — 패드에서 고른 값 → 문장 ──
//   light: { x:-1..1(왼→오), y:-1..1(아래→위), behind:bool, intensity:0..100, softness:0..100, kelvin:2000..9000, color:'#rrggbb'|'' , ambient:0..100 }
function describeLight(light) {
  if (!light || typeof light !== 'object') return '';
  const n = (v, d) => (Number.isFinite(+v) ? +v : d);
  const x = Math.max(-1, Math.min(1, n(light.x, -0.5))), y = Math.max(-1, Math.min(1, n(light.y, 0.4)));
  const az = Math.round(x * 90), el = Math.round(y * 75);
  const side = Math.abs(az) < 12 ? 'straight on from the camera side' : `${Math.abs(az)}° to the ${az < 0 ? 'left' : 'right'} of the camera`;
  const height = Math.abs(el) < 10 ? 'at the subject\'s height' : el > 0 ? `${el}° above` : `${-el}° below (uplight)`;
  const pos = light.behind ? `placed BEHIND the subject (back/rim light), ${side}, ${height} — outlining the edges with a bright rim and putting the front in gentle shadow`
    : `placed in front, ${side}, ${height}`;
  const inten = n(light.intensity, 60), soft = n(light.softness, 50), amb = n(light.ambient, 35);
  const kelvin = Math.round(n(light.kelvin, 5200));
  const warmth = kelvin < 3300 ? 'very warm tungsten' : kelvin < 4500 ? 'warm' : kelvin < 5800 ? 'neutral daylight' : kelvin < 7000 ? 'cool' : 'very cool blue';
  const color = /^#[0-9a-f]{6}$/i.test(light.color || '') && light.color.toLowerCase() !== '#ffffff' ? ` tinted ${light.color}` : '';
  return `One key light ${pos}. `
    + `Light quality: ${soft > 66 ? 'very soft and diffused (large softbox), feathered shadow edges' : soft > 33 ? 'medium-soft, defined but gentle shadow edges' : 'hard and direct, crisp sharp-edged shadows'}. `
    + `Intensity: ${inten > 75 ? 'strong, high contrast' : inten > 40 ? 'moderate' : 'subtle, low contrast'}. `
    + `Color: ${warmth} (~${kelvin}K)${color}. `
    + `Ambient fill: ${amb > 66 ? 'bright, shadows well filled' : amb > 33 ? 'medium' : 'low, deep moody shadows'}. `
    + 'Cast shadows, highlights, specular reflections on glossy surfaces and the contact shadow must all follow this light direction consistently.';
}

// ── 프롬프트 ── 사용자 입력은 "무엇을"만, 보존 규칙은 여기서 붙인다.
function buildPrompt(op, { prompt = '', text = '', hasMask = false, light = null, patched = false } = {}) {
  const p = String(prompt || '').trim();
  const keep = 'Keep everything else exactly identical — same product shape, colors, logo, label text, proportions, framing and position.';
  const area = patched ? 'the softly blurred patch in the photo' : 'the masked area';
  switch (op) {
    case 'replace_bg':
      return `Replace only the background of this photo with: ${p || 'a clean, premium studio backdrop'}. ${keep} `
        + 'Re-light the subject to match the new environment (direction of light, soft contact shadow, subtle reflections) so it looks like one real photograph, not a cut-out.';
    case 'inpaint':
      return hasMask
        ? `${patched ? `In ${area}, ` : ''}${p || 'clean it up naturally'}. Blend seamlessly with the surrounding lighting, perspective, grain and texture.${patched ? ` ${keep}` : ''}`
        : `Edit this photo: ${p}. Change only what is asked. ${keep}`;
    case 'erase':
      return hasMask
        ? (patched
          ? `Restore ${area} so it looks like natural, untouched background — continue the surrounding surface, texture, pattern and lighting through it. Do not add any object, text, letters or logo there. ${keep}`
          : 'clean plain surface that seamlessly continues the surrounding material, color, texture and lighting. No text, no letters, no numbers, no logos, no labels, no new objects — just the bare surface or background')
        : `Remove ${p || 'the distracting objects'} from this photo completely and fill where it was with a natural continuation of the surface or background behind it. Do not add anything new — no new text, letters or logos — and do not rewrite any existing printed text. ${keep}`;
    case 'expand':
      return patched
        ? `This photo was placed on a larger canvas; the blurred border is empty space. Extend the existing scene into it naturally — same lighting, perspective, surfaces, background and photographic style. Do not add new products, people or text.${p ? ` ${p}.` : ''} Do not change the original photo area.`
        : `${p ? `${p}. ` : ''}Seamless natural continuation of the surrounding scene, same lighting, perspective, surfaces and photographic style, no new objects, no text`;
    case 'relight': {
      const l = describeLight(light);
      return `Relight this photo. ${l}${p ? ` Extra direction: ${p}.` : ''} Change only the lighting — light direction, shadows, highlights, reflections and color temperature. ${keep}`;
    }
    case 'fix_text': {
      const t = String(text || '').trim();
      return `Fix the printed text on the product label. It must read exactly: "${t}". `
        + 'Match the original typography — font style, weight, color, size, curvature, perspective, material and print texture. Spell every character exactly as given. '
        + `${p ? `${p}. ` : ''}${keep}`;
    }
    default:
      return p;
  }
}

// ── 이미지 유틸 ── ⚠️ sharp 는 1채널 raw 에 blur·resize 를 걸면 3채널로 내보낸다 → 마스크는 매번 extractChannel(0) 로 1채널 고정.
const GEMINI_ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
function nearestAspect(w, h, list = GEMINI_ASPECTS) {
  const r = w / h;
  let best = list[0], d = Infinity;
  for (const a of list) {
    const [x, y] = a.split(':').map(Number);
    const dd = Math.abs(Math.log(r / (x / y)));
    if (dd < d) { d = dd; best = a; }
  }
  return best;
}
function fitSide(W, H, max = AI_SIDE) {
  const k = Math.min(1, max / Math.max(W, H));
  return [Math.max(8, Math.round(W * k)), Math.max(8, Math.round(H * k))];
}

/** 마스크 → W×H 1채널(0=유지, 255=편집) raw */
async function maskRaw(maskBuf, W, H) {
  return sharp(maskBuf).resize(W, H, { fit: 'fill' }).flatten({ background: '#000' }).greyscale().threshold(128).extractChannel(0).raw().toBuffer();
}

/** 결과를 원본 위에 마스크 영역만 합성(페더). 브러시 밖 = 원본 픽셀 그대로. */
async function compositeMasked(original, result, mask, W, H) {
  const sigma = Math.max(1.5, Math.min(W, H) / 300);
  const soft = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
  // removeAlpha 와 joinChannel 을 한 파이프라인에 두면 붙인 알파까지 지워진다 → 3채널 raw 로 끊고 붙인다
  const rgb = await sharp(result).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const top = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .joinChannel(soft, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return sharp(original).composite([{ input: top }]).png().toBuffer();
}

/** 편집 영역을 주변색으로 흐려 둔 사본(w×h JPEG) — 마스크를 못 받는 엔진용. 표시색을 쓰지 않으니 결과에 묻어나지 않는다. */
async function patchedCopy(original, mask, W, H, w, h) {
  const small = await sharp(original).removeAlpha().resize(w, h, { fit: 'fill' }).raw().toBuffer();
  const blurred = await sharp(small, { raw: { width: w, height: h, channels: 3 } }).blur(Math.max(8, Math.min(w, h) / 25)).raw().toBuffer();
  const m = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).resize(w, h, { fit: 'fill' }).blur(2).extractChannel(0).raw().toBuffer();
  for (let i = 0, j = 0; j < m.length; j++, i += 3) {
    const a = m[j] / 255;
    if (a > 0) { small[i] = small[i] * (1 - a) + blurred[i] * a; small[i + 1] = small[i + 1] * (1 - a) + blurred[i + 1] * a; small[i + 2] = small[i + 2] * (1 - a) + blurred[i + 2] * a; }
  }
  return sharp(small, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

async function download(url) {
  if (String(url).startsWith('data:')) return Buffer.from(String(url).split(',')[1], 'base64');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`result download failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}
const dataUrl = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;

// ── 엔진 호출 ──
async function runGemini(tool, image, text, aspectRatio) {
  // eslint-disable-next-line global-require
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const imageSize = (tool.controls && (tool.controls.imageSize || []).includes('2K')) ? '2K' : undefined;
  const response = await ai.models.generateContent({
    model: tool.model,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: image.toString('base64') } }, { text }] }],
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio, ...(imageSize ? { imageSize } : {}) } },
  });
  const cand = response.candidates && response.candidates[0];
  const img = ((cand && cand.content && cand.content.parts) || []).find((p) => p.inlineData);
  if (!img) throw new Error(`Blocked: ${(cand && cand.finishReason) || 'no image returned'}`);
  return Buffer.from(img.inlineData.data, 'base64');
}

/** GPT Image 캔버스(1:1·3:2·2:3)에 레터박스로 얹는다 — 비율 왜곡 없이 보내고, 돌아오면 같은 자리만 잘라 낸다. */
function gptCanvas(W, H) {
  const r = W / H;
  const [cw, ch] = r > 1.2 ? [1536, 1024] : r < 0.83 ? [1024, 1536] : [1024, 1024];
  const s = Math.min(cw / W, ch / H);
  const w = Math.round(W * s), h = Math.round(H * s);
  return { cw, ch, w, h, left: Math.floor((cw - w) / 2), top: Math.floor((ch - h) / 2) };
}

async function runOpenAI(tool, original, mask, text, W, H) {
  // eslint-disable-next-line global-require
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const g = gptCanvas(W, H);
  const pad = { top: g.top, bottom: g.ch - g.h - g.top, left: g.left, right: g.cw - g.w - g.left };
  const img = await sharp(original).removeAlpha().resize(g.w, g.h, { fit: 'fill' })
    .extend({ ...pad, background: { r: 128, g: 128, b: 128 } }).png().toBuffer();
  const params = { model: tool.model, image: new File([img], 'image.png', { type: 'image/png' }), prompt: text, n: 1, size: `${g.cw}x${g.ch}`, quality: 'high' };
  if (mask) {
    // OpenAI 마스크 = 알파 0 인 곳을 편집. 레터박스 여백은 유지(알파 255).
    const m = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).resize(g.w, g.h, { fit: 'fill' })
      .extend({ ...pad, background: '#000' }).negate().extractChannel(0).raw().toBuffer();
    const mPng = await sharp({ create: { width: g.cw, height: g.ch, channels: 3, background: '#000' } })
      .joinChannel(m, { raw: { width: g.cw, height: g.ch, channels: 1 } }).png().toBuffer();
    params.mask = new File([mPng], 'mask.png', { type: 'image/png' });
  }
  const out = await openai.images.edit(params);
  const buf = Buffer.from(out.data[0].b64_json, 'base64');
  // sharp 는 한 파이프라인에 resize 를 하나만 받는다 → 캔버스 맞춤 · 레터박스 잘라내기 · 원본 크기를 단계별로
  const canvas = await sharp(buf).resize(g.cw, g.ch, { fit: 'fill' }).png().toBuffer();
  const inner = await sharp(canvas).extract({ left: g.left, top: g.top, width: g.w, height: g.h }).png().toBuffer();
  return sharp(inner).resize(W, H, { fit: 'fill' }).png().toBuffer();
}

/** FLUX Fill(fal) — 진짜 마스크(흰색=채움). 긴 변 2048 사본으로 보내고 결과는 호출부가 원본 크기로 합성한다. */
async function runFluxFill(tool, original, mask, text, W, H) {
  // eslint-disable-next-line global-require
  const prov = require(`./providers/${tool.provider}.provider`);
  const [w, h] = fitSide(W, H, FILL_SIDE);
  const img = await sharp(original).removeAlpha().resize(w, h, { fit: 'fill' }).jpeg({ quality: 93 }).toBuffer();
  const m = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).resize(w, h, { fit: 'fill' }).extractChannel(0).png().toBuffer();
  const out = await prov.fill({ model: tool.model, imageUrl: dataUrl(img, 'image/jpeg'), maskUrl: dataUrl(m, 'image/png'), prompt: text });
  return download(out.url);
}

/** Bria Eraser(fal) — 프롬프트 없는 지우개. 마스크를 살짝 넓혀(가장자리 잔상 방지) 긴 변 2048 사본으로 보낸다. */
async function runBriaEraser(tool, original, mask, W, H) {
  // eslint-disable-next-line global-require
  const prov = require(`./providers/${tool.provider}.provider`);
  const [w, h] = fitSide(W, H);
  const img = await sharp(original).removeAlpha().resize(w, h, { fit: 'fill' }).jpeg({ quality: 93 }).toBuffer();
  const grow = Math.max(2, Math.round(Math.min(w, h) / 200));
  const m = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).resize(w, h, { fit: 'fill' }).blur(grow).threshold(16).extractChannel(0).png().toBuffer();
  const out = await prov.erase({ model: tool.model, imageUrl: dataUrl(img, 'image/jpeg'), maskUrl: dataUrl(m, 'image/png') });
  return download(out.url);
}

async function runExternal(tool, image, text, W, H) {
  // eslint-disable-next-line global-require
  const prov = require(`./providers/${tool.provider}.provider`);
  const aspectRatio = nearestAspect(W, H, (tool.controls && tool.controls.aspectRatio) || GEMINI_ASPECTS);
  const [x, y] = aspectRatio.split(':').map(Number);
  const out = await prov.generate({
    prompt: text, width: x >= y ? 1024 : Math.round(1024 * x / y / 8) * 8, height: x >= y ? Math.round(1024 * y / x / 8) * 8 : 1024,
    referenceImageUrls: [dataUrl(image, 'image/jpeg')],
    model: tool.model, editModel: tool.editModel, editSingle: !!tool.editSingle, sizing: tool.sizing,
    aspectRatio, imageSize: '2K', negative: false, extras: {},
  });
  return download(out.url);
}

/**
 * 편집 실행. original = 지금 캔버스(아무 포맷), mask = 같은 비율 PNG(흰색=편집) | null.
 * @returns {Promise<{ buffer: Buffer, ext: 'png'|'jpg', engine: object, prompt: string, passes?: number }>}
 */
async function runEdit({ op, tool, original, mask, prompt, text, factor, light }) {
  const meta = await sharp(original).metadata();
  const W = meta.width, H = meta.height;

  if (op === 'removebg') {
    // eslint-disable-next-line global-require
    const prov = require(`./providers/${tool.provider}.provider`);
    const out = await prov.removeBackground({ model: tool.model, imageUrl: dataUrl(await sharp(original).png().toBuffer(), 'image/png') });
    return { buffer: await download(out.url), ext: 'png', engine: tool, prompt: '' };
  }
  if (op === 'upscale') {
    // Topaz 는 한 번에 ×4 까지 — ×8·×16 은 결과 URL 을 다음 패스 입력으로 그대로 넘긴다(중간 다운로드 없음).
    const passes = upscalePasses(factor);
    const total = passes.reduce((a, b) => a * b, 1);
    if (Math.max(W, H) * total > UPSCALE_MAX_SIDE) throw Object.assign(new Error(`×${total} would be ${Math.max(W, H) * total}px — max ${UPSCALE_MAX_SIDE}px. Pick a smaller factor.`), { statusCode: 400 });
    // eslint-disable-next-line global-require
    const prov = require(`./providers/${tool.provider}.provider`);
    const big = Math.max(W, H) * total > 8192; // 8K 넘으면 JPEG(PNG 는 수백 MB 라 저장·메모리가 못 버틴다)
    let url = dataUrl(await sharp(original).png().toBuffer(), 'image/png');
    for (let i = 0; i < passes.length; i++) {
      const last = i === passes.length - 1;
      const out = await prov.upscale({ model: tool.model, imageUrl: url, factor: passes[i], outputFormat: last && big ? 'jpeg' : 'png' });
      url = out.url;
    }
    return { buffer: await download(url), ext: big ? 'jpg' : 'png', engine: tool, prompt: '', passes: passes.length };
  }

  const m = mask ? await maskRaw(mask, W, H) : null;
  const hasMask = !!(m && m.some((v) => v > 0));
  const trueMask = hasMask && (tool.provider === 'openai' || tool.id === 'flux-fill' || tool.id === 'bria-eraser');
  const patched = hasMask && !trueMask && (op === 'erase' || op === 'inpaint' || op === 'expand');
  const text2 = buildPrompt(op, { prompt, text, hasMask, light, patched });

  let raw;
  if (tool.id === 'bria-eraser') raw = await runBriaEraser(tool, original, m, W, H);
  else if (tool.id === 'flux-fill') raw = await runFluxFill(tool, original, m, text2, W, H);
  else if (tool.provider === 'openai') raw = await runOpenAI(tool, original, hasMask ? m : null, text2, W, H);
  else {
    const [w, h] = fitSide(W, H);
    const img = patched ? await patchedCopy(original, m, W, H, w, h)
      : await sharp(original).removeAlpha().resize(w, h, { fit: 'fill' }).jpeg({ quality: 92 }).toBuffer();
    raw = tool.provider === 'gemini' ? await runGemini(tool, img, text2, nearestAspect(W, H)) : await runExternal(tool, img, text2, W, H);
  }

  // 크기를 원본에 맞추고(비율은 가장 가까운 지원 비율이라 cover 로 미세 크롭), 마스크가 있으면 원본 위에 합성
  const fitted = await sharp(raw).resize(W, H, { fit: 'cover' }).png().toBuffer();
  raw = null;
  // 지우기는 브러시 가장자리에 물체 잔상이 남기 쉬워 합성 마스크를 살짝 넓힌다
  const mc = hasMask && op === 'erase'
    ? await sharp(m, { raw: { width: W, height: H, channels: 1 } }).blur(Math.max(2, Math.min(W, H) / 250)).threshold(16).extractChannel(0).raw().toBuffer()
    : m;
  const buffer = hasMask ? await compositeMasked(original, fitted, mc, W, H) : fitted;
  return { buffer, ext: 'png', engine: tool, prompt: text2 };
}

module.exports = { EDIT_OPS, candidates, pickEngine, catalog, buildPrompt, describeLight, runEdit, nearestAspect, gptCanvas, upscalePasses, UPSCALE_MAX_SIDE };
