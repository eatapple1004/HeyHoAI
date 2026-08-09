import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ImageAssetVo, ImageAssetStatus } from './vo/image-asset.vo';

/** 생성 이미지 에셋 저장소 — 캐릭터의 후보/대표(master) 이미지 관리 */
@Injectable()
export class ImageAssetRepository {
  constructor(private readonly db: DbService) {}

  /** 새 이미지는 항상 'candidate'로 들어온다(대표 지정은 setMaster로만) */
  async insert(data: {
    characterId: string; jobId: string; prompt: string; negativePrompt?: string;
    provider: string; providerJobId?: string; imageUrl: string;
    width: number; height: number; seed?: number | null;
    variationLabel?: string; metadata?: Record<string, any>;
  }): Promise<ImageAssetVo> {
    const r = await this.db.query<ImageAssetVo>(
      `INSERT INTO image_assets
         (character_id, job_id, prompt, negative_prompt, provider, provider_job_id,
          image_url, width, height, seed, variation_label, metadata, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'candidate')
       RETURNING *`,
      [data.characterId, data.jobId, data.prompt, data.negativePrompt, data.provider,
       data.providerJobId, data.imageUrl, data.width, data.height, data.seed ?? null,
       data.variationLabel, JSON.stringify(data.metadata || {})]);
    return r.rows[0];
  }

  async findById(id: string): Promise<ImageAssetVo | null> {
    const r = await this.db.query<ImageAssetVo>('SELECT * FROM image_assets WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async findByJobId(jobId: string): Promise<ImageAssetVo[]> {
    const r = await this.db.query<ImageAssetVo>(
      'SELECT * FROM image_assets WHERE job_id = $1 ORDER BY created_at', [jobId]);
    return r.rows;
  }

  async findByCharacterId(
    characterId: string,
    o: { status?: ImageAssetStatus; limit?: number; offset?: number } = {},
  ): Promise<ImageAssetVo[]> {
    const { status, limit = 50, offset = 0 } = o;
    const conditions = ['character_id = $1'];
    const params: unknown[] = [characterId];
    let idx = 2;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    const r = await this.db.query<ImageAssetVo>(
      `SELECT * FROM image_assets WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]);
    return r.rows;
  }

  async updateStatus(id: string, status: ImageAssetStatus): Promise<ImageAssetVo | null> {
    const r = await this.db.query<ImageAssetVo>(
      'UPDATE image_assets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', [status, id]);
    return r.rows[0] || null;
  }

  /**
   * 대표 이미지 교체 — **강등과 승격을 한 트랜잭션으로** 묶는다.
   * 나눠 실행하면 중간에 끊겼을 때 master가 0개(대표 없음)이거나 2개(어느 쪽이 대표인지 불명)가 된다.
   */
  async setMaster(characterId: string, newMasterId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE image_assets SET status = 'candidate', updated_at = now()
          WHERE character_id = $1 AND status = 'master'`, [characterId]);
      await client.query(
        `UPDATE image_assets SET status = 'master', updated_at = now() WHERE id = $1`, [newMasterId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}
