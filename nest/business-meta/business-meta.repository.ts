import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { DbService } from '../db/db.service';

// 트랜잭션이 필요해 풀에 직접 접근한다 — DbService.query는 단건 실행만 제공한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbClient = require(path.join(__dirname, '..', '..', 'src', 'db', 'client.js'));
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
   * 사업체 연결(business_id)·최초 소유자(user_id)는 유지된다 — 재연결이 연결 해제처럼 동작하면 안 된다.
   *
   * ⚠️ social_accounts.user_id 는 NOT NULL 이다(migrateAuth 에서 뒤늦게 추가된 컬럼).
   *   INSERT 에서 빼면 연결 마지막 단계에서만 터진다 — OAuth 를 다 통과한 뒤라 원인이 멀어 보인다.
   */
  async upsertAccount(input: {
    userId: string;
    accountId: string;
    username: string;
    displayName: string | null;
    profileImage: string | null;
    followers: number;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO social_accounts (user_id, platform, account_id, username, display_name, profile_image, followers, status, metadata)
       VALUES ($8, $1, $2, $3, $4, $5, $6, 'active', $7)
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
        input.profileImage, input.followers, JSON.stringify(input.metadata), input.userId],
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

  /** 사업체에 아직 안 붙은 Meta 직결 계정 — 이 화면은 Zernio 계정을 아예 보여주지 않는다. */
  unlinkedAccounts(): Promise<MetaAccountVo[]> {
    return this.db.query<MetaAccountVo>(
      `SELECT a.id, a.account_id, a.username, a.display_name, a.profile_image, a.followers,
              a.status, a.business_id, t.auth_mode, t.expires_at AS token_expires_at, a.created_at AS connected_at
         FROM social_accounts a
         LEFT JOIN meta_ig_tokens t ON t.account_id = a.id
        WHERE a.platform = $1 AND a.business_id IS NULL AND a.status = 'active'
        ORDER BY a.created_at DESC`,
      [META_PLATFORM],
    ).then((r) => r.rows);
  }

  /**
   * Zernio → Meta 전환 후보.
   * 같은 인스타 핸들의 Meta 직결 계정(토큰 보유)이 이미 연결돼 있어야 옮길 수 있다.
   * 없는 사업체는 그 계정으로 OAuth를 한 번 태워야 하므로 여기서 제외된다(사유를 같이 준다).
   */
  async migrationPlan(): Promise<Array<{
    business_id: string; business_name: string;
    old_id: string; old_username: string;
    new_id: string | null; queue_cnt: number; media_cnt: number;
  }>> {
    const { rows } = await this.db.query(`
      SELECT b.id AS business_id, b.name AS business_name,
             old.id AS old_id, old.username AS old_username,
             meta.id AS new_id,
             (SELECT COUNT(*)::int FROM post_queue q WHERE q.account_id = old.id)     AS queue_cnt,
             (SELECT COUNT(*)::int FROM account_media m WHERE m.account_id = old.id)  AS media_cnt
        FROM businesses b
        JOIN social_accounts old
          ON old.business_id = b.id AND old.platform <> $1 AND old.status = 'active'
        LEFT JOIN social_accounts meta
          ON meta.platform = $1 AND lower(meta.username) = lower(old.username)
         AND meta.status = 'active'
         AND EXISTS (SELECT 1 FROM meta_ig_tokens t WHERE t.account_id = meta.id)
       ORDER BY b.created_at DESC`, [META_PLATFORM]);
    return rows as any;
  }

  /**
   * 한 사업체의 연결을 Zernio 계정 → Meta 계정으로 옮긴다.
   *
   * ⚠️ 계정 행만 바꾸면 안 된다. 큐(post_queue)와 원본(account_media)이 **옛 계정 id를 참조**하므로
   *   그대로 두면 화면에서 자료가 사라지고, 남아 있던 예약 건은 여전히 Zernio로 나간다.
   *   넷을 한 트랜잭션으로 묶어 중간에 끊겨도 반쪽 상태가 남지 않게 한다.
   */
  async migrateOne(businessId: string, oldId: string, newId: string): Promise<{ queue: number; media: number }> {
    const conn = await dbClient.pool.connect();
    try {
      await conn.query('BEGIN');
      const q = await conn.query('UPDATE post_queue SET account_id = $1 WHERE account_id = $2', [newId, oldId]);
      const m = await conn.query('UPDATE account_media SET account_id = $1 WHERE account_id = $2', [newId, oldId]);
      await conn.query(
        `UPDATE social_accounts SET business_id = NULL, status = 'disabled', updated_at = now() WHERE id = $1`, [oldId]);
      await conn.query(
        'UPDATE social_accounts SET business_id = $1, updated_at = now() WHERE id = $2', [businessId, newId]);
      await conn.query('COMMIT');
      return { queue: q.rowCount || 0, media: m.rowCount || 0 };
    } catch (e) {
      await conn.query('ROLLBACK');
      throw e;
    } finally {
      conn.release();
    }
  }

  /** 큐 한 건이 걸려 있는 계정의 플랫폼 — 발행 경로를 확인하는 데 쓴다. */
  async queueAccount(queueId: string): Promise<{ platform: string; username: string } | null> {
    const { rows } = await this.db.query<{ platform: string; username: string }>(
      `SELECT sa.platform, sa.username
         FROM post_queue pq JOIN social_accounts sa ON sa.id = pq.account_id
        WHERE pq.id = $1`,
      [queueId],
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
