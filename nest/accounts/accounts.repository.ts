import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { SocialAccountVo, AccountMediaVo, PostQueueItemVo, ReelTemplateVo, OutfitPromptVo } from './vo/account.vo';

/**
 * 계정 워크플로 저장소 — social_accounts · account_media · reel_templates · outfit_prompts · post_queue.
 *
 * 다섯 테이블이 "한 소셜 계정의 작업 파이프라인"이라는 하나의 집합으로 함께 움직여서
 * (미디어 → 릴스 → 발행 큐) 리포지토리를 쪼개지 않고 한 곳에 둔다.
 */

/** 발행 큐는 항상 첨부 미디어의 파일 경로까지 함께 내려줘야 프론트가 썸네일을 그린다 */
const QUEUE_SELECT = `SELECT pq.*,
     img.file_path  AS image_path,
     reel.file_path AS reel_path,
     bgm.file_path  AS bgm_path
   FROM post_queue pq
   LEFT JOIN account_media img  ON img.id  = pq.image_media_id
   LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
   LEFT JOIN account_media bgm  ON bgm.id  = pq.bgm_media_id`;

@Injectable()
export class AccountsRepository {
  constructor(private readonly db: DbService) {}

  // ── social_accounts ──

  /**
   * Zernio 동기화 upsert — 같은 (platform, account_id)면 최신 정보로 갱신한다.
   * 재동기화 때 계정이 중복 생성되면 발행 큐가 어느 쪽에 붙는지 갈린다.
   */
  async upsertAccount(d: {
    userId: string; platform: string; accountId: string; username: string;
    displayName: string; profileImage: string | null; followers: number; metadata: unknown;
  }): Promise<SocialAccountVo> {
    const r = await this.db.query<SocialAccountVo>(
      `INSERT INTO social_accounts (user_id, platform, account_id, username, display_name, profile_image, followers, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (platform, account_id) DO UPDATE SET
         username = EXCLUDED.username,
         display_name = EXCLUDED.display_name,
         profile_image = EXCLUDED.profile_image,
         followers = EXCLUDED.followers,
         metadata = EXCLUDED.metadata,
         updated_at = now()
       RETURNING *`,
      [d.userId, d.platform, d.accountId, d.username, d.displayName, d.profileImage,
       d.followers || 0, JSON.stringify(d.metadata || {})]);
    return r.rows[0];
  }

