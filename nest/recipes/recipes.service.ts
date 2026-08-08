import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 레시피 조회/해석 재사용(중복 금지) — 시드 로드·resolver 호출은 레거시 recipe.service.js 단일소스.
//   dist/recipes/recipes.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'recipes', 'recipe.service.js'));

@Injectable()
export class RecipesService {
  // 생성 가능한 레시피 카드 메타 목록(mode/vertical 필터)
  list(mode?: string, vertical?: string) {
    return legacy.list({ mode, vertical });
  }

  // 카드 id → 생성 프롬프트(jobs)로 해석. 미존재 레시피/대상은 404 statusCode 에러를 throw.
  resolve(id: string, userId: string, body: any) {
    return legacy.resolve(id, userId, body || {});
  }
}
