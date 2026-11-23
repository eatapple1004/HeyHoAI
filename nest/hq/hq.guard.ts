import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../common/security/token.service';
import { AdminPageForbiddenException, PageRedirectException } from '../pages/page-auth.guard';
import { HqAccessService } from './hq-access.service';
import { HqRepository } from './hq.repository';

/**
 * HQ 입구 — **허용 메일 목록(HQ_ACCESS_EMAILS)에 있는 사람만** 들어온다. 도피아 관리자라도 목록에 없으면 막는다.
 *   들어오는 길은 둘: ① 도피아 로그인(그 계정 메일이 목록에 있을 때) ② Cloudflare Access 메일 인증(HqAccessService)
 *   목록이 비어 있으면 아무도 못 들어온다(fail closed).
 * 통과하면 req.hqActor = { id?, email } 를 남긴다. 서비스는 이걸로 기록의 '누가'를 적는다.
 */
export interface HqActor { id?: string; email?: string; service?: string }

/** 기계(서비스 토큰)가 갈 수 있는 길 — 카드 넣기·금고 공개 열쇠 읽기·기록 한 줄. 승인·공개·삭제·편집은 못 한다 */
const SERVICE_ROUTES = new Set(['POST /api/admin/hq/ledger/bulk', 'GET /api/admin/hq/vault/public', 'POST /api/admin/hq/log']);
const routeOf = (req: any) => `${req.method} ${String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '')}`;

/** 계정 id → 메일. 요청마다 users 를 다시 읽지 않게 5분 동안 기억한다(메일이 바뀌어도 5분 뒤엔 반영) */
const EMAIL_TTL_MS = 5 * 60_000;
const emailCache = new Map<string, { at: number; email: string | null }>();
async function emailOf(repo: HqRepository, id: string): Promise<string | null> {
  const hit = emailCache.get(id);
  if (hit && Date.now() - hit.at < EMAIL_TTL_MS) return hit.email;
  const email = await repo.emailOf(id);
  emailCache.set(id, { at: Date.now(), email });
  return email;
}

async function resolve(req: any, tokens: TokenService, access: HqAccessService, repo: HqRepository): Promise<{ actor: HqActor | null; loggedIn: boolean }> {
  const token = tokens.extract(req);
  const payload = token && tokens.verify(token);
  if (payload) {
    const email = await emailOf(repo, payload.id);
    if (access.allowed(email)) return { actor: { id: payload.id, email: String(email).toLowerCase() }, loggedIn: true };
  }
  const email = await access.emailFrom(req);
  if (email) return { actor: { email }, loggedIn: !!payload };
  const service = await access.serviceFrom(req);
  if (service) return { actor: { service }, loggedIn: false };
  return { actor: null, loggedIn: !!payload };
}

/** API — 실패하면 AdminGuard 와 같은 형식(비로그인 401 / 로그인했지만 목록 밖 403) */
@Injectable()
export class HqGuard implements CanActivate {
  constructor(private readonly tokens: TokenService, private readonly access: HqAccessService, private readonly repo: HqRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { actor, loggedIn } = await resolve(req, this.tokens, this.access, this.repo);
    if (actor && actor.service && !SERVICE_ROUTES.has(routeOf(req))) throw new ForbiddenException({ success: false, error: 'Forbidden — 기계 열쇠로는 갈 수 없는 길입니다' });
    if (actor) { req.hqActor = actor; return true; }
    if (loggedIn) throw new ForbiddenException({ success: false, error: 'Forbidden — HQ 허용 목록에 없는 계정입니다' });
    throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
  }
}

/** 화면 — 실패하면 AdminPageGuard 와 같은 응답(비로그인 /login, 로그인했지만 목록 밖 403 안내) */
@Injectable()
export class HqPageGuard implements CanActivate {
  constructor(private readonly tokens: TokenService, private readonly access: HqAccessService, private readonly repo: HqRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { actor, loggedIn } = await resolve(req, this.tokens, this.access, this.repo);
    if (actor && !actor.service) { req.hqActor = actor; return true; }
    if (loggedIn) throw new AdminPageForbiddenException();
    throw new PageRedirectException(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
}
