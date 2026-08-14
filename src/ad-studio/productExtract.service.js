const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');
const log = require('../lib/logger')('AdStudio:extract');

/**
 * 수집한 이미지 → 광고 대본에 쓸 제품 속성(구조화).
 * ============================================================================
 * ugcScript.service.js와 같은 Anthropic 비전 패턴. **텍스트가 아니라 이미지를 근거로** 뽑는 게 핵심이다.
 * 한국 상세페이지는 정보가 세로로 긴 이미지 한 장에 들어 있어서, HTML 텍스트만 믿으면 빈손이 된다.
 *
 * 반환값은 프롬프트 컴파일러(Phase 4)가 그대로 쓴다.
 */

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** strict 규약: additionalProperties:false + 전 필드 required */
const PRODUCT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'summary', 'sellingPoints', 'materials', 'colors', 'targetAudience', 'useScene', 'toneHint'],
  properties: {
    category: { type: 'string', description: '제품 카테고리(한국어, 예: 핸드크림·무선이어폰)' },
    summary: { type: 'string', description: '한 문장 요약(한국어)' },
    sellingPoints: { type: 'array', items: { type: 'string' }, description: '광고에 쓸 셀링포인트 3~5개(한국어)' },
    materials: { type: 'array', items: { type: 'string' }, description: '소재·성분. 모르면 빈 배열' },
    colors: { type: 'array', items: { type: 'string' }, description: '눈에 보이는 색상' },
    targetAudience: { type: 'string', description: '주 타깃(한국어)' },
    useScene: { type: 'string', description: '가장 자연스러운 사용 장면(한국어)' },
    toneHint: { type: 'string', description: '어울리는 광고 톤(예: 담백한 정보형·유쾌한 리뷰형)' },
  },
};

const SYSTEM = `너는 커머스 광고 기획자다. 제품 사진과 페이지 정보를 보고 **영상 광고 대본에 바로 쓸 수 있는** 속성을 뽑는다.

원칙:
- 사진에서 **실제로 보이는 것**만 쓴다. 안 보이는 성분·수치·효능을 지어내지 않는다.
- 과장·의학적 효능 표현을 쓰지 않는다(광고 심의 위반).
- 모르면 빈 값으로 둔다. 추측해서 채우면 대본이 거짓말을 하게 된다.
- 모든 텍스트는 한국어로 쓴다.`;

/** 이미지 URL을 base64로. 너무 크면 건너뛴다(비전 입력 상한·비용). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function toVisionBlock(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) return null;
    return { type: 'image', source: { type: 'base64', media_type: type, data: buf.toString('base64') } };
  } catch {
    return null;
  }
}

/**
 * @param {{name?:string, description?:string, price?:string, images?:string[], screenshots?:object[]}} product
 * @returns {Promise<object>} PRODUCT_SCHEMA 형태
 */
async function extract(product = {}) {
  const urls = [
    ...(product.screenshots || []).map((s) => s && s.url).filter(Boolean),  // 스크린샷 우선(페이지 전체 맥락)
    ...(product.images || []),
  ].slice(0, 4);   // 4장이면 충분하고, 그 이상은 비용만 늘어난다

  const blocks = (await Promise.all(urls.map(toVisionBlock))).filter(Boolean);
  if (!blocks.length && !product.name) {
    throw Object.assign(new Error('제품 이미지도 이름도 없어 분석할 수 없습니다.'), { statusCode: 400 });
  }

  const text = [
    product.name ? `제품명: ${product.name}` : '',
    product.price ? `가격: ${product.price}` : '',
    product.description ? `페이지 설명: ${String(product.description).slice(0, 1200)}` : '',
    blocks.length ? `첨부한 사진 ${blocks.length}장을 근거로 판단하라.` : '사진이 없으니 텍스트만으로 보수적으로 판단하라.',
  ].filter(Boolean).join('\n');

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL_SCRIPT,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: 'user', content: [...blocks, { type: 'text', text }] }],
    output_config: { format: { type: 'json_schema', schema: PRODUCT_SCHEMA } },
  });

  const out = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = out.match(/```json\s*([\s\S]*?)```/) || out.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error('제품 속성 추출: 유효한 JSON이 오지 않았습니다.');

  const attrs = JSON.parse(m[1]);
  log.info(`속성 추출 완료: ${attrs.category} (사진 ${blocks.length}장)`);
  return attrs;
}

module.exports = { extract, PRODUCT_SCHEMA };
