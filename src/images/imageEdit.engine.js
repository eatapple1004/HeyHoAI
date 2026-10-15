/**
 * ─── Image Editor 엔진 라우팅 (2026-10-15) ───
 *
 * Editor(/image-edit) 의 AI 작업마다 "이 서버에 연결된 엔진 중 그 목적에 맞는 것"을 고른다.
 *   · 엔진 정본은 src/tools/registry.js — 여기선 id 로 고르기만 한다(키 없는 엔진은 isToolAvailable 로 자동 탈락 → 다음 후보).
 *   · 비용도 정본(credit.service IMG_CREDIT)의 해당 엔진 costKey 를 그대로 쓴다(중복 정의 금지).
 *
 * 마스크 원칙: 연결 엔진 중 "진짜 마스크 입력"은 OpenAI GPT Image(images.edit mask)뿐이다.
 *   그 외 엔진으로 마스크 작업을 할 땐 표시 이미지(편집 영역 마젠타)로 위치를 알려 주고,
 *   어느 엔진이든 결과를 **원본 위에 마스크 영역만 페더 합성** → 브러시 밖 픽셀(제품·라벨)은 원본 그대로 남는다.
 *
 * 입력/출력은 전부 Buffer(PNG). 저장·과금·DB 는 generate.route 의 postEditHandler 가 한다.
 */
const sharp = require('sharp');
const { env } = require('../config');
const { getTool, isToolAvailable } = require('../tools/registry');

// op 정의 — mask: 'required' | 'optional' | 'none'. engines = 우선순위(자동 선택 순서). why = UI 에 보이는 선택 이유.
const EDIT_OPS = {
  replace_bg: {
    label: 'Replace background', mask: 'optional',
    engines: ['nano-banana-pro', 'seedream-5-pro', 'flux-3', 'gpt-image'],
    why: 'Keeps the product identical and re-lights it to sit naturally in the new scene.',
  },
  inpaint: {
    label: 'Inpaint', mask: 'required',
    engines: ['gpt-image', 'gpt-image-2.5-flare', 'nano-banana-pro'],
    why: 'True mask input — only the brushed area is regenerated, everything else stays pixel-exact.',
  },
  erase: {
    label: 'Erase object', mask: 'required',
    engines: ['gpt-image', 'gpt-image-2.5-flare', 'nano-banana-pro'],
    why: 'Mask fill that continues the surrounding background without adding anything new.',
  },
  expand: {
    label: 'Expand', mask: 'required',
    engines: ['gpt-image', 'gpt-image-2.5-flare', 'nano-banana-pro'],
    why: 'Fills only the new border; the original photo is pasted back untouched.',
  },
  relight: {
    label: 'Relight', mask: 'none',
    engines: ['nano-banana-pro', 'flux-3', 'seedream-5-pro'],
    why: 'Strongest at changing light, shadow and color temperature while holding shape and labels.',
  },
  fix_text: {
    label: 'Fix label text', mask: 'optional',
    // 마스크 있으면 GPT(정확한 글자 + 진짜 마스크), 없으면 Nano Banana Pro(전체 편집에서 글자 보존이 가장 안정)
    engines: ['gpt-image', 'nano-banana-pro', 'gpt-image-2.5-flare'],
    enginesNoMask: ['nano-banana-pro', 'gpt-image'],
    why: 'Best text rendering. Brush the label to lock the rest of the photo.',
  },
  removebg: {
    label: 'Remove background', mask: 'none',
    engines: ['birefnet'],
    why: 'BiRefNet — clean product cut-out as a transparent PNG.',
  },
  upscale: {
    label: 'Upscale', mask: 'none',
    engines: ['topaz'],
    why: 'Topaz — sharpens real detail instead of repainting it.',
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

/** tools API 용 공개 카탈로그 — Editor 페이지가 op 별 기본 엔진·대안·단가를 그린다. 비어 있으면 Editor = soon. */
function catalog(imageCost) {
  return Object.entries(EDIT_OPS).map(([op, def]) => {
    const list = candidates(op, true);
    if (!list.length) return null;
    const pub = (t) => ({ id: t.id, label: t.label, provider: t.provider, perImage: imageCost(t.costKey || 'pro', 1, false) });
    const noMask = def.enginesNoMask ? candidates(op, false)[0] : null;
    return { id: op, op, label: def.label, mask: def.mask, why: def.why, engine: pub(list[0]), engineNoMask: noMask ? pub(noMask) : null, alternatives: list.map(pub) };
  }).filter(Boolean);
}

// ── 프롬프트 ── 사용자 입력은 "무엇을"만, 보존 규칙은 여기서 붙인다.
function buildPrompt(op, { prompt = '', text = '', hasMask = false, hint = false } = {}) {
  const p = String(prompt || '').trim();
  const where = hasMask ? (hint ? 'inside the region highlighted in magenta in the second image' : 'inside the masked area') : '';
  const keep = 'Keep everything else exactly identical — same product shape, colors, logo, label text, proportions, framing and position.';
  switch (op) {
    case 'replace_bg':
      return `Replace only the background of this photo with: ${p || 'a clean, premium studio backdrop'}. ${keep} `
        + 'Re-light the subject to match the new environment (direction of light, soft contact shadow, subtle reflections) so it looks like one real photograph, not a cut-out.';
    case 'inpaint':
      return `Edit the photo ${where}: ${p || 'clean it up naturally'}. Blend seamlessly with the surrounding lighting, perspective, grain and texture. ${keep}`;
    case 'erase':
      return `Remove the object(s) ${where} and fill the area with a natural continuation of the surrounding background, surface and lighting. Do not add any new objects, text or logos. ${keep}`;
    case 'expand':
      return `This photo was placed on a larger canvas. Fill the empty border ${where} by naturally extending the existing scene — same lighting, perspective, surfaces, background and photographic style. Do not add new products, people or text.${p ? ` Extra direction: ${p}.` : ''} Do not change the original photo area.`;
    case 'relight':
      return `Relight this photo: ${p || 'soft, flattering studio light'}. Change only the lighting — light direction, shadows, highlights, reflections and color temperature. ${keep}`;
    case 'fix_text': {
      const t = String(text || '').trim();
      return `Fix the printed text on the product label${hasMask ? ` ${where}` : ''}. It must read exactly: "${t}". `
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

/** 마젠타 표시 이미지 — 마스크를 직접 못 받는 엔진에 "여기"를 알려 준다 */
async function hintImage(original, mask, W, H) {
  const alpha = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).linear(0.6, 0).extractChannel(0).raw().toBuffer();
  const tint = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 0, b: 200 } } })
    .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return sharp(original).removeAlpha().composite([{ input: tint }]).png().toBuffer();
}

