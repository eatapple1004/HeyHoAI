import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { UserVo } from './vo/user.vo';
import { SignupDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import { UserRepository } from './user.repository';
import { PasswordService } from './password.service';
import { CreditsService } from '../credits/credits.service';
import { AffiliateService } from '../affiliate/affiliate.service';
import { TrialService } from '../trial/trial.service';

// Google OAuth 핸들러는 리다이렉트·토큰 교환 전용 Express 핸들러라 그대로 재사용한다(로직 이중화 금지).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const google = require(path.join(__dirname, '..', '..', 'src', 'auth', 'google.js'));

export const googleHandlers = google;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

@Injectable()
export class AuthApiService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly credits: CreditsService,
    private readonly affiliate: AffiliateService,
    private readonly trial: TrialService,
  ) {}

  /**
   * 회원가입. 추천(ref) 쿠키가 있으면 추천 관계를 잇는다.
   * 보너스 지급·추천 연결은 **실패해도 가입은 성공**시킨다(부수 효과 때문에 계정이 안 만들어지면 안 된다).
   * @returns refLinked=true면 컨트롤러가 ref 쿠키를 지운다(중복 연결 방지).
   */
  async signup(body: SignupDto, refCode?: string): Promise<{ user: UserVo; refLinked: boolean }> {
    const { email, password, displayName } = body || ({} as SignupDto);
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !EMAIL_RE.test(normalized)) throw httpError(400, '유효한 이메일을 입력하세요.');
    if (!password || String(password).length < 8) throw httpError(400, '비밀번호는 8자 이상이어야 합니다.');
    if (await this.users.findByEmail(normalized)) throw httpError(409, '이미 가입된 이메일입니다.');

    const user = await this.users.insert({
      email: normalized,
      passwordHash: this.passwords.hash(password),
      displayName: displayName ? String(displayName).trim() : null,
      role: 'user',
    });
    await this.credits.grantSignupBonus(user.id).catch(() => {});

    let refLinked = false;
    if (refCode) {
      await this.affiliate.linkReferral(refCode, user.id).catch(() => {});
      refLinked = true;
    }
    return { user, refLinked };
  }

  /**
   * 로그인. 이메일 없음/비밀번호 불일치를 **같은 401 문구**로 묶는다(계정 존재 여부를 흘리지 않는다).
   * 체험 계정은 첫 로그인 시점부터 기간 카운트를 시작한다.
   */
  async login(body: LoginDto): Promise<UserVo> {
    const { email, password } = body || ({} as LoginDto);
    const user = await this.users.findByEmail(String(email || '').trim().toLowerCase());
    if (!user || !this.passwords.verify(password, user.password_hash as string)) {
      throw httpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    if (user.status !== 'active') throw httpError(403, '비활성화된 계정입니다.');

    await this.trial.startTrialIfNeeded(user.id);
    const { password_hash, ...safe } = user as any;   // 해시는 절대 응답에 싣지 않는다
    return safe as UserVo;
  }

  /** 현재 사용자 — 토큰은 유효한데 계정이 사라졌으면(탈퇴 등) 401 */
  async me(userId: string): Promise<UserVo> {
    const user = await this.users.findById(userId);
    if (!user) throw httpError(401, 'Unauthorized');
    return user;
  }

  async updateProfile(userId: string, body: UpdateProfileDto): Promise<UserVo> {
    const displayName = String((body || ({} as UpdateProfileDto)).displayName || '').trim();
    if (!displayName) throw httpError(400, 'Display name cannot be empty.');
    if (displayName.length > 50) throw httpError(400, 'Display name is too long (max 50).');
    const user = await this.users.updateDisplayName(userId, displayName);
    if (!user) throw httpError(404, 'Account not found.');
    return user;
  }

  /** 탈퇴(소프트 삭제) — 쿠키 제거는 컨트롤러가 한다 */
  deleteAccount(userId: string): Promise<void> {
    return this.users.softDelete(userId);
  }
}
