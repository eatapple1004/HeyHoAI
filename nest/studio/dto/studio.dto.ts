import { CustomThemeVo, ThemeOverrideVo, CreationPreviewVo, MacroGroup, ThemeItemType, OverrideAction } from '../vo/studio-theme.vo';

/** 스튜디오 큐레이션 API 경계 계약 — src/studio/studioThemes.service.js */

/** GET /api/studio/themes — 화면 한 번 그리는 데 필요한 모든 개인 설정 */
export interface StudioThemesDto {
  customThemes: CustomThemeVo[];
  /** 기본 섹션에서 숨긴 내장 레시피 id */
  hiddenRecipes: string[];
  themeOverrides: ThemeOverrideVo[];
  /** 통째로 숨긴 기본 테마 슬러그 */
  hiddenThemes: string[];
  /** creation id → 미리보기 */
  creationPreviews: Record<string, CreationPreviewVo>;
}

/** 테마 생성/수정 결과 — 생성 시에만 items가 빈 배열로 함께 온다 */
export interface StudioThemeDto {
  id: string;
  name: string;
  sortOrder: number;
  group: MacroGroup;
  items?: never[];
}

export interface DeletedThemeDto { id: string; }

export interface ThemeItemResultDto {
  themeId: string;
  itemType: ThemeItemType;
  itemId: string;
}

export interface HiddenRecipeResultDto { recipeId: string; hidden: boolean; }
export interface HiddenThemeResultDto { themeSlug: string; hidden: boolean; }

/** 기본 테마 오버라이드 결과 — category는 미분류(Custom) 템플릿이 대분류로 승격됐을 때만 채워진다 */
export interface GlobalThemeItemResultDto {
  themeSlug: string;
  itemType: ThemeItemType;
  itemId: string;
  action: OverrideAction;
  category: string | null;
}

// ── 요청 ──
export class CreateStudioThemeDto {
  name!: string;
  group?: MacroGroup;
}
export class UpdateStudioThemeDto {
  name?: string;
  sortOrder?: number;
  group?: MacroGroup;
}
export class AddThemeItemDto {
  /** 미지정이면 'recipe'로 처리 */
  itemType?: ThemeItemType;
  itemId!: string;
}
export class SetGlobalThemeItemDto {
  itemType?: ThemeItemType;
  itemId!: string;
  /** 미지정이면 'add' */
  action?: OverrideAction;
}
