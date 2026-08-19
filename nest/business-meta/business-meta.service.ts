import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { BusinessMetaRepository, MetaAccountVo } from './business-meta.repository';
import * as ig from './meta-ig.client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require(path.join(__dirname, '..', '..', 'src', 'lib', 'logger.js'));
const log = logger('BusinessMeta');

/** OAuth state를 담는 쿠키 — CSRF 방지. 기존 구글 로그인(src/auth/google.js)과 같은 방식. */
export const STATE_COOKIE = 'ig_oauth_state';

/**
 * 토큰 갱신 여유. Meta는 **만료된 토큰을 갱신해 주지 않으므로** 임박해서 돌리면
 * 하루 장애가 곧 재연결 요구가 된다. 7일 전부터 매일 시도해 6번의 기회를 만든다.
 */
const REFRESH_BEFORE_DAYS = 7;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BusinessMetaService implements OnModuleInit {
  constructor(private readonly repo: BusinessMetaRepository) {}

  /** 하루 한 번 만료 임박 토큰을 갱신한다. 없으면 두 달 뒤 게시가 **에러 없이** 멈춘다. */
  onModuleInit(): void {
    if (!ig.isConfigured()) return;
    setInterval(() => { this.refreshExpiring().catch((e) => log.error('토큰 갱신 루프 실패:', e.message)); },
      REFRESH_INTERVAL_MS).unref();
  }

  config() {
    return {
      configured: ig.isConfigured(),
      redirectUri: ig.redirectUri(),
      scopes: ig.SCOPES.split(','),
    };
  }

  accounts(): Promise<MetaAccountVo[]> {
    return this.repo.listAccounts();
  }

  /**
   * 동의 화면 URL + state.
   * `expect`(기대 핸들)를 state에 실어 보낸다 — 브라우저에 로그인돼 있던 계정이 그대로 붙어
   * 엉뚱한 계정이 조용히 등록되는 사고가 실제로 있었다(ADAM HQ 기록). 콜백에서 대조한다.
   */
  startUrl(expect: string | undefined, req: any): { url: string; state: string } {
    if (!ig.isConfigured()) {
      throw new BadRequestException('INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET 이 설정되지 않았습니다.');
    }
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = expect ? `${nonce}.${Buffer.from(expect).toString('base64url')}` : nonce;
    return { url: ig.authorizeUrl(state, req), state };
  }

  /**
   * 콜백 처리 — 코드 교환 → 장기 토큰 → 프로필 → 저장.
   * 반환값은 화면에 보여줄 결과만 담는다(토큰 없음).
   */
  async handleCallback(userId: string, code: string, state: string, cookieState: string | undefined, req: any): Promise<{
    username: string; accountId: string; mismatch: string | null;
  }> {
    if (!cookieState || !state || state !== cookieState) {
      throw new BadRequestException('OAuth state가 일치하지 않습니다 — 다시 시도해 주세요.');
    }
    const short = await ig.exchangeCode(code, req);
    const long = await ig.exchangeLongLived(short.accessToken);
    const profile = await ig.me(long.accessToken);

    // 기대 핸들과 다르면 저장은 하되 화면에서 경고한다 — 조용히 넘어가면 나중에 엉뚱한 계정에 게시된다.
    const expectB64 = state.includes('.') ? state.split('.')[1] : '';
    const expected = expectB64 ? Buffer.from(expectB64, 'base64url').toString('utf8') : '';
    const mismatch = expected && expected.replace(/^@/, '').toLowerCase() !== profile.username.toLowerCase()
      ? expected : null;

    const account = await this.repo.upsertAccount({
      userId,
      accountId: profile.id,
      username: profile.username,
      displayName: profile.username,
      profileImage: profile.profilePictureUrl,
      followers: profile.followersCount || 0,
      metadata: { source: 'meta_direct', accountType: profile.accountType || null, igUserId: profile.id },
    });
    await this.repo.saveToken(account.id, {
      authMode: 'instagram',
      accessToken: long.accessToken,
      scope: short.permissions || ig.SCOPES,
      expiresIn: long.expiresIn,
    });

    log.info(`연결 완료: @${profile.username} (만료 ${long.expiresIn ? Math.round(long.expiresIn / 86400) : '?'}일 뒤)`);
    return { username: profile.username, accountId: account.id, mismatch };
  }

  async refreshOne(id: string): Promise<MetaAccountVo> {
    const account = await this.repo.findAccount(id);
    if (!account) throw new NotFoundException('계정을 찾을 수 없습니다');
    const token = await this.repo.findToken(id);
    if (!token) throw new BadRequestException('저장된 토큰이 없습니다 — 다시 연결해 주세요.');

    const next = await ig.refreshLongLived(token.access_token);
    await this.repo.saveToken(id, {
      authMode: token.auth_mode, accessToken: next.accessToken, scope: null, expiresIn: next.expiresIn,
    });
    return (await this.repo.findAccount(id)) as MetaAccountVo;
  }

  /** 만료 임박분 일괄 갱신. 한 건이 실패해도 나머지는 계속한다. */
  async refreshExpiring(): Promise<{ tried: number; ok: number }> {
    const targets = await this.repo.tokensExpiringWithin(REFRESH_BEFORE_DAYS);
    let ok = 0;
    for (const t of targets) {
      try { await this.refreshOne(t.account_id); ok += 1; }
      catch (e: any) { log.error(`토큰 갱신 실패 @${t.username}: ${e.message}`); }
    }
    if (targets.length) log.info(`토큰 갱신 ${ok}/${targets.length}`);
    return { tried: targets.length, ok };
  }

  async disconnect(id: string): Promise<void> {
    if (!(await this.repo.findAccount(id))) throw new NotFoundException('계정을 찾을 수 없습니다');
    await this.repo.disconnect(id);
  }
}