async function download(url) {
  if (String(url).startsWith('data:')) return Buffer.from(String(url).split(',')[1], 'base64');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`result download failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

// ── 엔진 호출 ──
async function runGemini(tool, images, text, aspectRatio) {
  // eslint-disable-next-line global-require
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const parts = images.map((b) => ({ inlineData: { mimeType: 'image/png', data: b.toString('base64') } }));
  parts.push({ text });
  const imageSize = (tool.controls && (tool.controls.imageSize || []).includes('2K')) ? '2K' : undefined;
  const response = await ai.models.generateContent({
    model: tool.model,
    contents: [{ role: 'user', parts }],
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

async function runExternal(tool, images, text, W, H) {
  // eslint-disable-next-line global-require
  const prov = require(`./providers/${tool.provider}.provider`);
  const aspectRatio = nearestAspect(W, H, (tool.controls && tool.controls.aspectRatio) || GEMINI_ASPECTS);
  const [x, y] = aspectRatio.split(':').map(Number);
  const out = await prov.generate({
    prompt: text, width: x >= y ? 1024 : Math.round(1024 * x / y / 8) * 8, height: x >= y ? Math.round(1024 * y / x / 8) * 8 : 1024,
    referenceImageUrls: images.map((b) => `data:image/png;base64,${b.toString('base64')}`),
    model: tool.model, editModel: tool.editModel, editSingle: !!tool.editSingle, sizing: tool.sizing,
    aspectRatio, imageSize: '2K', negative: false, extras: {},
  });
  return download(out.url);
}

/**
 * 편집 실행. original = 지금 캔버스 PNG, mask = 같은 크기 PNG(흰색=편집) | null.
 * @returns {Promise<{ buffer: Buffer, engine: object, prompt: string }>}
 */
async function runEdit({ op, tool, original, mask, prompt, text, factor }) {
  const meta = await sharp(original).metadata();
  const W = meta.width, H = meta.height;

  if (op === 'removebg' || op === 'upscale') {
    // eslint-disable-next-line global-require
    const prov = require(`./providers/${tool.provider}.provider`);
    const imageUrl = `data:image/png;base64,${original.toString('base64')}`;
    const out = op === 'upscale'
      ? await prov.upscale({ model: tool.model, imageUrl, factor: factor === 4 ? 4 : 2 })
      : await prov.removeBackground({ model: tool.model, imageUrl });
    return { buffer: await sharp(await download(out.url)).png().toBuffer(), engine: tool, prompt: '' };
  }

  const m = mask ? await maskRaw(mask, W, H) : null;
  const hasMask = !!(m && m.some((v) => v > 0));
  const useHint = hasMask && tool.provider !== 'openai';
  const text2 = buildPrompt(op, { prompt, text, hasMask, hint: useHint });
  const images = [await sharp(original).removeAlpha().png().toBuffer()];
  if (useHint) images.push(await hintImage(original, m, W, H));

  let raw;
  if (tool.provider === 'openai') raw = await runOpenAI(tool, original, hasMask ? m : null, text2, W, H);
  else if (tool.provider === 'gemini') raw = await runGemini(tool, images, text2, nearestAspect(W, H));
  else raw = await runExternal(tool, images, text2, W, H);

  // 크기를 원본에 맞추고(비율은 가장 가까운 지원 비율이라 cover 로 미세 크롭), 마스크가 있으면 원본 위에 합성
  const fitted = await sharp(raw).resize(W, H, { fit: 'cover' }).png().toBuffer();
  const buffer = hasMask ? await compositeMasked(original, fitted, m, W, H) : fitted;
  return { buffer, engine: tool, prompt: text2 };
}

module.exports = { EDIT_OPS, candidates, pickEngine, catalog, buildPrompt, runEdit, nearestAspect, gptCanvas };
