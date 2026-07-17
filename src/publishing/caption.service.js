const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../config');
const { buildCaptionPrompt, BANNED_HASHTAGS } = require('./prompts/captionPrompt.builder');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ─── 해시태그 정제 ───

// ⛔ 캡션 금지어 검사 제거 (2026-07-17 사용자 결정) — 근거는 ugcScript.service.js의 같은 주석 참조.
//   요약: 실제 게이트는 이미지·영상 생성 레벨이고, 이 목록은 **우리가 만든 우리 자신의 캡션**을
//   부분문자열로 훑어 오탐만 냈다 — 'nude'→"rose-nude"(립스틱 셰이드) · 'loli'→**"lollipop"** ·
//   'child'→"children" · 'teen'→"teenager". 목록이 사라지며 `safe`는 항상 true가 되므로
//   그것과 422 throw도 같이 걷었다(영원히 안 터지는 가드를 남겨두면 다음 사람이 방어가 있다고 읽는다).
// BANNED_HASHTAGS(f4f·like4like 등)는 유지 — 그건 안전이 아니라 **IG 노출 위생**이라 근거가 다르다.

/**
 * 해시태그 정제 — 스팸 태그 제거 + 중복 제거 + IG 제한(30자·30개).
 * @param {{ hashtags: string[] }} data
 * @returns {{ removed: string[]; sanitizedHashtags: string[] }}
 */
function sanitizeCaptionHashtags({ hashtags }) {
  const removed = [];
  const seen = new Set();
  const sanitizedHashtags = hashtags
    .map((t) => t.toLowerCase().replace(/^#/, '').replace(/\s+/g, ''))
    .filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      if (BANNED_HASHTAGS.includes(t)) {
        removed.push(t);
        return false;
      }
      return t.length > 0 && t.length <= 30; // IG 해시태그 최대 30자
    });

  return {
    removed,
    sanitizedHashtags: sanitizedHashtags.slice(0, 30), // IG 해시태그 최대 30개
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

  // 해시태그 정제(스팸 태그·중복·IG 제한)
  const { sanitizedHashtags } = sanitizeCaptionHashtags({ hashtags: raw.hashtags || [] });

  return {
    caption: raw.caption,
    hashtags: sanitizedHashtags,
    callToAction: raw.callToAction || '',
    altText: raw.altText || '',
  };
}

module.exports = { generateCaption, sanitizeCaptionHashtags };
