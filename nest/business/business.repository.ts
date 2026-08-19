import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { DbService } from '../db/db.service';
import {
  BusinessAccountVo, BusinessListItemVo, BusinessMediaVo, BusinessPackVo, BusinessQueueVo, BusinessVo,
  PackChoiceVo,
} from './vo/business.vo';

// content_packs / pack_assets는 마이그레이션이 아니라 팩 리포지토리가 **지연 생성**한다.
//   조회 전에 그쪽 ensureSchema를 태워야 빈 DB에서 42P01(없는 테이블)로 죽지 않는다(단일소스 재사용).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packRepo = require(path.join(__dirname, '..', '..', 'src', 'pack', 'pack.repository.js'));

/**
 * ⚠️ UPDATE 컬럼은 화이트리스트로만 만든다 — 호출자가 준 키를 그대로 SQL에 붙이면
 *   컬럼명이 외부 입력이 되고, 잘못된 키가 SQL 에러(500)가 된다.
 */
const BUSINESS_UPDATABLE: Record<string, string> = {
  name: 'name',
  industry: 'industry',
  memo: 'memo',
  status: 'status',
};

const QUEUE_UPDATABLE: Record<string, string> = {
  imageCaption: 'image_caption',
  reelCaption: 'reel_caption',
  hashtags: 'hashtags',
  status: 'status',
  scheduledAt: 'scheduled_at',
};

/** file_path(`tmp/images/x.png`)·팩 자산 URL(`/images/x.png`) → 공개 URL `/images/x.png` */
export const toPublicUrl = (filePath: string | null): string | null =>
  filePath ? `/images/${filePath.split('/').pop()}` : null;

/** 반대 방향 — 공개 URL/파일명 → account_media.file_path 규약(`tmp/images/<파일명>`) */
export const toFilePath = (url: string): string => `tmp/images/${url.split('?')[0].split('/').pop()}`;

@Injectable()
export class BusinessRepository {
  constructor(private readonly db: DbService) {}

  // ── businesses ──

  /**
   * 목록 + 집계. 계정·큐 집계를 각각 사전 그룹핑해서 붙인다 —
   * 두 LEFT JOIN을 그냥 걸면 계정 수 × 큐 수로 행이 뻥튀기돼 합계가 틀어진다.
   */
  async listBusinesses(): Promise<BusinessListItemVo[]> {
    const r = await this.db.query<BusinessListItemVo>(`
      SELECT b.*,
             COALESCE(a.accounts, 0)::int        AS accounts,
             COALESCE(a.active_accounts, 0)::int AS active_accounts,
             COALESCE(a.followers, 0)::int       AS followers,
             COALESCE(q.pending, 0)::int         AS pending,
             COALESCE(q.scheduled, 0)::int       AS scheduled,
             COALESCE(q.posted, 0)::int          AS posted,
             a.primary_username, a.primary_profile_image,
             COALESCE(a.meta_accounts, 0)::int    AS meta_accounts
        FROM businesses b
        LEFT JOIN (
          SELECT business_id,
                 COUNT(*)                                   AS accounts,
                 COUNT(*) FILTER (WHERE status = 'active')  AS active_accounts,
                 -- Meta 직결 계정 수 — 목록에서 어느 사업체가 어느 경로로 나가는지 바로 보이게 한다
                 COUNT(*) FILTER (WHERE platform = 'instagram_meta') AS meta_accounts,
                 SUM(followers)                             AS followers,
                 (ARRAY_AGG(username      ORDER BY followers DESC NULLS LAST))[1] AS primary_username,
                 (ARRAY_AGG(profile_image ORDER BY followers DESC NULLS LAST))[1] AS primary_profile_image
            FROM social_accounts WHERE business_id IS NOT NULL GROUP BY business_id
        ) a ON a.business_id = b.id
        LEFT JOIN (
          SELECT sa.business_id,
                 COUNT(*) FILTER (WHERE pq.status IN ('pending', 'confirmed')) AS pending,
                 COUNT(*) FILTER (WHERE pq.status = 'scheduled')               AS scheduled,
                 COUNT(*) FILTER (WHERE pq.status = 'posted')                  AS posted
            FROM post_queue pq
            JOIN social_accounts sa ON sa.id = pq.account_id
           WHERE sa.business_id IS NOT NULL GROUP BY sa.business_id
        ) q ON q.business_id = b.id
       ORDER BY b.created_at DESC`);
    return r.rows;
  }

