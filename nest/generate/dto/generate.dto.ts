/** 생성 엔진 조회 계약 — src/generate/generate.route.js 의 reads */

/** 사용 가능한 도구(공개 필드만 노출) */
export interface ToolDto {
  id: string;
  label: string;
  type: 'image' | 'video' | 'upscale' | 'removebg';
  /** 어댑터 키(src/images|videos/providers) — 프론트는 배지·설명 매핑에만 쓴다 */
  provider: string;
  model: string;
  controls: Record<string, unknown>;
  imageSlots: unknown[];
  /** 커스텀 생성 단가(◈). image=장당, video=길이별 */
  pricing: { perImage?: number; perDuration?: Record<string, number> };
  /** 영상만: 레퍼런스 이미지 받는지(reference-to-video) · 최대 장수 · 시작 프레임 없이 생성 가능한지(text-to-video) */
  refModel?: boolean;
  refInput?: { max: number } | null;
  t2vModel?: boolean;
  /** 영상만: 프롬프트 없이 돌아가는 툴(업스케일) */
  noPrompt?: boolean;
}
export interface ToolsDto {
  image: ToolDto[];
  video: ToolDto[];
  /** 업스케일 툴(Topaz). 키 없는 서버면 빈 배열(실행은 editor[] 의 upscale op 가 한다) */
  upscale: ToolDto[];
  /** 배경 제거 툴(BiRefNet). 키 없는 서버면 빈 배열 */
  removebg: ToolDto[];
  /** Image Editor op 별 자동 엔진·대안·단가(src/images/imageEdit.engine.js catalog). 비어 있으면 Editor = soon */
  editor: EditorOpDto[];
  /** Face swap 엔진(registry type 'faceswap') — 비어 있으면 메뉴 soon */
  faceswap: ToolDto[];
  /** Face swap 대상 프리셋(우리 모델) */
  faceswapTargets: { id: string; label: string; url: string }[];
  /** Video Editor AI 도구(op)별 사용 가능 엔진 */
  videoEditor: { op: string; label: string; why: string; min: number; max: number; engines: { id: string; label: string; provider: string; perDuration: Record<string, number> }[] }[];
}

/** Image Editor op 1개 — engine = 자동 선택(마스크 있을 때), engineNoMask = 마스크 없을 때 다른 경우만 */
export interface EditorEngineDto { id: string; label: string; provider: string; perImage: number }
export interface EditorOpDto {
  id: string; op: string; label: string; mask: 'required' | 'optional' | 'none'; why: string;
  engine: EditorEngineDto; engineNoMask: EditorEngineDto | null; alternatives: EditorEngineDto[];
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
