import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenService } from '../common/security/token.service';

/**
 * 페이지 가드용 예외 — API 가드(401 JSON)와 달리 **사람이 보는 화면**이라 응답이 다르다.
 * 실제 응답 생성은 `PageExceptionFilter`가 맡는다(가드가 res를 직접 쓰면
 * Nest가 이어서 예외 응답을 또 쓰려다 "headers already sent"로 터진다).
 */
export class PageRedirectException extends Error {
  constructor(readonly location: string) {
    super('page redirect');
  }
}
export class AdminPageForbiddenException extends Error {
  constructor() {
    super('admin only');
  }
}

/** 로그인 필요 페이지 — 미인증이면 원래 가려던 주소를 next=로 달고 /login으로 보낸다 */
@Injectable()
export class PageGuard implements CanActivate {
  constructor(protected readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const payload = this.verify(req);
    if (!payload) throw new PageRedirectException(`/login?next=${encodeURIComponent(req.originalUrl)}`);
    req.user = payload;
    return true;
  }

  protected verify(req: any) {
    const token = this.tokens.extract(req);
    return token ? this.tokens.verify(token) : null;
  }
}

/** 관리자 전용 페이지 — 비로그인은 /login, 로그인했지만 일반 사용자면 403 안내 화면 */
@Injectable()
export class AdminPageGuard extends PageGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const payload: any = this.verify(req);
    if (!payload) throw new PageRedirectException(`/login?next=${encodeURIComponent(req.originalUrl)}`);
    if (payload.role !== 'admin') throw new AdminPageForbiddenException();
    req.user = payload;
    return true;
  }
}
