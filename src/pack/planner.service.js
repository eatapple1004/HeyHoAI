/**
 * Product Pack — 비전 플래너("이 제품엔 뭘 만들지"를 사진 보고 결정).
 *
 * 고정 suite(모든 제품 동일)가 아니라, **제품 사진을 Claude 비전으로 분석**해
 *   제품·카테고리를 추론하고 그 제품에 어울리는 컷 목록·프롬프트를 생성한다.
 *   (ad video 엔진 src/ugc/ugcScript.service 의 비전첨부 패턴 재사용.)
 *
 * 반환 cuts 는 pack.service 가 캐논 레퍼로 nano-banana 생성.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// structured outputs 스키마(유효 JSON 보장, strict 규약: additionalProperties:false + 전 필드 required)
const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    product: { type: 'string', description: 'one-line description of the exact product, grounded in the photo (form, color, material, what it is)' },
    category: { type: 'string', description: 'inferred product category, e.g. beverage, cosmetics-skincare, cosmetics-color, haircare, apparel, footwear, bag, jewelry, food, home, tech' },
    ingredient: { type: 'string', description: 'the natural source ingredient/material to feature, or empty string if none' },
    isSet: { type: 'boolean', description: 'true if the photo shows a set / multiple variants of the same product line' },
    variants: {
      type: 'array',
      description: 'if isSet, one entry per distinct variant in the set; empty array if not a set',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sku: { type: 'string', description: 'short slug id for the variant, e.g. mon, tue, red, blue' },
          label: { type: 'string', description: 'brief description of this variant for baking, e.g. "pink MON day-label", "red colorway"' },
        },
        required: ['sku', 'label'],
      },
    },
    cuts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string', description: 'short slug id, e.g. hero_sunlit, swatch_macro, on_shoulder' },
          label: { type: 'string', description: 'short Korean USE-CASE label a shop owner instantly understands — WHERE they would use this image. e.g. "쇼핑몰 대표 이미지", "상세 디테일컷", "착용 느낌", "감성 SNS 컷", "성분 강조", "세트 로우". NOT photography jargon like "고스트 착장감"·"에디토리얼"·"플랫레이".' },
          aspect: { type: 'string', enum: ['4:5', '1:1', '16:9'] },
          prompt: { type: 'string', description: 'detailed English image prompt grounded in THIS product; label/wordmark identical to reference, no fabricated lettering; product-only unless the category needs on-model' },
        },
        required: ['key', 'label', 'aspect', 'prompt'],
      },
    },
  },
  required: ['product', 'category', 'ingredient', 'isSet', 'variants', 'cuts'],
};

const SYSTEM = `You are a senior e-commerce content director. You look at a product photo and plan the exact set of marketing images that would best sell THAT specific product on its product page and social feed. You adapt to the product's real category and appearance — you never apply a one-size-fits-all template.`;

function buildUserPrompt(nImgs, hint, confirmed, state, exclude) {
  const known = (confirmed && confirmed.category)
    ? `This product has ALREADY been identified by the user as: category = "${confirmed.category}"${confirmed.product ? `, product = "${confirmed.product}"` : ''}. TRUST this — do NOT reclassify or drift to another category. Echo this category back and plan cuts tailored specifically to a "${confirmed.category}" product.`
    : `TASK: infer what the product is and its category first.`;
  // 🔵 상태 포커스 — 상태별로 플래너를 나눠 호출한다(호출당 출력이 작아 truncation 원천 차단 + 상태 수만큼 선형 확장).
  const stateFocus = state ? [
    `IMPORTANT — this plan is for ONE specific PRESENTATION STATE of the product: "${state.label}"${state.key ? ` (${state.key})` : ''}.`,
    `The canonical reference used to render these cuts shows the product in THAT state, so every cut must depict the product in that state.`,
    `Plan cuts that specifically showcase what makes THIS state worth seeing (what it reveals, its material detail, how a buyer judges it). Do NOT describe or depict the other states.`,
    `Give ${state.perState || 8}–${(state.perState || 8) + 2} cuts for this state.`,
  ].join('\n') : '';
  // 🔵 차수(round) — 한 호출에 20컷을 요구하면 JSON이 잘린다(참사 원인). 대신 호출을 나누고,
  //   2차부터는 앞서 뽑은 컷 라벨을 넘겨 "이것 말고 진짜 다른 것"을 받는다. 호출당 출력 크기는 그대로.
  const prev = (exclude || []).filter(Boolean);
  const roundClause = prev.length ? [
    `This is an ADDITIONAL round of planning for the SAME product. These shots are ALREADY planned:`,
    prev.map((e) => `  · ${e}`).join('\n'),
    `Give ${Math.max(6, Math.min(10, prev.length))} MORE cuts that are genuinely DIFFERENT from every one above — a different setting, framing, styling, mood or story. Do NOT produce near-duplicates or trivial variations (e.g. "on grey background" vs "on light grey background"). If you have run out of genuinely distinct ideas, return fewer cuts rather than padding with repeats.`,
  ].join('\n') : '';
  return [
    nImgs > 1
      ? `${nImgs} photos of the SAME single product are attached (different angles/states, or a set of variants). Study them together to understand its real appearance — form, color, material, finish, label/wordmark, and any moving parts.`
      : `A product photo is attached. Study its real appearance — form, color, material, finish, label/wordmark.`,
    hint ? `Seller note: ${hint}` : '',
    known,
    stateFocus,
    roundClause,
    (state || prev.length) ? '' : `Plan a DIVERSE PACK of 8–12 still shots that best sell THIS product.`,
    `Adapt shot TYPES to the category — pick from a menu, don't force a fixed list:`,
    `  · beverage/food → hero (sunlit / color-block / luxe), clean PDP (front, 3/4), ingredient-with-source, pour/texture macro, lifestyle (morning table / desk / iced), flat-lay, splash, editorial.`,
    `  · cosmetics-skincare → hero, PDP, texture/dollop macro, ingredient, on-skin swatch, dewy/glass hero, shelfie lifestyle.`,
    `  · cosmetics-color → shade swatch grid, texture macro, on-lips/on-skin, hero, gloss/mirror.`,
    `  · haircare → bottle hero, foam/lather macro, scalp/strand, in-shower lifestyle, ingredient.`,
    `  · apparel → flat-lay, ghost-mannequin, on-model, fabric/detail macro, styled scene.`,
    `  · footwear → 3/4 studio, sole/profile, on-foot, styled.`,
    `  · bag → flat-lay, on-shoulder, interior/detail, styled lifestyle.`,
    `  · jewelry → macro on seamless, on-hand/neck/ear, pedestal, editorial.`,
    `For EACH cut give: key (slug), label (short Korean), aspect (4:5 for hero/PDP, 1:1 or 16:9 where it fits), and a detailed English image prompt GROUNDED in the real product (its exact color/form/label). In every prompt keep the product's label and wordmark identical to the reference and do not fabricate lettering. Product-only (no people/hands) UNLESS the category needs on-model (apparel/footwear/jewelry-on-body) — say so explicitly in those.`,
    `Vary the shots — no two cuts should look the same. Ground the "ingredient" field in what you actually see (e.g. apple for apple vinegar, none for a tech gadget).`,
    `If this is a SET (multiple variants of the same line, e.g. day-of-week bottles or colorways), set isSet=true and list EACH distinct variant in "variants" (sku + a brief label used to bake that variant, e.g. "pink MON day-label"). If it is a single product, isSet=false and variants=[].`,
    `Return ONLY the JSON object matching the schema.`,
  ].filter(Boolean).join('\n');
}

const ASPECT_DIMS = { '4:5': [768, 960], '1:1': [960, 960], '16:9': [1280, 720] };
function dimsFor(aspect) { return ASPECT_DIMS[aspect] || ASPECT_DIMS['4:5']; }

/**
 * @param {object} p
 * @param {Array<{data:string, mediaType?:string}>} p.images  base64 제품 사진
 * @param {string} [p.hint]  판매자 메모(선택)
 * @param {{key:string,label:string,perState?:number}} [p.state]  상태 포커스(있으면 그 상태 전용 컷만 계획)
 * @param {string[]} [p.exclude]  이미 뽑힌 컷 라벨 — 2차 이상 호출에서 중복을 피하려고 넘긴다
 * @returns {Promise<{product, category, ingredient, isSet, cuts:Array}>}
 */
