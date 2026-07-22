/**
 * Product Pack — 스틸 생성 서비스.
 * 캐논 레퍼(제품 락킹) + 컷 프롬프트 → nano-banana 단품 생성 → JPEG 버퍼.
 * (단품은 AI가 라벨·모양 충실하게 재현. 멀티오브젝트는 compositor로.)
 */
const sharp = require('sharp');
const provider = require('../images/providers/nanoBanana.provider');

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
async function genStill({ canonRefPath, cut, ctx }) {
  const prompt = typeof cut.prompt === 'function' ? cut.prompt(ctx) : cut.prompt;
  const res = await provider.generate({
    prompt,
    negativePrompt: cut.neg,
    width: cut.w || 768,
    height: cut.h || 960,
    references: [{ path: canonRefPath, kind: 'product' }],
  });
  return resultToBuffer(res);
}

module.exports = { genStill, resultToBuffer };
