/**
 * 원장(ledger) 행 — credit_ledger / point_ledger / team_credit_ledger 가 같은 모양이다.
 * VO = DB 행 스냅샷: 컬럼명(snake_case) 그대로, 읽기 전용.
 */
export interface LedgerEntryVo {
  readonly id: string;
  readonly amount: number;
  readonly balance_after: number;
  readonly type: string;
  readonly description: string | null;
  readonly ref_id: string | null;
  readonly created_at: string;
}

/** 팀 원장은 누가 했는지(actor_id)가 더 붙는다. */
export interface TeamLedgerEntryVo extends LedgerEntryVo {
  readonly actor_id: string | null;
}
