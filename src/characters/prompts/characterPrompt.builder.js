/**
 * Claude API에 전달할 캐릭터 생성 프롬프트를 조립한다.
 */

const SYSTEM_PROMPT = `You are a professional character designer for Instagram virtual influencers.
You create detailed, brand-safe character profiles in JSON format.

ABSOLUTE RULES — violations cause immediate rejection:
1. Character MUST be clearly adult (minimum age 23).
2. NO sexual content, nudity, fetish references, or suggestive undertones.
3. NO minor cues: no school uniforms, no "young-looking" descriptors, no childlike traits.
4. Visual descriptions must be Instagram-appropriate (no underwear, no revealing poses).
5. Personality must be positive and brand-safe for commercial partnerships.
6. All output must be valid JSON matching the requested schema exactly.`;

/**
 * @param {{ concept: string; tone: string; topics: string[] }} input
 * @returns {{ system: string; user: string }}
 */
function buildCharacterPrompt({ concept, tone, topics }) {
  const user = `Create an Instagram AI character profile based on:

CONCEPT: ${concept}
TARGET TONE: ${tone}
CONTENT TOPICS: ${topics.join(', ')}

Return a JSON object with this exact structure:
{
  "name": "string — full display name",
  "age": number (must be 23-45),
  "gender": "string",
  "nationality": "string",
  "occupation": "string — creative, professional occupation",
  "personality": ["string array — 3 to 5 positive personality traits"],
  "backstory": "string — 2-3 sentences, brand-safe background story",
  "visualDescription": {
    "bodyType": "string — general build (e.g., athletic, slim, average)",
    "hairStyle": "string",
    "hairColor": "string",
    "eyeColor": "string",
    "skinTone": "string",
    "distinctiveFeatures": "string — unique but non-sexual visual traits",
    "defaultOutfit": "string — Instagram-appropriate everyday outfit"
  },
  "instagramProfile": {
    "username": "string — valid IG handle, no special chars except _ and .",
    "bio": "string — max 150 chars, catchy Instagram bio",
    "postingStyle": "string — description of visual and caption style",
    "contentPillars": ["string array — 3-5 content themes"],
    "hashtagGroups": ["string array — 10-15 relevant hashtags"]
  },
  "voiceGuidelines": {
    "tone": "string — how the character speaks in captions",
    "vocabulary": "string — word choice style",
    "emojiStyle": "string — how emojis are used",
    "captionLength": "string — short/medium/long preference"
  },
  "brandSafety": {
    "approvedThemes": ["string array — safe content themes"],
    "bannedTopics": ["string array — topics this character never discusses"],
    "targetAudience": "string — intended follower demographic"
  }
}

Return ONLY the JSON, no explanation.`;

  return { system: SYSTEM_PROMPT, user };
}

module.exports = { buildCharacterPrompt, SYSTEM_PROMPT };
