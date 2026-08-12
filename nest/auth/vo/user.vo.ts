/**
 * 사용자 행(VO) — users 테이블. ⚠️ 응답에 그대로 나가는 컬럼만 담는다(password_hash 제외).
 * findById는 축약 컬럼셋만 SELECT한다(user.repository.js).
 */
export interface UserVo {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly created_at: string;
}

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'deleted' | string;
