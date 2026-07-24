/**
 * Product Pack — 레퍼 베이크 서비스(캐논 트윈).
 *
 * 왜: 유저 업로드 사진에서 바로 콘텐츠를 생성하면 라벨 텍스트가 깨진다(라벨이 작게 잡혀서).
 *   먼저 **깨끗한 단품 캐논 레퍼**(단품·클린배경·라벨 보존)를 만들고, 거기서 모든 콘텐츠를 생성한다.
 *   세트/변형이면 SKU마다 1장(병 지오메트리 통일 + 라벨/색만 교체 전략도 가능 — 여기선 소스별 개별 베이크).
 */
// 모델·해상도는 **팩 전체가 같아야 한다** — 레퍼는 모든 컷의 상류다. 여기서 갈리면 하류 N컷이 통째로 갈린다.
const { resultToBuffer, PACK_IMAGE_MODEL, PACK_IMAGE_SIZE } = require('./stills.service');
const provider = require('../images/providers/nanoBanana.provider');

// 레퍼만 따로 낮추고 싶을 때를 위한 오버라이드(보통은 팩 공통값 그대로 쓴다).
const PACK_REF_IMAGE_SIZE = process.env.PACK_REF_IMAGE_SIZE || PACK_IMAGE_SIZE;

const NEG_NOTEXT = 'added text, caption, watermark, words or letters printed on the cup plate bowl or background, invented lettering not on the real product';
const BAKE_NEG = `garbled or gibberish lettering, misspelled wordmark, two or more products, duplicate product, extra caps, warped product, distorted label, people, hands, props, cluttered background, harsh blown highlights, ${NEG_NOTEXT}`;

/**
 * 단품 캐논 레퍼 1장 베이크.
 * @param {object} p
 * @param {string[]} p.sourcePaths  업로드 소스(같은 제품 여러 각도 가능)
 * @param {string}  [p.label]       라벨/변형 지시(예: 'MON pink day-label') — 세트일 때
 * @param {object}  [p.refBake]     suite.refBake 스펙
 * @returns {Promise<Buffer>}
 */
// 🔵 unit = "이 상품의 한 단위". classify가 자동 판별해 넘긴다 — 기본 가정("단품 하나")이 틀리는 케이스를
//   사용자가 게이트에서 손으로 교정("한 쌍으로")하기 전에, **첫 베이크부터** 맞추기 위한 것.
const UNIT_PHRASE = {
  pair: 'a matching PAIR of two identical pieces, arranged neatly together as the one sellable set',
  with_package: 'the product together with its own box/packaging, both in frame as one presentation',
  group: 'the full bundled group of pieces that are sold together as one unit, all in frame',
};
const NEG_MULTI = `garbled or gibberish lettering, misspelled wordmark, warped product, distorted label, people, hands, props, cluttered background, harsh blown highlights, ${NEG_NOTEXT}`; // 개체가 둘 이상이 정상인 경우 — "two or more/duplicate"를 뺀다

async function bakeOne({ sourcePaths, label, refBake = {}, hint, state, unit }) {
  // state = 같은 제품의 다른 모습(뚜껑 닫음/열음 등). 레퍼로 넘긴 사진 자체가 이미 그 상태라,
  //   모델이 임의로 "완성된 모습"으로 되돌리지(뚜껑을 도로 닫지) 않게 사진 그대로를 못박는다.
  // 🔴 state 설명은 **장면 지시**이지 제품에 인쇄할 글자가 아니다. 한국어 라벨을 그대로 넘겼더니
  //   모델이 그걸 라벨로 오해해 찻잔에 "우린 차"를 찍어버렸다(실제 발생) → 영어 desc + 각인 금지 명시.
  const variant = state
    ? ` The reference photo shows the product in one specific physical state: ${state}. Reproduce THAT exact state — same open/closed configuration, same parts visible or hidden — never change it, never "complete" or reassemble the product. This state description is a scene instruction ONLY: never print, engrave or letter any of those words onto the product, cup, plate or background.`
    : (label ? ` This specific variant: ${label}.` : '');
  // 단위 결정 우선순위: 사용자 수동 교정(hint) > classify 자동 판별(unit) > 기본(단품 하나).
  const phrase = UNIT_PHRASE[unit];
  const unitClause = hint
    ? `Present the product EXACTLY as the seller instructs: "${hint}". If they say a pair, show a matching PAIR of two identical pieces arranged neatly together; follow their instruction precisely.`
    : (phrase
      ? `Show exactly ONE sellable unit, which for this product means ${phrase}. Do not add or remove objects.`
      : `ONE single product only (never duplicate).`);
  const neg = (hint || phrase) ? NEG_MULTI : BAKE_NEG;
  const prompt = `Clean isolated e-commerce product photograph — ${unitClause} — standing upright and front-facing, large and centered on a light grey seamless studio background with a soft natural contact shadow, even softbox lighting, tack-sharp label. Keep the product's exact shape, color, cap and the wordmark on its label identical to the reference — do not garble or invent lettering. No people, no hands, no props.${variant} 4:5.`;
  const res = await provider.generate({
    prompt,
    negativePrompt: neg,
    width: 768, height: 960,
    references: (sourcePaths || []).map((p) => ({ path: p, kind: 'product' })),
    model: PACK_IMAGE_MODEL,
    imageSize: PACK_REF_IMAGE_SIZE,
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
async function bakeRefs({ sourcePaths, skus, refBake, unit }) {
  if (!skus || !skus.length) {
    return [{ sku: 'main', buffer: await bakeOne({ sourcePaths, refBake, unit }) }];
  }
  const out = [];
  for (const s of skus) {
    out.push({ sku: s.sku, buffer: await bakeOne({ sourcePaths, label: s.label, refBake, unit }) });
  }
  return out;
}

module.exports = { bakeOne, bakeRefs };
