/** 사업체 인스타 관리(관리자 전용) — DB row 형태 그대로의 반환 계약. */

/** businesses 한 행 */
export interface BusinessVo {
  id: string;
  name: string;
  industry: string | null;
  memo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** 목록 카드용 — 연결 계정·큐 상태 집계가 붙는다 */
export interface BusinessListItemVo extends BusinessVo {
  accounts: number;
  active_accounts: number;
  followers: number;
  /** 아직 확정 전(pending) + 확정(confirmed) = 발행 대기 */
  pending: number;
  /** 시각 예약(scheduled) */
  scheduled: number;
  posted: number;
  /** 대표 계정(팔로워 최다) 미리보기 */
  primary_username: string | null;
  primary_profile_image: string | null;
}

/** 사업체에 연결된(또는 미연결) 소셜 계정 */
export interface BusinessAccountVo {
  id: string;
  business_id: string | null;
  platform: string;
  /** Zernio 계정 ID(외부 식별자) — 우리 PK인 id와 다르다 */
  account_id: string;
  username: string | null;
  display_name: string | null;
  profile_image: string | null;
  followers: number;
  status: string;
  created_at: string;
}

/** 사업체 미디어(오리지널 원본 + 생성 결과물) */
export interface BusinessMediaVo {
  id: string;
  account_id: string | null;
  business_id: string | null;
  file_path: string;
  /** file_path에서 뽑은 공개 URL(`/images/<파일명>`) — 프론트가 그대로 <img src>에 쓴다 */
  url: string;
  media_type: string;
  caption: string | null;
  hashtags: string[];
  status: string;
  /** upload = 관리자가 올린 원본 · import = 팩/생성물에서 편입 · null = 기존 계정 미디어 */
  source: string | null;
  is_base: boolean;
  created_at: string;
}

/** 연결된 콘텐츠팩 + 그 자산들 */
export interface BusinessPackVo {
  pack_id: string;
  share_id: string;
  vertical: string | null;
  product: string | null;
  status: string;
  created_at: string;
  assets: PackAssetVo[];
}

export interface PackAssetVo {
  kind: string;
  cut_key: string | null;
  label: string | null;
  url: string;
  media_type: 'image' | 'video';
}

/** 발행 큐 한 건 */
export interface BusinessQueueVo {
  id: string;
  account_id: string;
  account_username: string | null;
  image_media_id: string | null;
  reel_media_id: string | null;
  image_path: string | null;
  reel_path: string | null;
  image_url: string | null;
  reel_url: string | null;
  image_caption: string | null;
  reel_caption: string | null;
  hashtags: string[];
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  image_post_url: string | null;
  reel_post_url: string | null;
  created_at: string;
}

/** AI 캡션 생성 결과 */
export interface CaptionDraftVo {
  caption: string;
  hashtags: string[];
  callToAction: string;
  altText: string;
}
