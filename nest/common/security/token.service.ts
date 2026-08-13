import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

// 환경설정 단일소스(검증·기본값 포함) — config는 앱 전체가 공유하므로 재사용한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', '..', 'src', 'config'));

/** JWT payload — ⚠️ id·role만 담는다(email 없음). marketplace가 email을 기대하는 버그의 원인. */
export interface JwtPayload {
  id: string;
  role: string;
}

/**
 * JWT 발급·검증 — src/auth/token.js 를 TypeScript로 이식.
 *   ⚠️ 서명 payload는 `{ sub, role }`, 검증 결과는 `{ id, role }` (레거시와 동일 — 바꾸면 기존 토큰이 깨진다).
 */
@Injectable()
export class TokenService {
  sign(user: { id: string; role: string }): string {
    return jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }

  /** 실패 시 null (예외를 던지지 않는다 — 가드가 401을 만든다) */
  verify(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      return { id: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  /** 요청에서 토큰 추출 — 쿠키 우선, Authorization Bearer 폴백 */
  extract(req: any): string | null {
    if (req.cookies && req.cookies.token) return req.cookies.token;
    const auth = req.headers?.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }
}
