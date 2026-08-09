import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as crypto from 'crypto';
import { TeamRepository } from './team.repository';
import { TeamVo, MyTeamVo, TeamInviteVo, TeamRole } from './vo/team.vo';
import { TeamLedgerEntryVo } from '../common/vo/ledger.vo';
import {
  TeamContextDto, TeamDetailDto, AcceptInviteResultDto, CreditTransferResultDto,
} from './dto/team.dto';

// 팀 크레딧 풀(이체·차감·컨텍스트 해석)은 크레딧 도메인과 얽혀 있어 아직 재사용 — credits 이식 시 함께 정리.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const teamCredit = require(path.join(__dirname, '..', '..', 'src', 'teams', 'team.credit.js'));

/** 역할 등급 — 상위 등급이 하위 권한을 포함한다 */
const ROLES: TeamRole[] = ['owner', 'editor', 'viewer'];
const ROLE_RANK: Record<TeamRole, number> = { viewer: 1, editor: 2, owner: 3 };

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

@Injectable()
export class TeamsService {
  constructor(private readonly repo: TeamRepository) {}

  /**
   * 권한 검사 — 멤버가 아니면 **404**(팀 존재 자체를 숨긴다), 등급 미달이면 403.
   * 이 구분은 의도적이다: 남의 팀 id를 넣어봐도 존재 여부를 알 수 없어야 한다.
   */
  private async assertRole(teamId: string, userId: string, minRole: TeamRole = 'viewer'): Promise<TeamRole> {
    const role = await this.repo.getRole(teamId, userId);
    if (!role) throw httpError(404, '팀을 찾을 수 없습니다.');
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) throw httpError(403, '이 작업을 수행할 권한이 없습니다.');
    return role;
  }

  private async getTeamOrThrow(teamId: string): Promise<TeamVo> {
    const team = await this.repo.findTeam(teamId);
    if (!team) throw httpError(404, '팀을 찾을 수 없습니다.');
    return team;
  }

  // ── 컨텍스트(개인/팀) ──
  resolveContext(userId: string): Promise<TeamContextDto> {
    return teamCredit.resolveContext(userId);
  }

  /** 컨텍스트 전환 — teamId가 있으면 멤버 확인 후 세팅, 없으면 개인 복귀 */
  async switchContext(userId: string, teamId?: string | null): Promise<TeamContextDto> {
    if (teamId) await this.assertRole(teamId, userId, 'viewer');
    await this.repo.setActiveTeam(userId, teamId ?? null);
    return teamCredit.resolveContext(userId);
  }

  // ── 팀 ──
  /** 생성자는 자동으로 owner 멤버가 된다 */
  async createTeam(name: string, ownerId: string): Promise<TeamVo> {
    const team = await this.repo.insertTeam(name, ownerId);
    await this.repo.addMember(team.id, ownerId, 'owner');
    return team;
  }

  listMyTeams(userId: string): Promise<MyTeamVo[]> {
    return this.repo.listMyTeams(userId);
  }

  /** 상세 = 팀 + 멤버 + 팀 풀 잔액 + 내 역할(멤버만) */
  async getTeamDetail(teamId: string, userId: string): Promise<TeamDetailDto> {
    const myRole = await this.assertRole(teamId, userId, 'viewer');
    const team = await this.getTeamOrThrow(teamId);
    const members = await this.repo.listMembers(teamId);
    const creditBalance = await teamCredit.getBalance(teamId);
    return { ...team, members, credit_balance: creditBalance, my_role: myRole };
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    await this.assertRole(teamId, userId, 'owner');
    await this.repo.deleteTeam(teamId);
  }

  // ── 초대 ──
  /** 만료된 링크는 410 — 404와 구분해 "있었지만 지났다"를 알려준다 */
  async getInvite(code: string): Promise<TeamInviteVo> {
    const inv = await this.repo.findInvite(code);
    if (!inv) throw httpError(404, '유효하지 않은 초대 링크입니다.');
    if (new Date(inv.expires_at) < new Date()) throw httpError(410, '만료된 초대 링크입니다.');
    return inv;
  }

  /** 이미 멤버면 already=true (중복 가입 아님) */
  async acceptInvite(code: string, userId: string): Promise<AcceptInviteResultDto> {
    const inv = await this.getInvite(code);
    const existing = await this.repo.getRole(inv.team_id, userId);
    if (existing) return { teamId: inv.team_id, role: existing, already: true };
    await this.repo.addMember(inv.team_id, userId, inv.role);
    return { teamId: inv.team_id, role: inv.role, already: false };
  }

  /** 초대 생성(owner) — owner 역할로는 초대할 수 없다(소유권 이전 미지원) */
  async createInvite(teamId: string, userId: string, role?: TeamRole) {
    await this.assertRole(teamId, userId, 'owner');
    const r: TeamRole = role && ROLES.includes(role) && role !== 'owner' ? role : 'editor';
    const code = crypto.randomBytes(9).toString('base64url'); // 12자 URL-safe
    return this.repo.insertInvite(teamId, code, r, userId);
  }

  // ── 멤버 ──
  async changeRole(teamId: string, userId: string, targetUserId: string, role: TeamRole) {
    await this.assertRole(teamId, userId, 'owner');
    const team = await this.getTeamOrThrow(teamId);
    if (!ROLES.includes(role)) throw httpError(400, '유효한 역할이 아닙니다.');
    if (targetUserId === team.owner_id) throw httpError(400, '소유자의 역할은 변경할 수 없습니다.');
    if (role === 'owner') throw httpError(400, '소유권 이전은 지원되지 않습니다.');
    const updated = await this.repo.updateMemberRole(teamId, targetUserId, role);
    if (!updated) throw httpError(404, '해당 멤버가 없습니다.');
    return updated;
  }

  /** owner는 타인 제거, 본인은 탈퇴(멤버 여부만 확인). 소유자는 탈퇴 불가 — 팀 삭제를 쓴다 */
  async removeMember(teamId: string, userId: string, targetUserId: string) {
    const team = await this.getTeamOrThrow(teamId);
    const isSelf = targetUserId === userId;
    await this.assertRole(teamId, userId, isSelf ? 'viewer' : 'owner');
    if (targetUserId === team.owner_id) {
      throw httpError(400, '소유자는 팀을 나갈 수 없습니다. 팀 삭제를 이용하세요.');
    }
    const removed = await this.repo.deleteMember(teamId, targetUserId);
    if (!removed) throw httpError(404, '해당 멤버가 없습니다.');
    return removed;
  }

  // ── 팀 크레딧 풀 ──
  async transferCredits(teamId: string, userId: string, amount: number): Promise<CreditTransferResultDto> {
    await this.assertRole(teamId, userId, 'owner');
    return teamCredit.transferFromUser(userId, teamId, amount);
  }

  async creditLedger(teamId: string, userId: string, limit: number): Promise<TeamLedgerEntryVo[]> {
    await this.assertRole(teamId, userId, 'viewer');
    return teamCredit.getLedger(teamId, limit);
  }
}
