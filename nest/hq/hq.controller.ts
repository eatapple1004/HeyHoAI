import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import * as path from 'path';
import { HqService } from './hq.service';
import { HqLedgerService } from './hq-ledger.service';
import { HqGuard, HqPageGuard } from './hq.guard';
import { PageExceptionFilter } from '../pages/page-exception.filter';
import { ApiOk, ApiResponse } from '../common/dto/api-response.dto';
import {
  HqBoardDto,
  HqBoardUpdateDto,
  HqDecisionCreateDto,
  HqDecisionDto,
  HqDecisionUpdateDto,
  HqFlowStepDto,
  HqFlowUpdateDto,
  HqImportDto,
  HqLeadCreateDto,
  HqLeadDto,
  HqLeadUpdateDto,
  HqLedgerBulkDto,
  HqLedgerBulkResultDto,
  HqLedgerListDto,
  HqVaultCreateDto,
  HqVaultWrappedDto,
  HqRefCreateDto,
  HqRefDto,
  HqRefUpdateDto,
  HqLogCreateDto,
  HqNumbersDto,
  HqSnapshotDto,
} from './dto/hq.dto';

// /api/admin/hq — 운영 기록판 API. 허용 메일 목록에 있는 사람만(도피아 로그인 또는 Access 메일 인증, HqGuard).
@Controller('api/admin/hq')
@UseGuards(HqGuard)
export class AdminHqController {
  constructor(private readonly hq: HqService, private readonly ledger: HqLedgerService) {}

  // GET /api/admin/hq — 판·결정·고객·기록 한 번에
  @Get()
  async snapshot(@Req() req: any): Promise<ApiResponse<HqSnapshotDto>> {
    return { success: true, data: await this.hq.snapshot(req.hqActor) };
  }

  // GET /api/admin/hq/numbers — 운영 DB 읽기 전용 집계(진단 신청·사업체·리포트·마케팅 작업·결제)
  @Get('numbers')
  async numbers(): Promise<ApiResponse<HqNumbersDto>> {
    return { success: true, data: await this.hq.numbers() };
  }

  // POST /api/admin/hq/import — 비어 있을 때 한 번, 맥 독립 HQ의 hq.json 을 옮겨 온다
  @Post('import')
  @HttpCode(200)
  async importAll(@Body() body: HqImportDto, @Req() req: any): Promise<ApiOk> {
    await this.hq.importAll(body, req.hqActor);
    return { success: true };
  }

  // PUT /api/admin/hq/flow/:id — 흐름 단계 상태·메모
  @Put('flow/:id')
  async updateFlow(@Param('id') id: string, @Body() body: HqFlowUpdateDto, @Req() req: any): Promise<ApiResponse<HqFlowStepDto>> {
    return { success: true, data: await this.hq.updateFlow(id, body, req.hqActor) };
  }

  // PUT /api/admin/hq/board/:section — 판의 한 칸(direction·weapons·products·rules·links)을 통째로 고친다
  @Put('board/:section')
  async updateBoard(@Param('section') section: string, @Body() body: HqBoardUpdateDto, @Req() req: any): Promise<ApiResponse<HqBoardDto>> {
    return { success: true, data: await this.hq.updateBoardSection(section, body, req.hqActor) };
  }

  // POST /api/admin/hq/decisions — 결정할 것 추가(D번호 자동)
  @Post('decisions')
  @HttpCode(200)
  async createDecision(@Body() body: HqDecisionCreateDto, @Req() req: any): Promise<ApiResponse<HqDecisionDto>> {
    return { success: true, data: await this.hq.createDecision(body, req.hqActor) };
  }

  // PUT /api/admin/hq/decisions/:code — 대기·결정·보류 + 결론
  @Put('decisions/:code')
  async updateDecision(@Param('code') code: string, @Body() body: HqDecisionUpdateDto, @Req() req: any): Promise<ApiResponse<HqDecisionDto>> {
    return { success: true, data: await this.hq.updateDecision(code, body, req.hqActor) };
  }

  // POST /api/admin/hq/leads — 고객·후보 추가(첫 단계로 들어간다)
  @Post('leads')
  @HttpCode(200)
  async createLead(@Body() body: HqLeadCreateDto, @Req() req: any): Promise<ApiResponse<HqLeadDto>> {
    return { success: true, data: await this.hq.createLead(body, req.hqActor) };
  }

  // PUT /api/admin/hq/leads/:id — 단계 이동·정보 수정
  @Put('leads/:id')
  async updateLead(@Param('id') id: string, @Body() body: HqLeadUpdateDto, @Req() req: any): Promise<ApiResponse<HqLeadDto>> {
    return { success: true, data: await this.hq.updateLead(id, body, req.hqActor) };
  }

