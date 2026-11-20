/**
 * HQ 테이블 행 스냅샷(VO) — DB 컬럼명 그대로(snake_case). 문서 §9 컨벤션.
 */

/** hq_state 한 줄 — key 별 JSON 덩어리(지금은 'board' 하나). */
export interface HqStateRowVo {
  readonly key: string;
  readonly value: any;
  readonly updated_at: string;
  readonly updated_by: string | null;
}

export interface HqDecisionRowVo {
  readonly id: string;
  readonly code: string;
  readonly question: string;
  readonly options: string;
  readonly recommend: string;
  readonly status: string;
  readonly answer: string;
  readonly opened_at: string;
  readonly decided_at: string | null;
}

export interface HqLeadRowVo {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly source: string;
  readonly stage: string;
  readonly contact: string;
  readonly note: string;
  readonly business_id: string | null;
  /** 다음 할 일(없으면 빈 글자)과 날짜('YYYY-MM-DD' 또는 null) */
  readonly next_action: string;
  readonly next_date: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface HqLogRowVo {
  readonly id: string;
  readonly at: string;
  readonly who: string;
  readonly kind: string;
  readonly text: string;
}
