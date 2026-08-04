/**
 * Product Pack — 레퍼 베이크 서비스(캐논 트윈).
 *
 * 왜: 유저 업로드 사진에서 바로 콘텐츠를 생성하면 라벨 텍스트가 깨진다(라벨이 작게 잡혀서).
 *   먼저 **깨끗한 단품 캐논 레퍼**(단품·클린배경·라벨 보존)를 만들고, 거기서 모든 콘텐츠를 생성한다.
 *   세트/변형이면 SKU마다 1장(병 지오메트리 통일 + 라벨/색만 교체 전략도 가능 — 여기선 소스별 개별 베이크).
 */
// 모델·해상도는 **팩 전체가 같아야 한다** — 레퍼는 모든 컷의 상류다. 여기서 갈리면 하류 N컷이 통째로 갈린다.
const sharp = require('sharp');
const { resultToBuffer, PACK_IMAGE_MODEL, PACK_IMAGE_SIZE } = require('./stills.service');
const provider = require('../images/providers/nanoBanana.provider');

// 레퍼만 따로 낮추고 싶을 때를 위한 오버라이드(보통은 팩 공통값 그대로 쓴다).
const PACK_REF_IMAGE_SIZE = process.env.PACK_REF_IMAGE_SIZE || PACK_IMAGE_SIZE;

/**
 * 🔴 소스는 "증거"지 "캔버스"가 아니다.
 *
 * 실측(2026-08-04, 프로드 팩 86과 **바이트 동일한** 네이버 스크린샷 소스로 48장):
 *   - 쇼핑몰 배지 `4명 이상 구매`·갤러리 카운터 `1/6`이 원위치에 그대로 재현되거나(프로드 팩 169),
 *     또렷하게 다시 그려지고, 프레임 아래 끝에 원본 사진의 띠(바지·매장 바닥)가 남았다.
 *   - 소스가 스크린샷이 아닌 깨끗한 AI 전신컷이어도 흰 운동화·벽 모서리가 남았다(프로드 팩 167).
 * 즉 모델이 입력을 **편집할 캔버스**로 읽는다. 프롬프트가 "입력에 제품이 아닌 것이 섞여 있을 수 있다"고
 * 한 번도 말한 적이 없었다(7/22 첫 커밋 이후 이 문장 없음).
 */
const SOURCE_HYGIENE = `The reference images are EVIDENCE of the product's shape, colour, material and markings — they are NOT a canvas to edit. They may be shop-page screenshots or lifestyle photos that also contain things which are NOT the product: buy-count badges, image counters, carousel arrows, price tags, watermarks, shop interiors, furniture, mannequins, models, and other garments or items worn or held alongside it. None of that belongs to the product. Take the product; leave everything else behind. Do not copy, reuse, extend or outpaint any region of a reference — every pixel of the output is a newly rendered photograph.`;

// 프레임 전면 지배 — 예전 문구는 "large and centered"뿐이라 **아래 20%에 다른 패널이 들어와도 위반이 아니었다.**
const FRAME = `The background is ONE continuous seamless sweep filling the entire frame, edge to edge and top to bottom — no panels, bands, strips, borders or leftover slices of another photo anywhere, especially along the bottom edge. The whole product is inside the frame, and nothing else is.`;

/**
 * 🔴 금지어 나열은 실패했다 — `invented lettering`·`garbled lettering`이 이미 네거티브에 있었는데도
 *   없는 브랜드를 지어냈다(`TAOK SHIMP`·`YENAEN BEASKE`·`DREASEAN`·`MBBFB CSICOEN`).
 *   Gemini엔 진짜 negative 채널이 없어 네거티브는 `Avoid: …` 평문으로 꼬리에 붙을 뿐이고,
 *   금지어를 적으면 오히려 그 개념을 활성화한다. → **원하는 상태를 긍정문으로** 기술한다.
 *   (2K가 글자를 그릴 픽셀을 주는데 그릴 글자가 없으면 지어내서 채운다 — 실측상 지어내기는 2K 칸에만 나왔다.)
 */
const MARKINGS = `Reproduce only the lettering physically printed, woven or embossed on the product itself in the reference, exactly as it reads there. If no logo or text is visible on it, the product carries none — leave those surfaces blank. Never invent a brand name, neck tag, hem tag, care label or wordmark.`;

