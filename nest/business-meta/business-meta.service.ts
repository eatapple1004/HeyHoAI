import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { BusinessMetaRepository, MetaAccountVo } from './business-meta.repository';
import * as ig from './meta-ig.client';
import * as pub from './meta-publish.client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require(path.join(__dirname, '..', '..', 'src', 'lib', 'logger.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));
// 발행기는 스케줄러 단일소스를 그대로 쓴다 — BGM 합성·캐러셀 규칙·큐 상태 갱신이 이미 그 안에 있다.
//   따로 구현하면 같은 로직이 두 벌이 되고 한쪽만 고쳐진다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const scheduler = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'scheduler.js'));
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

  // ── 발행 ──

  /**
   * 미디어 URL 정규화.
   * 인스타는 **자기가 그 주소로 파일을 가지러 온다.** 그래서 상대경로(`/images/x.png`)를
   * 그대로 넘기면 조용히 실패한다 — 절대 https URL로 바꿔 준다.
   */
  private absolute(url: string): string {
    const u = String(url || '').trim();
    if (!u) throw new BadRequestException('미디어 URL이 비어 있습니다');
    if (/^https?:\/\//i.test(u)) return u;
    const base = String(env.PUBLIC_URL || '').replace(/\/$/, '');
    if (!base) throw new BadRequestException('PUBLIC_URL이 없어 상대경로를 절대 URL로 바꿀 수 없습니다');
    return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
  }

  /** 토큰 + 인스타 사용자 ID를 함께 꺼낸다(둘 다 있어야 발행이 가능하다). */
  private async credentials(id: string) {
    const account = await this.repo.findAccount(id);
    if (!account) throw new NotFoundException('계정을 찾을 수 없습니다');
    const token = await this.repo.findToken(id);
    if (!token) throw new BadRequestException('저장된 토큰이 없습니다 — 다시 연결해 주세요.');
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      throw new BadRequestException('토큰이 만료됐습니다 — 다시 연결해 주세요(만료된 토큰은 갱신할 수 없습니다).');
    }
    return { account, token };
  }

  async publish(id: string, body: {
    kind: pub.PublishKind; caption?: string; imageUrls?: string[]; videoUrl?: string; shareToFeed?: boolean;
  }): Promise<pub.PublishResult> {
    const { account, token } = await this.credentials(id);
    const kind = body.kind || 'image';
    if (!['image', 'carousel', 'reel', 'story'].includes(kind)) {
      throw new BadRequestException('kind는 image | carousel | reel | story 중 하나여야 합니다');
    }
    const imageUrls = (body.imageUrls || []).filter(Boolean).map((u) => this.absolute(u));
    const videoUrl = body.videoUrl ? this.absolute(body.videoUrl) : undefined;

    const r = await pub.publish({
      token: token.access_token,
      igUserId: account.account_id,
      authMode: token.auth_mode,
      kind, caption: body.caption, imageUrls, videoUrl, shareToFeed: body.shareToFeed,
    });
    log.info(`발행 완료 @${account.username} ${kind} → ${r.permalink || r.mediaId}`);
    return r;
  }

  /** 사업체에 붙일 수 있는 Meta 직결 계정 */
  unlinkedAccounts() {
    return this.repo.unlinkedAccounts();
  }

  /**
   * 큐 한 건 즉시 발행 — **Meta 직결 계정에만** 허용한다.
   * 이 화면은 직결 전용이라, Zernio 계정 건이 섞여 들어오면 조용히 중개로 나가버린다.
   * 그러면 "직결로 올렸다"는 확인이 무의미해지므로 여기서 막고 어디로 가야 하는지 알려준다.
   */
  async publishQueue(queueId: string): Promise<{ imagePostUrl: string | null; reelPostUrl: string | null }> {
    const acc = await this.repo.queueAccount(queueId);
    if (!acc) throw new NotFoundException('발행 건을 찾을 수 없습니다');
    if (acc.platform !== 'instagram_meta') {
      throw new BadRequestException(
        `이 발행 건은 Zernio 계정(@${acc.username})에 걸려 있습니다 — 사업체 관리(Zernio) 화면에서 발행하세요.`);
    }
    return scheduler.publishSingleItem(queueId);
  }

  /** 전환 계획 — 무엇이 옮겨지고 무엇이 왜 안 되는지 먼저 보여준다(누르기 전에 알아야 한다). */
  async migrationPlan() {
    const rows = await this.repo.migrationPlan();
    return {
      movable: rows.filter((r) => r.new_id),
      blocked: rows.filter((r) => !r.new_id).map((r) => ({
        ...r,
        reason: `@${r.old_username} 의 Meta 직결 연결이 없습니다 — 앱에 Instagram 테스터로 초대·수락한 뒤 [＋ 인스타 연결]로 그 계정을 붙여야 합니다.`,
      })),
    };
  }

  /** 옮길 수 있는 것만 옮긴다. 막힌 건은 건드리지 않고 사유를 그대로 돌려준다. */
  async migrate() {
    const plan = await this.migrationPlan();
    const moved: any[] = [];
    for (const r of plan.movable) {
      const counts = await this.repo.migrateOne(r.business_id, r.old_id, r.new_id as string);
      log.info(`전환 ${r.business_name}: @${r.old_username} Zernio → Meta (큐 ${counts.queue} · 원본 ${counts.media})`);
      moved.push({ business: r.business_name, username: r.old_username, ...counts });
    }
    return { moved, blocked: plan.blocked };
  }

  /**
   * Zernio 연결 전부 해제 — 옮길 수 있는 건 먼저 Meta로 옮기고, 나머지는 그냥 뗀다.
   * 순서가 중요하다: 떼고 나서 옮기려 하면 짝을 찾을 근거(business_id)가 이미 사라진다.
   */
  async detachLegacy() {
    const migrated = await this.migrate();          // 대체 가능한 것 먼저 이관
    const detached = await this.repo.detachLegacy(); // 남은 Zernio 연결 해제
    for (const d of detached) {
      log.warn(`Zernio 연결 해제 @${d.username} — 큐 ${d.queue_cnt}·원본 ${d.media_cnt}건은 계정에 남아 있습니다(사업체 화면에서는 안 보임)`);
    }
    return { moved: migrated.moved, detached };
  }

  async quota(id: string): Promise<{ used: number; cap: number | null }> {
    const { account, token } = await this.credentials(id);
    return pub.quota(account.account_id, token.access_token, token.auth_mode);
  }
}
