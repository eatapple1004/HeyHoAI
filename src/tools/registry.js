/**
 * Tool Registry — 생성 툴(이미지·영상) 단일 정본.
 *
 * 소비처: generate.route(템플릿 tool → 프로바이더 라우팅), studio UI(툴 픽커),
 *         recipe 시드/recipeStore(template.tool 기본값·검증).
 *
 * 원칙: "잘나가는 툴을 폭넓게 등록(빌드)하되, 런칭 노출은 enabled로 큐레이션."
 *   - enabled:true  = 런칭 노출(유저 선택 가능)
 *   - enabled:false = 코드엔 있으나 숨김(준비·검증 후 플립)
 *
 * 비용은 여기서 중복 정의하지 않는다(단일소스 = src/credits/credit.service.js).
 *   - image: costKey → COSTS.imageModelSurcharge[costKey]
 *   - video: 길이(duration)로 videoCost() 산정 → costKey 불필요
 *
 * model = 실제 프로바이더 모델 id. provider = 어댑터 키(src/images|videos/providers).
 */

// controls = 툴별 생성 폼 스키마(정본). 스튜디오가 이걸로 컨트롤을 동적 렌더(Leonardo식 "툴마다 폼").
//   aspectRatio: string[]  (select; 첫 값 = 기본)   imageSize/resolution: string[] (해상도 티어 select)
//   duration: number[] (영상 길이 select; 's' 접미)  negative: bool (네거티브 입력)  audio: bool (오디오 토글)
//   → 새 컨트롤 타입은 스튜디오 renderer에 케이스 1개만 추가하면 됨. 새 '툴'은 여기 한 줄로 폼이 생김.
const IMG_ASPECTS = ['3:4', '1:1', '4:3', '9:16', '16:9', '2:3', '3:2']; // Gemini API 지원값(기본 3:4)

const TOOLS = {
  // ── 이미지 ──
  'nano-banana-pro': {
    id: 'nano-banana-pro', label: 'Nano Banana Pro', type: 'image',
    provider: 'gemini', model: 'gemini-3-pro-image-preview',
    costKey: 'pro', enabled: true,
    controls: { aspectRatio: IMG_ASPECTS, imageSize: ['1K', '2K'], count: [1, 2, 3, 4], negative: true }, // 2K=Pro 전용
  },
  'nano-banana': {
    id: 'nano-banana', label: 'Nano Banana', type: 'image',
    provider: 'gemini', model: 'gemini-2.5-flash-image',
    costKey: 'flash', enabled: true,
    controls: { aspectRatio: IMG_ASPECTS, count: [1, 2, 3, 4], negative: true }, // flash=1K 고정(imageSize 없음)
  },
  'gpt-image': {
    id: 'gpt-image', label: 'GPT Image', type: 'image',
    provider: 'openai', model: 'gpt-image-2',
    costKey: 'gpt-image-2', enabled: false,
    controls: { aspectRatio: ['1:1', '3:4', '16:9'], negative: true },
  },
  'gpt-image-hd': {
    id: 'gpt-image-hd', label: 'GPT Image HD', type: 'image',
    provider: 'openai', model: 'gpt-image-2-high',
    costKey: 'gpt-image-2-high', enabled: false,
    controls: { aspectRatio: ['1:1', '3:4', '16:9'], negative: true },
  },
  'flux-pro': {
    id: 'flux-pro', label: 'Flux Pro', type: 'image',
    provider: 'replicate', model: 'black-forest-labs/flux-1.1-pro',
    costKey: null, enabled: false,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16'], negative: true },
  },

  // ── 영상 ──
  'kling': {
    id: 'kling', label: 'Kling', type: 'video',
    provider: 'kling', model: 'kling-v3',
    costKey: null, enabled: true, // 비디오 툴 런칭 노출(2026-06-21). ⚠️ 실제 생성은 KLING_ACCESS/SECRET_KEY 필요.
    // 라이브 async 경로 실배선. 시작프레임=레퍼런스(subject). 끝프레임=image_tail, 오디오=video-to-audio.
    controls: {
      duration: [5, 10],
      quality: [{ value: 'std', label: 'Standard' }, { value: 'pro', label: 'Pro' }],
      aspectRatio: ['9:16', '1:1', '16:9'],
      endFrame: { type: 'image' }, // 끝 프레임(선택)
      audio: { type: 'toggle' },   // 효과음/배경음 합성(선택)
    },
  },
  'runway': {
    id: 'runway', label: 'Runway', type: 'video',
    provider: 'runway', model: 'gen4_turbo',
    costKey: null, enabled: false,
    controls: { duration: [5, 10] },
  },
  // 추가 툴(minimax, fal, veo 등)은 #9 어댑터 웨이브에서 검증 후 등록 — controls만 채우면 폼 자동.
};

const DEFAULT_IMAGE_TOOL = 'nano-banana-pro';
const DEFAULT_VIDEO_TOOL = 'kling';

/** id로 툴 조회 (없으면 null) */
function getTool(id) {
  return TOOLS[id] || null;
}

/** output 타입별 기본 툴 id ('reel'|'video' → 영상, 그 외 → 이미지) */
function defaultToolFor(type) {
  return (type === 'video' || type === 'reel') ? DEFAULT_VIDEO_TOOL : DEFAULT_IMAGE_TOOL;
}

/** 유효 툴 id 보장 — 모르는/빈 id는 type 기본값으로 폴백 */
function resolveToolId(id, type) {
  return (id && TOOLS[id]) ? id : defaultToolFor(type);
}

/** 목록 (옵션: type 필터, enabledOnly) */
function listTools({ type, enabledOnly = false } = {}) {
  return Object.values(TOOLS)
    .filter((t) => !type || t.type === type)
    .filter((t) => !enabledOnly || t.enabled);
}

module.exports = {
  TOOLS,
  DEFAULT_IMAGE_TOOL,
  DEFAULT_VIDEO_TOOL,
  getTool,
  defaultToolFor,
  resolveToolId,
  listTools,
};