async function planPack({ images, hint, category, product, state, exclude }) {
  const imgs = (images || []).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('planPack: 제품 사진 필요'), { statusCode: 400 });

  const content = [
    ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } })),
    { type: 'text', text: buildUserPrompt(imgs.length, hint, { category, product }, state, exclude) },
  ];
  const resp = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT,
    // 8~12컷 × 상세 프롬프트 → 4200은 JSON 잘림(→파싱실패→폴백)이 잦았다. 넉넉히.
    // 🔵 20컷+는 이 한 호출을 키워서가 아니라 **상태별로 호출을 나눠서** 얻는다(호출당 출력은 계속 8~12컷 수준 유지).
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(`planner: JSON 없음(len=${text.length}, stop=${resp.stop_reason})`);
  let plan;
  try { plan = JSON.parse(m[1]); }
  catch (e) { throw new Error(`planner: JSON 파싱 실패(${e.message} · len=${text.length} · stop=${resp.stop_reason})`); } // 잘림이면 stop_reason=max_tokens로 드러남

  // 컷에 w/h 주입(aspect → 픽셀) + neg
  const NEG = 'garbled or fabricated lettering, distorted label, two or more products unless a set shot, duplicate product, warped product, extra caps, blown highlights';
  plan.cuts = (plan.cuts || []).map((c) => {
    const [w, h] = dimsFor(c.aspect);
    // promptText/aspect도 보존 — config.plan에 직렬화 저장해 "컷 재생성"에 재사용(prompt는 함수라 직렬화 불가).
    return { key: c.key, label: c.label, w, h, neg: NEG, aspect: c.aspect, promptText: c.prompt, prompt: () => c.prompt };
  });
  return plan;
}

