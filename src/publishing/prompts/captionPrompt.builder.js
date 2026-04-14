/**
 * 캐릭터 persona + 콘텐츠 컨텍스트를 받아
 * Claude API용 캡션/해시태그 생성 프롬프트를 조립한다.
 */

const SYSTEM_PROMPT = `You are a social media copywriter for Instagram virtual influencer accounts.
You write captions and select hashtags that feel authentic to the character's voice.

ABSOLUTE RULES:
1. Write in the character's voice and tone — never break character.
2. NO sexual, suggestive, or fetish-related language.
3. NO references to minors, school, or anything implying underage.
4. NO aggressive, hateful, or controversial statements.
5. Hashtags must be brand-safe — no spam tags, no banned IG tags.
6. Keep captions concise and engaging — Instagram users scroll fast.
7. Return valid JSON only, no explanation.`;

// ─── 해시태그 정책 ───

/** Instagram이 차단하거나 스팸으로 간주하는 태그 목록 */
const BANNED_HASHTAGS = [
  // 스팸성
  'followforfollow', 'f4f', 'like4like', 'l4l', 'follow4follow',
  'likeforlike', 'followback', 'instalike', 'tagsforlikes',
  'followme', 'likesforlikes', 'instadaily', 'instagood',
  // NSFW 관련
  'nsfw', 'sexy', 'hot', 'thot', 'baddie', 'onlyfans',
  'bikini', 'lingerie', 'boudoir',
  // IG 제한 태그
  'adulting', 'alone', 'attractive', 'beautyblogger',
  'desk', 'direct', 'dm', 'elevator',
];

/**
 * @param {{
 *   persona: object;
 *   mediaType: 'image' | 'video' | 'carousel';
 *   mediaContext: string;
 *   theme?: string;
 *   mood?: string;
 *   language?: string;
 * }} input
 * @returns {{ system: string; user: string }}
 */
function buildCaptionPrompt(input) {
  const { persona, mediaType, mediaContext, theme, mood, language = 'en' } = input;
  const voice = persona.voiceGuidelines || {};
  const brand = persona.brandSafety || {};
  const ig = persona.instagramProfile || {};

  const user = `Generate an Instagram caption and hashtags for this post.

CHARACTER:
- Name: ${persona.name}
- Personality: ${(persona.personality || []).join(', ')}
- Voice tone: ${voice.tone || 'friendly'}
- Vocabulary style: ${voice.vocabulary || 'casual'}
- Emoji usage: ${voice.emojiStyle || 'moderate'}
- Caption length preference: ${voice.captionLength || 'medium'}

POST CONTEXT:
- Media type: ${mediaType}${mediaType === 'video' ? ' (Instagram Reel)' : ''}
- Scene/content: ${mediaContext}
${theme ? `- Theme: ${theme}` : ''}
${mood ? `- Mood: ${mood}` : ''}
- Language: ${language}

CONTENT PILLARS: ${(ig.contentPillars || []).join(', ')}
BANNED TOPICS: ${(brand.bannedTopics || []).join(', ')}

Return JSON:
{
  "caption": "string — the full caption text, 1-3 short paragraphs",
  "hashtags": ["string array — 10-20 relevant hashtags WITHOUT # prefix"],
  "callToAction": "string — optional engagement prompt (question or CTA)",
  "altText": "string — accessibility alt text describing the visual content"
}

HASHTAG RULES:
- Mix of broad (100k+ posts) and niche (1k-50k posts) tags
- 3-5 tags directly related to the content
- 3-5 tags related to the character's niche
- 2-5 location or community tags
- NO spam tags (follow4follow, like4like, etc.)
- NO banned or restricted Instagram tags
- NO NSFW-adjacent tags

Return ONLY the JSON.`;

  return { system: SYSTEM_PROMPT, user };
}

module.exports = { buildCaptionPrompt, BANNED_HASHTAGS, SYSTEM_PROMPT };
