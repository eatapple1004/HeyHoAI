import { VisualAttributeVo } from '../vo/media.vo';

/** 이미지·영상·비주얼 API 경계 계약 — src/{images,videos,visuals}/*.api.js */

/** 이미지 생성 결과 — 후보들 + 자동 선정된 대표 */
export interface GenerateImagesResultDto {
  job: { id: string; status: string; candidateCount: number };
  master: { id: string; url: string; variation: string } | null;
  candidates: Array<{ id: string; url: string; variation: string; status: string }>;
}

/** 영상 생성 결과 */
export interface GenerateVideoResultDto {
  job: { id: string; status: string; provider: string; attempt: number };
  video: {
    id: string;
    videoUrl: string;
    durationMs: number;
    videoStyle: string;
    sourceImageId: string | null;
    status: string;
  };
}

/** 속성 조합 → 프롬프트 컴파일 결과 */
export interface CompilePromptResultDto {
  prompt: string;
  attributes: VisualAttributeVo[];
}

// ── 요청 ──

export class ListByStatusQueryDto {
  status?: string;
}

export class CreateVisualPresetDto {
  name!: string;
  description?: string;
  attributeIds!: string[];
  isDefault?: boolean;
}

export class CompilePromptDto {
  attributeIds!: string[];
}

export class ListAttributesQueryDto {
  category?: string;
  /** 쉼표 구분 */
  tags?: string;
}
