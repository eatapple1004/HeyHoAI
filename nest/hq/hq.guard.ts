import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../common/security/token.service';
import { AdminPageForbiddenException, PageRedirectException } from '../pages/page-auth.guard';
import { HqAccessService } from './hq-access.service';

/**
 * HQ 입구 — 둘 중 하나면 통과한다.
 *   ① 도피아 관리자 로그인(= AdminGuard 와 같은 판정)
 *   ② Cloudflare Access 메일 인증(HqAccessService) — 도피아 계정 없이 HQ 만 보는 사람
 * 통과하면 req.hqActor = { id?, email? } 를 남긴다. 서비스는 이걸로 기록의 '누가'를 적는다.
 */
export interface HqActor { id?: string; email?: string }

async function resolve(req: any, tokens: TokenService, access: HqAccessService): Promise<{ actor: HqActor | null; loggedInNonAdmin: boolean }> {
  const token = tokens.extract(req);
  const payload = token && tokens.verify(token);
  if (payload && payload.role === 'admin') return { actor: { id: payload.id }, loggedInNonAdmin: false };
  const email = await access.emailFrom(req);
  if (email) return { actor: { email }, loggedInNonAdmin: false };
  return { actor: null, loggedInNonAdmin: !!payload };
}

/** API — 실패하면 AdminGuard 와 같은 형식(401 / 403) */
@Injectable()
export class HqGuard implements CanActivate {
  constructor(private readonly tokens: TokenService, private readonly access: HqAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { actor, loggedInNonAdmin } = await resolve(req, this.tokens, this.access);
    if (actor) { req.hqActor = actor; return true; }
    if (loggedInNonAdmin) throw new ForbiddenException({ success: false, error: 'Forbidden — admin only' });
    throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
  }
}

/** 화면 — 실패하면 AdminPageGuard 와 같은 응답(비로그인 /login, 일반 사용자 403 안내) */
@Injectable()
export class HqPageGuard implements CanActivate {
  constructor(private readonly tokens: TokenService, private readonly access: HqAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { actor, loggedInNonAdmin } = await resolve(req, this.tokens, this.access);
    if (actor) { req.hqActor = actor; return true; }
    if (loggedInNonAdmin) throw new AdminPageForbiddenException();
    throw new PageRedirectException(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
}
