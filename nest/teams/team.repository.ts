import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { TeamVo, MyTeamVo, TeamMemberVo, TeamInviteVo, TeamRole } from './vo/team.vo';

/** 팀 데이터 접근 — teams / team_members / team_invites / team_credit_ledger / users.active_team_id */
@Injectable()
export class TeamRepository {
  constructor(private readonly db: DbService) {}

  async getRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const r = await this.db.query<{ role: TeamRole }>(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
    return r.rows[0]?.role || null;
  }

  async insertTeam(name: string, ownerId: string): Promise<TeamVo> {
    const t = await this.db.query<TeamVo>(
      'INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at',
      [String(name).slice(0, 120), ownerId]);
    return t.rows[0];
  }

  async addMember(teamId: string, userId: string, role: TeamRole): Promise<void> {
    await this.db.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO NOTHING`, [teamId, userId, role]);
  }

  async listMyTeams(userId: string): Promise<MyTeamVo[]> {
    const r = await this.db.query<MyTeamVo>(
      `SELECT t.id, t.name, t.owner_id, tm.role AS my_role,
              (SELECT count(*) FROM team_members WHERE team_id = t.id) AS member_count
       FROM teams t JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = $1 ORDER BY t.created_at`, [userId]);
    return r.rows;
  }

  /** 멤버 목록 — owner → editor → viewer 순, 같은 등급은 가입순 */
  async listMembers(teamId: string): Promise<TeamMemberVo[]> {
    const r = await this.db.query<TeamMemberVo>(
      `SELECT tm.user_id, tm.role, tm.created_at, u.email, u.display_name
       FROM team_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, tm.created_at`,
      [teamId]);
    return r.rows;
  }

  async insertInvite(teamId: string, code: string, role: TeamRole, createdBy: string) {
    const r = await this.db.query<{ code: string; role: TeamRole; expires_at: string }>(
      `INSERT INTO team_invites (team_id, code, role, created_by) VALUES ($1, $2, $3, $4)
       RETURNING code, role, expires_at`, [teamId, code, role, createdBy]);
    return r.rows[0];
  }

  async findInvite(code: string): Promise<TeamInviteVo | null> {
    const r = await this.db.query<TeamInviteVo>(
      `SELECT i.code, i.role, i.expires_at, i.team_id, t.name AS team_name
       FROM team_invites i JOIN teams t ON t.id = i.team_id
       WHERE i.code = $1`, [code]);
    return r.rows[0] || null;
  }

  async updateMemberRole(teamId: string, targetUserId: string, newRole: TeamRole) {
    const r = await this.db.query<{ user_id: string; role: TeamRole }>(
      `UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING user_id, role`,
      [newRole, teamId, targetUserId]);
    return r.rowCount === 0 ? null : r.rows[0];
  }

  async deleteMember(teamId: string, targetUserId: string) {
    const r = await this.db.query<{ user_id: string }>(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING user_id',
      [teamId, targetUserId]);
    return r.rowCount === 0 ? null : r.rows[0];
  }

  async findTeam(teamId: string): Promise<TeamVo | null> {
    const r = await this.db.query<TeamVo>(
      'SELECT id, name, owner_id, created_at FROM teams WHERE id = $1', [teamId]);
    return r.rows[0] || null;
  }

  /** 멤버십은 FK CASCADE로 함께 지워진다 */
  async deleteTeam(teamId: string): Promise<void> {
    await this.db.query('DELETE FROM teams WHERE id = $1', [teamId]);
  }

  /** 작업 컨텍스트 전환 — null이면 개인으로 복귀 */
  async setActiveTeam(userId: string, teamId: string | null): Promise<void> {
    if (teamId) {
      await this.db.query('UPDATE users SET active_team_id = $1 WHERE id = $2', [teamId, userId]);
    } else {
      await this.db.query('UPDATE users SET active_team_id = NULL WHERE id = $1', [userId]);
    }
  }
}
