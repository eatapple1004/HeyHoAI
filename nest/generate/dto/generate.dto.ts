/** 생성 엔진 조회 계약 — src/generate/generate.route.js 의 reads */

/** 사용 가능한 도구(공개 필드만 노출) */
export interface ToolDto {
  id: string;
  label: string;
  type: 'image' | 'video';
  model: string;
  controls: Record<string, unknown>;
  imageSlots: unknown[];
}
export interface ToolsDto {
  image: ToolDto[];
  video: ToolDto[];
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