  async findBusiness(id: string): Promise<BusinessVo | null> {
    const r = await this.db.query<BusinessVo>('SELECT * FROM businesses WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async insertBusiness(d: { name: string; industry?: string; memo?: string }): Promise<BusinessVo> {
    const r = await this.db.query<BusinessVo>(
      `INSERT INTO businesses (name, industry, memo) VALUES ($1, $2, $3) RETURNING *`,
      [d.name, d.industry || null, d.memo || null]);
    return r.rows[0];
  }

  async updateBusiness(id: string, fields: Record<string, unknown>): Promise<BusinessVo | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    for (const [key, col] of Object.entries(BUSINESS_UPDATABLE)) {
      if (fields[key] !== undefined) { sets.push(`${col} = $${params.length + 1}`); params.push(fields[key]); }
    }
    if (!sets.length) return this.findBusiness(id);
    sets.push('updated_at = now()');
    const r = await this.db.query<BusinessVo>(
      `UPDATE businesses SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  /** 삭제 — 계정은 business_id만 끊기고(ON DELETE SET NULL) 살아남는다. 미디어는 CASCADE. */
  async removeBusiness(id: string): Promise<BusinessVo | null> {
    const r = await this.db.query<BusinessVo>('DELETE FROM businesses WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }

  // ── 계정 연결 ──

  async accountsOf(businessId: string): Promise<BusinessAccountVo[]> {
    const r = await this.db.query<BusinessAccountVo>(
      `SELECT id, business_id, platform, account_id, username, display_name, profile_image,
              followers, status, created_at
         FROM social_accounts WHERE business_id = $1 ORDER BY followers DESC, created_at`, [businessId]);
    return r.rows;
  }

  /** 아직 어느 사업체에도 안 붙은 계정 — 연결 드롭다운용 */
  async unlinkedAccounts(): Promise<BusinessAccountVo[]> {
    const r = await this.db.query<BusinessAccountVo>(
      `SELECT id, business_id, platform, account_id, username, display_name, profile_image,
              followers, status, created_at
         FROM social_accounts WHERE business_id IS NULL ORDER BY created_at DESC`);
    return r.rows;
  }

  async findAccount(accountId: string): Promise<BusinessAccountVo | null> {
    const r = await this.db.query<BusinessAccountVo>(
      'SELECT * FROM social_accounts WHERE id = $1', [accountId]);
    return r.rows[0] || null;
  }

  async setAccountBusiness(accountId: string, businessId: string | null): Promise<BusinessAccountVo | null> {
    const r = await this.db.query<BusinessAccountVo>(
      `UPDATE social_accounts SET business_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [businessId, accountId]);
    return r.rows[0] || null;
  }

  // ── 미디어(오리지널 + 결과물) ──

  /**
   * 사업체 미디어 = 사업체에 직접 매단 것(계정 연동 전 업로드) + 소속 계정에 달린 것.
   * 오리지널(is_base)을 항상 위로 올린다.
   */
  async mediaOf(businessId: string, opts: { isBase?: boolean; mediaType?: string } = {}): Promise<BusinessMediaVo[]> {
    const conds = ['(m.business_id = $1 OR sa.business_id = $1)'];
    const params: unknown[] = [businessId];
    if (opts.isBase !== undefined) { conds.push(`m.is_base = $${params.length + 1}`); params.push(opts.isBase); }
    if (opts.mediaType) { conds.push(`m.media_type = $${params.length + 1}`); params.push(opts.mediaType); }

    const r = await this.db.query<BusinessMediaVo>(
      `SELECT m.id, m.account_id, m.business_id, m.file_path, m.media_type, m.caption,
              m.hashtags, m.status, m.source, COALESCE(m.is_base, false) AS is_base, m.created_at
         FROM account_media m
         LEFT JOIN social_accounts sa ON sa.id = m.account_id
        WHERE ${conds.join(' AND ')}
        ORDER BY COALESCE(m.is_base, false) DESC, m.created_at DESC`, params);
    return r.rows.map((m) => ({ ...m, url: toPublicUrl(m.file_path) as string }));
  }

