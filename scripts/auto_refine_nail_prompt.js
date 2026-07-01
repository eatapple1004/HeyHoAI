/**
 * auto_refine_nail_prompt.js — 프롬프트 자동 정밀화 루프 (generate → judge → revise → repeat)
 *
 * 레퍼런스 네일 이미지 + 목표(타깃) 레이아웃 이미지를 주면,
 * 결과물이 타깃에 충분히 가까워질 때까지 프롬프트를 자동으로 수정하며 반복 생성한다.
 *
 *   생성: Gemini 이미지 모델(GEMINI_API_KEY, nanoBanana provider와 동일 호출)
 *   판정: Claude 비전(ANTHROPIC_API_KEY) — 8개 레버 루브릭으로 통과/실패 채점 + 프롬프트 재작성
 *
 * 사용:
 *   node scripts/auto_refine_nail_prompt.js \
 *     --ref  /path/to/reference_nail.png \
 *     --target /path/to/target_layout.png \
 *     [--out scripts/_refine_out] [--max 6] [--judge claude-sonnet-4-6]
 *
 * ⚠️ 매 반복마다 이미지 1장 생성(Gemini, ~$0.04) + 판정 1회(Claude, ~$0.02) → 실제 API 비용 발생.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const Anthropic = require('@anthropic-ai/sdk');

// ── args ──
const A = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k.startsWith('--')) A[k.slice(2)] = (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) ? process.argv[++i] : true;
}
const REF = A.ref, TARGET = A.target;
const OUT = A.out || path.join('scripts', '_refine_out');
const MAX = parseInt(A.max || '6', 10);
const IMG_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const JUDGE_MODEL = A.judge || 'claude-sonnet-4-6';

if (!REF || !TARGET) { console.error('필수: --ref <레퍼런스 네일 이미지> --target <타깃 레이아웃 이미지>'); process.exit(1); }
if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY 없음(.env)'); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY 없음(.env)'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const anth = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const mime = (p) => (/\.png$/i.test(p) ? 'image/png' : /\.(jpe?g)$/i.test(p) ? 'image/jpeg' : 'image/png');
const b64 = (p) => fs.readFileSync(p).toString('base64');

// ── 평가 루브릭 (7회 반복으로 도출한 핵심 레버) ──
const RUBRIC = [
  ['fiveSeparateTips', '손/손가락 없이 분리된 프레스온 팁 5개만 있는가'],
  ['topDown', '정수리 탑다운(수직 위에서) 시점인가 (비스듬 원근/3D 측면 아님)'],
  ['restingFlat', '바닥에 평평하게 놓여 있는가 (공중 부양/세워짐 아님)'],
  ['shadowMinimal', '그림자가 옅고 비부각인가 (길거나 진한 캐스트 섀도 아님)'],
  ['parabolaCurve', '좌하단→우상단으로 휘는 포물선(J/곡선) 배열인가 (직선 아님)'],
  ['sizeTaper', '엄지(좌하 최대)→새끼(우상 최소) 크기 테이퍼가 뚜렷한가'],
  ['whiteBg', '깨끗한 순백/오프화이트 배경인가 (회색끼/그라데이션 아님)'],
  ['charmRestraint', '3D 참이 1~2개 포인트 팁에만, 나머지는 깔끔한가'],
];
const CRITICAL = ['fiveSeparateTips', 'topDown', 'restingFlat', 'parabolaCurve', 'sizeTaper', 'whiteBg'];

// 초기 프롬프트 (v7)
let prompt = fs.existsSync(path.join(OUT, 'seed_prompt.txt'))
  ? fs.readFileSync(path.join(OUT, 'seed_prompt.txt'), 'utf8')
  : `Overhead top-down flat-lay product photograph of a press-on nail set, faithfully recreating the EXACT nail art, colors, glitter, and 3D charms from the reference image — re-rendered as 5 individual separate press-on nail tips (NOT on a hand).
CAMERA: shot straight from DIRECTLY ABOVE, 90° top-down orthographic flat-lay, no perspective, no tilt, no 3D side view.
PLACEMENT: tips lie FLAT, resting on the surface, not floating, not tilted.
ARRANGEMENT: the 5 tips trace a CURVED path shaped like the letter "J" / lower-left quarter of a circle — NOT a straight line. Tip1 (largest) bottom-left lowest; tip2 directly above it (curve rises up the left side); tip3 near top where it bends right (apex); tip4 continues right along the top; tip5 (smallest) far upper-right. Evenly spaced, not touching.
SIZE: clear thumb→pinky size gradient, tip1 largest, tip5 smallest.
NAIL SHAPE: short-to-medium rounded almond / soft squoval, uniform.
FINISH: glossy gel jelly top coat, pearlescent shimmer, gentle cat-eye streaks; reproduce reference colors.
CHARMS: 3D charms on ONLY 1–2 hero tips; other tips clean shimmer/gradient.
BACKGROUND: seamless pure off-white (#f7f8fa), even, no props. Shadows faint contact only.
Square composition, bright airy studio light, premium e-commerce product flat-lay, hyper-realistic, 8k.`;
let negative = `straight line, straight diagonal row, linear arrangement, hand, fingers, nails on skin, perspective, 3D rotation, side view, tilted, floating, levitating, long coffin/stiletto nails, similar-sized tips, overlapping tips, charm on every nail, cluttered, grey gradient background, long/harsh shadow, blurry, low quality, deformed nail, text, watermark, matte`;

async function generate(p, neg, iter) {
  const full = neg ? `${p}\n\nAvoid: ${neg}` : p;
  // 듀얼 레퍼런스: IMAGE 1 = 디자인 소스(색·아트·참), IMAGE 2 = 레이아웃 견본(배열·시점·배경·그림자만 모방)
  const contents = [{ role: 'user', parts: [
    { text: 'IMAGE 1 — DESIGN SOURCE: reproduce this nail set\'s EXACT polish colors, gradients, glitter, shimmer and charm style.' },
    { inlineData: { mimeType: mime(REF), data: b64(REF) } },
    { text: 'IMAGE 2 — LAYOUT REFERENCE ONLY: copy its composition exactly — the SAME number of separate nail tips (count them: FIVE), the SAME smooth parabolic J-curve arrangement rising from lower-left to upper-right, the SAME perfectly straight top-down overhead camera, the SAME clean pure-white background, and the SAME very soft minimal shadow. Do NOT copy IMAGE 2\'s colors or its cherry charms — take ONLY its layout, framing, viewpoint, spacing and background from it.' },
    { inlineData: { mimeType: mime(TARGET), data: b64(TARGET) } },
    { text: full },
  ] }];
  const resp = await ai.models.generateContent({
    model: IMG_MODEL, contents,
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  });
  const parts = resp.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData);
  if (!img) throw new Error('생성 실패: 이미지 없음');
  const ext = img.inlineData.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const file = path.join(OUT, `iter${iter}.${ext}`);
  fs.writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'));
  return file;
}

async function judge(genPath) {
  const rubricList = RUBRIC.map(([k, d]) => `- ${k}: ${d}`).join('\n');
  const instruction = `너는 네일 제품 플랫레이 사진 품질 심사관이다. 첫 번째 이미지는 [TARGET](목표 레이아웃), 두 번째 이미지는 [GENERATED](방금 생성된 결과)다.
GENERATED가 TARGET의 "레이아웃/시점/배경/그림자/배열"에 얼마나 부합하는지 아래 항목을 각각 true/false로 채점하라(네일 디자인 자체의 색/참 종류는 레퍼런스 기준이므로 무시, 오직 구도·형식만 평가):
${rubricList}

그리고 실패한 항목을 고치도록 프롬프트를 다시 써라. 반드시 아래 JSON만 출력(설명/코드펜스 금지):
{"scores":{${RUBRIC.map(([k]) => `"${k}":true|false`).join(',')}},"critique":"무엇이 타깃과 다른지 1-2문장","revisedPrompt":"실패 항목을 고친 전체 프롬프트","revisedNegative":"전체 네거티브"}`;
  const msg = await anth.messages.create({
    model: JUDGE_MODEL, max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: instruction },
      { type: 'text', text: '[TARGET]:' },
      { type: 'image', source: { type: 'base64', media_type: mime(TARGET), data: b64(TARGET) } },
      { type: 'text', text: '[GENERATED]:' },
      { type: 'image', source: { type: 'base64', media_type: mime(genPath), data: b64(genPath) } },
    ] }],
  });
  let t = (msg.content.find((c) => c.type === 'text') || {}).text || '{}';
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  return JSON.parse(t.slice(s, e + 1));
}

(async () => {
  console.log(`▶ auto-refine 시작 — ref=${REF}\n  target=${TARGET}\n  out=${OUT} · max=${MAX} · img=${IMG_MODEL} · judge=${JUDGE_MODEL}\n`);
  const log = [];
  let best = null;
  for (let i = 1; i <= MAX; i++) {
    process.stdout.write(`[iter ${i}] 생성…`);
    const img = await generate(prompt, negative, i);
    process.stdout.write(' 판정…');
    const v = await judge(img);
    const passed = CRITICAL.filter((k) => v.scores[k]).length;
    const allCrit = CRITICAL.every((k) => v.scores[k]);
    const okCount = Object.values(v.scores).filter(Boolean).length;
    console.log(` 핵심 ${passed}/${CRITICAL.length} · 전체 ${okCount}/${RUBRIC.length} — ${v.critique}`);
    log.push({ iter: i, img, scores: v.scores, critique: v.critique, prompt, negative });
    if (!best || okCount > best.okCount) best = { iter: i, img, okCount, prompt, negative };
    if (allCrit) { console.log(`\n✅ iter ${i}에서 핵심 레버 전부 통과 → 종료. 결과: ${img}`); break; }
    prompt = v.revisedPrompt || prompt;
    negative = v.revisedNegative || negative;
    if (i === MAX) console.log(`\n⏹ max(${MAX}) 도달 — 최고 결과: iter ${best.iter} (${best.okCount}/${RUBRIC.length}) ${best.img}`);
  }
  fs.writeFileSync(path.join(OUT, 'run.json'), JSON.stringify({ ref: REF, target: TARGET, log }, null, 2));
  fs.writeFileSync(path.join(OUT, 'final_prompt.txt'), `# PROMPT\n${best.prompt}\n\n# NEGATIVE\n${best.negative}\n`);
  console.log(`\n📝 로그: ${path.join(OUT, 'run.json')} · 최종 프롬프트: ${path.join(OUT, 'final_prompt.txt')}`);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