  async findAccounts(f: { userId?: string; platform?: string; status?: string } = {}): Promise<SocialAccountVo[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (f.userId) { conditions.push(`user_id = $${i++}`); params.push(f.userId); }
    if (f.platform) { conditions.push(`platform = $${i++}`); params.push(f.platform); }
    if (f.status) { conditions.push(`status = $${i++}`); params.push(f.status); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const r = await this.db.query<SocialAccountVo>(
      `SELECT * FROM social_accounts ${where} ORDER BY created_at DESC`, params);
    return r.rows;
  }

  async findAccountById(id: string): Promise<SocialAccountVo | null> {
    const r = await this.db.query<SocialAccountVo>('SELECT * FROM social_accounts WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async updateAccountStatus(id: string, status: string): Promise<SocialAccountVo | null> {
    const r = await this.db.query<SocialAccountVo>(
      'UPDATE social_accounts SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', [status, id]);
    return r.rows[0] || null;
  }

  async updateAccountMetadata(id: string, metadata: unknown): Promise<void> {
    await this.db.query(
      'UPDATE social_accounts SET metadata = $1, updated_at = now() WHERE id = $2',
      [JSON.stringify(metadata), id]);
  }

  async removeAccount(id: string): Promise<SocialAccountVo | null> {
    const r = await this.db.query<SocialAccountVo>(
      'DELETE FROM social_accounts WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }

  // ── account_media ──

  async insertMedia(d: {
    accountId: string; filePath: string; mediaType?: string;
    caption?: string | null; hashtags?: string[]; metadata?: unknown;
  }): Promise<AccountMediaVo> {
    const r = await this.db.query<AccountMediaVo>(
      `INSERT INTO account_media (account_id, file_path, media_type, caption, hashtags, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [d.accountId, d.filePath, d.mediaType || 'image', d.caption || null,
       d.hashtags || [], JSON.stringify(d.metadata || {})]);
    return r.rows[0];
  }

  async findMediaByAccount(
    accountId: string, o: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<AccountMediaVo[]> {
    const { status, limit = 50, offset = 0 } = o;
    const conditions = ['account_id = $1'];
    const params: unknown[] = [accountId];
    let i = 2;
    if (status) { conditions.push(`status = $${i++}`); params.push(status); }
    const r = await this.db.query<AccountMediaVo>(
      `SELECT * FROM account_media WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`, [...params, limit, offset]);
    return r.rows;
  }

  async countMedia(accountId: string): Promise<number> {
    const r = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) FROM account_media WHERE account_id = $1', [accountId]);
    return parseInt(r.rows[0].count, 10);
  }

  async findMediaById(id: string): Promise<AccountMediaVo | null> {
    const r = await this.db.query<AccountMediaVo>('SELECT * FROM account_media WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async updateMedia(id: string, f: { caption?: string; hashtags?: string[]; status?: string }): Promise<AccountMediaVo | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    let i = 2;
    if (f.caption !== undefined) { sets.push(`caption = $${i++}`); params.push(f.caption); }
    if (f.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); params.push(f.hashtags); }
    if (f.status !== undefined) { sets.push(`status = $${i++}`); params.push(f.status); }
    if (!sets.length) return this.findMediaById(id);
    sets.push('updated_at = now()');
    const r = await this.db.query<AccountMediaVo>(
      `UPDATE account_media SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  async removeMedia(id: string): Promise<AccountMediaVo | null> {
    const r = await this.db.query<AccountMediaVo>('DELETE FROM account_media WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }

  /** 기본 사진 교체 — 기존 base를 먼저 내리지 않으면 base가 2장이 된다 */
  async setBaseMedia(accountId: string, mediaId: string): Promise<AccountMediaVo | null> {
    await this.db.query(
      'UPDATE account_media SET is_base = false WHERE account_id = $1 AND is_base = true', [accountId]);
    const r = await this.db.query<AccountMediaVo>(
      'UPDATE account_media SET is_base = true, updated_at = now() WHERE id = $1 AND account_id = $2 RETURNING *',
      [mediaId, accountId]);
    return r.rows[0] || null;
  }

  async findBaseMedia(accountId: string): Promise<AccountMediaVo | null> {
    const r = await this.db.query<AccountMediaVo>(
      'SELECT * FROM account_media WHERE account_id = $1 AND is_base = true LIMIT 1', [accountId]);
    return r.rows[0] || null;
  }

  // ── reel_templates ──

  async findReelTemplates(accountId: string): Promise<ReelTemplateVo[]> {
    const r = await this.db.query<ReelTemplateVo>(
      'SELECT * FROM reel_templates WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
    return r.rows;
  }

  async removeReelTemplate(id: string): Promise<ReelTemplateVo | null> {
    const r = await this.db.query<ReelTemplateVo>(
      'DELETE FROM reel_templates WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }

  // ── outfit_prompts ──

  async findOutfitPrompts(accountId: string): Promise<OutfitPromptVo[]> {
    const r = await this.db.query<OutfitPromptVo>(
      'SELECT * FROM outfit_prompts WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
    return r.rows;
  }

  async insertOutfitPrompt(d: { accountId: string; name: string; prompt: string }): Promise<OutfitPromptVo> {
    const r = await this.db.query<OutfitPromptVo>(
      'INSERT INTO outfit_prompts (account_id, name, prompt) VALUES ($1,$2,$3) RETURNING *',
      [d.accountId, d.name, d.prompt]);
    return r.rows[0];
  }

  async updateOutfitPrompt(id: string, f: { name?: string; prompt?: string }): Promise<OutfitPromptVo | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    let i = 2;
    if (f.name !== undefined) { sets.push(`name = $${i++}`); params.push(f.name); }
    if (f.prompt !== undefined) { sets.push(`prompt = $${i++}`); params.push(f.prompt); }
    if (!sets.length) {
      const cur = await this.db.query<OutfitPromptVo>('SELECT * FROM outfit_prompts WHERE id = $1', [id]);
      return cur.rows[0] || null;
    }
    const r = await this.db.query<OutfitPromptVo>(
      `UPDATE outfit_prompts SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  async removeOutfitPrompt(id: string): Promise<OutfitPromptVo | null> {
    const r = await this.db.query<OutfitPromptVo>(
      'DELETE FROM outfit_prompts WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }

  // ── post_queue ──

  async insertQueueItem(d: {
    accountId: string; imageMediaId?: string | null; reelMediaId?: string | null;
    imageCaption?: string | null; reelCaption?: string | null; hashtags?: string[]; bgmMediaId?: string | null;
  }): Promise<PostQueueItemVo> {
    const r = await this.db.query<PostQueueItemVo>(
      `INSERT INTO post_queue (account_id, image_media_id, reel_media_id, image_caption, reel_caption, hashtags, bgm_media_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [d.accountId, d.imageMediaId || null, d.reelMediaId || null, d.imageCaption || null,
       d.reelCaption || null, d.hashtags || [], d.bgmMediaId || null]);
    return r.rows[0];
  }

  async findQueueByAccount(
    accountId: string, o: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<PostQueueItemVo[]> {
    const { status, limit = 50, offset = 0 } = o;
    const conditions = ['pq.account_id = $1'];
    const params: unknown[] = [accountId];
    let i = 2;
    if (status) { conditions.push(`pq.status = $${i++}`); params.push(status); }
    const r = await this.db.query<PostQueueItemVo>(
      `${QUEUE_SELECT} WHERE ${conditions.join(' AND ')}
        ORDER BY pq.created_at DESC LIMIT $${i++} OFFSET $${i}`, [...params, limit, offset]);
    return r.rows;
  }

  async findQueueItemById(id: string): Promise<PostQueueItemVo | null> {
    const r = await this.db.query<PostQueueItemVo>(`${QUEUE_SELECT} WHERE pq.id = $1`, [id]);
    return r.rows[0] || null;
  }

  async updateQueueItem(id: string, f: {
    imageCaption?: string | null; reelCaption?: string | null; hashtags?: string[]; status?: string;
    postedAt?: string | null; imagePostUrl?: string | null; reelPostUrl?: string | null; bgmMediaId?: string | null;
  }): Promise<PostQueueItemVo | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    let i = 2;
    const put = (col: string, v: unknown) => { sets.push(`${col} = $${i++}`); params.push(v); };
    if (f.imageCaption !== undefined) put('image_caption', f.imageCaption);
    if (f.reelCaption !== undefined) put('reel_caption', f.reelCaption);
    if (f.hashtags !== undefined) put('hashtags', f.hashtags);
    if (f.status !== undefined) put('status', f.status);
    if (f.postedAt !== undefined) put('posted_at', f.postedAt);
    if (f.imagePostUrl !== undefined) put('image_post_url', f.imagePostUrl);
    if (f.reelPostUrl !== undefined) put('reel_post_url', f.reelPostUrl);
    if (f.bgmMediaId !== undefined) put('bgm_media_id', f.bgmMediaId);
    if (!sets.length) return this.findQueueItemById(id);
    sets.push('updated_at = now()');
    const r = await this.db.query<PostQueueItemVo>(
      `UPDATE post_queue SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  async removeQueueItem(id: string): Promise<PostQueueItemVo | null> {
    const r = await this.db.query<PostQueueItemVo>(
      'DELETE FROM post_queue WHERE id = $1 RETURNING *', [id]);
    return r.rows[0] || null;
  }
}