// ── 가벼운 분류(확인 단계용) — 출력이 작아 truncation 위험 없음. planPack 전에 카테고리를 확정받는다. ──
const CATEGORIES = ['beverage', 'food', 'cosmetics-skincare', 'cosmetics-color', 'haircare', 'apparel', 'footwear', 'bag', 'jewelry', 'home', 'tech', 'other'];
const CLASSIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    product: { type: 'string', description: 'one-line description of the exact product (form, color, material, what it is)' },
    category: { type: 'string', description: `product category, one of: ${CATEGORIES.join(', ')}` },
    isSet: { type: 'boolean', description: 'true if the photo shows a set / multiple distinct variants of the same line' },
    variants: { type: 'array', description: 'if isSet, one entry per distinct variant; else empty', items: { type: 'object', additionalProperties: false, properties: { sku: { type: 'string' }, label: { type: 'string' } }, required: ['sku', 'label'] } },
    // 🔵 unit = "이 상품의 한 단위가 무엇인가" — 캐논 레퍼를 구울 때 몇 개를 그릴지 결정한다.
    //   기본 가정("단품 하나")이 틀리는 흔한 케이스: 귀걸이(한 쌍), 향수+박스(본체+패키지).
    unit: {
      type: 'string',
      enum: ['single', 'pair', 'with_package', 'group'],
      description: 'What makes up ONE sellable presentation of this product: "single" = one object on its own; "pair" = two identical pieces always sold/worn together (earrings, shoes, socks, gloves); "with_package" = the item shown together with its own box/pouch/packaging as one presentation; "group" = several pieces bundled and sold as one unit. Judge from the photo and from how this product is normally sold. Default "single" when unsure.',
    },
    // 🔵 상태(state) = 같은 하나의 제품을 "다르게 보여준 모습"(뚜껑 닫음/열음, 접힘/펼침, 포장/개봉).
    //   변형(variants=다른 SKU·색상)과는 다른 축. 상태마다 캐논 레퍼를 따로 굽고 컷 세트를 따로 만든다.
    states: {
      type: 'array',
      description: 'distinct PRESENTATION STATES of the SAME single product that are actually VISIBLE in the attached photos (e.g. cap-on vs cap-off, closed vs open, folded vs unfolded, boxed vs unboxed). If every photo shows the same state, return exactly ONE entry. Never invent a state that is not photographed.',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          key: { type: 'string', description: 'short ascii slug, e.g. closed, open, folded' },
          label: { type: 'string', description: 'very short Korean label a shop owner reads instantly, e.g. "뚜껑 닫음", "뚜껑 열림"' },
          photoIndex: { type: 'number', description: '0-based index of the attached photo that best shows this state; -1 if no single photo shows it clearly' },
        },
        required: ['key', 'label', 'photoIndex'],
      },
    },
  },
  required: ['product', 'category', 'isSet', 'variants', 'states', 'unit'],
};
async function classifyProduct({ images, hint }) {
  const imgs = (images || []).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('classify: 제품 사진 필요'), { statusCode: 400 });
  const content = [
    ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } })),
    { type: 'text', text: [
      `Identify the product in the attached photo${imgs.length > 1 ? 's' : ''} precisely and concisely.`,
      hint ? `Seller note: "${hint}" — trust this for the category.` : '',
      `Distinguish two different axes, and do not confuse them:`,
      `  · variants = DIFFERENT products/SKUs of one line (red vs blue, MON vs TUE bottle) → isSet + variants.`,
      `  · states   = the SAME single product shown differently (cap on vs cap off, closed vs open, folded vs unfolded, boxed vs unboxed) → states.`,
      `A lipstick photographed with its cap on AND with the cap off is ONE product in TWO states — not two variants.`,
      `⚠️ A different camera ANGLE, distance, crop or lighting of the SAME configuration is NOT a different state (front view vs side view vs close-up = one state). A state must differ in how the object itself is arranged — opened/closed, folded/unfolded, packed/unpacked, assembled/apart.`,
      `Only list a state you can actually SEE in the attached photo${imgs.length > 1 ? 's' : ''}. If all photos show the same state, return exactly one state. Max 4.`,
      `Also decide "unit" — how many objects make up ONE sellable presentation. Earrings are normally sold and worn as a PAIR; a perfume shown with its own box is "with_package". Getting this wrong makes every generated image show the wrong number of objects.`,
      `Return: product (one line), category (exactly one of: ${CATEGORIES.join(', ')}), isSet, variants, states, unit.`,
    ].filter(Boolean).join('\n') },
  ];
  const resp = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT, max_tokens: 900,
    system: 'You identify consumer products from photos precisely and concisely.',
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error('classify: JSON 없음');
  return JSON.parse(m[1]);
}

module.exports = { planPack, classifyProduct, PLAN_SCHEMA, CATEGORIES };
