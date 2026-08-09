/**
 * image_assets 한 행의 스냅샷(VO) — DB 컬럼명(snake_case)을 그대로 유지한다.
 * 이름을 바꾸면 어느 컬럼에서 온 값인지 추적이 끊기고, 응답 형식 변화로 프론트가 깨진다.
 * API로 나갈 땐 DTO로 옮겨 담는다.
 */
export type ImageAssetStatus = 'candidate' | 'master' | 'rejected' | 'archived';

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
  readonly variation_label: string | null;
  readonly metadata: Record<string, any> | null;
  readonly status: ImageAssetStatus;
  readonly created_at: string;
  readonly updated_at: string;
}
