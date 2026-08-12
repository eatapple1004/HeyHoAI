/** 레시피 API 계약 — src/recipes/recipe.service.js */

/** 카드 메타(목록) — recipeStore.list() 결과 */
export interface RecipeCardDto {
  id: string;
  name: string;
  mode?: string;
  vertical?: string;
  [k: string]: unknown;
}

/** 해석 결과 — resolver 출력 + 스튜디오 편의 필드 */
export interface ResolvedRecipeDto {
  id: string;
  name: string;
  mode?: string;
  type: 'reel' | 'image';
  jobs?: Array<{ prompt: string; negativePrompt?: string; [k: string]: unknown }>;
  /** /api/generate 로 바로 보낼 수 있는 편의 필드(스타일은 이미 프롬프트에 반영돼 none) */
  generate: { prompt: string; negativePrompt: string; style: 'none'; count: number };
  [k: string]: unknown;
}

export class ResolveRecipeDto {
  /** 주면 그 캐릭터를 주어로(소유 검증), 없으면 미리보기용 일반 주어 */
  subjectId?: string;
  userSlots?: Record<string, unknown>;
}
export class ListRecipesQueryDto {
  mode?: string;
  vertical?: string;
}
