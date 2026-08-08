import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/teams — 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   ⚠️ 라우트 선언 순서 주의: '/context'·'/invites/...' 같은 고정 경로를 ':id'보다 먼저 선언해야
//      Nest가 고정 경로를 :id로 잡아먹지 않는다(레거시 Express 라우터와 동일한 이유).
//   권한/미존재 에러(statusCode)는 서비스가 throw → LegacyErrorFilter가 레거시와 동일 형식으로 응답.
@Controller('api/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  // GET /api/teams/context — 현재 작업 컨텍스트(개인/팀)
  @Get('context')
  async context(@Req() req: any) {
    return { success: true, data: await this.teams.resolveContext(req.user.id) };
  }

  // PUT /api/teams/context { teamId|null } — 컨텍스트 전환
  @Put('context')
  async switchContext(@Req() req: any, @Body() body: any) {
    const teamId = body && body.teamId;
    return { success: true, data: await this.teams.switchContext(req.user.id, teamId) };
  }

  // GET /api/teams/invites/:code — 초대 미리보기(팀명/역할)
  @Get('invites/:code')
  async invitePreview(@Param('code') code: string) {
    const inv = await this.teams.getInvite(code);
    return { success: true, data: { teamName: inv.team_name, role: inv.role, teamId: inv.team_id } };
  }

  // POST /api/teams/invites/:code/accept — 초대 수락
  @Post('invites/:code/accept')
  @HttpCode(200) // 레거시 res.json=200
  async acceptInvite(@Req() req: any, @Param('code') code: string) {
    return { success: true, data: await this.teams.acceptInvite(code, req.user.id) };
  }

  // POST /api/teams { name } — 팀 생성 (레거시도 201)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const name = body && body.name;
    if (!name || !String(name).trim()) {
      throw new HttpException({ success: false, error: '팀 이름이 필요합니다.' }, 400);
    }
    const team = await this.teams.createTeam(String(name).trim(), req.user.id);
    return { success: true, data: { ...team, my_role: 'owner', member_count: 1 } };
  }

  // GET /api/teams — 내가 속한 팀 목록
  @Get()
  async list(@Req() req: any) {
    return { success: true, data: await this.teams.listMyTeams(req.user.id) };
  }

  // GET /api/teams/:id — 팀 상세 + 멤버 + 풀 잔액 (멤버만)
  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.teams.getTeamDetail(id, req.user.id) };
  }

  // POST /api/teams/:id/credits/transfer { amount } — 개인→팀 풀 이체 (owner)
  @Post(':id/credits/transfer')
  @HttpCode(200)
  async transfer(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const amount = parseInt((body || {}).amount, 10);
    if (!(amount > 0)) {
      throw new HttpException({ success: false, error: '이체 금액은 1 이상이어야 합니다.' }, 400);
    }
    return { success: true, data: await this.teams.transferCredits(id, req.user.id, amount) };
  }

  // GET /api/teams/:id/credits/ledger?limit=50 — 팀 크레딧 내역 (멤버)
  @Get(':id/credits/ledger')
  async ledger(@Req() req: any, @Param('id') id: string, @Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit as string, 10) || 50, 200);
    return { success: true, data: await this.teams.creditLedger(id, req.user.id, n) };
  }

  // POST /api/teams/:id/invites { role } — 초대 링크 생성 (owner, 레거시도 201)
  @Post(':id/invites')
  async createInvite(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const inv = await this.teams.createInvite(id, req.user.id, (body || {}).role);
    const url = `${req.protocol}://${req.get('host')}/join-team?code=${inv.code}`;
    return { success: true, data: { ...inv, url } };
  }

  // PATCH /api/teams/:id/members/:userId { role } — 역할 변경 (owner)
  @Patch(':id/members/:userId')
  async changeRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return {
      success: true,
      data: await this.teams.changeRole(id, req.user.id, userId, (body || {}).role),
    };
  }

  // DELETE /api/teams/:id/members/:userId — 멤버 제거(owner) 또는 본인 탈퇴
  @Delete(':id/members/:userId')
  async removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return { success: true, data: await this.teams.removeMember(id, req.user.id, userId) };
  }

  // DELETE /api/teams/:id — 팀 삭제 (owner)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.teams.deleteTeam(id, req.user.id);
    return { success: true };
  }
}
