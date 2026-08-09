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
import { StudioService } from './studio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResponse, ApiOk } from '../common/dto/api-response.dto';
import { StudioThemesDto, StudioThemeDto, DeletedThemeDto, ThemeItemResultDto, HiddenRecipeResultDto, HiddenThemeResultDto, GlobalThemeItemResultDto, CreateStudioThemeDto, UpdateStudioThemeDto, AddThemeItemDto, SetGlobalThemeItemDto } from './dto/studio.dto';

// /api/studio — 스튜디오 개인 큐레이션(테마 조직화). 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   400/403/404 도메인 에러는 서비스가 throw → LegacyErrorFilter가 레거시와 동일 형식으로 응답.
@Controller('api/studio')
@UseGuards(JwtAuthGuard)
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  // GET /api/studio/themes — 내 커스텀 테마(+멤버) + 숨긴 내장 레시피
  @Get('themes')
  async themes(@Req() req: any): Promise<ApiResponse<StudioThemesDto>> {
    return { success: true, data: await this.studio.getThemes(req.user.id) };
  }

  // POST /api/studio/themes { name, group } — 커스텀 테마 생성 (레거시도 201)
  @Post('themes')
  async createTheme(@Req() req: any, @Body() body: CreateStudioThemeDto): Promise<ApiResponse<StudioThemeDto>> {
    return { success: true, data: await this.studio.createTheme(req.user.id, body) };
  }

  // PATCH /api/studio/themes/:id { name?, sortOrder?, group? }
  @Patch('themes/:id')
  async updateTheme(@Req() req: any, @Param('id') id: string, @Body() body: UpdateStudioThemeDto): Promise<ApiResponse<StudioThemeDto>> {
    return { success: true, data: await this.studio.updateTheme(req.user.id, id, body) };
  }

  // DELETE /api/studio/themes/:id — 커스텀 테마 삭제(멤버십 CASCADE)
  @Delete('themes/:id')
  async deleteTheme(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<DeletedThemeDto>> {
    return { success: true, data: await this.studio.deleteTheme(req.user.id, id) };
  }

  // POST /api/studio/themes/:id/items { itemType, itemId } — 테마에 넣기(마켓 템플릿은 보유 검증)
  @Post('themes/:id/items')
  @HttpCode(200) // 레거시 res.json=200
  async addItem(@Req() req: any, @Param('id') id: string, @Body() body: AddThemeItemDto): Promise<ApiResponse<ThemeItemResultDto>> {
    return { success: true, data: await this.studio.addItem(req.user.id, id, body) };
  }

  // DELETE /api/studio/themes/:id/items/:itemType/:itemId — 테마에서 빼기
  @Delete('themes/:id/items/:itemType/:itemId')
  async removeItem(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: string,
  ) {
    await this.studio.removeItem(req.user.id, id, itemType, itemId);
    return { success: true };
  }

  // POST /api/studio/hidden/:recipeId — 기본 섹션에서 내장 레시피 숨김
  @Post('hidden/:recipeId')
  @HttpCode(200)
  async hideRecipe(@Req() req: any, @Param('recipeId') recipeId: string): Promise<ApiResponse<HiddenRecipeResultDto>> {
    return { success: true, data: await this.studio.hideRecipe(req.user.id, recipeId) };
  }

  // DELETE /api/studio/hidden/:recipeId — 다시 보이기
  @Delete('hidden/:recipeId')
  async unhideRecipe(@Req() req: any, @Param('recipeId') recipeId: string): Promise<ApiResponse<HiddenRecipeResultDto>> {
    return { success: true, data: await this.studio.unhideRecipe(req.user.id, recipeId) };
  }

  // POST /api/studio/global-themes/:slug/items { itemType, itemId, action } — 기본 테마 개인 오버라이드
  @Post('global-themes/:slug/items')
  @HttpCode(200)
  async setGlobalThemeItem(@Req() req: any, @Param('slug') slug: string, @Body() body: SetGlobalThemeItemDto): Promise<ApiResponse<GlobalThemeItemResultDto>> {
    return { success: true, data: await this.studio.setGlobalThemeItem(req.user.id, slug, body) };
  }

  // DELETE /api/studio/global-themes/:slug/items/:itemType/:itemId — 오버라이드 해제
  @Delete('global-themes/:slug/items/:itemType/:itemId')
  async removeGlobalThemeItem(
    @Req() req: any,
    @Param('slug') slug: string,
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: string,
  ) {
    await this.studio.removeGlobalThemeItem(req.user.id, slug, itemType, itemId);
    return { success: true };
  }

  // POST /api/studio/hidden-themes/:slug — 기본 테마 통째로 제거
  @Post('hidden-themes/:slug')
  @HttpCode(200)
  async hideTheme(@Req() req: any, @Param('slug') slug: string): Promise<ApiResponse<HiddenThemeResultDto>> {
    return { success: true, data: await this.studio.hideTheme(req.user.id, slug) };
  }

  // DELETE /api/studio/hidden-themes/:slug — 기본 테마 다시 보이기
  @Delete('hidden-themes/:slug')
  async unhideTheme(@Req() req: any, @Param('slug') slug: string): Promise<ApiResponse<HiddenThemeResultDto>> {
    return { success: true, data: await this.studio.unhideTheme(req.user.id, slug) };
  }
}
