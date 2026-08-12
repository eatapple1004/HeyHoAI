/**
 * 스튜디오 개인 큐레이션 행(VO) — user_studio_themes / user_studio_theme_items /
 * user_theme_overrides / user_hidden_* (설계 = docs/테마_조직화_설계_2026-06-24.md).
 */

/** 커스텀 테마가 속한 대분류 — "Your themes" 중립 버킷은 폐지됨 */
export type MacroGroup = 'Influencer' | 'Shopping';
/** 테마에 넣을 수 있는 것 — 내장 레시피 · 마켓 템플릿 · 저장 룩(creation) */
export type ThemeItemType = 'recipe' | 'template' | 'creation';
export type OverrideAction = 'add' | 'remove';

/** 테마 멤버 한 건 */
export interface ThemeItemVo {
  readonly itemType: ThemeItemType;
  readonly itemId: string;
}

/** 커스텀 테마(+멤버) */
export interface CustomThemeVo {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly group: MacroGroup;
  readonly items: ThemeItemVo[];
}

/** 기본(글로벌) 테마 개인 오버라이드 */
export interface ThemeOverrideVo {
  readonly themeSlug: string;
  readonly itemType: ThemeItemType;
  readonly itemId: string;
  readonly action: OverrideAction;
}

/** 테마에 넣은 creation의 미리보기(비공개·삭제분은 자동 제외되어 map에 없다) */
export interface CreationPreviewVo {
  readonly url: string | null;
  readonly type: 'video' | 'image';
  readonly creatorHandle: string | null;
}
