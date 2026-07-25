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
    concept: { type: 'string', description: 'ONLY when asked to invent a fresh concept for this round: a short Korean name for the new theme you chose (e.g. "겨울 홈카페", "미니멀 데스크"). Empty string otherwise.' },
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
  required: ['product', 'category', 'ingredient', 'concept', 'isSet', 'variants', 'cuts'],
};

const SYSTEM = `You are a senior e-commerce content director. You look at a product photo and plan the exact set of marketing images that would best sell THAT specific product on its product page and social feed. You adapt to the product's real category and appearance — you never apply a one-size-fits-all template.`;

function buildUserPrompt(nImgs, hint, confirmed, state, exclude, want, lens, seed, autoConcept) {
  const n = Math.max(4, Math.min(12, want || 10));   // 한 호출의 요청량 — 12를 넘기면 JSON이 잘린다
  const known = (confirmed && confirmed.category)
    ? `This product has ALREADY been identified by the user as: category = "${confirmed.category}"${confirmed.product ? `, product = "${confirmed.product}"` : ''}. TRUST this — do NOT reclassify or drift to another category. Echo this category back and plan cuts tailored specifically to a "${confirmed.category}" product.`
    : `TASK: infer what the product is and its category first.`;
  // 🔵 상태 포커스 — 상태별로 플래너를 나눠 호출한다(호출당 출력이 작아 truncation 원천 차단 + 상태 수만큼 선형 확장).
  const stateFocus = state ? [
    `IMPORTANT — this plan is for ONE specific PRESENTATION STATE of the product: ${state.desc ? state.desc : `"${state.label}"`}${state.key ? ` (${state.key})` : ''}.`,
    `The canonical reference used to render these cuts shows the product in THAT state, so EVERY cut must depict the product in that state.`,
    // 🔒 상태 > 렌즈 — 실제로 "우린 차" 상태인데 렌즈가 찻잎 축이라 마른 찻잎 컷이 나왔다(라벨·내용 불일치).
    `🔒 This state is a HARD constraint and OUTRANKS the lens/angle below. If a lens would show a different state (e.g. dry loose leaves when this state is brewed liquid), adapt that lens to THIS state instead — never plan a cut whose subject is a different state.`,
    `Plan cuts that specifically showcase what makes THIS state worth seeing (what it reveals, its material detail, how a buyer judges it). Do NOT describe or depict the other states.`,
    // 🔴 브랜드 노출 — 파생 상태(내용물·완성형)만 찍으면 "어느 회사 제품인지 모르는 일반 사진"이 된다.
    //   실측에서 27컷 중 브랜드가 보이는 게 8컷뿐이었다(나머지는 그냥 찻잎·찻물).
    state.derived
      ? `🏷 BRAND VISIBILITY — this state shows the contents/prepared form, not the branded package, so on its own it looks like a generic stock photo. Plan MOST cuts in this round with the product's own branded package ALSO in frame (standing beside it, behind it, being poured from it) so a shopper can tell whose product this is. Keep only 1–2 pure macro shots without the package. Say explicitly in those prompts that the branded package is in frame with its label facing the camera.`
      : '',
    `Give ${n} cuts for this state.`,
  ].filter(Boolean).join('\n') : '';
  // 🔵 차수(round) — 한 호출에 20컷을 요구하면 JSON이 잘린다(참사 원인). 대신 호출을 나누고,
  //   2차부터는 앞서 뽑은 컷 라벨을 넘겨 "이것 말고 진짜 다른 것"을 받는다. 호출당 출력 크기는 그대로.
  const prev = (exclude || []).filter(Boolean);
  // autoConcept 모드에선 roundClause를 끈다 — "다른 것 주고 아이디어 없으면 적게"는 잔여물 긁기 프레임이라
  //   테마 창안(autoConceptClause)과 충돌한다. 대신 여태 나온 라벨을 autoConceptClause 안에서 참조한다.
  const roundClause = (prev.length && !autoConcept) ? [
    `This is an ADDITIONAL round of planning for the SAME product. These shots are ALREADY planned:`,
    prev.map((e) => `  · ${e}`).join('\n'),
    `Give ${n} MORE cuts that are genuinely DIFFERENT from every one above — a different setting, framing, styling, mood or story. Do NOT produce near-duplicates or trivial variations (e.g. "on grey background" vs "on light grey background"). If you have run out of genuinely distinct ideas, return fewer cuts rather than padding with repeats.`,
  ].join('\n') : '';
  // 🟢 유저 컨셉 프롬프트 = 기획 주도 브리프. 있으면 표준 메뉴를 강제하지 않고 이 브리프대로 다시 기획한다.
  //   단 상거래 필수컷(정면 PDP·디테일)은 브리프에 없어도 몇 컷 유지(결정: 프롬프트 우선 + 필수컷 유지).
  const briefClause = hint ? [
    `CREATIVE BRIEF from the seller — treat this as the PRIMARY driver of the whole pack: "${hint}".`,
    `Plan MOST of the ${n} cuts to realize THIS brief in genuinely different ways — vary the setting, framing, props, lighting, mood and story while staying faithful to the brief AND to the real product (its exact shape/color/label/wordmark, no fabricated lettering).`,
    `Always also include at least ONE clean front-facing PDP cut and ONE detail/macro cut so the product page still works commercially, even if the brief doesn't mention them.`,
    `Do NOT ignore the brief and fall back to a generic category template.`,
  ].join('\n') : '';
  // 🟣 렌즈(lens) — 이번 라운드의 "축". 차수마다 다른 렌즈로 돌려 다양성을 낸다(핵심→라이프→아트→배경→시즌→실험).
  //   같은 제품도 씬·무드·배경 조합은 사실상 무한이라, 렌즈를 회전시키면 근접 중복 없이 계속 새 컷이 나온다.
  //   브리프가 있으면 브리프가 PRIMARY, 렌즈는 "그 브리프를 이번엔 이 각도로" 보조. Claude가 둘을 자연히 조화시킨다.
  const lensClause = lens ? [
    `THIS ROUND'S LENS — plan all ${n} cuts through one specific angle: **${lens.label}** — ${lens.brief}`,
    `Every cut this round should belong to that lens, while keeping the real product exact (shape/color/label/wordmark, no fabricated lettering).`,
    state ? `⚠️ If this lens conflicts with the STATE constraint above, the STATE wins — bend the lens to fit the state, never the other way round.` : '',
  ].filter(Boolean).join('\n') : '';
  // ✦ 씨앗(seed) — "이 컷이 마음에 든다, 이런 걸로 더". roundClause/lensClause 는 "다른 것"을 요구하지만
  //   이건 반대다: **같은 결**(무드·조명·세팅 종류)을 유지하고 각도·소품·구도만 바꾼 형제 컷을 뽑는다.
  //   exclude 로 기존 라벨을 함께 넘겨 씨앗 자신·다른 기존 컷의 재현은 막는다(변주는 하되 복제는 안 함).
  const seedClause = seed ? [
    `THE SELLER LOVED THIS SHOT and wants MORE in the same vein:`,
    `  · ${seed.label || 'the selected cut'}${seed.prompt ? ` — ${seed.prompt}` : ''}`,
    `Plan ${n} NEW shots that feel like siblings of it — keep the SAME mood, lighting family, palette and setting TYPE — but make each one a genuinely distinct angle, framing, prop arrangement or composition. They should read as "more of this look", not near-duplicates of the seed or of each other. Keep the real product exact (shape/color/label/wordmark, no fabricated lettering).`,
  ].join('\n') : '';
  // 🧠 알아서 더 — 브리프 없이 "새로 뽑아줘". exclude(=여태 나온 라벨)만 주면 남은 걸 긁다 마른다.
  //   그게 아니라 **한 발 위에서 새 컨셉(테마)을 스스로 창안**하게 한다 — 테마는 개별 컷보다 훨씬 무궁무진하고,
  //   하나의 테마가 서로 어울리는 컷 묶음을 낳는다(흩어진 잔여물이 아니라 결이 있는 새 세트).
  const autoConceptClause = autoConcept ? [
    `AUTO-CONCEPT — the seller didn't specify a direction; they trust you to come up with a fresh one.`,
    `Do NOT just scrape leftover shot ideas. Instead, INVENT ONE genuinely new creative concept/theme for THIS product — a specific mood, setting and story that a real brand might run — that is clearly DIFFERENT from every direction already covered. Think seasonal campaigns, a lifestyle moment, an editorial mood, a material/surface story, a gifting angle, a time-of-day scene — pick ONE and commit.`,
    prev.length ? `Directions ALREADY covered (choose a theme unlike all of these):\n${prev.map((e) => `  · ${e}`).join('\n')}` : '',
    `Name that theme in the "concept" field (short Korean), then plan all ${n} cuts to realize that single coherent theme in distinct framings. Keep the real product exact (shape/color/label/wordmark, no fabricated lettering).`,
  ].filter(Boolean).join('\n') : '';
  return [
    nImgs > 1
      ? `${nImgs} photos of the SAME single product are attached (different angles/states, or a set of variants). Study them together to understand its real appearance — form, color, material, finish, label/wordmark, and any moving parts.`
      : `A product photo is attached. Study its real appearance — form, color, material, finish, label/wordmark.`,
    briefClause,
    known,
    stateFocus,
    roundClause,
    lensClause,
    seedClause,
    autoConceptClause,
    (state || prev.length || seed || autoConcept) ? '' : `Plan a DIVERSE PACK of ${n} still shots that best sell THIS product.`,
    hint
      ? `Category shot types below are only LOOSE inspiration — the creative brief above takes priority over this menu:`
      : `Adapt shot TYPES to the category — pick from a menu, don't force a fixed list:`,
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
 * @param {number} [p.want]  이번 호출에서 받고 싶은 컷 수(4~12로 클램프 — 12 넘기면 JSON이 잘린다)
 * @param {{key,label,brief}} [p.lens]  이번 라운드의 축(핵심·라이프·아트…) — 차수 회전으로 다양성
 * @param {{label,prompt}} [p.seed]  "이 컷처럼 더" — 이 컷과 같은 결로 형제 컷 N장(무드 유지, 구도만 변주)
 * @param {boolean} [p.autoConcept]  "알아서 더" — 브리프 없이, 여태 안 나온 **새 컨셉을 스스로 창안**해 N장
 * @returns {Promise<{product, category, ingredient, concept, isSet, cuts:Array}>}
 */
async function planPack({ images, hint, category, product, state, exclude, want, lens, seed, autoConcept }) {
  const imgs = (images || []).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('planPack: 제품 사진 필요'), { statusCode: 400 });

  const content = [
    ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } })),
    { type: 'text', text: buildUserPrompt(imgs.length, hint, { category, product }, state, exclude, want, lens, seed, autoConcept) },
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
          label: { type: 'string', description: 'very short Korean label a shop owner reads instantly, e.g. "뚜껑 닫음", "뚜껑 열림". UI display only.' },
          // 🔴 desc = 이미지 모델에게 주는 **영어** 상태 설명. 한국어 label을 그대로 넘기면 모델이 그걸
          //   "제품에 인쇄할 글자"로 오해해 컵에 "우린 차"를 찍어버린다(실제 발생).
          desc: { type: 'string', description: 'SHORT ENGLISH description of this physical state, for the image model. Describe what the object looks like, e.g. "cap on, tube closed", "cap off with the bullet extended", "loose dry tea leaves on a plate", "brewed tea in a cup". This is a scene instruction — never a label to print on the product.' },
          // 🏷 브랜드가 보이는 상태인지 — 안 보이는 상태(내용물·완성형)는 그대로 찍으면 "일반 스톡사진"이 된다.
          showsPackage: { type: 'boolean', description: 'true if this state shows the branded package itself (sealed pouch, box, labelled bottle) so the brand is readable; false if it shows only the contents or prepared form (loose leaves, brewed liquid, cream swatch, food plated) where no brand is visible.' },
          photoIndex: { type: 'number', description: '0-based index of the attached photo that best shows this state; -1 if no single photo shows it clearly' },
        },
        required: ['key', 'label', 'desc', 'showsPackage', 'photoIndex'],
      },
    },
    // 🟣 렌즈(lenses) = 이 제품을 다양하게 찍는 "축"들, 유효순. 컷은 이 축을 하나씩 돌며 뽑힌다(축마다 소량).
    //   고정 배열이 아니라 제품이 정한다: 음료엔 성분·원물, 주얼리엔 착용, 텀블러엔 카페·아웃도어…
    //   개수도 제품이 정함(보통 6~10). 생성량이 실제로 몇 개 축을 얼마 깊이 쓸지 결정한다.
    lenses: {
      type: 'array',
      description: 'Ordered list of distinct CREATIVE ANGLES this pack rotates through for variety, most valuable first — each angle yields a few cuts, then the next. IF the seller gave a concept/mood note, these must be different ways to REALIZE THAT CONCEPT (vary prop/moment/framing/lighting within it), NOT unrelated generic angles. If NO concept was given, tailor them to the product category: tumbler → cafe/office, outdoors, surface-texture, minimal; jewelry → on-body, macro, pedestal, editorial; drink → ingredient, lifestyle, splash, iced. Give 6–10.',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          key: { type: 'string', description: 'short ascii slug, e.g. cafe, ingredient, on_hand, surface' },
          label: { type: 'string', description: 'very short Korean label a shop owner reads instantly, e.g. "카페 감성", "성분·원물", "착용컷", "배경·질감"' },
          brief: { type: 'string', description: 'one concise English phrase telling the planner what this angle covers (max ~15 words)' },
        },
        required: ['key', 'label', 'brief'],
      },
    },
  },
  required: ['product', 'category', 'isSet', 'variants', 'states', 'unit', 'lenses'],
};
/** classify 프롬프트 빌더 — 렌즈 지시가 컨셉(hint) 유무로 갈린다. 테스트용으로 추출. */
function buildClassifyPrompt(nImgs, hint) {
  const many = nImgs > 1;
  return [
    `Identify the product in the attached photo${many ? 's' : ''} precisely and concisely.`,
    hint ? `Seller note: "${hint}" — this may describe the desired CONCEPT/mood rather than the product; identify the product itself from the PHOTO, and use the note only if it names the product or category.` : '',
    `Distinguish two different axes, and do not confuse them:`,
    `  · variants = DIFFERENT products/SKUs of one line (red vs blue, MON vs TUE bottle) → isSet + variants.`,
    `  · states   = the SAME single product shown differently (cap on vs cap off, closed vs open, folded vs unfolded, boxed vs unboxed) → states.`,
    `A lipstick photographed with its cap on AND with the cap off is ONE product in TWO states — not two variants.`,
    `⚠️ A different camera ANGLE, distance, crop or lighting of the SAME configuration is NOT a different state (front view vs side view vs close-up = one state). A state must differ in how the object itself is arranged — opened/closed, folded/unfolded, packed/unpacked, assembled/apart.`,
    `Only list a state you can actually SEE in the attached photo${many ? 's' : ''}. If all photos show the same state, return exactly one state. Max 4.`,
    `For each state also give "desc" — a SHORT ENGLISH description of how the object physically looks in that state (a scene instruction for an image model, NEVER text to print on the product) — and "showsPackage": whether the branded package is visible in that state (a sealed pouch shows it; loose contents or a brewed cup do not).`,
    `Also decide "unit" — how many objects make up ONE sellable presentation. Earrings are normally sold and worn as a PAIR; a perfume shown with its own box is "with_package". Getting this wrong makes every generated image show the wrong number of objects.`,
    // 🟣 렌즈 = 다양성 축. 컨셉이 있으면 "그 컨셉의 변주"로, 없으면 "제품 카테고리 축"으로.
    //   안 그러면 "카페 아침" 컨셉인데 렌즈가 "배경질감/시즌" 딴 축으로 끌어 컨셉을 배신한다.
    hint
      ? `Also give "lenses" — 6 to 10 DIFFERENT WAYS TO REALIZE THE SELLER'S CONCEPT ("${hint}"), most useful first. Each lens is a distinct angle/prop/moment/framing/lighting WITHIN that concept (concept "cozy cafe morning" → lenses like "라떼와 함께", "창가 햇살", "책과 함께", "김 나는 컵", "나무 테이블 위"). Keep them ALL faithful to that concept — do NOT drift to unrelated generic product angles like plain grey-background or seasonal shots. Keep each brief short.`
      : `Also give "lenses" — 6 to 10 distinct creative ANGLES for shooting THIS product, most valuable first (a clean PDP/detail angle near the top). Make them genuinely different from each other and specific to this product's category. Keep each brief short.`,
    `Return: product (one line), category (exactly one of: ${CATEGORIES.join(', ')}), isSet, variants, states (key/label/desc/showsPackage/photoIndex), unit, lenses.`,
  ].filter(Boolean).join('\n');
}

async function classifyProduct({ images, hint }) {
  const imgs = (images || []).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('classify: 제품 사진 필요'), { statusCode: 400 });
  const content = [
    ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } })),
    { type: 'text', text: buildClassifyPrompt(imgs.length, hint) },
  ];
  const resp = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT, max_tokens: 1400,   // lenses(6~10 × label+brief) 추가분 — 압축돼 있어 여유
    system: 'You identify consumer products from photos precisely and concisely.',
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error('classify: JSON 없음');
  return JSON.parse(m[1]);
}

module.exports = { planPack, classifyProduct, buildClassifyPrompt, PLAN_SCHEMA, CATEGORIES };
