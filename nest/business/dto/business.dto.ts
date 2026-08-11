/** 사업체 인스타 관리 API 요청 계약 (관리자 전용). */

export interface CreateBusinessDto {
  name: string;
  industry?: string;
  memo?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  industry?: string;
  memo?: string;
  /** active | paused */
  status?: string;
}

export interface LinkAccountDto {
  /** social_accounts.id (우리 PK) */
  accountId: string;
}

export interface LinkPackDto {
  /** content_packs.id(숫자) 또는 share_id(UUID) 둘 다 받는다 */
  pack: string;
}

/** 생성물 파일명을 사업체 미디어로 등록(팩 자산 → 미디어 편입에도 쓴다) */
export interface RegisterMediaDto {
  /** `/images/<파일명>` 또는 `tmp/images/<파일명>` 또는 파일명 단독 */
  url: string;
  mediaType?: 'image' | 'video' | 'audio';
  caption?: string;
}

/** AI 캡션 생성 요청 */
export interface GenerateCaptionDto {
  /** 캡션의 근거가 될 미디어 — 선택된 이미지/영상 */
  mediaId?: string;
  /** mediaId 대신 URL로도 받는다(팩 자산 즉시 캡션) */
  url?: string;
  /** feed(피드 게시물) | reel(릴스) */
  postType?: 'feed' | 'reel';
  /** 말투 — 예: 친근한, 전문적인, 감성적인 */
  tone?: string;
  /** 캡션 언어(기본 ko) */
  language?: string;
  /** 이번 게시물에서 강조할 포인트(이벤트·신메뉴 등) */
  highlight?: string;
}

/** 큐 등록 — 이미지/릴스 중 최소 하나는 있어야 한다 */
export interface EnqueueDto {
  /** 발행할 계정(social_accounts.id). 생략하면 사업체의 유일한 활성 계정을 쓴다 */
  accountId?: string;
  imageMediaId?: string;
  reelMediaId?: string;
  /** 미디어 대신 URL로 지정하면 서버가 account_media로 편입한 뒤 큐에 넣는다 */
  imageUrl?: string;
  reelUrl?: string;
  bgmMediaId?: string;
  imageCaption?: string;
  reelCaption?: string;
  hashtags?: string[];
  /** ISO8601. 있으면 예약(scheduled), 없으면 확정(confirmed = 다음 발행 루프 대상) */
  scheduledAt?: string;
}

/** 큐 수정 — 캡션/해시태그/예약시각/상태 */
export interface UpdateQueueDto {
  imageCaption?: string;
  reelCaption?: string;
  hashtags?: string[];
  /** null을 주면 예약을 걷고 confirmed로 되돌린다 */
  scheduledAt?: string | null;
  /** pending | confirmed | scheduled | cancelled */
  status?: string;
}
