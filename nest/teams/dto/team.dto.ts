import { TeamVo, TeamMemberVo, TeamRole } from '../vo/team.vo';

/** 팀 API 경계 계약 — src/teams/team.service.js · team.credit.js */

/** 현재 작업 컨텍스트(개인/팀) */
export type TeamContextDto =
  | { type: 'personal' }
  | { type: 'team'; teamId: string; teamName: string; role: TeamRole };

/** 팀 상세 = 팀 행 + 멤버 + 팀 풀 잔액 + 내 역할 */
export interface TeamDetailDto extends TeamVo {
  members: TeamMemberVo[];
  credit_balance: number;
  my_role: TeamRole;
}

/** 팀 생성 직후 응답(목록 형태에 맞춰 my_role·member_count를 붙여 내려준다) */
export interface CreatedTeamDto extends TeamVo {
  my_role: 'owner';
  member_count: 1;
}

/** 초대 미리보기 */
export interface InvitePreviewDto {
  teamName: string;
  role: TeamRole;
  teamId: string;
}

/** 초대 생성 결과 — url은 요청 protocol/host로 조립(프록시 뒤에서 https가 되려면 trust proxy 필요) */
export interface CreatedInviteDto {
  code: string;
  role: TeamRole;
  expires_at: string;
  url: string;
}

/** 초대 수락 결과 — already=true 면 이미 멤버였다 */
export interface AcceptInviteResultDto {
  teamId: string;
  role: TeamRole;
  already: boolean;
}

/** 개인 → 팀 풀 이체 결과 */
export interface CreditTransferResultDto {
  userBalance: number;
  teamBalance: number;
}

// ── 요청 DTO (지금은 타입 전용 — 나중에 class-validator 데코레이터만 붙이면 검증 활성화) ──

export class CreateTeamDto {
  name!: string;
}

export class SwitchTeamContextDto {
  /** null이면 개인 컨텍스트로 복귀 */
  teamId!: string | null;
}

export class CreateInviteDto {
  role?: TeamRole;
}

export class ChangeMemberRoleDto {
  role!: TeamRole;
}

export class TransferCreditsDto {
  /** 클라이언트가 문자열로 보낼 수 있어 컨트롤러에서 parseInt로 정규화한다(레거시 동작 유지) */
  amount!: number | string;
}
