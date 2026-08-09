/** 크레딧 응답 계약 — src/credits/credit.service.js + teams/team.credit.js */

/** 현재 작업 컨텍스트 — 개인이면 type='personal' 만 온다 */
export type CreditContextDto =
  | { type: 'personal' }
  | { type: 'team'; teamId: string; teamName: string; role: string };

export interface CreditOverviewDto {
  /** 개인 또는 활성 팀 풀 잔액 */
  balance: number;
  /** 교환 가능한 포인트(로열티 적립분) */
  points: number;
  /** admin(개인 컨텍스트)만 true */
  unlimited: boolean;
  /** 기능별 크레딧 단가표 */
  costs: Record<string, unknown>;
  context: CreditContextDto;
}

/** 포인트 → 크레딧 교환 결과 */
export interface PointExchangeResultDto {
  points: number;
  credits: number;
  [k: string]: unknown;
}

/** POST /api/credits/points/exchange 요청 */
export class ExchangePointsDto {
  amount!: number;
}
