/**
 * adminRefine.route.js — 관리자 프롬프트 자동 정밀화 (author → generate → judge → revise 루프)
 *
 * 관리자가 [목표 이미지]+[레퍼런스 이미지]를 올리면:
 *   0) 목표 이미지를 읽어 초기 프롬프트 + 평가 체크리스트를 '처음부터' 작성(target-driven)
 *   1) 레퍼런스 디자인을 목표 구도로 생성 → 판정 → 실패 항목 고쳐 프롬프트 재작성 → 반복
 * 각 단계를 NDJSON으로 스트리밍한다.
 *
 *   생성: Gemini 이미지(GEMINI_API_KEY, 기본 Nano Banana Pro = gemini-3-pro-image-preview)
 *   판정/작성: Claude 비전(ANTHROPIC_API_KEY)
 */
const { Router } = require('express');
const { GoogleGenAI } = require('@google/genai');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAdmin } = require('../middleware/auth');

const router = Router();

// admin 도구는 품질 우선 → 전용 REFINE_IMAGE_MODEL(기본 Nano Banana Pro)로 스튜디오(GEMINI_IMAGE_MODEL, flash)와 분리.
// 서버 .env가 flash여도 admin refine/apply는 Pro로 생성 → 로컬과 동일 품질/수렴.
const IMG_MODEL = process.env.REFINE_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const JUDGE_MODEL = process.env.REFINE_JUDGE_MODEL || 'claude-sonnet-4-6';

// 단발 생성 품질 보강(확대/크롭 방지 + 고해상도) — 두 이미지 입력 시 img2img 줌인 경향 억제
const QUALITY_SUFFIX = '\n\nRender a FRESH, full, well-composed scene at high resolution with sharp focus and fine detail — do NOT simply zoom into, crop, tightly frame, or lightly edit the input images. Reframe the whole composition anew. Avoid soft, blurry, low-resolution, or overly zoomed output.';

