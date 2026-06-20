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

const TOOLS = {
  // ── 이미지 ──
  'nano-banana-pro': {
    id: 'nano-banana-pro', label: 'Nano Banana Pro', type: 'image',
    provider: 'gemini', model: 'gemini-3-pro-image-preview',
    costKey: 'pro', enabled: true,
  },
  'nano-banana': {
    id: 'nano-banana', label: 'Nano Banana', type: 'image',
    provider: 'gemini', model: 'gemini-2.5-flash-image',
    costKey: 'flash', enabled: true,
  },
  'gpt-image': {
    id: 'gpt-image', label: 'GPT Image', type: 'image',
    provider: 'openai', model: 'gpt-image-2',
    costKey: 'gpt-image-2', enabled: false,
  },
  'gpt-image-hd': {
    id: 'gpt-image-hd', label: 'GPT Image HD', type: 'image',
    provider: 'openai', model: 'gpt-image-2-high',
    costKey: 'gpt-image-2-high', enabled: false,
  },
  'flux-pro': {
    id: 'flux-pro', label: 'Flux Pro', type: 'image',
    provider: 'replicate', model: 'black-forest-labs/flux-1.1-pro',
    costKey: null, enabled: false,
  },

  // ── 영상 ──
  'kling': {
    id: 'kling', label: 'Kling', type: 'video',
    provider: 'kling', model: 'kling-v3',
    costKey: null, enabled: false,
  },
  'runway': {
    id: 'runway', label: 'Runway', type: 'video',
    provider: 'runway', model: 'gen4_turbo',
    costKey: null, enabled: false,
  },
  // 추가 툴(minimax, fal, veo 등)은 #9 어댑터 웨이브에서 검증 후 등록.
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
