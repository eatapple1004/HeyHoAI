import { ContentVo, PublishJobVo, ContentMediaType } from '../vo/content.vo';

/** 콘텐츠·발행 API 경계 계약 — src/publishing/publishing.api.js */

/** 예약 결과 — 작업이 만들어지고 콘텐츠 상태가 함께 바뀐다 */
export interface SchedulePublishResultDto {
  publishJob: PublishJobVo;
  content?: ContentVo;
  [k: string]: unknown;
}

/** 즉시 발행(approve → schedule → execute) 결과 */
export interface PublishNowResultDto {
  publishJob?: PublishJobVo;
  [k: string]: unknown;
}

// ── 요청 (zod 스키마 content.validator.js 와 같은 모양 — 나중에 class-validator로 대체 가능) ──

export class CreateContentDto {
  characterId!: string;
  mediaType!: ContentMediaType;
  /** carousel은 최대 10장 */
  mediaAssetIds!: string[];
  theme?: string;
  mood?: string;
  mediaContext!: string;
  /** 기본 'en' */
  language?: string;
  /** 직접 입력 시 자동 캡션 생성을 건너뛴다(IG 최대 2200자) */
  manualCaption?: string;
  manualHashtags?: string[];
}

export class UpdateContentDto {
  caption?: string;
  hashtags?: string[];
  callToAction?: string;
  altText?: string;
}

export class ScheduleContentDto {
  /** ISO 8601 */
  scheduledAt!: string;
}

export class ListContentsQueryDto {
  status?: string;
  limit?: string;
  offset?: string;
}

export class ListPublishJobsQueryDto {
  status?: string;
}
