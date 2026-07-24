/**
 * Product Pack — 스틸 생성 서비스.
 * 캐논 레퍼(제품 락킹) + 컷 프롬프트 → nano-banana 단품 생성 → JPEG 버퍼.
 * (단품은 AI가 라벨·모양 충실하게 재현. 멀티오브젝트는 compositor로.)
 */
const sharp = require('sharp');
const provider = require('../images/providers/nanoBanana.provider');

/**
 * Pack은 **품질 우선 → Nano Banana Pro**.
 *
 * 왜 명시하나: provider 기본값은 `env.GEMINI_IMAGE_MODEL`(=flash)인데, studio는 자체 클라이언트로
 *   이미 pro를 쓰고 adminRefine도 pro다 — provider를 그대로 쓰던 **Pack만 flash에 묶여** 있었다.
 *   Pack 결과가 studio보다 못한 구조적 이유였다(모델 차이지 프롬프트 차이가 아니었다).
 * 되돌리려면 배포 없이 `PACK_IMAGE_MODEL=gemini-2.5-flash-image` + restart.
 *   (pro는 장당 단가가 flash의 3배 남짓 — 팩 1개 20~25장 기준 차이가 그대로 곱해진다.)
 */
const PACK_IMAGE_MODEL = process.env.PACK_IMAGE_MODEL || 'gemini-3-pro-image-preview';

/** provider.generate 응답(localPath|url|data)을 JPEG 버퍼로 정규화. */
async function resultToBuffer(res) {
  const src = (res.metadata && res.metadata.localPath) || res.localPath;
  if (src) {
    const fs = require('fs');
    if (fs.existsSync(src)) return sharp(fs.readFileSync(src)).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  }
  const url = res.url || '';
  if (/^data:/.test(url)) return sharp(Buffer.from(url.split(',')[1], 'base64')).jpeg({ quality: 92 }).toBuffer();
  if (/^https?:/.test(url)) return sharp(Buffer.from(await (await fetch(url)).arrayBuffer())).jpeg({ quality: 92 }).toBuffer();
  throw new Error('nano-banana 응답에서 이미지 못 찾음: ' + JSON.stringify(Object.keys(res)));
}

/**
 * 컷 1장 생성.
 * @param {object} p
 * @param {string} p.canonRefPath  캐논 레퍼 경로(kind:product)
 * @param {object} p.cut           suites 의 still 컷 {prompt(ctx), neg, w, h}
 * @param {object} p.ctx           프롬프트 컨텍스트 { product }
 * @returns {Promise<Buffer>}
 */
async function genStill({ canonRefPath, brandRefPath, cut, ctx }) {
  const prompt = typeof cut.prompt === 'function' ? cut.prompt(ctx) : cut.prompt;
  // 🏷 파생 상태(내용물·완성형) 컷은 브랜드가 안 보여 "일반 스톡사진"이 된다 → 포장 레퍼를 함께 참조시켜
  //   프롬프트가 "포장도 프레임에" 라고 할 때 실제 라벨을 그릴 수 있게 한다. (provider가 다중 제품 레퍼 지원)
  const references = [{ path: canonRefPath, kind: 'product' }];
  if (brandRefPath && brandRefPath !== canonRefPath) references.push({ path: brandRefPath, kind: 'product' });
  const res = await provider.generate({
    prompt,
    negativePrompt: cut.neg,
    width: cut.w || 768,
    height: cut.h || 960,
    references,
    model: PACK_IMAGE_MODEL,
  });
  return resultToBuffer(res);
}

module.exports = { genStill, resultToBuffer, PACK_IMAGE_MODEL };
