import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../common/security/token.service';

/**
 * Spring Security의 hasRole('ADMIN')에 대응하는 Nest Guard.
 *   레거시 requireAdmin과 동일 — 미인증 401 / 비관리자 403(응답 형식까지 동일).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = this.tokens.extract(req);
    const payload = token && this.tokens.verify(token);
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
