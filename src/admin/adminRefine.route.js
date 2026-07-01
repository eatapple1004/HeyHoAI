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

const IMG_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const JUDGE_MODEL = process.env.REFINE_JUDGE_MODEL || 'claude-sonnet-4-6';

const parseJson = (raw) => {
  let t = (raw || '{}').replace(/```(json)?/gi, '').trim();
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
};

// ── 0) 목표 이미지 → 초기 프롬프트 + 평가 체크리스트 '처음부터' 작성 ──
async function authorFromTarget(anth, ref, target) {
  const instruction = `너는 이미지 생성 프롬프트 작가다. 두 이미지가 주어진다.
[TARGET] = 만들고 싶은 결과물의 "구도/레이아웃/시점/배경/조명/스타일" 본보기.
[REFERENCE] = 결과물에 재현할 "피사체/디자인(색·형태·요소)".

목표: REFERENCE의 디자인을 TARGET의 구도·형식으로 렌더링하는 text-to-image 프롬프트를 처음부터 작성하라.
- prompt: TARGET을 자세히 관찰해 배치/개수/시점(예: 탑다운/정면/각도)/배경/그림자/조명/스타일을 구체적으로 묘사. REFERENCE의 색·요소는 재현하되 배열/형식은 TARGET을 따르도록.
- negative: 벗어나면 안 되는 것들.
- checklist: 결과물이 TARGET의 구도·형식에 부합하는지 판정할 구체적 시각 기준 5~8개. 각 항목 {k: 짧은 camelCase 키, d: 한국어 한 줄 설명}. (피사체 색/디자인 자체가 아니라 '구도·시점·배경·배열·개수' 위주로)

아래 JSON만 출력(코드펜스 금지):
{"prompt":"...","negative":"...","checklist":[{"k":"...","d":"..."}]}`;
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
  const full = negative ? `${prompt}\n\nAvoid: ${negative}` : prompt;
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

// ── 판정: 동적 체크리스트로 채점 + 실패 항목 고쳐 프롬프트 재작성 ──
async function judge(anth, gen, target, checklist) {
  const rubricList = checklist.map((c) => `- ${c.k}: ${c.d}`).join('\n');
  const keys = checklist.map((c) => `"${c.k}":true|false`).join(',');
  const instruction = `너는 이미지 구도 심사관이다. 첫 이미지=[TARGET](목표), 둘째=[GENERATED](결과). GENERATED가 TARGET의 구도/시점/배경/배열/개수에 부합하는지 아래를 각각 true/false로 채점하라(피사체 색·디자인 자체는 무시, 구도·형식만):\n${rubricList}\n\n실패 항목을 고치도록 프롬프트를 다시 써라. 아래 JSON만 출력(코드펜스 금지):\n{"scores":{${keys}},"critique":"타깃과 다른 점 1-2문장","revisedPrompt":"전체 프롬프트","revisedNegative":"전체 네거티브"}`;
  const msg = await anth.messages.create({
    model: JUDGE_MODEL, max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: instruction },
      { type: 'text', text: '[TARGET]:' },
      { type: 'image', source: { type: 'base64', media_type: target.mime, data: target.b64 } },
      { type: 'text', text: '[GENERATED]:' },
      { type: 'image', source: { type: 'base64', media_type: gen.mime, data: gen.b64 } },
    ] }],
  });
  return parseJson((msg.content.find((c) => c.type === 'text') || {}).text);
}

// POST /api/admin/refine — NDJSON 스트림 { ref:{b64,mime}, target:{b64,mime}, max? }
async function refineHandler(req, res) {
  const { ref, target } = req.body || {};
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
    const authored = await withTimeout(authorFromTarget(anth, refImg, tgtImg), 90000, '프롬프트 작성');
    let prompt = authored.prompt;
    let negative = authored.negative || '';
    const checklist = authored.checklist;
    console.log(`[refine] 초기 프롬프트 작성 완료 · 체크리스트 ${checklist.length}개`);
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
      const v = await withTimeout(judge(anth, gen, tgtImg, checklist), 90000, '판정');
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
  const full = negative ? `${prompt}\n\nAvoid: ${negative}` : prompt;
  const parts = [
    { text: 'IMAGE 1 — reference: reproduce this subject\'s exact colors, design and decorative elements.' },
    { inlineData: { mimeType: ref.mime, data: ref.b64 } },
  ];
  if (layout) { // 템플릿에 지정된 타깃(레이아웃) 이미지 — 구도/시점/배경만 모방, 색·피사체는 IMAGE 1
    parts.push({ text: 'IMAGE 2 — layout target: match ONLY its composition, subject count, camera viewpoint, background and shadow. Do NOT copy its colors or subject.' });
    parts.push({ inlineData: { mimeType: layout.mime, data: layout.b64 } });
  }
  parts.push({ text: full });
  const resp = await ai.models.generateContent({
    model: IMG_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  });
  const p = (resp.candidates?.[0]?.content?.parts || []).find((x) => x.inlineData);
  if (!p) throw new Error('생성 실패: 이미지 없음');
  return { b64: p.inlineData.data, mime: p.inlineData.mimeType || 'image/png' };
}

// POST /api/admin/refine/apply — { ref:{b64,mime}, prompt, negative?, count? } → NDJSON 이미지 스트림
async function applyHandler(req, res) {
  const { ref, prompt, negative, layout } = req.body || {};
  const count = Math.min(Math.max(parseInt(req.body?.count || 3, 10), 1), 6);
  const layoutImg = toImg(layout); // 템플릿 타깃 이미지(옵션): data URL 또는 {b64,mime}
  if (!ref?.b64 || !prompt) return res.status(400).json({ error: 'ref 이미지와 prompt가 필요합니다.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  const send = (o) => { try { res.write(JSON.stringify(o) + '\n'); } catch (_) {} };
  let aborted = false;
  res.on('close', () => { if (!res.writableEnded) aborted = true; });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const refImg = { b64: ref.b64, mime: ref.mime || 'image/png' };
  const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(`${l} 타임아웃`)), ms))]);

  send({ type: 'start', count, imgModel: IMG_MODEL, withLayout: !!layoutImg });
  try {
    for (let i = 1; i <= count && !aborted; i++) {
      send({ type: 'progress', i });
      console.log(`[apply] ${i}/${count} 생성…${layoutImg ? ' (+타깃 레이아웃)' : ''}`);
      const g = await withTimeout(generateRefOnly(ai, prompt, negative, refImg, layoutImg), 180000, '생성');
      send({ type: 'img', i, image: `data:${g.mime};base64,${g.b64}` });
    }
    send({ type: 'done' });
  } catch (e) { console.error('[apply] 오류:', e.message); send({ type: 'error', message: e.message }); }
  res.end();
}
router.post('/admin/refine/apply', requireAdmin, applyHandler);

module.exports = router;
module.exports.handler = refineHandler; // 로컬 미리보기 서버(scripts/refine_local_server.js)에서 인증 없이 재사용
module.exports.applyHandler = applyHandler;
