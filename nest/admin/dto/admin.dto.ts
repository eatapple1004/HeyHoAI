/** 관리자 조회·제안서 API 계약 — src/admin/{adminData,proposal}.service.js */

/** 전체 크리에이션 행(비공개 포함) — 관리자만 */
export interface AdminCreationDto {
  idx: number;
  url: string;
  isReel: boolean;
  visibility: string;
  status: string;
  takenDown: boolean;
  templateName: string | null;
  templateSource: string | null;
  model: string | null;
  width: number | null;
  height: number | null;
  likes: number;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
}

/**
 * 대시보드 집계 — 블록별로 개별 try/catch 격리라 테이블이 없으면 그 블록만 비거나 `_err`가 담긴다.
 * (전체 500을 막기 위한 의도적 설계 — 그래서 필드가 unknown 허용)
 */
export interface AdminStatsDto {
  users: Record<string, unknown>;
  creations: Record<string, unknown>;
  videoJobs: Record<string, unknown>;
  ugcJobs: Record<string, unknown>;
  faceswap: Record<string, unknown>;
  packs: Record<string, unknown>;
  payments: Record<string, unknown>;
  byProvider: unknown[];
  topTemplates: unknown[];
  templateSources: unknown[];
  topModels: unknown[];
  ugcByType: unknown[];
  topUsers: unknown[];
  engagement: Record<string, unknown>;
  timeseries: unknown[];
  recentPayments: unknown[];
}

/** 제안서 목록 행 */
export interface ProposalListItemDto {
  id: string;
  company: string;
  title: string | null;
  updated_at: string;
  groups: number;
}

/** 제안서 단건(편집용 전체 로드) */
export interface ProposalDto {
  id: string;
  company: string;
  title: string | null;
  meta: Record<string, unknown>;
  selection: unknown[];
}

/** before/after 그룹 — 1 레퍼런스 → n 결과 */
export interface ProposalResultGroupDto {
  gkey: string;
  beforeUrl: string;
  altBeforeUrl: string;
  beforeKind: 'original' | 'canonical';
  isPack: boolean;
  label: string;
  results: Array<{ idx: number; afterUrl: string; label: string }>;
}

/** results 응답 — groups·scope·hasMore가 최상위 필드 */
export interface ProposalResultsDto {
  groups: ProposalResultGroupDto[];
  scope: 'mine' | 'all';
  hasMore: boolean;
}

/** refine 실행 기록(목록) */
export interface RefineRunSummaryDto {
  id: string;
  goal: string | null;
  prompt: string | null;
  best_file: string | null;
  best_ok: number | null;
  total: number | null;
  converged: boolean;
  max_iters: number | null;
  iter_count: number;
  created_at: string;
}

// ── 요청 ──
export class ListCreationsQueryDto {
  visibility?: 'public' | 'private';
  status?: 'success' | 'failed' | 'pending';
  q?: string;
  limit?: string;
  offset?: string;
}
export class SaveProposalDto {
  company!: string;
  /** 있으면 update, 없으면 insert */
  id?: string;
  title?: string;
  about?: string;
  intro?: string;
  svc?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  selection?: unknown[];
}
export class ProposalResultsQueryDto {
  scope?: 'mine' | 'all';
  limit?: string;
  offset?: string;
}
