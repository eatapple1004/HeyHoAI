const { Router } = require('express');
const svc = require('./team.service');
const teamCredit = require('./team.credit');
const { query } = require('../db/client');

const router = Router();

/** GET /api/teams/context — 현재 작업 컨텍스트 (개인/팀) */
router.get('/context', async (req, res, next) => {
  try {
    res.json({ success: true, data: await teamCredit.resolveContext(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** PUT /api/teams/context { teamId|null } — 컨텍스트 전환 */
router.put('/context', async (req, res, next) => {
  try {
    const { teamId } = req.body || {};
    if (teamId) {
      await svc.assertRole(teamId, req.user.id, 'viewer'); // 멤버 확인
      await query('UPDATE users SET active_team_id = $1 WHERE id = $2', [teamId, req.user.id]);
    } else {
      await query('UPDATE users SET active_team_id = NULL WHERE id = $1', [req.user.id]);
    }
    res.json({ success: true, data: await teamCredit.resolveContext(req.user.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/teams { name } — 팀 생성 */
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '팀 이름이 필요합니다.' });
    const team = await svc.createTeam(name.trim(), req.user.id);
    res.status(201).json({ success: true, data: { ...team, my_role: 'owner', member_count: 1 } });
  } catch (err) { next(err); }
});

/** GET /api/teams — 내가 속한 팀 목록 */
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listMyTeams(req.user.id) });
  } catch (err) { next(err); }
});

/** GET /api/teams/invites/:code — 초대 미리보기 (팀명/역할) */
router.get('/invites/:code', async (req, res, next) => {
  try {
    const inv = await svc.getInvite(req.params.code);
    res.json({ success: true, data: { teamName: inv.team_name, role: inv.role, teamId: inv.team_id } });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/teams/invites/:code/accept — 초대 수락 */
router.post('/invites/:code/accept', async (req, res, next) => {
  try {
    const result = await svc.acceptInvite(req.params.code, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/teams/:id — 팀 상세 + 멤버 + 풀 잔액 (멤버만) */
router.get('/:id', async (req, res, next) => {
  try {
    const myRole = await svc.assertRole(req.params.id, req.user.id, 'viewer');
    const team = await svc.getTeam(req.params.id);
    const members = await svc.listMembers(req.params.id);
    const creditBalance = await teamCredit.getBalance(req.params.id);
    res.json({ success: true, data: { ...team, members, credit_balance: creditBalance, my_role: myRole } });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/teams/:id/credits/transfer { amount } — 개인→팀 풀 이체 (owner) */
router.post('/:id/credits/transfer', async (req, res, next) => {
  try {
    await svc.assertRole(req.params.id, req.user.id, 'owner');
    const amount = parseInt((req.body || {}).amount, 10);
    if (!(amount > 0)) return res.status(400).json({ success: false, error: '이체 금액은 1 이상이어야 합니다.' });
    const result = await teamCredit.transferFromUser(req.user.id, req.params.id, amount);
    res.json({ success: true, data: result });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/teams/:id/credits/ledger — 팀 크레딧 내역 (멤버) */
router.get('/:id/credits/ledger', async (req, res, next) => {
  try {
    await svc.assertRole(req.params.id, req.user.id, 'viewer');
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    res.json({ success: true, data: await teamCredit.getLedger(req.params.id, limit) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/teams/:id/invites { role } — 초대 링크 생성 (owner) */
router.post('/:id/invites', async (req, res, next) => {
  try {
    await svc.assertRole(req.params.id, req.user.id, 'owner');
    const inv = await svc.createInvite(req.params.id, (req.body || {}).role, req.user.id);
    const url = `${req.protocol}://${req.get('host')}/join-team.html?code=${inv.code}`;
    res.status(201).json({ success: true, data: { ...inv, url } });
  } catch (err) { handle(err, res, next); }
});

/** PATCH /api/teams/:id/members/:userId { role } — 역할 변경 (owner) */
router.patch('/:id/members/:userId', async (req, res, next) => {
  try {
    await svc.assertRole(req.params.id, req.user.id, 'owner');
    const team = await svc.getTeam(req.params.id);
    const updated = await svc.changeRole(req.params.id, req.params.userId, (req.body || {}).role, team);
    res.json({ success: true, data: updated });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/teams/:id/members/:userId — 멤버 제거(owner) 또는 본인 탈퇴 */
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const team = await svc.getTeam(req.params.id);
    const isSelf = req.params.userId === req.user.id;
    if (!isSelf) await svc.assertRole(req.params.id, req.user.id, 'owner');
    else await svc.assertRole(req.params.id, req.user.id, 'viewer'); // 멤버 여부 확인
    const removed = await svc.removeMember(req.params.id, req.params.userId, team);
    res.json({ success: true, data: removed });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/teams/:id — 팀 삭제 (owner) */
router.delete('/:id', async (req, res, next) => {
  try {
    await svc.assertRole(req.params.id, req.user.id, 'owner');
    await svc.deleteTeam(req.params.id);
    res.json({ success: true });
  } catch (err) { handle(err, res, next); }
});

function handle(err, res, next) {
  if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
  next(err);
}

module.exports = { router };
