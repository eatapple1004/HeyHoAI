/** 생성 엔진 조회 계약 — src/generate/generate.route.js 의 reads */

/** 사용 가능한 도구(공개 필드만 노출) */
export interface ToolDto {
  id: string;
  label: string;
  type: 'image' | 'video';
  /** 어댑터 키(src/images|videos/providers) — 프론트는 배지·설명 매핑에만 쓴다 */
  provider: string;
  model: string;
  controls: Record<string, unknown>;
  imageSlots: unknown[];
  /** 커스텀 생성 단가(◈). image=장당, video=길이별 */
  pricing: { perImage?: number; perDuration?: Record<string, number> };
}
export interface ToolsDto {
  image: ToolDto[];
  video: ToolDto[];
  /** 업스케일 툴(Topaz). 키 없는 서버면 빈 배열 → 메가메뉴 Upscale 기능이 soon 으로 */
  upscale: ToolDto[];
}

/** BGM 파일 */
export interface BgmFileDto {
  filename: string;
  url: string;
  size: string;
  createdAt: string;
}

/** 스타일 프리셋(style_presets 행) */
export interface StylePresetDto {
  name: string;
  prefix?: string;
  suffix?: string;
  negative_prompt?: string;
  [k: string]: unknown;
}
