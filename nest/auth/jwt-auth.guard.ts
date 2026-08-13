import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../common/security/token.service';

/**
 * Spring Security 필터 / @PreAuthorize에 대응하는 Nest Guard.
 *   성공 시 req.user = { id, role } 세팅(레거시 requireAuth와 완전 동일). 실패 시 401 JSON.
 *   토큰 추출·검증은 TokenService(전역 SecurityModule) 주입 — 더 이상 src/를 require하지 않는다.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = this.tokens.extract(req);
    const payload = token && this.tokens.verify(token);
    if (!payload) {
      throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
    }
    req.user = { id: payload.id, role: payload.role };
    return true;
  }
}
