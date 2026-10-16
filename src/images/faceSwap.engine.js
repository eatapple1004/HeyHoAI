/**
 * ─── Face swap (2026-10-16) — "우리 모델 + 본인 얼굴만" (docs/Features_전시구조 Image #6) ───
 *
 * 정책(코드로 강제):
 *   · 바꿀 대상(target) = Doppia 모델 사진만 — Yuna 장면 뱅크(public/img/shoot/yuna) 또는 내 Library 의 생성 결과물.
 *     임의 사진 업로드는 받지 않는다(남의 사진에 얼굴을 얹는 딥페이크 경로 차단).
 *   · 넣을 얼굴(source) = 본인 얼굴만 — 화면에서 "내 얼굴·성인" 동의 체크 필수(이용약관 제12조 ②), 서버가 동의값 확인.
 *   · 서버 판별(Gemini Flash): 얼굴 사진은 실제 사람 얼굴 정확히 1명 + 성인으로 보일 것, 대상 사진도 성인 1명 이상.
 *     판별이 실패·타임아웃이면 막는다(fail closed).
 *   · 얼굴 사진은 저장하지 않는다(요청 처리 후 업로드 임시파일 삭제). 결과물은 항상 비공개.
 *
 * 엔진: registry type 'faceswap' — Easel Advanced Face Swap(머리카락 유지/내 머리 선택) → fal Face Swap 폴백. 둘 다 fal.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { env } = require('../config');
const logger = require('../lib/logger');
const { listTools } = require('../tools/registry');

const CHECK_MODEL = process.env.FACESWAP_CHECK_MODEL || 'gemini-2.5-flash';
const CHECK_TIMEOUT_MS = 12000;
const SIDE = 2048;

// Doppia 모델 프리셋(정적 파일) — id 화이트리스트. 이름은 public/shoot.html 의 Yuna 뱅크와 같다.
const PRESETS = ['studio', 'street', 'cafe', 'rooftop', 'park', 'night', 'wall'].map((s) => ({
  id: `yuna/${s}`, label: `Yuna · ${s[0].toUpperCase()}${s.slice(1)}`, url: `/img/shoot/yuna/${s}.jpg`,
}));
function presetFile(id) {
  const p = PRESETS.find((x) => x.id === id);
  return p ? path.join(process.cwd(), 'public', p.url.replace(/^\//, '')) : null;
}

// (2026-10-16) 사용자 결정: Face swap 앱은 잠시 막고 메뉴엔 Coming soon. 다시 열 땐 false 로 — 메뉴·페이지·API 가 함께 열린다.
//   ※ On Model 속옷 stage-2 faceswap(faceswapWorker)은 별개 기능이라 영향 없음.
const PAUSED = true;
function engines() { return PAUSED ? [] : listTools({ type: 'faceswap', enabledOnly: true, availableOnly: true }); }

/** 얼굴 판별 — { faces, adult, realPhoto, gender } | null(판별 실패) */
async function inspectFaces(buf) {
  if (!env.GEMINI_API_KEY) return null;
  // eslint-disable-next-line global-require
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const small = await sharp(buf).rotate().resize(768, 768, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
  const parts = [
    { inlineData: { mimeType: 'image/jpeg', data: small.toString('base64') } },
    { text: 'Inspect this image. Reply with JSON only: {"faces": <number of clearly visible human faces>, "adult": <true if every visible person is clearly an adult aged 18 or older, false if anyone could be a minor or it is unclear>, "real_photo": <true if it is a photograph or photorealistic image of a person, false for drawings, cartoons, dolls, statues>, "gender": "female" | "male" | "unknown" (of the largest face)}' },
  ];
  try {
    const resp = await Promise.race([
      ai.models.generateContent({ model: CHECK_MODEL, contents: [{ role: 'user', parts }], config: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('face check timeout')), CHECK_TIMEOUT_MS)),
    ]);
    const j = JSON.parse(String(resp.text || '{}').replace(/^```json|```$/g, '').trim());
    return { faces: parseInt(j.faces, 10) || 0, adult: j.adult === true, realPhoto: j.real_photo !== false, gender: ['female', 'male'].includes(j.gender) ? j.gender : 'unknown' };
  } catch (e) {
    logger.warn({ err: e.message }, 'faceswap face check failed');
    return null;
  }
}

/** 얼굴 사진 검사 — 통과면 { gender }, 아니면 { error } */
async function checkSourceFace(buf) {
  const r = await inspectFaces(buf);
  if (!r) return { error: "We couldn't check the face photo. Please try again." };
  if (r.faces === 0) return { error: 'No face found. Use a clear, front-facing photo of your face.' };
  if (r.faces > 1) return { error: 'Only one face, please — crop the photo to just your face.' };
  if (!r.realPhoto) return { error: 'Use a real photo of your own face.' };
  if (!r.adult) return { error: 'Face swap is for adults (18+) only.' };
  return { gender: r.gender };
}
/** 대상(우리 모델) 검사 — 미성년자·얼굴 없음 차단 */
async function checkTarget(buf) {
  const r = await inspectFaces(buf);
  if (!r) return { error: "We couldn't check the model photo. Please try again." };
  if (r.faces === 0) return { error: 'This photo has no visible face to swap.' };
  if (!r.adult) return { error: 'This photo may show a minor — face swap is blocked for it.' };
  return { faces: r.faces };
}

const dataUrl = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;
async function prep(buf) { return sharp(buf).rotate().removeAlpha().resize(SIDE, SIDE, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 93 }).toBuffer(); }

/** 스왑 실행 → PNG Buffer. hair: 'model'(모델 머리 유지) | 'mine'(내 머리) */
async function runSwap({ tool, target, face, hair, gender }) {
  // eslint-disable-next-line global-require
  const prov = require(`./providers/${tool.provider}.provider`);
  const t = dataUrl(await prep(target)), f = dataUrl(await prep(face));
  const input = tool.id === 'easel-faceswap'
    ? { face_image_0: f, gender_0: gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'non-binary', target_image: t, workflow_type: hair === 'mine' ? 'user_hair' : 'target_hair', upscale: true, detailer: true }
    : { base_image_url: t, swap_image_url: f };
  const out = await prov.runImage({ model: tool.model, input, maxWaitMs: 240_000 });
  const r = await fetch(out.url);
  if (!r.ok) throw new Error(`result download failed (${r.status})`);
  return sharp(Buffer.from(await r.arrayBuffer())).png().toBuffer();
}

function readPreset(id) {
  const f = presetFile(id);
  return f && fs.existsSync(f) ? fs.readFileSync(f) : null;
}

module.exports = { PAUSED, PRESETS, engines, checkSourceFace, checkTarget, runSwap, readPreset };
