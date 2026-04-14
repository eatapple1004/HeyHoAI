const Anthropic = require('@anthropic-ai/sdk');
const { env } = require('../../config');
const { buildCharacterPrompt } = require('../prompts/characterPrompt.builder');

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/**
 * Claude API를 호출해 캐릭터 프로필 JSON을 생성한다.
 *
 * @param {{ concept: string; tone: string; topics: string[] }} input
 * @returns {Promise<object>} 파싱된 캐릭터 JSON
 */
async function generateCharacter(input) {
  const { system, user } = buildCharacterPrompt(input);

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // JSON 블록 추출 (```json ... ``` 또는 bare JSON)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error('Claude response did not contain valid JSON');
  }

  return JSON.parse(jsonMatch[1]);
}

module.exports = { generateCharacter };
