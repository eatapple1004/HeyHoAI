import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * 비밀번호 해시 — `scrypt$<salt-hex>$<hash-hex>`.
 *
 * ⚠️ 포맷·파라미터(salt 16B, keylen 64)는 **저장된 해시와 호환되어야 한다**.
 *    바꾸면 기존 사용자가 전부 로그인 실패한다. 외부 의존 없이 node:crypto만 쓴다.
 */
@Injectable()
export class PasswordService {
  hash(password: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(String(password), salt, 64);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
  }

  /** 타이밍 안전 비교 — 일반 `===`는 실패 지점까지의 시간으로 해시를 추정당할 수 있다. */
  verify(password: string, stored: string): boolean {
    if (typeof stored !== 'string') return false;
    const [scheme, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
}
