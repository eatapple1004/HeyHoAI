import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * HQ 메일 인증 — Cloudflare Access 가 붙여 보내는 서명(Cf-Access-Jwt-Assertion)을 직접 검증한다.
 *   Access 앞단에서 이미 메일 코드 인증을 거쳤어도, 헤더는 누구나 흉내 낼 수 있으므로 서버가 다시 확인한다.
 *   서명(RS256)·발급처(팀 도메인)·대상(AUD)·만료를 모두 맞춰 보고, 허용 메일 목록(HQ_ACCESS_EMAILS)에 있어야 통과.
 *   설정(HQ_ACCESS_TEAM·HQ_ACCESS_AUD)이 없으면 항상 null — 그때는 목록에 있는 도피아 로그인만 남는다(fail closed).
 */
@Injectable()
export class HqAccessService {
  private keys: { at: number; team: string; list: any[] } = { at: 0, team: '', list: [] };

  /** 허용 메일 목록(HQ_ACCESS_EMAILS) — 비어 있으면 아무도 못 들어온다(fail closed) */
  allowList(): Set<string> {
    return new Set(String(env.HQ_ACCESS_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  }

  allowed(email: string | null | undefined): boolean {
    return !!email && this.allowList().has(String(email).toLowerCase());
  }

  private config(): { team: string; aud: string } | null {
    const team = String(env.HQ_ACCESS_TEAM || '').trim();
    const aud = String(env.HQ_ACCESS_AUD || '').trim();
    if (!team || !aud) return null;
    return { team, aud };
  }

  /** Access 공개키 — 한 시간 동안 재사용(요청마다 받지 않는다) */
  private async publicKeys(team: string): Promise<any[]> {
    if (this.keys.team === team && Date.now() - this.keys.at < 3_600_000) return this.keys.list;
    const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
    if (!r.ok) throw new Error(`access certs ${r.status}`);
    const list = ((await r.json()) as any).keys || [];
    this.keys = { at: Date.now(), team, list };
    return list;
  }

  /** 서비스 토큰 Client ID 목록(HQ_ACCESS_SERVICES) — 비어 있으면 기계 접근 없음 */
  serviceList(): Set<string> {
    return new Set(String(env.HQ_ACCESS_SERVICES || '').split(',').map((s) => s.trim()).filter(Boolean));
  }

  /** 통과하면 소문자 메일, 아니면 null */
  async emailFrom(req: any): Promise<string | null> {
    const claims = await this.claims(req);
    const email = claims && claims.email ? String(claims.email).toLowerCase() : '';
    return email && this.allowed(email) ? email : null;
  }

  /** 서비스 토큰으로 들어온 기계면 그 Client ID, 아니면 null — 사람 메일이 있는 서명은 기계로 보지 않는다 */
  async serviceFrom(req: any): Promise<string | null> {
    const claims = await this.claims(req);
    if (!claims || claims.email) return null;
    const cn = String(claims.common_name || '');
    return cn && this.serviceList().has(cn) ? cn : null;
  }

  /** Access 서명을 검증하고 claims 를 돌려준다(요청마다 한 번만 계산) */
  private async claims(req: any): Promise<any | null> {
    if (req.__hqClaims !== undefined) return req.__hqClaims;
    req.__hqClaims = await this.verify(req);
    return req.__hqClaims;
  }

  private async verify(req: any): Promise<any | null> {
    const cfg = this.config();
    if (!cfg) return null;
    const token = String(req.headers?.['cf-access-jwt-assertion'] || '');
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    try {
      const head = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
      const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      if (head.alg !== 'RS256') return null;
      const jwk = (await this.publicKeys(cfg.team)).find((k) => k.kid === head.kid);
      if (!jwk) return null;
      const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(s, 'base64url'));
      if (!ok) return null;
      if (claims.iss !== `https://${cfg.team}`) return null;
      if (![].concat(claims.aud || []).includes(cfg.aud)) return null;
      const now = Date.now() / 1000;
      if (!claims.exp || claims.exp < now || (claims.nbf && claims.nbf > now + 60)) return null;
      return claims;
    } catch {
      return null;
    }
  }
}
