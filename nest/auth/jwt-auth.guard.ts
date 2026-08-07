import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as path from 'path';

// 레거시 JWT 인증 로직 재사용(쿠키 우선 / Bearer 폴백 → verifyToken).
//   dist/auth/jwt-auth.guard.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractToken } = require(path.join(__dirname, '..', '..', 'src', 'middleware', 'auth.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifyToken } = require(path.join(__dirname, '..', '..', 'src', 'auth', 'token.js'));

// Spring Security 필터 / @PreAuthorize에 대응하는 Nest Guard.
//   성공 시 req.user = { id, role } 세팅(레거시 requireAuth와 완전 동일). 실패 시 401 JSON.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = extractToken(req);
    const payload = token && verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
    }
    req.user = { id: payload.id, role: payload.role };
    return true;
  }
}
