/**
 * 캐릭터 행(VO) — characters 테이블 스냅샷. snake_case 그대로 응답에 나간다.
 * persona는 Claude가 생성한 프로필 JSON(스키마는 character.validator.js 의 characterProfileSchema).
 */
export interface CharacterVo {
  readonly id: string;
  readonly name: string;
  readonly concept: string | null;
  readonly persona: CharacterPersonaVo;
  readonly status: CharacterStatus;
  readonly created_at: string;
  readonly updated_at: string;
  readonly reference_image_id: string | null;
  /** 대표 이미지 웹 경로(/images/...) — file:// 절대경로는 브라우저가 못 읽어 이 형태로 저장 */
  readonly reference_image_url: string | null;
  readonly user_id: string;
  readonly team_id: string | null;
}

export type CharacterStatus = 'active' | 'archived' | string;

/** 생성된 캐릭터 프로필 — register/register-with-image는 defaultPersona()로 채운다 */
export interface CharacterPersonaVo {
  readonly name: string;
  readonly age: number;
  readonly gender: string;
  readonly nationality: string;
  readonly occupation: string;
  readonly personality: string[];
  readonly backstory: string;
  readonly visualDescription: Record<string, string>;
  readonly instagramProfile: { username: string; bio: string };
  readonly voiceGuidelines: Record<string, string>;
  readonly brandSafety: Record<string, unknown>;
}
