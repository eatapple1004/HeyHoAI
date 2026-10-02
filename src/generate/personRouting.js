/**
 * 인물 요청 → GPT Image 자동 라우팅 (Shots).
 *
 * 왜: 인물(얼굴·모델 착용)이 들어가는 컷은 GPT Image가 Gemini보다 인상이 자연스럽다는 판단(2026-10-02 사용자 결정).
 *
 * 판정 = 둘 중 하나라도 해당하면 인물 요청:
 *   1) 프롬프트 키워드 — 사람을 가리키는 단어(한/영). 무료·즉시.
 *   2) 레퍼런스 사진에 실제 사람 얼굴 — 키워드가 안 걸렸을 때만 Gemini Flash(텍스트)로 판별(요청당 1회, 저렴).
 *
 * 규칙(사용자 결정):
 *   - 과금은 원래 고른 모델 요율 그대로(차액은 플랫폼 흡수) → 이 모듈은 '생성 모델'만 바꾼다.
 *   - GPT 실패/거절 시 그 장은 Gemini로 재시도(generate.route 소관).
 *   - 화면에 GPT 버튼은 없다(자동만).
 *   - PERSON_ROUTE_GPT=true 인 환경에서만 동작(현재 dev만).
 */
const { GoogleGenAI } = require('@google/genai');
const { env } = require('../config');
const logger = require('../lib/logger');

const FACE_MODEL = process.env.PERSON_ROUTE_FACE_MODEL || 'gemini-2.5-flash';
const FACE_TIMEOUT_MS = 8000;
const FACE_MAX_IMAGES = 4;

// 사람을 가리키는 단어. 영문은 단어 경계, 한글은 부분일치(조사가 붙으므로).
//   'face'·'worn' 단독은 뺐다 — 제품 프롬프트에 "front face of the case", "worn texture"로 흔히 나와 오판(전 시드 스캔 2026-10-02).
const EN_PERSON = /\b(person|people|human|humans|man|men|woman|women|girl|girls|boy|boys|lady|ladies|guy|guys|male|female|models?|influencer|selfie|portrait|headshot|facial|wearing|worn\s+(by|on)|on-model|actor|actress|kid|kids|child|children|baby|couple|bride|groom|she|her|he|his)\b/i;
const KO_PERSON = /(사람|인물|모델|여자|남자|여성|남성|소녀|소년|아이|아기|셀카|셀피|얼굴|프로필|증명사진|헤드샷|인플루언서|착용|착장|입은|입고|커플|신부|신랑)/;
// 사람이 아닌데 위 단어에 걸리는 표현 · "사람 없이" 같은 부정 — 판정 전에 지운다.
const NOT_PERSON = /\b(ghost[\s-]?mannequin|mannequin|(no|without)\s+(a\s+|any\s+|visible\s+)?(people|person|humans?|models?|faces?|hands?)|faceless|to\s+model|3d\s*model|model\s*(number|no\.?))\b/gi;
const KO_NOT_PERSON = /(사람\s*없이|인물\s*없이|모델\s*없이|얼굴\s*없이|마네킹)/g;

function promptMentionsPerson(text) {
  const t = String(text || '').replace(NOT_PERSON, ' ').replace(KO_NOT_PERSON, ' ');
  return EN_PERSON.test(t) || KO_PERSON.test(t);
}

// 레퍼런스 중 실제 사람 얼굴이 있는가. 실패·타임아웃은 '없음'으로 본다(라우팅은 부가 기능 — 생성을 막지 않는다).
async function refsHaveFace(refs) {
  const imgs = (refs || []).filter((r) => r && r.base64 && r.source !== 'croquis').slice(0, FACE_MAX_IMAGES);
  if (!imgs.length || !env.GEMINI_API_KEY) return false;
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  // 512px로 줄여 보낸다 — 얼굴 유무만 보면 되고, 원본(수 MB)을 보내면 판정이 수 초 걸린다.
  const sharp = require('sharp');
  const parts = [];
  for (const r of imgs) {
    try {
      const small = await sharp(Buffer.from(r.base64, 'base64')).resize(512, 512, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: small.toString('base64') } });
    } catch (e) { /* 읽을 수 없는 이미지는 건너뛴다 */ }
  }
  if (!parts.length) return false;
  parts.push({ text: 'Does any of these images show a real human face (eyes, nose and mouth visible)? Hands, arms or bodies without a visible face count as no. Mannequins, dolls and drawings count as no. Answer with exactly one word: yes or no.' });
  try {
    const resp = await Promise.race([
      ai.models.generateContent({ model: FACE_MODEL, contents: [{ role: 'user', parts }], config: { thinkingConfig: { thinkingBudget: 0 } } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('face check timeout')), FACE_TIMEOUT_MS)),
    ]);
    const out = String(resp.text || '').trim().toLowerCase();
    return out.startsWith('yes');
  } catch (e) {
    logger.warn({ err: e.message }, 'person route face check failed — Gemini 유지');
    return false;
  }
}

/**
 * GPT로 보낼지 판정. 보낼 거면 { model, reason } 반환, 아니면 null.
 *   explicitTool — 사용자가 툴을 직접 고른 요청(Custom)은 존중한다.
 *   faceswap    — 속옷 On Model 파이프라인은 벤더 차단·스왑 전제라 제외.
 *   imageSize   — 2K/4K는 GPT가 못 맞춘다 → 고른 해상도를 지키려고 제외.
 *   bodywear    — 속옷·수영복(garment 지정)은 OpenAI 정책상 거절 가능성이 높아 처음부터 Gemini.
 */
async function decide({ prompt, refs, model, explicitTool, faceswap, imageSize, bodywear }) {
  if (!env.PERSON_ROUTE_GPT) return null;
  if (!env.OPENAI_API_KEY) return null;
  if (explicitTool || faceswap || bodywear) return null;
  if (String(model || '').startsWith('gpt-')) return null;
  if (imageSize) return null;
  if (promptMentionsPerson(prompt)) return { model: 'gpt-image-2', reason: 'prompt' };
  if (await refsHaveFace(refs)) return { model: 'gpt-image-2', reason: 'face' };
  return null;
}

module.exports = { decide, promptMentionsPerson, refsHaveFace };