  async findMedia(id: string): Promise<BusinessMediaVo | null> {
    const r = await this.db.query<BusinessMediaVo>('SELECT * FROM account_media WHERE id = $1', [id]);
    const m = r.rows[0];
    return m ? { ...m, url: toPublicUrl(m.file_path) as string } : null;
  }

  /** 같은 사업체에 같은 파일이 이미 있으면 재사용(팩 자산을 두 번 고를 때 중복 행 방지) */
  async findMediaByPath(businessId: string, filePath: string): Promise<BusinessMediaVo | null> {
    const r = await this.db.query<BusinessMediaVo>(
      `SELECT m.* FROM account_media m
         LEFT JOIN social_accounts sa ON sa.id = m.account_id
        WHERE m.file_path = $2 AND (m.business_id = $1 OR sa.business_id = $1) LIMIT 1`,
      [businessId, filePath]);
    const m = r.rows[0];
    return m ? { ...m, url: toPublicUrl(m.file_path) as string } : null;
  }

  async insertMedia(d: {
    businessId: string; accountId?: string | null; filePath: string;
    mediaType: string; caption?: string | null; isBase?: boolean;
    /** upload = 관리자가 올린 원본, import = 팩·생성물에서 편입 */
    source?: 'upload' | 'import';
  }): Promise<BusinessMediaVo> {
    const r = await this.db.query<BusinessMediaVo>(
      `INSERT INTO account_media (business_id, account_id, file_path, media_type, caption, is_base, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [d.businessId, d.accountId || null, d.filePath, d.mediaType, d.caption || null,
       d.isBase || false, d.source || null]);
    const m = r.rows[0];
    return { ...m, url: toPublicUrl(m.file_path) as string };
  }

  /** 오리지널 지정은 사업체 안에서 배타적 — 먼저 전부 내리고 하나만 올린다 */
  async setBaseMedia(businessId: string, mediaId: string): Promise<BusinessMediaVo | null> {
    await this.db.query(
      `UPDATE account_media m SET is_base = false
         FROM social_accounts sa
        WHERE sa.id = m.account_id AND sa.business_id = $1 AND m.is_base = true`, [businessId]);
    await this.db.query(
      'UPDATE account_media SET is_base = false WHERE business_id = $1 AND is_base = true', [businessId]);
    const r = await this.db.query<BusinessMediaVo>(
      'UPDATE account_media SET is_base = true, updated_at = now() WHERE id = $1 RETURNING *', [mediaId]);
    const m = r.rows[0];
    return m ? { ...m, url: toPublicUrl(m.file_path) as string } : null;
  }

  async removeMedia(id: string): Promise<BusinessMediaVo | null> {
    const r = await this.db.query<BusinessMediaVo>(
      'DELETE FROM account_media WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }

  // ── 콘텐츠팩 ──

  /** id(숫자) 또는 share_id(UUID) 어느 쪽으로도 찾는다 */
  async findPack(key: string): Promise<{ id: string; share_id: string } | null> {
    await packRepo.ensureSchema();
    const numeric = /^\d+$/.test(key);
    const r = await this.db.query<{ id: string; share_id: string }>(
      `SELECT id, share_id FROM content_packs WHERE ${numeric ? 'id = $1::bigint' : 'share_id = $1'}`, [key]);
    return r.rows[0] || null;
  }

  /**
   * 연결 후보 팩 목록 — 대표 이미지(cover)를 붙여 눈으로 고를 수 있게 한다.
   * 기본은 이 관리자가 만든 팩 + 이미 이 사업체에 붙은 팩. `all`이면 전체(고객 팩 포함).
   * 대표 컷 우선순위: still > composite > ref > source (원본 사진이 표지가 되면 팩을 알아볼 수 없다).
   */
  async availablePacks(businessId: string, opts: { userId?: string; all?: boolean; limit?: number } = {}):
    Promise<PackChoiceVo[]> {
    await packRepo.ensureSchema();
    const params: unknown[] = [businessId];
    let scope = '';
    if (!opts.all && opts.userId) {
      params.push(String(opts.userId));
      scope = `WHERE (p.user_id = $${params.length} OR bp.business_id IS NOT NULL)`;
    }
    params.push(opts.limit || 60);

    const r = await this.db.query<PackChoiceVo>(
      `SELECT p.id::text AS pack_id, p.share_id, p.vertical, p.product, p.status, p.created_at,
              (bp.business_id IS NOT NULL) AS linked,
              cover.url AS cover_url,
              COALESCE(cnt.n, 0)::int AS asset_count
         FROM content_packs p
         LEFT JOIN business_packs bp ON bp.pack_id = p.id AND bp.business_id = $1
         LEFT JOIN LATERAL (
           SELECT a.url FROM pack_assets a
            WHERE a.pack_id = p.id AND a.url IS NOT NULL
            ORDER BY CASE a.kind WHEN 'still' THEN 0 WHEN 'composite' THEN 1 WHEN 'ref' THEN 2 ELSE 3 END, a.id
            LIMIT 1
         ) cover ON true
         LEFT JOIN LATERAL (
           SELECT count(*) AS n FROM pack_assets a WHERE a.pack_id = p.id AND a.url IS NOT NULL
         ) cnt ON true
         ${scope}
        ORDER BY p.created_at DESC
        LIMIT $${params.length}`, params);
    return r.rows;
  }

  async linkPack(businessId: string, packId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO business_packs (business_id, pack_id) VALUES ($1, $2::bigint)
       ON CONFLICT (business_id, pack_id) DO NOTHING`, [businessId, packId]);
  }

