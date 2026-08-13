import { TeamRole } from './team.vo';

/**
 * 활성 작업 컨텍스트 — 이 사용자의 생성비가 **어느 지갑에서** 나가는지.
 * 개인이면 users.credit_balance, 팀이면 teams.credit_balance(팀 풀).
 */
export type WorkContextVo =
  | { readonly type: 'personal' }
  | { readonly type: 'team'; readonly teamId: string; readonly teamName: string; readonly role: TeamRole };