  // DELETE /api/admin/hq/leads/:id
  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string, @Req() req: any): Promise<ApiOk> {
    await this.hq.deleteLead(id, req.hqActor);
    return { success: true };
  }

  // POST /api/admin/hq/refs — 레퍼런스 추가(기본 '작업 중'으로 들어간다)
  @Post('refs')
  @HttpCode(200)
  async createRef(@Body() body: HqRefCreateDto, @Req() req: any): Promise<ApiResponse<HqRefDto>> {
    return { success: true, data: await this.hq.createRef(body, req.hqActor) };
  }

  // PUT /api/admin/hq/refs/:id — 단계 이동·공개 기록·정보 수정
  @Put('refs/:id')
  async updateRef(@Param('id') id: string, @Body() body: HqRefUpdateDto, @Req() req: any): Promise<ApiResponse<HqRefDto>> {
    return { success: true, data: await this.hq.updateRef(id, body, req.hqActor) };
  }

  // DELETE /api/admin/hq/refs/:id
  @Delete('refs/:id')
  async deleteRef(@Param('id') id: string, @Req() req: any): Promise<ApiOk> {
    await this.hq.deleteRef(id, req.hqActor);
    return { success: true };
  }

  // GET /api/admin/hq/ledger — 레퍼런스 원장 전체 + 금고 상태(잠긴 카드는 잠긴 글 그대로)
  @Get('ledger')
  async ledgerList(@Req() req: any): Promise<ApiResponse<HqLedgerListDto>> {
    return { success: true, data: await this.ledger.list(req.hqActor) };
  }

  // POST /api/admin/hq/ledger/bulk — 카드 넣기(origin 같으면 고침). 수확기 기계 열쇠가 쓰는 길
  @Post('ledger/bulk')
  @HttpCode(200)
  async ledgerBulk(@Body() body: HqLedgerBulkDto, @Req() req: any): Promise<ApiResponse<HqLedgerBulkResultDto>> {
    return { success: true, data: await this.ledger.bulk(body, req.hqActor) };
  }

  // POST /api/admin/hq/ledger/:id/promote — 원장 카드를 레퍼런스 보드 '완성' 칸으로
  @Post('ledger/:id/promote')
  @HttpCode(200)
  async ledgerPromote(@Param('id') id: string, @Req() req: any): Promise<ApiResponse<HqRefDto>> {
    return { success: true, data: await this.ledger.promote(id, req.hqActor) };
  }

  // GET /api/admin/hq/vault/public — 금고 공개 열쇠(잠그는 데만 쓰임). 수확기도 읽는다
  @Get('vault/public')
  async vaultPublic(): Promise<ApiResponse<{ publicKey: JsonWebKey | null }>> {
    return { success: true, data: await this.ledger.vaultPublic() };
  }

  // GET /api/admin/hq/vault — 주인만: 비밀 문구로 잠긴 개인 열쇠(브라우저가 푼다)
  @Get('vault')
  async vaultWrapped(@Req() req: any): Promise<ApiResponse<HqVaultWrappedDto>> {
    return { success: true, data: await this.ledger.vaultWrapped(req.hqActor) };
  }

  // POST /api/admin/hq/vault — 주인만, 처음 한 번 금고 만들기
  @Post('vault')
  @HttpCode(200)
  async vaultCreate(@Body() body: HqVaultCreateDto, @Req() req: any): Promise<ApiOk> {
    await this.ledger.createVault(body, req.hqActor);
    return { success: true };
  }

  // POST /api/admin/hq/log — 손으로 남기는 기록 한 줄
  @Post('log')
  @HttpCode(200)
  async addLog(@Body() body: HqLogCreateDto, @Req() req: any): Promise<ApiOk> {
    await this.hq.addLog(body, req.hqActor);
    return { success: true };
  }
}

// /admin-hq 화면 — 관리자 화면들과 같은 페이지 응답(PageExceptionFilter). 입구는 HqPageGuard(허용 메일 목록).
//   HqModule 이 PagesModule 보다 먼저 등록돼 있어 클린 URL(:name)보다 이 라우트가 먼저 잡힌다.
const ADMIN_HQ_PAGE = path.join(__dirname, '..', '..', 'public', 'admin-hq.html');

@Controller()
@UseFilters(PageExceptionFilter)
export class HqPageController {
  @UseGuards(HqPageGuard)
  @Get('admin-hq')
  page(@Res() res: any) { return res.sendFile(ADMIN_HQ_PAGE); }
}
