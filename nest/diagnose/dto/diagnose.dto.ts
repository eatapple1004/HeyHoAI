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
  /** 인스타·가게·스토어 주소 등. 비어도 됨 */
  links?: string[];
  message?: string;
  /** 신청 시점의 답 스냅샷 — 진단서 쓸 때 세션 테이블을 안 뒤져도 되게 */
  answers?: DiagnoseAnswersDto;
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
  links: string[];
  message: string | null;
  answers: DiagnoseAnswersDto | null;
  status: string;
  created_at: string;
}
