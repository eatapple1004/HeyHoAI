import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { TrialRepository, TrialRowVo } from './trial.repository';
import { PasswordService } from '../auth/password.service';
import { CreditsService } from '../credits/credits.service';
import { TrialAccountDto, TrialStatusDto, TrialPatchResultDto, CreateTrialDto, PatchTrialDto } from './dto/trial.dto';

/**
 * 체험 계정 — 회사별 전용 계정. **첫 로그인 시점부터** N일 + 지급 토큰(◈) 한도.
 *
 * ⚠️ 순수 토큰 기반(2026-07-31): 사용 한도는 크레딧 잔액이 담당한다(0이면 생성 시 402).
 *    과거 '사진 장수' 게이팅은 폐지됐고, `trial_image_quota` 컬럼은 이제 **발급액 표시용**으로 재활용된다.
 */

const DEFAULT_CREDITS = 1500;
const MAX_CREDITS = 10_000_000;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 365;
const DAY_MS = 86_400_000;

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}
function clamp(v: unknown, min: number, max: number, fallback: number): number {
  return Math.max(min, Math.min(parseInt(String(v), 10) || fallback, max));
}

@Injectable()
export class TrialService {
  constructor(
    private readonly repo: TrialRepository,
    private readonly passwords: PasswordService,
    private readonly credits: CreditsService,
  ) {}

  /** 헷갈리는 글자(0/O/1/l/I) 제외 — 담당자가 전화로 불러줘야 하는 비밀번호다 */
  private genPassword(len = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const buf = crypto.randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i++) out += chars[buf[i] % chars.length];
    return out;
  }

  /** 회사명 → 충돌 없는 체험 이메일. 50번 안에 못 찾으면 타임스탬프로 확정. */
  private async uniqueEmail(base: string): Promise<string> {
    const slug = String(base || 'trial').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'trial';
    for (let n = 0; n < 50; n++) {
      const email = `${slug}${n === 0 ? '' : n}@trial.doppia.ai`;
      if (!(await this.repo.emailExists(email))) return email;
    }
    return `${slug}-${Date.now()}@trial.doppia.ai`;
  }

  /** 관리자: 체험 계정 발급. 평문 비밀번호는 **이 응답에서만 1회** 노출된다(저장은 해시만). */
  async createTrialAccount(body: CreateTrialDto = {} as CreateTrialDto): Promise<TrialAccountDto> {
    const { companyName, email, password, days } = body;
    const rawCredits = body.credits != null ? body.credits : (body as any).quota;  // quota=구버전 클라 호환
    const company = String(companyName || '').trim();
    if (!company) throw httpError(400, '회사명을 입력하세요.');
    const c = clamp(rawCredits, 1, MAX_CREDITS, DEFAULT_CREDITS);
    const d = clamp(days, 1, MAX_DAYS, DEFAULT_DAYS);

    const mail = (email && String(email).trim().toLowerCase()) || (await this.uniqueEmail(company));
    if (await this.repo.emailExists(mail)) throw httpError(409, '이미 존재하는 이메일입니다.');
    const pw = (password && String(password)) || this.genPassword();

    const row = await this.repo.insertTrialUser({
      email: mail, passwordHash: this.passwords.hash(pw), company, days: d, credits: c,
    });
    // 토큰 지급은 원장(ledger)을 거쳐야 이후 정산·환불이 맞는다.
    await this.credits.addCredits(row.id, c, {
      type: 'trial_grant', description: `체험 계정 발급 지급 ◈${c}`,
    });
    return { id: row.id, email: mail, password: pw, companyName: company, credits: c, days: d };
  }

  /** 첫 로그인 훅 — 카운트다운 시작점 기록(이미 시작했으면 무변경) */
  startTrialIfNeeded(userId: string): Promise<void> {
    return this.repo.startTrialIfNeeded(userId);
  }

  /** 본인 체험 상태(스튜디오 배너용). 비-체험이면 null. */
  async getStatus(userId: string): Promise<TrialStatusDto> {
    const u = await this.repo.findStatusRow(userId);
    if (!u || !u.is_trial) return null as any;
    const { started, expired, daysLeft } = this.period(u);
    const granted = u.trial_image_quota;   // 발급 토큰(표시용)
    const balance = u.credit_balance;      // 남은 토큰
    return {
      isTrial: true, companyName: u.company_name,
      started, expired, daysLeft,
      quota: granted, balance,
      used: Math.max(0, granted - balance),
      remaining: Math.max(0, balance),
      expiresAt: u.expires_at,
    } as TrialStatusDto;
  }

  /** 관리자: 전체 체험 계정 + 상태 */
  async listTrials(): Promise<unknown[]> {
    const rows = await this.repo.listTrialRows();
    return rows.map((u) => {
      const { started, expired, daysLeft } = this.period(u);
      const granted = u.trial_image_quota;
      const balance = u.credit_balance;
      return {
        id: u.id, email: u.email, companyName: u.company_name, status: u.status,
        createdAt: u.created_at, startedAt: u.trial_started_at, started, expired,
        days: u.trial_days, daysLeft,
        quota: granted, balance,
        used: Math.max(0, granted - balance),
        remaining: Math.max(0, balance),
      };
    });
  }

  /** 관리자: 토큰 추가 지급 / 기간 변경 / 활성 토글 — **전달된 필드만** 적용 */
  async patchTrial(id: string, body: PatchTrialDto = {}): Promise<TrialPatchResultDto> {
    const out: any = { id };
    if (body.addCredits != null) out.credits = await this.grantCredits(id, body.addCredits);
    if (body.days != null) out.days = await this.setDays(id, body.days);
    if (body.status != null) out.status = await this.setStatus(id, body.status);
    return out;
  }

  private async grantCredits(userId: string, amount: unknown) {
    const amt = clamp(amount, 1, MAX_CREDITS, 0);
    if (!(await this.repo.isTrial(userId))) throw httpError(404, '체험 계정이 아닙니다.');
    await this.credits.addCredits(userId, amt, {
      type: 'trial_grant', description: `체험 계정 토큰 추가 지급 ◈${amt}`,
    });
    const r = await this.repo.addGrantedQuota(userId, amt);
    return { balance: r.credit_balance, granted: r.trial_image_quota, added: amt };
  }

  private async setDays(userId: string, days: unknown): Promise<number> {
    const d = clamp(days, 1, MAX_DAYS, DEFAULT_DAYS);
    await this.repo.setDays(userId, d);
    return d;
  }

  /** 화이트리스트 — 임의 status 문자열이 users.status에 들어가지 않게 한다 */
  private async setStatus(userId: string, status: unknown): Promise<string> {
    const s = status === 'disabled' ? 'disabled' : 'active';
    await this.repo.setStatus(userId, s);
    return s;
  }

  /** 시작 여부·만료·남은 일수 — 기준 시각은 DB의 now() */
  private period(u: TrialRowVo) {
    const started = !!u.trial_started_at;
    const nowMs = new Date(u.now).getTime();
    const expMs = u.expires_at ? new Date(u.expires_at).getTime() : 0;
    const expired = started && nowMs > expMs;
    const daysLeft = started ? Math.max(0, Math.ceil((expMs - nowMs) / DAY_MS)) : u.trial_days;
    return { started, expired, daysLeft };
  }
}
