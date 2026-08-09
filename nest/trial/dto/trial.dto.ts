/** 체험 계정 API 계약 — src/trial/trial.service.js */

/** 발급 결과 — password는 이 응답에서만 1회 노출된다 */
export interface TrialAccountDto {
  id: string;
  email: string;
  password: string;
  companyName: string;
  credits: number;
  days: number;
}

/** 본인 체험 상태(스튜디오 배너용) — 비체험이면 null */
export type TrialStatusDto = Record<string, unknown> | null;

/** 관리자 수정 결과 — 전달한 필드만 채워져 돌아온다 */
export interface TrialPatchResultDto {
  id: string;
  credits?: unknown;
  days?: unknown;
  status?: unknown;
}

export class CreateTrialDto {
  companyName!: string;
  email?: string;
  password?: string;
  credits?: number;
  /** 구버전 클라 호환(credits 대체) */
  quota?: number;
  days?: number;
}
export class PatchTrialDto {
  addCredits?: number;
  days?: number;
  status?: string;
}
