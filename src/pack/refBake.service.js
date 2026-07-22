/**
 * Product Pack — 레퍼 베이크 서비스(캐논 트윈).
 *
 * 왜: 유저 업로드 사진에서 바로 콘텐츠를 생성하면 라벨 텍스트가 깨진다(라벨이 작게 잡혀서).
 *   먼저 **깨끗한 단품 캐논 레퍼**(단품·클린배경·라벨 보존)를 만들고, 거기서 모든 콘텐츠를 생성한다.
 *   세트/변형이면 SKU마다 1장(병 지오메트리 통일 + 라벨/색만 교체 전략도 가능 — 여기선 소스별 개별 베이크).
 */
const { resultToBuffer } = require('./stills.service');
const provider = require('../images/providers/nanoBanana.provider');

const BAKE_NEG = 'garbled or gibberish lettering, misspelled wordmark, two or more products, duplicate product, extra caps, warped product, distorted label, people, hands, props, cluttered background, harsh blown highlights';

/**
 * 단품 캐논 레퍼 1장 베이크.
 * @param {object} p
 * @param {string[]} p.sourcePaths  업로드 소스(같은 제품 여러 각도 가능)
 * @param {string}  [p.label]       라벨/변형 지시(예: 'MON pink day-label') — 세트일 때
 * @param {object}  [p.refBake]     suite.refBake 스펙
 * @returns {Promise<Buffer>}
 */
async function bakeOne({ sourcePaths, label, refBake = {} }) {
  const variant = label ? ` This specific variant: ${label}.` : '';
  const prompt = `Clean isolated e-commerce product photograph, ONE single product only (never duplicate), standing upright and front-facing, large and centered on a light grey seamless studio background with a soft natural contact shadow, even softbox lighting, tack-sharp label. Keep the product's exact shape, color, cap and the wordmark on its label identical to the reference — do not garble or invent lettering. No people, no hands, no props.${variant} 4:5.`;
  const res = await provider.generate({
    prompt,
    negativePrompt: BAKE_NEG,
    width: 768, height: 960,
    references: (sourcePaths || []).map((p) => ({ path: p, kind: 'product' })),
  });
  return resultToBuffer(res);
}

/**
 * 잡 단위 베이크: 단일이면 1장, 세트면 SKU마다.
 * @param {object} p
 * @param {string[]} p.sourcePaths
 * @param {Array<{sku:string,label?:string}>} [p.skus]  세트 구성(없으면 단일)
 * @param {object} [p.refBake]
 * @returns {Promise<Array<{sku:string, buffer:Buffer}>>}
 */
async function bakeRefs({ sourcePaths, skus, refBake }) {
  if (!skus || !skus.length) {
    return [{ sku: 'main', buffer: await bakeOne({ sourcePaths, refBake }) }];
  }
  const out = [];
  for (const s of skus) {
    out.push({ sku: s.sku, buffer: await bakeOne({ sourcePaths, label: s.label, refBake }) });
  }
  return out;
}

module.exports = { bakeOne, bakeRefs };
