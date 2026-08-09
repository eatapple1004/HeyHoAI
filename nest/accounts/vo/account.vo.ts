/**
 * 소셜 계정·미디어·발행 큐 행(VO) — social_accounts / account_media / post_queue /
 * reel_templates / outfit_prompts. snake_case 그대로 응답에 나간다.
 */

export type AccountStatus = 'active' | 'paused' | 'disabled';

/** social_accounts 행 — metadata에 기본 캡션(defaultImageCaption·defaultReelCaption)이 들어간다 */
export interface SocialAccountVo {
  readonly id: string;
  readonly platform: string;
  /** 외부(Zernio) 계정 id */
  readonly account_id: string;
  readonly username: string | null;
  readonly display_name: string | null;
  readonly profile_image: string | null;
  readonly followers: number | null;
  readonly status: AccountStatus;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly user_id: string;
}

/** account_media 행 — is_base=true 가 의상 생성의 기준 사진 */
export interface AccountMediaVo {
  readonly id: string;
  readonly account_id: string;
  readonly file_path: string;
  readonly media_type: string;
  readonly caption: string | null;
  readonly hashtags: string[] | null;
  readonly status: string;
  readonly posted_at: string | null;
  readonly post_url: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly is_base: boolean | null;
}

/** post_queue 행 — 이미지/릴스를 각각 따로 들고 캡션·URL도 분리돼 있다 */
export interface PostQueueItemVo {
  readonly id: string;
  readonly account_id: string;
  readonly image_media_id: string | null;
  readonly reel_media_id: string | null;
  readonly caption: string | null;
  readonly hashtags: string[] | null;
  readonly status: string;
  readonly scheduled_at: string | null;
  readonly posted_at: string | null;
  readonly post_url: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly image_caption: string | null;
  readonly reel_caption: string | null;
  readonly image_post_url: string | null;
  readonly reel_post_url: string | null;
  readonly bgm_media_id: string | null;
}

/** reel_templates 행 — 릴스 프롬프트 재사용 */
export interface ReelTemplateVo {
  readonly id: string;
  readonly account_id: string;
  readonly name: string;
  readonly prompt: string;
  readonly duration: string | null;
  readonly mode: string | null;
  readonly source_media_id: string | null;
  readonly created_at: string;
}

/** outfit_prompts 행 */
export interface OutfitPromptVo {
  readonly id: string;
  readonly account_id: string;
  readonly name: string;
  readonly prompt: string;
  readonly created_at: string;
}
