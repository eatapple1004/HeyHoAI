import { Injectable } from '@nestjs/common';
import { StudioThemesDto, StudioThemeDto, DeletedThemeDto, ThemeItemResultDto, HiddenRecipeResultDto, HiddenThemeResultDto, GlobalThemeItemResultDto, CreateStudioThemeDto, UpdateStudioThemeDto, AddThemeItemDto, SetGlobalThemeItemDto } from './dto/studio.dto';
import * as path from 'path';

// 스튜디오 테마 큐레이션 로직 재사용(중복 금지) — SQL·보유검증·오버라이드는 레거시 studioThemes.service.js 단일소스.
//   dist/studio/studio.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'studio', 'studioThemes.service.js'));

@Injectable()
export class StudioService {
  // 커스텀 테마(+멤버)·숨긴 내장 레시피·오버라이드·creation 미리보기
  getThemes(userId: string): Promise<StudioThemesDto> {
    return legacy.getThemes(userId);
  }

  createTheme(userId: string, body: CreateStudioThemeDto): Promise<StudioThemeDto> {
    return legacy.createTheme(userId, body || {});
  }

  updateTheme(userId: string, themeId: string, body: UpdateStudioThemeDto): Promise<StudioThemeDto> {
    return legacy.updateTheme(userId, themeId, body || {});
  }

  deleteTheme(userId: string, themeId: string): Promise<DeletedThemeDto> {
    return legacy.deleteTheme(userId, themeId);
  }

  addItem(userId: string, themeId: string, body: AddThemeItemDto): Promise<ThemeItemResultDto> {
    return legacy.addItem(userId, themeId, body || {});
  }

  removeItem(userId: string, themeId: string, itemType: string, itemId: string): Promise<void> {
    return legacy.removeItem(userId, themeId, itemType, itemId);
  }

  hideRecipe(userId: string, recipeId: string): Promise<HiddenRecipeResultDto> {
    return legacy.hideRecipe(userId, recipeId);
  }

  unhideRecipe(userId: string, recipeId: string): Promise<HiddenRecipeResultDto> {
    return legacy.unhideRecipe(userId, recipeId);
  }

  setGlobalThemeItem(userId: string, slug: string, body: SetGlobalThemeItemDto): Promise<GlobalThemeItemResultDto> {
    return legacy.setGlobalThemeItem(userId, slug, body || {});
  }

  removeGlobalThemeItem(userId: string, slug: string, itemType: string, itemId: string): Promise<void> {
    return legacy.removeGlobalThemeItem(userId, slug, itemType, itemId);
  }

  hideTheme(userId: string, slug: string): Promise<HiddenThemeResultDto> {
    return legacy.hideTheme(userId, slug);
  }

  unhideTheme(userId: string, slug: string): Promise<HiddenThemeResultDto> {
    return legacy.unhideTheme(userId, slug);
  }
}
