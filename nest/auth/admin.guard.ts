import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as path from 'path';

// 레거시 requireAdmin과 동일 — 인증 실패 401 / 비관리자 403.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractToken } = require(path.join(__dirname, '..', '..', 'src', 'middleware', 'auth.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifyToken } = require(path.join(__dirname, '..', '..', 'src', 'auth', 'token.js'));

/** Spring Security의 hasRole('ADMIN')에 대응하는 Nest Guard. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = extractToken(req);
    const payload = token && verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
    }
    if (payload.role !== 'admin') {
      throw new ForbiddenException({ success: false, error: 'Forbidden — admin only' });
    }
    req.user = { id: payload.id, role: payload.role };
    return true;
  }
}
