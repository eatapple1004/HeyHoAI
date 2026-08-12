import { CharacterVo } from '../vo/character.vo';

/** 캐릭터 API 경계 계약 — src/characters/character.api.js */

/** 목록 — pagination은 응답 최상위 필드로 나간다(ApiPaginated) */
export interface CharacterListDto {
  data: CharacterVo[];
  pagination: { total: number; limit: number; offset: number };
}

// ── 요청 ──

/** POST /api/characters — Claude로 프로필 생성(zod createCharacterRequestSchema) */
export class CreateCharacterDto {
  concept!: string;
  tone?: string;
  topics?: string[];
}

/** POST /api/characters/register — 멀티파트(referenceImage) + 이름·컨셉 */
export class RegisterCharacterDto {
  name!: string;
  concept!: string;
}

/** POST /api/characters/register-with-image — 이미 생성된 이미지 파일명으로 등록 */
export class RegisterWithImageDto {
  name!: string;
  concept!: string;
  imageFilename!: string;
}

export class SetReferenceImageDto {
  imageId!: string;
}

export class ListCharactersQueryDto {
  status?: string;
  limit?: string;
  offset?: string;
}
