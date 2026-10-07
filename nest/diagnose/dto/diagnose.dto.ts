/**
 * 진단 퍼널(/diagnose) API 계약.
 *   설계 정본 = 노션 "Doppia 웹 진단 퍼널 — 사업 지도·질문 설계" §6 구현 계획 2단계.
 *   - sessions: 결과 화면을 본 사람 전원의 답(익명). 나중에 "같은 업종에서 N%가 이렇게 답했어요" 벤치마크 재료.
 *   - requests: "맞춤 진단서 받기"를 누른 사람의 연락처 + 답 스냅샷. 사람이 1~2일 안에 진단서를 보낸다.
 */

/** 질문 답 — 프론트(public/diagnose.html)의 상태 객체와 같은 모양. 값은 선택지 id(영문 슬러그). */
export interface DiagnoseAnswersDto {
  q0: string | null;
  q01: string | null;
  q02: string | null;
  q1: string[];
  q2: string | null;
  q4: string[];
  /** '기타(직접 입력하기)'에 적은 글 — 최대 200자 */
  q1Other?: string;
  q4Other?: string;
}

export type DiagnoseTrack = 'small' | 'brand';

export class CreateSessionDto {
  answers!: DiagnoseAnswersDto;
  track!: DiagnoseTrack;
  lang?: string;
  /** 결과 직전 화면에서 받은 가게 이름·링크(선택) — 리포트 헤더·실측(2단계)용 */
  businessName?: string;
  link?: string;
}

export class CreateRequestDto {
  /** sessions에서 받은 id. 없어도 받는다(저장 실패했어도 신청은 잃지 않는다). */
  sessionId?: string;
  track!: DiagnoseTrack;
  lang?: string;
  /** 가게·브랜드 이름 / 회사명 */
  businessName!: string;
  /** 담당자 이름 — 브랜드 트랙 필수, 소상공인은 선택 */
  contactName?: string;
  /** 이메일 또는 전화 — 하나는 필수 */
  contact!: string;
  /** 채널별 링크 {channel, url} (옛 클라 호환: 문자열 배열도 받음). 비어도 됨 */
  links?: Array<{ channel: string; url: string } | string>;
  message?: string;
  /** 업체 정보 — 주력 제품·지역·목표·예산 + 결과 화면 실측 스냅샷. 리포트 쓰는 사람이 본다 */
  details?: { product?: string; area?: string; goal?: string; budget?: string; metrics?: unknown };
  /** 신청 시점의 답 스냅샷 — 진단서 쓸 때 세션 테이블을 안 뒤져도 되게 */
  answers?: DiagnoseAnswersDto;
}

/** 실측 요청 — 인스타(@handle·URL) 또는 가게(카카오맵 URL·가게 이름) */
export class LookupDto {
  sessionId?: string;
  link!: string;
}

export interface InstagramMetricsDto {
  source: 'instagram';
  username: string;
  is_private: boolean;
  followers: number;
  media_count: number;
  /** 마지막 게시 후 며칠 — 게시물 없으면 null */
  days_since_last_post: number | null;
  posts_30d: number;
  /** 최근 게시물 평균 (좋아요+댓글)/팔로워 ×100, 소수 1자리 */
  engagement_rate: number | null;
  reels_ratio: number;
  sampled: number;
}

export interface KakaoMetricsDto {
  source: 'kakao';
  place_id: string;
  name: string;
  status: string;
  address: string;
  category: string;
  review_count: number;
  rating: number | null;
  photo_count: number;
  blog_review_count: number;
  blog_last_at: string;
  days_since_blog: number | null;
  instagram: string;
  matched_from_search?: { id: string; name: string | null; address: string | null; candidates: number };
}

export type LookupMetricsDto = InstagramMetricsDto | KakaoMetricsDto;

export interface LookupResultDto {
  ok: boolean;
  /** 실패 사유 코드 — not_found · private · no_key · upstream · unsupported */
  reason?: string;
  metrics?: LookupMetricsDto;
}

export interface SessionCreatedDto {
  id: string;
}

export interface RequestCreatedDto {
  id: string;
}

/** 관리자 목록 행 */
export interface DiagnoseRequestRowDto {
  id: string;
  session_id: string | null;
  track: string;
  lang: string | null;
  business_name: string;
  contact_name: string | null;
  contact: string;
  links: Array<{ channel: string; url: string }>;
  message: string | null;
  answers: DiagnoseAnswersDto | null;
  details: Record<string, unknown> | null;
  status: string;
  created_at: string;
}
