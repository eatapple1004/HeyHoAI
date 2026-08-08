import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { MarketplaceCreatorsService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/marketplace — 템플릿 서브트리를 뺀 나머지(테마 목록·크리에이터·정산·라이브러리).
//   전 엔드포인트 인증 필요(= 레거시 requireAuth). 400/404는 서비스가 throw → LegacyErrorFilter.
//   ⚠️ /templates/** 는 MarketplaceController가 소유(더 구체적인 경로가 별도 컨트롤러).
@Controller('api/marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceCreatorsController {
  constructor(private readonly marketplace: MarketplaceCreatorsService) {}

  // GET /api/marketplace/themes — 글로벌 테마 목록
  @Get('themes')
  async themes() {
    return { success: true, data: await this.marketplace.listThemes() };
  }

  // GET /api/marketplace/me — 크리에이터 상태 + 내 템플릿 + 오피셜
  @Get('me')
  async me(@Req() req: any) {
    return { success: true, data: await this.marketplace.getMe(req.user.id) };
  }

  // GET /api/marketplace/earnings — 정산 대시보드
  @Get('earnings')
  async earnings(@Req() req: any) {
    return { success: true, data: await this.marketplace.getEarnings(req.user) };
  }

  // POST /api/marketplace/apply — 크리에이터 신청(즉시 승인)
  @Post('apply')
  @HttpCode(200) // 레거시 res.json=200
  async apply(@Req() req: any) {
    return { success: true, data: await this.marketplace.applyCreator(req.user.id) };
  }

  // GET /api/marketplace/creators/:handle — 공개 스토어프론트
  @Get('creators/:handle')
  async creator(@Req() req: any, @Param('handle') handle: string) {
    return { success: true, data: await this.marketplace.getCreator(req.user.id, handle) };
  }

  // POST /api/marketplace/creators/:handle/follow — 팔로우(멱등)
  @Post('creators/:handle/follow')
  @HttpCode(200)
  async follow(@Req() req: any, @Param('handle') handle: string) {
    return { success: true, data: await this.marketplace.followCreator(req.user.id, handle) };
  }

  // DELETE /api/marketplace/creators/:handle/follow — 언팔로우(멱등)
  @Delete('creators/:handle/follow')
  async unfollow(@Req() req: any, @Param('handle') handle: string) {
    return { success: true, data: await this.marketplace.unfollowCreator(req.user.id, handle) };
  }

  // GET /api/marketplace/bookmarks — 저장한 템플릿(Library Saved)
  @Get('bookmarks')
  async bookmarks(@Req() req: any) {
    return { success: true, data: await this.marketplace.listBookmarks(req.user.id) };
  }

  // GET /api/marketplace/recipe-gates — recipe-backed 유료 게이트
  @Get('recipe-gates')
  async recipeGates(@Req() req: any) {
    return { success: true, data: await this.marketplace.listRecipeGates(req.user.id) };
  }

  // GET /api/marketplace/owned — 보유 템플릿 전부(Library My templates 정본)
  @Get('owned')
  async owned(@Req() req: any) {
    return { success: true, data: await this.marketplace.listOwned(req.user.id) };
  }

  // PATCH /api/marketplace/owned/in-studio { ids, in_studio }
  @Patch('owned/in-studio')
  async ownedInStudio(@Req() req: any, @Body() body: any) {
    return { success: true, data: await this.marketplace.setOwnedInStudio(req.user.id, body) };
  }

  // GET /api/marketplace/default-officials — 기본공개(무료) 공식 템플릿
  @Get('default-officials')
  async defaultOfficials(@Req() req: any) {
    return { success: true, data: await this.marketplace.listDefaultOfficials(req.user.id) };
  }
}
