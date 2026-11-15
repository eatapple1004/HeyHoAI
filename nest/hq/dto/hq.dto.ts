import { HqDecisionRowVo, HqLeadRowVo, HqLogRowVo } from '../vo/hq.vo';

/**
 * HQ API 계약 — 관리자 전용 운영 기록판(/admin-hq).
 *   방향·흐름·결정·고객·기록을 한 곳에 남긴다. 내용(전략·고객 이름)은 DB에만 있고 코드에는 없다(저장소 공개).
 */

/** 흐름 한 단계 — 진행 상태는 아래 넷 중 하나 */
export type HqFlowStatus = '없음' | '만드는 중' | '있음' | '운영 중';
export const HQ_FLOW_STATUSES: HqFlowStatus[] = ['없음', '만드는 중', '있음', '운영 중'];

export type HqDecisionStatus = '대기' | '결정' | '보류';
export const HQ_DECISION_STATUSES: HqDecisionStatus[] = ['대기', '결정', '보류'];

export interface HqFlowStepDto { id: string; name: string; what: string; parts: string; status: HqFlowStatus; note: string }
export interface HqNameUseDto { name: string; use: string }
export interface HqProductDto { name: string; who: string; what: string }
export interface HqLinkDto { name: string; url: string }

/** 판 전체(hq_state 'board') — 화면 '한눈에' 탭이 그대로 그린다 */
export interface HqBoardDto {
  direction: { line: string; why: string; decided: string };
  weapons: HqNameUseDto[];
  flow: HqFlowStepDto[];
  products: HqProductDto[];
  rules: string[];
  links: HqLinkDto[];
  leadStages: string[];
}

/** GET /api/admin/hq 응답 */
export interface HqSnapshotDto {
  /** 아직 아무것도 가져오지 않았으면 null — 화면이 '가져오기'를 띄운다 */
  board: HqBoardDto | null;
  decisions: HqDecisionRowVo[];
  leads: HqLeadRowVo[];
  log: HqLogRowVo[];
  me: string;
  env: string;
}

/** GET /api/admin/hq/numbers — 운영 DB에서 읽기 전용으로 센 숫자 */
export interface HqNumberDto {
  key: string;
  label: string;
  /** 테이블이 그 환경에 아직 없으면 null */
  value: number | null;
}
export interface HqNumbersDto { env: string; at: string; items: HqNumberDto[] }

// ─── 요청 ───

/** 독립 HQ(맥 버전)의 hq.json 을 그대로 받는다 — 비어 있을 때 한 번만 */
export class HqImportDto {
  direction!: HqBoardDto['direction'];
  weapons?: HqNameUseDto[];
  flow?: HqFlowStepDto[];
  products?: HqProductDto[];
  rules?: string[];
  links?: HqLinkDto[];
  leadStages?: string[];
  decisions?: Array<{ id?: string; question: string; options?: string; recommend?: string; status?: string; answer?: string; opened?: string; decided?: string }>;
  leads?: Array<{ name: string; kind?: string; source?: string; stage?: string; contact?: string; note?: string; created?: string; updated?: string }>;
  log?: Array<{ at?: string; who?: string; kind?: string; text: string }>;
}

export class HqFlowUpdateDto { status?: string; note?: string }
export class HqDecisionCreateDto { question!: string; options?: string; recommend?: string }
export class HqDecisionUpdateDto { status?: string; answer?: string }
export class HqLeadCreateDto { name!: string; kind?: string; source?: string; contact?: string; note?: string; businessId?: string }
export class HqLeadUpdateDto { name?: string; kind?: string; source?: string; stage?: string; contact?: string; note?: string; businessId?: string | null }
export class HqLogCreateDto { kind?: string; text!: string }

export type HqDecisionDto = HqDecisionRowVo;
export type HqLeadDto = HqLeadRowVo;
