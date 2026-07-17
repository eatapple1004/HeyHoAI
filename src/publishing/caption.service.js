const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');
const { buildCaptionPrompt, BANNED_HASHTAGS } = require('./prompts/captionPrompt.builder');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ─── 캡션 안전성 검증 ───

// 캡션 금지어 — **솔리시테이션 전용**. 성인·미성년 어휘는 제거했다(2026-07-17, ugcScript.service와 같은 결정):
//   실제 게이트는 이미지·영상 생성 레벨이고, 부분문자열 매칭이라 멀쩡한 말이 걸렸다 —
//   'nude'→"rose-nude"(립스틱 셰이드) · 'loli'→**"lollipop"** · 'child'→"children" · 'teen'→"teenager".
// 아래 3개는 남긴다 — 이미지·영상 모델이 못 보는 **텍스트 솔리시테이션**이고, 구라서 오탐이 없다.
const CAPTION_BLOCKED_TERMS = [
  'onlyfans', 'link in bio for more', 'dm for prices',
];

/**
 * 생성된 캡션 + 해시태그의 안전성을 검증한다.
 * @param {{ caption: string; hashtags: string[] }} data
 * @returns {{ safe: boolean; violations: string[]; sanitizedHashtags: string[] }}
 */
function validateCaptionSafety({ caption, hashtags }) {
  const violations = [];
  const lower = caption.toLowerCase();

  // 캡션 금지어 검사
  for (const term of CAPTION_BLOCKED_TERMS) {
    if (lower.includes(term)) {
      violations.push(`Caption contains blocked term: "${term}"`);
    }
  }

  // 해시태그 정제: 금지 태그 제거 + 중복 제거
  const seen = new Set();
  const sanitizedHashtags = hashtags
    .map((t) => t.toLowerCase().replace(/^#/, '').replace(/\s+/g, ''))
    .filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      if (BANNED_HASHTAGS.includes(t)) {
        violations.push(`Removed banned hashtag: #${t}`);
        return false;
      }
      return t.length > 0 && t.length <= 30; // IG 해시태그 최대 30자
    });

  // IG 해시태그 최대 30개 제한
  const finalHashtags = sanitizedHashtags.slice(0, 30);

  return {
    safe: violations.filter((v) => !v.startsWith('Removed')).length === 0,
    violations,
    sanitizedHashtags: finalHashtags,
  };
}

/**
 * Claude API로 캡션과 해시태그를 생성한다.
 *
 * @param {{
 *   persona: object;
 *   mediaType: 'image' | 'video' | 'carousel';
 *   mediaContext: string;
 *   theme?: string;
 *   mood?: string;
 *   language?: string;
 * }} input
 * @returns {Promise<{
 *   caption: string;
 *   hashtags: string[];
 *   callToAction: string;
 *   altText: string;
 * }>}
 */
async function generateCaption(input) {
  const { system, user } = buildCaptionPrompt(input);

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON for caption');
  }

  const raw = JSON.parse(jsonMatch[1]);

  // 안전성 검증 + 해시태그 정제
  const safety = validateCaptionSafety({
    caption: raw.caption || '',
    hashtags: raw.hashtags || [],
  });

  if (!safety.safe) {
    throw Object.assign(
      new Error(`Unsafe caption: ${safety.violations.join('; ')}`),
      { statusCode: 422 }
    );
  }

  return {
    caption: raw.caption,
    hashtags: safety.sanitizedHashtags,
    callToAction: raw.callToAction || '',
    altText: raw.altText || '',
  };
}

module.exports = { generateCaption, validateCaptionSafety };