  async unlinkPack(businessId: string, packId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM business_packs WHERE business_id = $1 AND pack_id = $2::bigint', [businessId, packId]);
  }

  /** 연결된 팩 + 자산. 자산 URL 확장자로 이미지/영상을 가른다(팩은 media_type을 따로 안 들고 있다). */
  async packsOf(businessId: string): Promise<BusinessPackVo[]> {
    await packRepo.ensureSchema();
    const packs = await this.db.query<any>(
      `SELECT p.id::text AS pack_id, p.share_id, p.vertical, p.product, p.status, p.created_at
         FROM business_packs bp JOIN content_packs p ON p.id = bp.pack_id
        WHERE bp.business_id = $1 ORDER BY p.created_at DESC`, [businessId]);
    if (!packs.rows.length) return [];

    const assets = await this.db.query<any>(
      `SELECT a.pack_id::text AS pack_id, a.kind, a.cut_key, a.label, a.url
         FROM pack_assets a
        WHERE a.pack_id = ANY($1::bigint[]) AND a.url IS NOT NULL
        ORDER BY a.id`,
      [packs.rows.map((p) => p.pack_id)]);

    const byPack = new Map<string, any[]>();
    for (const a of assets.rows) {
      const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(a.url);
      const list = byPack.get(a.pack_id) || [];
      list.push({ ...a, media_type: isVideo ? 'video' : 'image' });
      byPack.set(a.pack_id, list);
    }
    return packs.rows.map((p) => ({ ...p, assets: byPack.get(p.pack_id) || [] }));
  }

  // ── 발행 큐 ──

