import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ContentVo, PublishJobVo } from './vo/content.vo';

/**
 * 콘텐츠 + 게시 Job 저장소.
 *
 * ⚠️ UPDATE 컬럼은 **화이트리스트로만** 만든다. 호출자가 준 객체의 키를 그대로 SQL에 붙이면
 *   (레거시가 그랬다) 컬럼명이 외부 입력으로 결정되고, 잘못된 키는 SQL 에러(500)가 된다.
 */
const CONTENT_UPDATABLE: Record<string, string> = {
  caption: 'caption',
  hashtags: 'hashtags',
  callToAction: 'call_to_action',
  call_to_action: 'call_to_action',
  altText: 'alt_text',
  alt_text: 'alt_text',
  status: 'status',
  scheduled_at: 'scheduled_at',
  scheduledAt: 'scheduled_at',
};

@Injectable()
export class PublishingRepository {
  constructor(private readonly db: DbService) {}

  // ── contents ──

  async insertContent(d: {
    characterId: string; mediaType: string; mediaAssetIds: string[];
    caption: string; hashtags: string[]; callToAction: string; altText: string; mediaContext: string;
  }): Promise<ContentVo> {
    const r = await this.db.query<ContentVo>(
      `INSERT INTO contents
         (character_id, media_type, media_asset_ids, caption, hashtags,
          call_to_action, alt_text, media_context, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft') RETURNING *`,
      [d.characterId, d.mediaType, d.mediaAssetIds, d.caption, d.hashtags,
       d.callToAction, d.altText, d.mediaContext]);
    return r.rows[0];
  }

  async findContentById(id: string): Promise<ContentVo | null> {
    const r = await this.db.query<ContentVo>('SELECT * FROM contents WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  /** 목록 + 전체 건수(페이지네이션용) */
  async findContentsByCharacter(
    characterId: string, o: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<{ rows: ContentVo[]; total: number }> {
    const { status, limit = 20, offset = 0 } = o;
    const conditions = ['character_id = $1'];
    const params: unknown[] = [characterId];
    let idx = 2;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    const where = conditions.join(' AND ');
    const count = await this.db.query<{ count: string }>(`SELECT COUNT(*) FROM contents WHERE ${where}`, params);
    const data = await this.db.query<ContentVo>(
      `SELECT * FROM contents WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]);
    return { rows: data.rows, total: parseInt(count.rows[0].count, 10) };
  }

  /** 화이트리스트에 없는 키는 **조용히 무시**한다(잘못된 키로 500이 나지 않도록) */
  async updateContent(id: string, fields: Record<string, unknown>): Promise<ContentVo | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    let idx = 2;
    for (const [key, value] of Object.entries(fields || {})) {
      const col = CONTENT_UPDATABLE[key];
      if (!col || value === undefined) continue;
      sets.push(`${col} = $${idx++}`);
      params.push(value);
    }
    if (sets.length === 0) return this.findContentById(id);
    sets.push('updated_at = now()');
    const r = await this.db.query<ContentVo>(
      `UPDATE contents SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  updateContentStatus(id: string, status: string): Promise<ContentVo | null> {
    return this.updateContent(id, { status });
  }

  // ── publish_jobs ──

  async insertPublishJob(d: { contentId: string; characterId: string; scheduledAt?: string }): Promise<PublishJobVo> {
    const r = await this.db.query<PublishJobVo>(
      `INSERT INTO publish_jobs (content_id, character_id, scheduled_at, status)
       VALUES ($1,$2,$3,'pending') RETURNING *`,
      [d.contentId, d.characterId, d.scheduledAt || null]);
    return r.rows[0];
  }

  async findJobById(id: string): Promise<PublishJobVo | null> {
    const r = await this.db.query<PublishJobVo>('SELECT * FROM publish_jobs WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async findJobsByCharacter(
    characterId: string, o: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<PublishJobVo[]> {
    const { status, limit = 20, offset = 0 } = o;
    const conditions = ['character_id = $1'];
    const params: unknown[] = [characterId];
    let idx = 2;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    const r = await this.db.query<PublishJobVo>(
      `SELECT * FROM publish_jobs WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]);
    return r.rows;
  }

  /** 완료·실패 시각은 DB에서 찍는다(앱 서버 시계에 의존하지 않도록) */
  async updateJobStatus(
    id: string,
    u: { status: string; igMediaId?: string; igPermalink?: string; attempt?: number; error?: string },
  ): Promise<PublishJobVo> {
    const sets = ['status = $2', 'updated_at = now()'];
    const params: unknown[] = [id, u.status];
    let idx = 3;
    if (u.igMediaId) { sets.push(`ig_media_id = $${idx++}`); params.push(u.igMediaId); }
    if (u.igPermalink) { sets.push(`ig_permalink = $${idx++}`); params.push(u.igPermalink); }
    if (u.attempt != null) { sets.push(`attempt = $${idx++}`); params.push(u.attempt); }
    if (u.error) { sets.push(`error = $${idx++}`); params.push(u.error); }
    if (u.status === 'published' || u.status === 'failed') sets.push('finished_at = now()');
    if (u.status === 'published') sets.push('published_at = now()');
    const r = await this.db.query<PublishJobVo>(
      `UPDATE publish_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return r.rows[0];
  }
}
