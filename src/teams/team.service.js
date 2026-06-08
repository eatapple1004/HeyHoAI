const crypto = require('crypto');
const { query } = require('../db/client');

const ROLES = ['owner', 'editor', 'viewer'];
const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/** 팀 내 사용자의 역할 조회 (멤버 아니면 null) */
async function getRole(teamId, userId) {
  const r = await query('SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
  return r.rows[0]?.role || null;
}

/** 최소 역할 이상인지 검증. 아니면 403(멤버 아니면 404). */
async function assertRole(teamId, userId, minRole = 'viewer') {
  const role = await getRole(teamId, userId);
  if (!role) throw httpError(404, '팀을 찾을 수 없습니다.');
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw httpError(403, '이 작업을 수행할 권한이 없습니다.');
  }
  return role;
}

/** 팀 생성 — 생성자를 owner 멤버로 추가 */
async function createTeam(name, ownerId) {
  const t = await query(
    'INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at',
    [String(name).slice(0, 120), ownerId]
  );
  const team = t.rows[0];
  await query(
    `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [team.id, ownerId]
  );
  return team;
}

/** 내가 속한 팀 목록 (내 역할 + 멤버 수) */
async function listMyTeams(userId) {
  const r = await query(
    `SELECT t.id, t.name, t.owner_id, tm.role AS my_role,
            (SELECT count(*) FROM team_members WHERE team_id = t.id) AS member_count
     FROM teams t JOIN team_members tm ON tm.team_id = t.id
     WHERE tm.user_id = $1 ORDER BY t.created_at`,
    [userId]
  );
  return r.rows;
}

/** 팀 멤버 목록 (이메일/이름/역할) */
async function listMembers(teamId) {
  const r = await query(
    `SELECT tm.user_id, tm.role, tm.created_at, u.email, u.display_name
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1
     ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, tm.created_at`,
    [teamId]
  );
  return r.rows;
}

/** 초대 링크 생성 (owner 전용) */
async function createInvite(teamId, role, createdBy) {
  const r = ROLES.includes(role) && role !== 'owner' ? role : 'editor';
  const code = crypto.randomBytes(9).toString('base64url'); // 12자 URL-safe
  const ins = await query(
    `INSERT INTO team_invites (team_id, code, role, created_by) VALUES ($1, $2, $3, $4)
     RETURNING code, role, expires_at`,
    [teamId, code, r, createdBy]
  );
  return ins.rows[0];
}

/** 초대 코드 정보 조회 (유효성 + 팀명) */
async function getInvite(code) {
  const r = await query(
    `SELECT i.code, i.role, i.expires_at, i.team_id, t.name AS team_name
     FROM team_invites i JOIN teams t ON t.id = i.team_id
     WHERE i.code = $1`,
    [code]
  );
  const inv = r.rows[0];
  if (!inv) throw httpError(404, '유효하지 않은 초대 링크입니다.');
  if (new Date(inv.expires_at) < new Date()) throw httpError(410, '만료된 초대 링크입니다.');
  return inv;
}

/** 초대 수락 — 멤버로 추가 (이미 멤버면 그대로) */
async function acceptInvite(code, userId) {
  const inv = await getInvite(code);
  const existing = await getRole(inv.team_id, userId);
  if (existing) return { teamId: inv.team_id, role: existing, already: true };
  await query(
    `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (team_id, user_id) DO NOTHING`,
    [inv.team_id, userId, inv.role]
  );
  return { teamId: inv.team_id, role: inv.role, already: false };
}

/** 멤버 역할 변경 (owner 전용). owner 자신은 강등 불가(소유권 보호). */
async function changeRole(teamId, targetUserId, newRole, team) {
  if (!ROLES.includes(newRole)) throw httpError(400, '유효한 역할이 아닙니다.');
  if (targetUserId === team.owner_id) throw httpError(400, '소유자의 역할은 변경할 수 없습니다.');
  if (newRole === 'owner') throw httpError(400, '소유권 이전은 지원되지 않습니다.');
  const r = await query(
    `UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING user_id, role`,
    [newRole, teamId, targetUserId]
  );
  if (r.rowCount === 0) throw httpError(404, '해당 멤버가 없습니다.');
  return r.rows[0];
}

/** 멤버 제거. owner는 제거 불가. (본인 탈퇴 or owner의 제거) */
async function removeMember(teamId, targetUserId, team) {
  if (targetUserId === team.owner_id) throw httpError(400, '소유자는 팀을 나갈 수 없습니다. 팀 삭제를 이용하세요.');
  const r = await query(
    'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING user_id',
    [teamId, targetUserId]
  );
  if (r.rowCount === 0) throw httpError(404, '해당 멤버가 없습니다.');
  return r.rows[0];
}

/** 팀 조회 */
async function getTeam(teamId) {
  const r = await query('SELECT id, name, owner_id, created_at FROM teams WHERE id = $1', [teamId]);
  if (!r.rows[0]) throw httpError(404, '팀을 찾을 수 없습니다.');
  return r.rows[0];
}

/** 팀 삭제 (owner 전용) */
async function deleteTeam(teamId) {
  await query('DELETE FROM teams WHERE id = $1', [teamId]);
}

module.exports = {
  ROLES,
  getRole,
  assertRole,
  createTeam,
  listMyTeams,
  listMembers,
  createInvite,
  getInvite,
  acceptInvite,
  changeRole,
  removeMember,
  getTeam,
  deleteTeam,
};