// 카테고리별 제시 방식. 플래너가 이미 `config.category` 로 판별해 저장하는데 **베이크만 그걸 안 읽고 있었다**
//   → 옷에도 "standing upright"(병 어휘)가 나가고 있었다. 없는 카테고리는 기본값.
const PRESENTATION = {
  apparel: 'presented on an invisible ghost mannequin — filled out as if worn, front-facing, symmetrical, sleeves and hem falling naturally',
  footwear: 'the pair placed front-facing at a slight three-quarter angle',
  jewelry: 'laid flat and front-facing at macro scale',
  bag: 'standing upright and front-facing with its handles or strap arranged naturally',
};
const PRESENTATION_DEFAULT = 'standing upright and front-facing';

// 네거티브는 **물리적 결함어만** 남긴다(글자 관련은 MARKINGS 로 승격, cup/plate/bowl·cap 은 음료 어휘라 삭제).
const BAKE_NEG = 'warped or distorted product, two or more products, duplicate product, people, hands, props, cluttered background, harsh blown highlights';
const NEG_MULTI = 'warped or distorted product, people, hands, props, cluttered background, harsh blown highlights'; // 개체가 둘 이상이 정상인 경우 — "two or more/duplicate"를 뺀다

/**
 * 단품 캐논 레퍼 1장 베이크.
 * @param {object} p
 * @param {string[]} p.sourcePaths  업로드 소스(같은 제품 여러 각도 가능)
 * @param {string}  [p.label]       라벨/변형 지시(예: 'MON pink day-label') — 세트일 때
 * @param {string}  [p.category]    플래너가 판별한 카테고리(apparel/footwear/… ) — 제시 방식 분기
 * @returns {Promise<Buffer>}
 */
// 🔵 unit = "이 상품의 한 단위". classify가 자동 판별해 넘긴다 — 기본 가정("단품 하나")이 틀리는 케이스를
//   사용자가 게이트에서 손으로 교정("한 쌍으로")하기 전에, **첫 베이크부터** 맞추기 위한 것.
const UNIT_PHRASE = {
  pair: 'a matching PAIR of two identical pieces, arranged neatly together as the one sellable set',
  with_package: 'the product together with its own box/packaging, both in frame as one presentation',
  group: 'the full bundled group of pieces that are sold together as one unit, all in frame',
};

/**
 * 출력 비율 = **소스 비율에 가장 가까운 지원 비율**.
 *
 * 🔴 왜 4:5 고정을 풀었나(실측 2026-08-04, 같은 소스 12장씩):
 *      Pro + 4:5 + 2K = 오염 4/12(33%)  ← 현행. 세 조건이 **모두** 모인 칸만 크게 샌다
 *      Pro + 1:1 + 2K = 1/12( 8%)       ← 소스(589×632)가 거의 정사각이라 늘릴 캔버스가 없다
 *      Pro + 4:5 + 1K = 0/4 · flash 계열 = 0/8
 *    소스보다 세로로 긴 캔버스를 요구하면 모델이 **늘어난 자리를 소스로 이어 채운다**(바지 띠·배지 이동).
 *    레퍼는 중간 산출물이고 최종 컷은 각자 비율로 따로 생성되므로(genStill 이 cut.w/cut.h 사용)
 *    레퍼를 4:5로 못박을 이유가 애초에 없었다.
 *    ⚠️ 완치가 아니라 완화다(8% 잔존) — 위 SOURCE_HYGIENE/FRAME 과 **함께** 써야 한다.
 *    ⚠️ 워드마크는 안 깨진다: 아메리카노 `ANS BAKERY` 현행 3/3 · 소스비율 3/3 모두 또렷(실측).
 */
async function outputAspect(sourcePaths) {
  const FALLBACK = { w: 768, h: 960, name: '4:5' };
  const first = (sourcePaths || [])[0];
  if (!first) return FALLBACK;
  try {
    const { width, height } = await sharp(first).metadata();
    if (width > 0 && height > 0) return { w: width, h: height, name: provider.getAspectRatio(width, height) };
  } catch (_) { /* 못 읽으면 종전 동작 그대로 */ }
  return FALLBACK;
}

