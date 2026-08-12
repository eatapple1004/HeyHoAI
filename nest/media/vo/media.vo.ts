/**
 * 이미지·영상·비주얼 행(VO) — image_assets / video_assets / generation_jobs /
 * video_generation_jobs / visual_attributes / visual_attribute_categories / character_visual_presets.
 * snake_case 그대로 응답에 나간다.
 */

export type AssetStatus = 'pending' | 'success' | 'failed' | string;

/** image_assets 행 */
export interface ImageAssetVo {
  readonly id: string;
  readonly character_id: string;
  readonly job_id: string;
  readonly prompt: string;
  readonly negative_prompt: string | null;
  readonly provider: string;
  readonly provider_job_id: string | null;
  readonly image_url: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number | null;
  /** 후보 구분 라벨(A/B/C…) */
  readonly variation_label: string;
  readonly metadata: Record<string, unknown> | null;
  readonly status: AssetStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** video_assets 행 */
export interface VideoAssetVo {
  readonly id: string;
  readonly character_id: string;
  readonly job_id: string;
  readonly source_image_id: string | null;
  readonly motion_prompt: string;
  readonly negative_prompt: string | null;
  readonly provider: string;
  readonly provider_job_id: string | null;
  readonly video_url: string;
  readonly width: number;
  readonly height: number;
  readonly duration_ms: number;
  readonly video_style: string;
  readonly metadata: Record<string, unknown> | null;
  readonly status: AssetStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** generation_jobs 행(이미지 후보 생성 이력) */
export interface GenerationJobVo {
  readonly id: string;
  readonly character_id: string;
  readonly provider: string;
  readonly candidate_count: number;
  readonly master_image_id: string | null;
  readonly status: AssetStatus;
  readonly error: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly finished_at: string | null;
}

/** video_generation_jobs 행 */
export interface VideoJobVo {
  readonly id: string;
  readonly character_id: string;
  readonly source_image_id: string | null;
  readonly provider: string;
  readonly provider_job_id: string | null;
  readonly video_style: string;
  readonly motion_prompt: string;
  readonly video_asset_id: string | null;
  readonly attempt: number;
  readonly status: AssetStatus;
  readonly error: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly finished_at: string | null;
}

/** visual_attribute_categories 행 */
export interface VisualCategoryVo {
  readonly id: string;
  readonly [k: string]: unknown;
}

/** visual_attributes 행 — prompt_fragment가 실제 프롬프트에 합성된다 */
export interface VisualAttributeVo {
  readonly id: string;
  readonly category_id: string;
  readonly key: string;
  readonly value: string;
  readonly prompt_fragment: string;
  readonly tags: string[] | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

/** character_visual_presets 행 */
export interface VisualPresetVo {
  readonly id: string;
  readonly character_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly attribute_ids: string[];
  readonly compiled_prompt: string | null;
  readonly is_default: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}
