/**
 * ugcScript.builder.js — 영상 "대본" 생성 프롬프트 빌더 (포맷 무관)
 * ============================================================================
 * 옵션1(컨셉→대본→완성 영상)의 두뇌. 사용자 제품 + 한 줄 컨셉 → 구조화된 대본.
 *   - outputType 프로파일(profiles/)이 연출 방향(발화 유무·씬 타입·렌더 매핑)을 결정.
 *     product-ad(무출연)·model-editorial(모델 화보)·ugc-talking(발화) 등.
 *   - 대본을 씬 단위로 쪼개고 spoken/broll 태그. broll의 brollPrompt는 Doppia 제품/모델 렌더용.
 *   - caption.service.js 와 동일한 Claude(messages.create) 패턴. 모델은 서비스에서 주입.
 * 산출물: 엄격한 JSON(스키마는 ugcScript.service.SCRIPT_SCHEMA 와 정합).
 */
const { getProfile, DEFAULT_OUTPUT_TYPE } = require('../profiles');

// 포맷별 골격 힌트(Claude가 구조를 잡도록).
const FORMAT_HINTS = {
  'hook-cta':          'Punchy hook in the first 2s, one clear benefit, hard CTA. ~15s.',
  'problem-solution':  'Open on a relatable pain point, agitate briefly, reveal the product as the fix, proof, CTA. ~25s.',
  'testimonial':       'First-person authentic review from a happy customer; specific results, not salesy. ~20s.',
  'unboxing':          'Excited unboxing/first-impression energy; reveal, texture/detail beats, reaction, CTA. ~20s.',
  'demo':              'Show the product in use step by step; before/after or how-to; clear payoff. ~25s.',
  'pov':               'POV/day-in-the-life framing that folds the product in naturally; trend-native. ~18s.',
};

function fmtLine(v) { return FORMAT_HINTS[v] ? `- ${v}: ${FORMAT_HINTS[v]}` : `- ${v}`; }

/**
 * @param {{
 *   product: string,        // 제품명/설명 (필수)
 *   concept: string,        // 한 줄 컨셉/앵글 (필수)
 *   outputType?: string,    // profiles 키 (기본 product-ad)
 *   format?: string,        // FORMAT_HINTS 키 (기본 hook-cta)
 *   platform?: string,      // 'reels'|'tiktok'|'shorts' (기본 reels)
 *   durationSec?: number,   // 목표 길이(기본=프로파일 defaultDurationSec)
 *   tone?: string,          // 톤(기본 'authentic, upbeat, friendly')
 *   language?: string,      // 'ko'|'en' (기본 ko)
 *   audience?: string,      // 타깃(선택)
 * }} input
 * @returns {{ system: string, user: string, profile: object }}
 */
function buildUgcScriptPrompt(input) {
  const {
    product, concept,
    outputType = DEFAULT_OUTPUT_TYPE,
    format = 'hook-cta',
    platform = 'reels',
    tone = 'authentic, upbeat, friendly',
    language = 'ko',
    audience = '',
  } = input || {};

  const profile = getProfile(outputType);
  const durationSec = input?.durationSec || profile.defaultDurationSec || 20;
  const langName = language === 'en' ? 'English' : 'Korean';

  const system = [
    'You are a top-tier short-form creative director for TikTok / Instagram Reels / YouTube Shorts.',
    'You turn a product + a one-line concept into a scroll-stopping, native-feeling video script.',
    '',
    profile.systemGuide,
    '',
    'Golden rules:',
    '- Hook must land in the first 2 seconds (a scroll-stopper: bold claim, question, or pattern interrupt).',
    '- One core benefit, not a feature dump. Conversational, native — never corporate.',
    `- Write all onScreenText, spoken, cta, caption in ${langName}. brollPrompt stays in English.`,
    '- Keep total on-screen/spoken words realistic for the target duration (~2.5 words/sec).',
    '- Safe, honest, no medical/financial guarantees, no banned/adult content.',
    'Return ONLY a single JSON object (no prose, no markdown fences), matching exactly this schema:',
    '{',
    '  "title": string,',
    '  "format": string,',
    `  "durationSec": number,`,
    `  "aspect": "${profile.aspect}",`,
    '  "language": "ko"|"en",',
    '  "hook": string,                       // the opening line / first on-screen text',
    '  "scenes": [',
    '    { "n": number, "type": "spoken"|"broll", "durationSec": number,',
    '      "spoken": string,                 // dialogue/voiceover; EMPTY for no-dialogue output types',
    '      "onScreenText": string,           // short caption/overlay text',
    '      "direction": string,              // what is shown / camera & motion',
    '      "brollPrompt": string             // for type "broll": product/model image prompt (English)',
    '    }',
    '  ],',
    '  "cta": string,',
    '  "caption": string,                    // ready-to-post caption',
    '  "hashtags": string[],                 // 5-12, no # prefix',
    '  "musicVibe": string                   // e.g. "upbeat lofi", "trendy pop"',
    '}',
    `Allowed scene types for this output type: ${profile.sceneTypes.map((t) => `"${t}"`).join(', ')}.`,
  ].join('\n');

  const user = [
    `Output type: ${outputType}`,
    `Product: ${product}`,
    `Concept / angle: ${concept}`,
    audience ? `Target audience: ${audience}` : '',
    `Format: ${format}`,
    `Formats reference:\n${fmtLine(format)}`,
    `Platform: ${platform}`,
    `Target duration: ~${durationSec}s`,
    `Tone: ${tone}`,
    `Language: ${langName}`,
    '',
    'Write the video script now as the JSON object.',
  ].filter(Boolean).join('\n');

  return { system, user, profile };
}

module.exports = { buildUgcScriptPrompt, FORMAT_HINTS };
