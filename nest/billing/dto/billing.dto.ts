/** 결제 API 계약 — src/billing/*.route.js */

/** 크레딧 팩 — available은 게이트(키 설정·variant 매핑)까지 통과했는지 */
export interface CreditPackDto {
  id: string;
  available: boolean;
  [k: string]: unknown;
}

/** 팩 목록 — configured=false면 결제 자체가 휴면 */
export interface PacksDto {
  packs: CreditPackDto[];
  configured: boolean;
}

/** PG 설정 노출(공개 가능한 값만) */
export type PgConfigDto = Record<string, unknown>;
