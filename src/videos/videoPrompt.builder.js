/**
 * 캐릭터 persona + 사용자 입력을 받아 영상 생성용 motion prompt를 조립한다.
 *
 * ── Motion Prompt 구성 규칙 ──
 * 1. 주어(subject)는 이미지에 이미 포함되어 있으므로 생략
 *    → Image-to-Video는 "이미지 속 인물이 어떻게 움직이는지"만 기술
 * 2. 구조: [movement] + [expression] + [camera] + [atmosphere]
 * 3. 매 prompt에 SAFETY_MOTION_ENFORCEMENT 자동 접미
 * 4. negativePrompt에 SAFETY_MOTION_NEGATIVE 자동 주입
 * 5. Reels 최적: 짧고 반복 가능한 모션 권장 (3~5초)
 */

// ─── Safety Guards ───

const SAFETY_MOTION_NEGATIVE = [
  // 미성년 / 성적 차단
  'undressing', 'removing clothes', 'nudity', 'naked', 'sexual movement',
  'suggestive pose', 'seductive', 'twerking', 'provocative', 'fetish',
  'bondage', 'lingerie reveal', 'erotic', 'intimate touching',
  // 미성년 암시
  'childlike movement', 'school', 'teen', 'minor',
  // 폭력 / 유해
  'violence', 'fighting', 'weapon', 'blood', 'smoking', 'drinking alcohol',
  // 품질 방어
  'morphing', 'distorted face', 'extra limbs', 'glitch', 'low quality',
  'blurry', 'watermark',
].join(', ');

const SAFETY_MOTION_ENFORCEMENT =
  'fully clothed throughout, natural casual movement, brand-safe for Instagram, SFW';

// ─── Style Presets ───

/**
 * 각 video_style에 대응하는 카메라 + 분위기 지시
 */
const STYLE_PRESETS = {
  slow_motion: {
    camera: 'slow motion capture, 120fps look',
    atmosphere: 'dreamy, ethereal lighting',
    recommendedDuration: 5,
  },
  natural: {
    camera: 'handheld camera, subtle movement',
    atmosphere: 'warm natural lighting, casual vibe',
    recommendedDuration: 3,
  },
  dynamic: {
    camera: 'smooth tracking shot, slight push-in',
    atmosphere: 'vibrant, energetic mood',
    recommendedDuration: 5,
  },
  cinematic: {
    camera: 'cinematic dolly shot, shallow depth of field',
    atmosphere: 'golden hour, film grain, moody color grading',
    recommendedDuration: 5,
  },
  loop: {
    camera: 'locked tripod, static frame',
    atmosphere: 'seamless loop, cinemagraph style',
    recommendedDuration: 3,
  },
};

// ─── Movement Templates ───

/**
 * 사용자가 prompt를 비워둘 경우 persona 기반으로 기본 모션을 생성한다.
 */
const DEFAULT_MOVEMENTS = [
  'gently turns head toward camera and smiles',
  'hair blowing softly in the breeze, blinking naturally',
  'looks down then up at the camera with a warm expression',
  'slight head tilt, relaxed breathing, subtle smile',
];

/**
 * 영상 생성용 motion prompt를 조립한다.
 *
 * @param {{
 *   persona: object;
 *   videoStyle: string;
 *   userPrompt?: string;
 * }} input
 * @returns {{
 *   motionPrompt: string;
 *   negativePrompt: string;
 *   durationSec: number;
 *   style: string;
 * }}
 */
function buildVideoPrompt({ persona, videoStyle, userPrompt }) {
  const style = STYLE_PRESETS[videoStyle] || STYLE_PRESETS.natural;

  // 움직임: 사용자 입력이 있으면 사용, 없으면 기본 모션 중 랜덤
  const movement = userPrompt && userPrompt.trim().length > 0
    ? userPrompt.trim()
    : DEFAULT_MOVEMENTS[Math.floor(Math.random() * DEFAULT_MOVEMENTS.length)];

  // 표정: persona personality에서 힌트
  const personality = persona.personality || [];
  const expressionHint = personality.includes('cheerful')
    ? 'warm cheerful expression'
    : personality.includes('mysterious')
      ? 'calm composed expression'
      : 'natural relaxed expression';

  const motionPrompt = [
    movement,
    expressionHint,
    style.camera,
    style.atmosphere,
    SAFETY_MOTION_ENFORCEMENT,
  ].join(', ');

  return {
    motionPrompt,
    negativePrompt: SAFETY_MOTION_NEGATIVE,
    durationSec: style.recommendedDuration,
    style: videoStyle,
  };
}

module.exports = {
  buildVideoPrompt,
  STYLE_PRESETS,
  SAFETY_MOTION_NEGATIVE,
  SAFETY_MOTION_ENFORCEMENT,
  DEFAULT_MOVEMENTS,
};
