/**
 * 콘텐츠·발행 작업 행(VO) — contents / publish_jobs 테이블 스냅샷.
 * ⚠️ snake_case 그대로 응답에 나간다(프론트가 이 이름을 읽음).
 */

export type ContentStatus = 'draft' | 'approved' | 'rejected' | 'scheduled' | 'published' | string;
export type ContentMediaType = 'image' | 'video' | 'carousel';

/** contents 행 */
export interface ContentVo {
  readonly id: string;
  readonly character_id: string;
  readonly media_type: ContentMediaType;
  readonly media_asset_ids: string[];
  readonly caption: string | null;
  readonly hashtags: string[] | null;
  readonly call_to_action: string | null;
  readonly alt_text: string | null;
  readonly media_context: string | null;
  readonly scheduled_at: string | null;
  readonly status: ContentStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

export type PublishJobStatus = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled' | string;

/** publish_jobs 행 — 인스타 발행 결과(ig_media_id·permalink)가 성공 시 채워진다 */
export interface PublishJobVo {
  readonly id: string;
  readonly content_id: string;
  readonly character_id: string;
  readonly scheduled_at: string | null;
  readonly attempt: number;
  readonly ig_media_id: string | null;
  readonly ig_permalink: string | null;
  readonly status: PublishJobStatus;
  readonly error: string | null;
  readonly published_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly finished_at: string | null;
}
