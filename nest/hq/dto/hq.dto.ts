import { HqDecisionRowVo, HqLeadRowVo, HqLogRowVo, HqPublishedVo, HqRefRowVo } from '../vo/hq.vo';

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
  /** 목표(2026-11-21 추가). 예전 판에는 없을 수 있다 */
  goal?: { text: string; decided: string };
  direction: { line: string; why: string; decided: string };
  weapons: HqNameUseDto[];
  flow: HqFlowStepDto[];
  products: HqProductDto[];
  rules: string[];
  links: HqLinkDto[];
  leadStages: string[];
}

/** 화면에서 통째로 고칠 수 있는 판의 칸 — 흐름은 단계별 PUT /flow/:id 로 따로 고친다 */
export type HqBoardSection = 'goal' | 'direction' | 'weapons' | 'products' | 'rules' | 'links';
export const HQ_BOARD_SECTIONS: HqBoardSection[] = ['goal', 'direction', 'weapons', 'products', 'rules', 'links'];

/** 레퍼런스가 지나는 네 칸 — 순서가 곧 진행 */
export const HQ_REF_STAGES = ['작업 중', '완성', '권리 확인', '공개'];

/** GET /api/admin/hq 응답 */
export interface HqSnapshotDto {
  /** 아직 아무것도 가져오지 않았으면 null — 화면이 '가져오기'를 띄운다 */
  board: HqBoardDto | null;
  decisions: HqDecisionRowVo[];
  leads: HqLeadRowVo[];
  refs: HqRefRowVo[];
  refStages: string[];
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
/** PUT /api/admin/hq/board/:section — value 모양은 칸마다 HqBoardDto 의 그 칸과 같다 */
export class HqBoardUpdateDto { value!: unknown }
export class HqDecisionCreateDto { question!: string; options?: string; recommend?: string }
export class HqDecisionUpdateDto { status?: string; answer?: string }
export class HqLeadCreateDto { name!: string; kind?: string; source?: string; contact?: string; note?: string; businessId?: string; nextAction?: string; nextDate?: string }
export class HqLeadUpdateDto { name?: string; kind?: string; source?: string; stage?: string; contact?: string; note?: string; businessId?: string | null; nextAction?: string; nextDate?: string | null }
export class HqLogCreateDto { kind?: string; text!: string }
export class HqRefCreateDto { title!: string; client?: string; kind?: string; source?: string; stage?: string; leadId?: string; resultUrl?: string; note?: string; published?: HqPublishedVo[]; doneDate?: string }
export class HqRefUpdateDto { title?: string; client?: string; kind?: string; source?: string; stage?: string; leadId?: string | null; resultUrl?: string; note?: string; published?: HqPublishedVo[]; doneDate?: string | null }
export type HqRefDto = HqRefRowVo;

export type HqDecisionDto = HqDecisionRowVo;
export type HqLeadDto = HqLeadRowVo;
