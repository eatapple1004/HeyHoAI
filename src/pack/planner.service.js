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
    cuts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string', description: 'short slug id, e.g. hero_sunlit, swatch_macro, on_shoulder' },
          label: { type: 'string', description: 'short Korean label for the UI' },
          aspect: { type: 'string', enum: ['4:5', '1:1', '16:9'] },
          prompt: { type: 'string', description: 'detailed English image prompt grounded in THIS product; label/wordmark identical to reference, no fabricated lettering; product-only unless the category needs on-model' },
        },
        required: ['key', 'label', 'aspect', 'prompt'],
      },
    },
  },
  required: ['product', 'category', 'ingredient', 'isSet', 'cuts'],
};

const SYSTEM = `You are a senior e-commerce content director. You look at a product photo and plan the exact set of marketing images that would best sell THAT specific product on its product page and social feed. You adapt to the product's real category and appearance — you never apply a one-size-fits-all template.`;

function buildUserPrompt(nImgs, hint) {
  return [
    nImgs > 1
      ? `${nImgs} photos of the SAME single product are attached (different angles/states, or a set of variants). Study them together to understand its real appearance — form, color, material, finish, label/wordmark, and any moving parts.`
      : `A product photo is attached. Study its real appearance — form, color, material, finish, label/wordmark.`,
    hint ? `Seller note: ${hint}` : '',
    `TASK: infer what the product is and its category, then plan a DIVERSE PACK of 10–14 still shots that best sell THIS product.`,
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
    `Return ONLY the JSON object matching the schema.`,
  ].filter(Boolean).join('\n');
}

const ASPECT_DIMS = { '4:5': [768, 960], '1:1': [960, 960], '16:9': [1280, 720] };
function dimsFor(aspect) { return ASPECT_DIMS[aspect] || ASPECT_DIMS['4:5']; }

/**
 * @param {object} p
 * @param {Array<{data:string, mediaType?:string}>} p.images  base64 제품 사진
 * @param {string} [p.hint]  판매자 메모(선택)
 * @returns {Promise<{product, category, ingredient, isSet, cuts:Array}>}
 */
async function planPack({ images, hint }) {
  const imgs = (images || []).filter((im) => im && im.data);
  if (!imgs.length) throw Object.assign(new Error('planPack: 제품 사진 필요'), { statusCode: 400 });

  const content = [
    ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } })),
    { type: 'text', text: buildUserPrompt(imgs.length, hint) },
  ];
  const resp = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT,
    max_tokens: 4200,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error('planner: Claude가 JSON을 반환하지 않음');
  const plan = JSON.parse(m[1]);

  // 컷에 w/h 주입(aspect → 픽셀) + neg
  const NEG = 'garbled or fabricated lettering, distorted label, two or more products unless a set shot, duplicate product, warped product, extra caps, blown highlights';
  plan.cuts = (plan.cuts || []).map((c) => {
    const [w, h] = dimsFor(c.aspect);
    return { key: c.key, label: c.label, w, h, neg: NEG, prompt: () => c.prompt };
  });
  return plan;
}

module.exports = { planPack, PLAN_SCHEMA };
