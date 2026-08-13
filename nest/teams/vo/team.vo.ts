/**
 * 팀 관련 DB 행 스냅샷(VO) — src/teams/team.service.js 의 SELECT 결과 형태.
 * 컬럼명(snake_case) 그대로가 응답에 나가므로 이름을 바꾸지 말 것.
 */

/** teams 행 */
export interface TeamVo {
  readonly id: string;
  readonly name: string;
  readonly owner_id: string;
  readonly created_at: string;
}

/** 내가 속한 팀 목록 행 — 내 역할·인원수가 붙는다(member_count는 count(*)라 문자열) */
export interface MyTeamVo {
  readonly id: string;
  readonly name: string;
  readonly owner_id: string;
  readonly my_role: TeamRole;
  readonly member_count: string;
}

/** team_members + users 조인 행 */
export interface TeamMemberVo {
  readonly user_id: string;
  readonly role: TeamRole;
  readonly created_at: string;
  readonly email: string | null;
  readonly display_name: string | null;
}

/** 초대 행 + 팀명 */
export interface TeamInviteVo {
  readonly code: string;
  readonly role: TeamRole;
  readonly expires_at: string;
  readonly team_id: string;
  readonly team_name: string;
}

export type TeamRole = 'owner' | 'editor' | 'viewer';
