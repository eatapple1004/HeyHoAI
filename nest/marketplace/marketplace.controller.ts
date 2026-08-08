import {
  Controller,
  Get,
  Post,
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
import { MarketplaceService, toErrorBody } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/marketplace/templates — 템플릿 서브트리(카탈로그·상세·CRUD·사용/구매·신고·북마크).
//   전 엔드포인트 인증 필요(= 레거시 requireAuth). 나머지 marketplace 경로(themes·me·earnings·
//   creators·owned 등)는 아직 레거시가 처리한다(main.ts NEST_PREFIXES가 templates 서브트리만 소유).
@Controller('api/marketplace/templates')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  // GET /api/marketplace/templates?category=&feed=1&theme=
  @Get()
  async list(@Req() req: any, @Query() q: any) {
    return { success: true, data: await this.marketplace.listTemplates(req.user.id, q) };
  }

  // POST /api/marketplace/templates — 템플릿 저장(레거시도 201)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return { success: true, data: await this.marketplace.createTemplate(req.user, body) };
  }

  // GET /api/marketplace/templates/:id — 상세(유료는 prompt 블랙박스)
  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.marketplace.getTemplate(req.user.id, id) };
  }

  // GET /api/marketplace/templates/:id/creations
  @Get(':id/creations')
  async creations(@Param('id') id: string) {
    return { success: true, data: await this.marketplace.getTemplateCreations(id) };
  }

  // PATCH /api/marketplace/templates/:id — 내 템플릿 편집
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.marketplace.updateTemplate(req.user.id, id, body) };
  }

  // DELETE /api/marketplace/templates/:id — 내 템플릿 내리기
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.marketplace.deleteTemplate(req.user.id, id) };
  }

  // POST /api/marketplace/templates/:id/use — 사용(보유 게이트). 유료 미보유는 402 + data.needPurchase.
  @Post(':id/use')
  @HttpCode(200) // 레거시 res.json=200
  async use(@Req() req: any, @Param('id') id: string) {
    try {
      const out = await this.marketplace.useTemplate(req.user.id, id);
      return { success: true, ...out };
    } catch (err: any) {
      // 402는 error 외에 data(needPurchase·price)를 함께 내려야 해서 공용 변환을 쓴다.
      if (err && err.statusCode) throw new HttpException(toErrorBody(err), err.statusCode);
      throw err;
    }
  }

  // POST /api/marketplace/templates/:id/acquire — 보유 획득(유료면 과금 + 크리에이터 70% 로열티)
  @Post(':id/acquire')
  @HttpCode(200)
  async acquire(@Req() req: any, @Param('id') id: string) {
    try {
      const out = await this.marketplace.acquireTemplate(req.user, id);
      return { success: true, ...out };
    } catch (err: any) {
      if (err && err.statusCode) throw new HttpException(toErrorBody(err), err.statusCode);
      throw err;
    }
  }

  // POST /api/marketplace/templates/:id/add-to-my-templates — 내 템플릿을 My templates에 추가(멱등)
  @Post(':id/add-to-my-templates')
  @HttpCode(200)
  async addToMine(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.marketplace.addToMyTemplates(req.user.id, id) };
  }

  // POST /api/marketplace/templates/:id/report — 신고(누적 시 자동 테이크다운)
  @Post(':id/report')
  @HttpCode(200)
  async report(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.marketplace.reportTemplate(req.user.id, id, (body || {}).reason) };
  }

  // POST /api/marketplace/templates/:id/bookmark — 저장(멱등)
  @Post(':id/bookmark')
  @HttpCode(200)
  async bookmark(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.marketplace.bookmarkTemplate(req.user.id, id) };
  }

  // DELETE /api/marketplace/templates/:id/bookmark — 저장 해제
  @Delete(':id/bookmark')
  async unbookmark(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.marketplace.unbookmarkTemplate(req.user.id, id) };
  }
}
