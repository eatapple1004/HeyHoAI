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
  /** 고객 운영 정보(계약한 고객만 채움) — HqLeadOpsVo */
  readonly ops: HqLeadOpsVo;
  /** 고객 전용 페이지 주소 토큰(없으면 null)과 켜짐 여부 */
  readonly page_token: string | null;
  readonly page_on: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/** 고객 운영 정보 — 형태(구축·운영·구축+운영·자사)·스튜디오·범위·시작일·핵심 숫자·시작 전 기록·공개 수준 */
export interface HqLeadOpsVo {
  service?: string; studio?: string; scope?: string; started?: string;
  metric?: { name?: string; unit?: string; start?: string; now?: string };
  before?: string; share?: string;
}

export interface HqReportRowVo {
  readonly id: string;
  readonly lead_id: string;
  readonly week: string;
  readonly metric_value: string;
  readonly done: string;
  readonly next: string;
  /** '초안' | '게시' — 고객 페이지에는 '게시'만 */
  readonly status: string;
  readonly posted_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** 공개 기록 한 줄 — 어디에(channel) 어떤 주소로(url) 언제(date, 'YYYY-MM-DD') */
export interface HqPublishedVo { channel: string; url: string; date: string }

export interface HqRefRowVo {
  readonly id: string;
  readonly title: string;
  readonly client: string;
  readonly kind: string;
  readonly source: string;
  readonly stage: string;
  readonly lead_id: string | null;
  readonly ledger_id?: string | null;
  readonly result_url: string;
  readonly note: string;
  readonly published: HqPublishedVo[];
  readonly done_date: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** 원장 카드 본문(민감하지 않은 카드만 평문으로 둔다) */
export interface HqLedgerBodyVo {
  what?: string; result?: string; numbers?: string[]; ai_role?: string; fails?: string; visibility?: string; tags?: string[];
}

export interface HqLedgerRowVo {
  readonly id: string;
  readonly origin: string;
  readonly day: string | null;
  readonly area: string;
  readonly title: string;
  readonly kind: string;
  readonly sensitive: boolean;
  readonly body: HqLedgerBodyVo;
  /** 민감 카드만 — 금고 공개 열쇠로 잠근 글(JSON 문자열 {v,k,iv,ct}). 서버는 풀 수 없다 */
  readonly sealed: string;
  readonly session: string;
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