async function bakeOne({ sourcePaths, label, hint, state, unit, category, derived }) {
  // state = 같은 제품의 다른 모습(포장/개봉, 뚜껑 닫음/열음, 컵에 따름 등).
  //
  // 🔴 예전 문구는 "레퍼 사진이 **이미** 그 상태다 → 그대로 재현하라"였다. 그 전제가 자주 틀린다:
  //   프로드 팩 172(사진 1장, 상태 2개) — 한 장에 파우치와 유리잔이 **같이** 있었는데 두 상태 모두
  //   파우치로 나왔다. 모델이 "레퍼=파우치"로 읽고 desc(`clear glass filled with amber juice`)를 버린 것.
  //   → 전제를 뒤집는다: 사진은 **제품 정체성의 증거**일 뿐이고, **어느 상태로 그릴지는 이 문장이 정한다.**
  //   SOURCE_HYGIENE("옆에 놓인 다른 물건은 제품이 아니다")과 부딪히지 않도록 **맨 뒤에** 두어 이 절이 이긴다.
  //
  // 🔴 state 설명은 **장면 지시**이지 제품에 인쇄할 글자가 아니다. 한국어 라벨을 그대로 넘겼더니
  //   모델이 그걸 라벨로 오해해 찻잔에 "우린 차"를 찍어버렸다(실제 발생) → 영어 desc + 각인 금지 명시.
  const NO_ENGRAVE = ` This state description is a scene instruction ONLY: never print, engrave or letter any of those words onto the product or the background.`;
  const variant = state
    ? ` STATE: render the product in exactly this physical state — ${state}. The reference may show it in a different state, or show several states at once; take the product's identity, colour, material and markings from the reference and ignore whatever state it happens to be in there. Never "complete", close or reassemble the product to make it look tidier.${NO_ENGRAVE}`
    : (label ? ` This specific variant: ${label}.` : '');
  // 🔴 `No people, no hands, no props.` — 7/22 원본에 있던 문장. 어제 개편에서 빼면서 유연함이 죽었다.
  //   이 문장은 **상태 desc와 싸워서 이긴다**: 팩50의 desc가 `held in two wet hands`로 손을 명시하는데도
  //   7/24 결과에는 손이 없었다. 빼고 나니 같은 입력 6장 중 5장에 손이 남았다 — 하던 일이 있는 문장이다.
  //   ⚠️ 단 `no props`는 **포장 상태에만** 맞다. 파생 상태에선 유리잔·거품이 prop으로 분류돼 지워진다.
  const EXCLUDE = derived ? 'No people, no hands.' : 'No people, no hands, no props.';
  // 단위 결정 우선순위: 사용자 수동 교정(hint) > classify 자동 판별(unit) > 기본(단품 하나).
  const phrase = UNIT_PHRASE[unit];
  const unitClause = hint
    ? `Present the product EXACTLY as the seller instructs: "${hint}". If they say a pair, show a matching PAIR of two identical pieces arranged neatly together; follow their instruction precisely.`
    : (phrase
      ? `Show exactly ONE sellable unit, which for this product means ${phrase}. Do not add or remove objects.`
      : `Show exactly ONE single product — never a second copy, never a front-and-back pair side by side.`);
  const neg = (hint || phrase) ? NEG_MULTI : BAKE_NEG;
  const presentation = PRESENTATION[category] || PRESENTATION_DEFAULT;
  const aspect = await outputAspect(sourcePaths);

  const prompt = `A brand-new clean isolated e-commerce product photograph, shot from scratch in a studio. ${unitClause}

${SOURCE_HYGIENE}

THE PHOTOGRAPH: the product ${presentation}, large and centred on a light grey seamless studio background with a soft natural contact shadow, even softbox lighting, tack-sharp detail, true to its real shape, colour and material. ${FRAME} ${EXCLUDE}

MARKINGS: ${MARKINGS}${variant} ${aspect.name}.`;

  const res = await provider.generate({
    prompt,
    negativePrompt: neg,
    width: aspect.w, height: aspect.h,   // provider 가 지원 비율 중 최근접으로 매핑한다
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
 * @returns {Promise<Array<{sku:string, buffer:Buffer}>>}
 */
async function bakeRefs({ sourcePaths, skus, unit, category }) {
  if (!skus || !skus.length) {
    return [{ sku: 'main', buffer: await bakeOne({ sourcePaths, unit, category }) }];
  }
  const out = [];
  for (const s of skus) {
    out.push({ sku: s.sku, buffer: await bakeOne({ sourcePaths, label: s.label, unit, category }) });
  }
  return out;
}

module.exports = { bakeOne, bakeRefs };
