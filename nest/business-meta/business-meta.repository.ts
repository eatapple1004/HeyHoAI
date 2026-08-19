import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuthMode } from './meta-ig.client';

/**
 * Meta 직결 계정 저장소.
 *
 * ⚠️ 토큰은 `meta_ig_tokens`에만 있고, 계정 조회 메서드는 그 테이블을 **join하지 않는다.**
 *   social_accounts.metadata는 관리자 화면이 통째로 받아 가는 값이라 거기 토큰을 넣으면
 *   화면 응답에 비밀값이 섞여 나간다. 물리적으로 분리해 두는 게 유일하게 확실한 방법이다.
 */

/** 화면에 내려도 되는 계정 정보(토큰 없음) */
export interface MetaAccountVo {
  id: string;
  account_id: string;
  username: string;
  display_name: string | null;
  profile_image: string | null;
  followers: number;
  status: string;
  business_id: string | null;
  business_name?: string | null;
  auth_mode: AuthMode;
  token_expires_at: string | null;
  connected_at: string;
}

/** Zernio 계정(platform='instagram')과 섞이지 않게 별도 플랫폼 값을 쓴다.
 *  social_accounts는 UNIQUE(platform, account_id)라 같은 인스타 계정을 양쪽에 동시에 둘 수 있다. */
export const META_PLATFORM = 'instagram_meta';

@Injectable()
export class BusinessMetaRepository {
  constructor(private readonly db: DbService) {}

  /**
   * OAuth로 받은 계정을 저장한다. 같은 계정을 다시 연결하면 프로필만 갱신되고
   * 사업체 연결(business_id)은 유지된다 — 재연결이 연결 해제처럼 동작하면 안 된다.
   */
  async upsertAccount(input: {
    accountId: string;
    username: string;
    displayName: string | null;
    profileImage: string | null;
    followers: number;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO social_accounts (platform, account_id, username, display_name, profile_image, followers, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       ON CONFLICT (platform, account_id) DO UPDATE
         SET username = EXCLUDED.username,
             display_name = EXCLUDED.display_name,
             profile_image = EXCLUDED.profile_image,
             followers = EXCLUDED.followers,
             status = 'active',
             metadata = EXCLUDED.metadata,
             updated_at = now()
       RETURNING id`,
      [META_PLATFORM, input.accountId, input.username, input.displayName,
        input.profileImage, input.followers, JSON.stringify(input.metadata)],
    );
    return rows[0];
  }

  async saveToken(accountId: string, input: {
    authMode: AuthMode;
    accessToken: string;
    scope: string | null;
    expiresIn: number | null;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO meta_ig_tokens (account_id, auth_mode, access_token, scope, expires_at, refreshed_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (account_id) DO UPDATE
         SET auth_mode = EXCLUDED.auth_mode,
             access_token = EXCLUDED.access_token,
             scope = COALESCE(EXCLUDED.scope, meta_ig_tokens.scope),
             expires_at = EXCLUDED.expires_at,
             refreshed_at = now(),
             updated_at = now()`,
      [accountId, input.authMode, input.accessToken, input.scope,
        input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null],
    );
  }

  /** 서버 내부 전용 — 절대 컨트롤러 응답에 싣지 않는다. */
  async findToken(accountId: string): Promise<{ access_token: string; auth_mode: AuthMode; expires_at: string | null } | null> {
    const { rows } = await this.db.query(
      'SELECT access_token, auth_mode, expires_at FROM meta_ig_tokens WHERE account_id = $1',
      [accountId],
    );
    return rows[0] || null;
  }

  /** 만료가 `days`일 안으로 다가온 토큰 — 갱신 대상 */
  async tokensExpiringWithin(days: number): Promise<Array<{ account_id: string; access_token: string; username: string }>> {
    const { rows } = await this.db.query(
      `SELECT t.account_id, t.access_token, a.username
         FROM meta_ig_tokens t
         JOIN social_accounts a ON a.id = t.account_id
        WHERE a.status = 'active'
          AND t.expires_at IS NOT NULL
          AND t.expires_at < now() + ($1 || ' days')::interval
          AND t.expires_at > now()`,
      [String(days)],
    );
    return rows;
  }

  listAccounts(): Promise<MetaAccountVo[]> {
    return this.db.query<MetaAccountVo>(
      `SELECT a.id, a.account_id, a.username, a.display_name, a.profile_image, a.followers,
              a.status, a.business_id, b.name AS business_name,
              t.auth_mode, t.expires_at AS token_expires_at, a.created_at AS connected_at
         FROM social_accounts a
         LEFT JOIN businesses b ON b.id = a.business_id
         LEFT JOIN meta_ig_tokens t ON t.account_id = a.id
        WHERE a.platform = $1
        ORDER BY a.created_at DESC`,
      [META_PLATFORM],
    ).then((r) => r.rows);
  }

  async findAccount(id: string): Promise<MetaAccountVo | null> {
    const { rows } = await this.db.query<MetaAccountVo>(
      `SELECT a.id, a.account_id, a.username, a.display_name, a.profile_image, a.followers,
              a.status, a.business_id, t.auth_mode, t.expires_at AS token_expires_at,
              a.created_at AS connected_at
         FROM social_accounts a
         LEFT JOIN meta_ig_tokens t ON t.account_id = a.id
        WHERE a.id = $1 AND a.platform = $2`,
      [id, META_PLATFORM],
    );
    return rows[0] || null;
  }

  /**
   * 연결 해제 — 토큰만 지우고 계정 행은 `disabled`로 남긴다.
   * 행까지 지우면 사업체 연결과 그동안 쌓인 미디어(account_media)가 CASCADE로 함께 사라진다.
   */
  async disconnect(id: string): Promise<void> {
    await this.db.query('DELETE FROM meta_ig_tokens WHERE account_id = $1', [id]);
    await this.db.query(
      `UPDATE social_accounts SET status = 'disabled', updated_at = now() WHERE id = $1 AND platform = $2`,
      [id, META_PLATFORM],
    );
  }
}