  async queueOf(businessId: string, status?: string): Promise<BusinessQueueVo[]> {
    const conds = ['sa.business_id = $1'];
    const params: unknown[] = [businessId];
    if (status) { conds.push(`pq.status = $${params.length + 1}`); params.push(status); }

    const r = await this.db.query<BusinessQueueVo & { image_paths: string[] | null }>(
      `SELECT pq.*, sa.username AS account_username,
              img.file_path  AS image_path,
              reel.file_path AS reel_path,
              carousel.paths AS image_paths
         FROM post_queue pq
         JOIN social_accounts sa ON sa.id = pq.account_id
         LEFT JOIN account_media img  ON img.id  = pq.image_media_id
         LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
         LEFT JOIN LATERAL (
           SELECT array_agg(am.file_path ORDER BY u.ord) AS paths
             FROM unnest(COALESCE(pq.image_media_ids, ARRAY[]::uuid[])) WITH ORDINALITY AS u(mid, ord)
             JOIN account_media am ON am.id = u.mid
         ) carousel ON true
        WHERE ${conds.join(' AND ')}
        ORDER BY COALESCE(pq.scheduled_at, pq.created_at) DESC`, params);
    return r.rows.map((q) => {
      // 캐러셀이면 배열이 진실, 아니면 단일 컬럼 한 장짜리로 본다(구 데이터 호환).
      const paths = q.image_paths && q.image_paths.length ? q.image_paths : [q.image_path].filter(Boolean) as string[];
      return {
        ...q,
        image_url: toPublicUrl(q.image_path),
        reel_url: toPublicUrl(q.reel_path),
        image_urls: paths.map((p) => toPublicUrl(p) as string),
      };
    });
  }

  async insertQueue(d: {
    accountId: string; imageMediaId?: string | null; imageMediaIds?: string[]; reelMediaId?: string | null;
    bgmMediaId?: string | null;
    imageCaption?: string | null; reelCaption?: string | null; hashtags?: string[]; scheduledAt?: string | null;
  }): Promise<BusinessQueueVo> {
    // 예약 시각이 있으면 scheduled(스케줄러가 도래분을 집는다), 없으면 confirmed(다음 발행 루프 대상).
    const status = d.scheduledAt ? 'scheduled' : 'confirmed';
    const ids = d.imageMediaIds && d.imageMediaIds.length
      ? d.imageMediaIds
      : (d.imageMediaId ? [d.imageMediaId] : []);
    const r = await this.db.query<BusinessQueueVo>(
      `INSERT INTO post_queue
         (account_id, image_media_id, image_media_ids, reel_media_id, bgm_media_id,
          image_caption, reel_caption, hashtags, status, scheduled_at)
       VALUES ($1,$2,$3::uuid[],$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [d.accountId, ids[0] || null, ids, d.reelMediaId || null, d.bgmMediaId || null,
       d.imageCaption || null, d.reelCaption || null, d.hashtags || [], status, d.scheduledAt || null]);
    return r.rows[0];
  }

  async findQueue(id: string): Promise<BusinessQueueVo | null> {
    const r = await this.db.query<BusinessQueueVo>(
      `SELECT pq.*, sa.business_id FROM post_queue pq
         JOIN social_accounts sa ON sa.id = pq.account_id
        WHERE pq.id = $1`, [id]);
    return r.rows[0] || null;
  }

  async updateQueue(id: string, fields: Record<string, unknown>): Promise<BusinessQueueVo | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    for (const [key, col] of Object.entries(QUEUE_UPDATABLE)) {
      if (fields[key] !== undefined) { sets.push(`${col} = $${params.length + 1}`); params.push(fields[key]); }
    }
    if (!sets.length) return this.findQueue(id);
    sets.push('updated_at = now()');
    const r = await this.db.query<BusinessQueueVo>(
      `UPDATE post_queue SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  async removeQueue(id: string): Promise<BusinessQueueVo | null> {
    const r = await this.db.query<BusinessQueueVo>(
      'DELETE FROM post_queue WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }
}
