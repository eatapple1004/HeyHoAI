/** 인증 API 계약 — src/auth/auth.api.js */
export class SignupDto {
  email!: string;
  password!: string;
  displayName?: string;
}
export class LoginDto {
  email!: string;
  password!: string;
}
export class UpdateProfileDto {
  /** 1~50자 */
  displayName!: string;
}
