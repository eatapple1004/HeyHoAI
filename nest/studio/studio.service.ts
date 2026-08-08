import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 스튜디오 테마 큐레이션 로직 재사용(중복 금지) — SQL·보유검증·오버라이드는 레거시 studioThemes.service.js 단일소스.
//   dist/studio/studio.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'studio', 'studioThemes.service.js'));

@Injectable()
export class StudioService {
  // 커스텀 테마(+멤버)·숨긴 내장 레시피·오버라이드·creation 미리보기
  getThemes(userId: string) {
    return legacy.getThemes(userId);
  }

  createTheme(userId: string, body: any) {
    return legacy.createTheme(userId, body || {});
  }

  updateTheme(userId: string, themeId: string, body: any) {
    return legacy.updateTheme(userId, themeId, body || {});
  }

  deleteTheme(userId: string, themeId: string) {
    return legacy.deleteTheme(userId, themeId);
  }

  addItem(userId: string, themeId: string, body: any) {
    return legacy.addItem(userId, themeId, body || {});
  }

  removeItem(userId: string, themeId: string, itemType: string, itemId: string) {
    return legacy.removeItem(userId, themeId, itemType, itemId);
  }

  hideRecipe(userId: string, recipeId: string) {
    return legacy.hideRecipe(userId, recipeId);
  }

  unhideRecipe(userId: string, recipeId: string) {
    return legacy.unhideRecipe(userId, recipeId);
  }

  setGlobalThemeItem(userId: string, slug: string, body: any) {
    return legacy.setGlobalThemeItem(userId, slug, body || {});
  }

  removeGlobalThemeItem(userId: string, slug: string, itemType: string, itemId: string) {
    return legacy.removeGlobalThemeItem(userId, slug, itemType, itemId);
  }

  hideTheme(userId: string, slug: string) {
    return legacy.hideTheme(userId, slug);
  }

  unhideTheme(userId: string, slug: string) {
    return legacy.unhideTheme(userId, slug);
  }
}