const parseJson = (raw) => {
  let t = (raw || '{}').replace(/```(json)?/gi, '').trim();
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
};

// 디자인 일치는 항상 REFERENCE와 비교(구도 체크리스트와 별개로 매 판정에 추가)
const DESIGN_ITEM = { k: 'designMatchesReference', d: '네일/피사체 디자인(베이스색·아트·글리터·참·마감)이 REFERENCE와 일치(구도가 아닌 디자인 자체 · TARGET의 디자인과 같으면 false)' };

// ── 0) 목표 이미지 → 초기 프롬프트 + 평가 체크리스트 '처음부터' 작성 ──
async function authorFromTarget(anth, ref, target, goal) {
  const goalBlock = (goal && String(goal).trim())
    ? `\n\n[관리자가 지정한 목표 — 최우선 반영]: ${String(goal).trim()}\n이 목표를 prompt와 checklist에 우선 반영하라(구도·배치·배경·연출·개수·분위기 등). 단, 네일/피사체 "디자인"은 여전히 REFERENCE에서만 가져온다(위 규칙 유지).`
    : '';
  const instruction = `너는 이미지 생성 프롬프트 작가다. 두 이미지가 주어진다.
[TARGET] = 결과물의 "구도/시점/포즈/프레이밍/배경/조명" 본보기.
[REFERENCE] = 결과물의 네일/피사체에 입힐 "디자인(베이스색·네일아트·글리터·참·마감)" 원본.

목표: REFERENCE의 디자인을 TARGET의 구도로 렌더링하는 text-to-image 프롬프트를 작성하라.
- prompt: TARGET의 손 포즈·시점(각도)·프레이밍·배경·조명·크롭만 구체적으로 묘사하라.
  ⚠️ 네일/피사체의 "디자인(색·아트·글리터·참·마감)"은 절대 TARGET을 보고 묘사하지 말 것. TARGET의 네일 색/디자인 단어(예: pearl-white, gold wire, crystal, french tip 등)를 프롬프트에 넣지 마라.
  디자인은 "reproduce the EXACT nail design — base color, nail art, glitter, charms and finish — from the reference image, applied to these nails" 처럼 REFERENCE에서 가져오라고 지시만 하라.
- negative: 벗어나면 안 되는 것들 + "nail design copied from the target, target's nail colors, wrong nail design not matching the reference".
- checklist: 결과물이 TARGET의 "구도·형식"에 부합하는지 판정할 기준 5~7개. 각 {k: camelCase, d: 한국어 한 줄}. (⚠️ 디자인 자체는 넣지 마라 — 디자인 일치는 자동으로 REFERENCE와 비교된다. 오직 구도·시점·포즈·배경·프레이밍·개수만.)

아래 JSON만 출력(코드펜스 금지):
{"prompt":"...","negative":"...","checklist":[{"k":"...","d":"..."}]}${goalBlock}`;
  const msg = await anth.messages.create({
    model: JUDGE_MODEL, max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: instruction },
      { type: 'text', text: '[TARGET]:' },
      { type: 'image', source: { type: 'base64', media_type: target.mime, data: target.b64 } },
      { type: 'text', text: '[REFERENCE]:' },
      { type: 'image', source: { type: 'base64', media_type: ref.mime, data: ref.b64 } },
    ] }],
  });
  const out = parseJson((msg.content.find((c) => c.type === 'text') || {}).text);
  if (!out.prompt || !Array.isArray(out.checklist) || !out.checklist.length) throw new Error('초기 프롬프트 작성 실패(형식 오류)');
  return out;
}

async function generate(ai, prompt, negative, ref, target) {
  const full = (negative ? `${prompt}\n\nAvoid: ${negative}` : prompt) + QUALITY_SUFFIX;
  const parts = [
    { text: 'IMAGE 1 — DESIGN SOURCE: reproduce this subject\'s EXACT colors, patterns, texture and decorative elements.' },
    { inlineData: { mimeType: ref.mime, data: ref.b64 } },
    { text: 'IMAGE 2 — LAYOUT REFERENCE ONLY: match its composition, subject count, camera viewpoint, background and shadow. Do NOT copy IMAGE 2\'s colors or its specific subject — take ONLY its layout/framing/viewpoint/background from it.' },
    { inlineData: { mimeType: target.mime, data: target.b64 } },
    { text: full },
  ];
  const resp = await ai.models.generateContent({
    model: IMG_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  });
  const p = (resp.candidates?.[0]?.content?.parts || []).find((x) => x.inlineData);
  if (!p) throw new Error('생성 실패: 이미지 없음');
  return { b64: p.inlineData.data, mime: p.inlineData.mimeType || 'image/png' };
}

// ── 판정: 구도(vs TARGET) + 디자인 일치(vs REFERENCE) 채점 + 프롬프트 재작성 ──
async function judge(anth, gen, target, ref, checklist) {
  const rubricList = checklist.map((c) => `- ${c.k}: ${c.d}`).join('\n');
  const keys = checklist.map((c) => `"${c.k}":true|false`).join(',');
  const instruction = `너는 이미지 심사관이다. 3장이 주어진다: [TARGET](목표 구도), [REFERENCE](네일/피사체 디자인 원본), [GENERATED](결과).
아래 각 항목을 true/false로 채점하라:
- 구도/시점/포즈/배경/프레이밍/개수 관련 항목: GENERATED를 [TARGET]과 비교.
- "designMatchesReference": GENERATED의 네일/피사체 디자인(베이스색·네일아트·글리터·참·마감)이 [REFERENCE]와 일치하는지 비교하라. 구도가 아니라 '디자인 자체'다. GENERATED가 [TARGET]의 네일 디자인을 그대로 따라했으면(=REFERENCE 디자인이 아니면) false.
${rubricList}

실패 항목을 고치도록 프롬프트를 다시 써라. 특히 designMatchesReference가 false면, 프롬프트가 REFERENCE 디자인을 확실히 입히도록(그리고 TARGET 네일 디자인은 배제하도록) 수정하라. 아래 JSON만 출력(코드펜스 금지):
{"scores":{${keys}},"critique":"타깃/레퍼런스와 다른 점 1-2문장","revisedPrompt":"전체 프롬프트","revisedNegative":"전체 네거티브"}`;
  const msg = await anth.messages.create({
    model: JUDGE_MODEL, max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: instruction },
      { type: 'text', text: '[TARGET]:' },
      { type: 'image', source: { type: 'base64', media_type: target.mime, data: target.b64 } },
      { type: 'text', text: '[REFERENCE]:' },
      { type: 'image', source: { type: 'base64', media_type: ref.mime, data: ref.b64 } },
      { type: 'text', text: '[GENERATED]:' },
      { type: 'image', source: { type: 'base64', media_type: gen.mime, data: gen.b64 } },
    ] }],
  });
  return parseJson((msg.content.find((c) => c.type === 'text') || {}).text);
}

// POST /api/admin/refine — NDJSON 스트림 { ref:{b64,mime}, target:{b64,mime}, max? }
async function refineHandler(req, res) {
  const { ref, target, goal } = req.body || {};
  const max = Math.min(Math.max(parseInt(req.body?.max || 6, 10), 1), 12);
  if (!ref?.b64 || !target?.b64) return res.status(400).json({ error: 'ref, target 이미지가 필요합니다.' });
  if (!process.env.GEMINI_API_KEY || !process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API 키 미설정(.env)' });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  const send = (o) => { try { res.write(JSON.stringify(o) + '\n'); } catch (_) {} };

  // 실제 이탈만 감지(req.on('close')는 업로드 종료 즉시 발화하므로 부적합)
  let aborted = false;
  res.on('close', () => { if (!res.writableEnded) aborted = true; });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const anth = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const refImg = { b64: ref.b64, mime: ref.mime || 'image/png' };
  const tgtImg = { b64: target.b64, mime: target.mime || 'image/png' };

  const withTimeout = (p, ms, label) => Promise.race([
    p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} 타임아웃 (${ms / 1000}s)`)), ms)),
  ]);

  try {
    // 0) 목표 사진을 읽고 초기 프롬프트 + 체크리스트 작성
    send({ type: 'authoring' });
    console.log('[refine] 목표 이미지 분석 → 초기 프롬프트 작성…');
    const authored = await withTimeout(authorFromTarget(anth, refImg, tgtImg, goal), 90000, '프롬프트 작성');
    let prompt = authored.prompt;
    let negative = authored.negative || '';
    const checklist = [...authored.checklist, DESIGN_ITEM]; // 구도(vs TARGET) + 디자인 일치(vs REFERENCE)
    console.log(`[refine] 초기 프롬프트 작성 완료 · 체크리스트 ${checklist.length}개(디자인 일치 포함)`);
    send({ type: 'start', max, imgModel: IMG_MODEL, judgeModel: JUDGE_MODEL, rubric: checklist, critical: checklist.map((c) => c.k), authoredPrompt: prompt, authoredNegative: negative });

    // 최종 결과 = 성공(수렴) iter가 있으면 그것, 없으면 마지막(N번째) iter.
    // (수렴 시 그 iter에서 break → last가 곧 성공 iter가 됨)
    let last = null;
    for (let i = 1; i <= max && !aborted; i++) {
      send({ type: 'progress', i, stage: 'generate' });
      const t0 = Date.now();
      console.log(`[refine] iter ${i} 생성 시작 (${IMG_MODEL})…`);
      const gen = await withTimeout(generate(ai, prompt, negative, refImg, tgtImg), 180000, '생성');
      console.log(`[refine] iter ${i} 생성 완료 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      if (aborted) break;
      const image = `data:${gen.mime};base64,${gen.b64}`;
      send({ type: 'progress', i, stage: 'judge', image });
      const v = await withTimeout(judge(anth, gen, tgtImg, refImg, checklist), 90000, '판정');
      console.log(`[refine] iter ${i} 판정 완료`);
      const okCount = checklist.filter((c) => v.scores?.[c.k]).length;
      const allPass = okCount === checklist.length;
      send({ type: 'iter', i, image, scores: v.scores, okCount, total: checklist.length, critPass: allPass, critique: v.critique, prompt, negative });
      last = { i, image, okCount, prompt, negative, converged: allPass }; // 항상 최신 iter로 갱신
      if (allPass) { send({ type: 'converged', i }); break; }
      prompt = v.revisedPrompt || prompt;
      negative = v.revisedNegative || negative;
    }
    send({ type: 'done', best: last, total: checklist.length });
  } catch (e) {
    console.error('[refine] 오류:', e.message);
    send({ type: 'error', message: e.message });
  }
  res.end();
}
router.post('/admin/refine', requireAdmin, refineHandler);

// ── ② 생성 단계: 고정된 프롬프트를 레퍼런스에만 적용(타깃 없이) → N장 생성 ──
// data URL 문자열 또는 {b64,mime} → {b64,mime} 정규화
function toImg(x) {
  if (!x) return null;
  if (typeof x === 'string') { const m = x.match(/^data:([^;]+);base64,(.*)$/); return m ? { mime: m[1], b64: m[2] } : null; }
  return x.b64 ? { b64: x.b64, mime: x.mime || 'image/png' } : null;
}

async function generateRefOnly(ai, prompt, negative, ref, layout) {
  const fullQ = (negative ? `${prompt}\n\nAvoid: ${negative}` : prompt) + QUALITY_SUFFIX;
  const parts = [
    { text: 'IMAGE 1 — reference: reproduce this subject\'s exact colors, design and decorative elements.' },
    { inlineData: { mimeType: ref.mime, data: ref.b64 } },
  ];
  if (layout) { // 템플릿에 지정된 타깃(레이아웃) 이미지 — 구도/시점/배경만 모방, 색·피사체는 IMAGE 1
    parts.push({ text: 'IMAGE 2 — layout target: match ONLY its composition, subject count, camera viewpoint, background and shadow. Do NOT copy its colors or subject.' });
    parts.push({ inlineData: { mimeType: layout.mime, data: layout.b64 } });
  }
  parts.push({ text: fullQ });
  const resp = await ai.models.generateContent({
    model: IMG_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  });
  const p = (resp.candidates?.[0]?.content?.parts || []).find((x) => x.inlineData);
  if (!p) throw new Error('생성 실패: 이미지 없음');
  return { b64: p.inlineData.data, mime: p.inlineData.mimeType || 'image/png' };
}

// POST /api/admin/refine/apply — { ref, prompt, negative?, count?, layout?, loop? } → NDJSON 스트림
//   loop=false(기본): count장 단발 생성 · loop=true: 타깃에 수렴할 때까지 재시도해 최고/수렴 1장 선택
async function applyHandler(req, res) {
  const { ref, prompt, negative, layout } = req.body || {};
  const count = Math.min(Math.max(parseInt(req.body?.count || 3, 10), 1), 8);
  const loop = req.body?.loop === true || req.body?.loop === 'true';
  const layoutImg = toImg(layout); // 템플릿 타깃 이미지(옵션)
  if (!ref?.b64 || !prompt) return res.status(400).json({ error: 'ref 이미지와 prompt가 필요합니다.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });
  if (loop && (!layoutImg || !process.env.ANTHROPIC_API_KEY)) {
    return res.status(400).json({ error: '루프 모드는 템플릿 타깃 이미지 + ANTHROPIC_API_KEY가 필요합니다.' });
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  const send = (o) => { try { res.write(JSON.stringify(o) + '\n'); } catch (_) {} };
  let aborted = false;
  res.on('close', () => { if (!res.writableEnded) aborted = true; });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const refImg = { b64: ref.b64, mime: ref.mime || 'image/png' };
  const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(`${l} 타임아웃`)), ms))]);

  try {
    if (loop) {
      // 판정 루프: 타깃(layout)에 수렴할 때까지 재시도 → 최고/수렴 1장 선택 (count = 최대 반복)
      const anth = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      console.log('[apply-loop] 타깃 분석 → 체크리스트 작성…');
      const authored = await withTimeout(authorFromTarget(anth, refImg, layoutImg), 90000, '기준 작성');
      const checklist = [...authored.checklist, DESIGN_ITEM]; // 구도(vs 타깃) + 디자인 일치(vs 레퍼런스)
      let curPrompt = prompt, curNeg = negative || '', best = null;
      send({ type: 'start', count, imgModel: IMG_MODEL, withLayout: true, loop: true, rubric: checklist });
      for (let i = 1; i <= count && !aborted; i++) {
        send({ type: 'progress', i, stage: 'generate' });
        const gen = await withTimeout(generate(ai, curPrompt, curNeg, refImg, layoutImg), 180000, '생성');
        if (aborted) break;
        const image = `data:${gen.mime};base64,${gen.b64}`;
        send({ type: 'progress', i, stage: 'judge', image });
        const v = await withTimeout(judge(anth, gen, layoutImg, refImg, checklist), 90000, '판정');
        const okCount = checklist.filter((c) => v.scores?.[c.k]).length;
        const allPass = okCount === checklist.length;
        send({ type: 'iter', i, image, okCount, total: checklist.length, critPass: allPass, critique: v.critique });
        if (!best || okCount > best.okCount) best = { i, image, okCount, converged: allPass }; // 최고 선택
        if (allPass) { best.converged = true; send({ type: 'converged', i }); break; }
        curPrompt = v.revisedPrompt || curPrompt; curNeg = v.revisedNegative || curNeg;
      }
      send({ type: 'done', best, total: checklist.length });
    } else {
      // 단발: count장 생성
      send({ type: 'start', count, imgModel: IMG_MODEL, withLayout: !!layoutImg, loop: false });
      for (let i = 1; i <= count && !aborted; i++) {
        send({ type: 'progress', i });
        console.log(`[apply] ${i}/${count} 생성…${layoutImg ? ' (+타깃)' : ''}`);
        const g = await withTimeout(generateRefOnly(ai, prompt, negative, refImg, layoutImg), 180000, '생성');
        send({ type: 'img', i, image: `data:${g.mime};base64,${g.b64}` });
      }
      send({ type: 'done' });
    }
  } catch (e) { console.error('[apply] 오류:', e.message); send({ type: 'error', message: e.message }); }
  res.end();
}
router.post('/admin/refine/apply', requireAdmin, applyHandler);

module.exports = router;
module.exports.handler = refineHandler; // 로컬 미리보기 서버(scripts/refine_local_server.js)에서 인증 없이 재사용
module.exports.applyHandler = applyHandler;
