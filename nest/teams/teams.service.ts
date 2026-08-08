import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 팀 로직 재사용(중복 금지) — 권한검사·초대·멤버·팀 크레딧 풀은 레거시 서비스가 단일소스.
//   dist/teams/teams.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const svc = require(path.join(__dirname, '..', '..', 'src', 'teams', 'team.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const teamCredit = require(path.join(__dirname, '..', '..', 'src', 'teams', 'team.credit.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { query } = require(path.join(__dirname, '..', '..', 'src', 'db', 'client.js'));

@Injectable()
export class TeamsService {
  // ── 컨텍스트(개인/팀) ──
  // 권한 미달·미존재는 레거시 서비스가 statusCode 에러를 throw → LegacyErrorFilter가 그대로 응답.
  resolveContext(userId: string) {
    return teamCredit.resolveContext(userId);
  }

  // 컨텍스트 전환: teamId가 있으면 멤버 여부 확인 후 active_team_id 세팅, 없으면 개인으로 복귀.
  async switchContext(userId: string, teamId?: string | null) {
    if (teamId) {
      await svc.assertRole(teamId, userId, 'viewer'); // 멤버 확인
      await query('UPDATE users SET active_team_id = $1 WHERE id = $2', [teamId, userId]);
    } else {
      await query('UPDATE users SET active_team_id = NULL WHERE id = $1', [userId]);
    }
    return teamCredit.resolveContext(userId);
  }

  // ── 팀 ──
  createTeam(name: string, ownerId: string) {
    return svc.createTeam(name, ownerId);
  }

  listMyTeams(userId: string) {
    return svc.listMyTeams(userId);
  }

  // 팀 상세 = 팀 + 멤버 + 팀 풀 잔액 + 내 역할(멤버만 조회 가능)
  async getTeamDetail(teamId: string, userId: string) {
    const myRole = await svc.assertRole(teamId, userId, 'viewer');
    const team = await svc.getTeam(teamId);
    const members = await svc.listMembers(teamId);
    const creditBalance = await teamCredit.getBalance(teamId);
    return { ...team, members, credit_balance: creditBalance, my_role: myRole };
  }

  async deleteTeam(teamId: string, userId: string) {
    await svc.assertRole(teamId, userId, 'owner');
    return svc.deleteTeam(teamId);
  }

  // ── 초대 ──
  getInvite(code: string) {
    return svc.getInvite(code);
  }

  acceptInvite(code: string, userId: string) {
    return svc.acceptInvite(code, userId);
  }

  async createInvite(teamId: string, userId: string, role: any) {
    await svc.assertRole(teamId, userId, 'owner');
    return svc.createInvite(teamId, role, userId);
  }

  // ── 멤버 ──
  async changeRole(teamId: string, userId: string, targetUserId: string, role: any) {
    await svc.assertRole(teamId, userId, 'owner');
    const team = await svc.getTeam(teamId);
    return svc.changeRole(teamId, targetUserId, role, team);
  }

  // owner는 타인 제거, 본인은 탈퇴(멤버 여부만 확인) — 레거시와 동일한 분기.
  async removeMember(teamId: string, userId: string, targetUserId: string) {
    const team = await svc.getTeam(teamId);
    const isSelf = targetUserId === userId;
    await svc.assertRole(teamId, userId, isSelf ? 'viewer' : 'owner');
    return svc.removeMember(teamId, targetUserId, team);
  }

  // ── 팀 크레딧 풀 ──
  async transferCredits(teamId: string, userId: string, amount: number) {
    await svc.assertRole(teamId, userId, 'owner');
    return teamCredit.transferFromUser(userId, teamId, amount);
  }

  async creditLedger(teamId: string, userId: string, limit: number) {
    await svc.assertRole(teamId, userId, 'viewer');
    return teamCredit.getLedger(teamId, limit);
  }
}
