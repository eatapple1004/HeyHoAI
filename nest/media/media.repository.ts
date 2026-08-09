import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  ImageAssetVo, VideoAssetVo, GenerationJobVo, VideoJobVo,
  VisualAttributeVo, VisualCategoryVo, VisualPresetVo,
} from './vo/media.vo';

/**
 * 미디어 도메인 데이터 접근 — 이미지/영상 에셋과 그 생성 Job, 비주얼 속성/프리셋.
 *
 * 테이블은 6개지만 전부 "캐릭터 하위 미디어"라는 한 집합으로 함께 조회·정렬되고,
 * 서로를 참조(job → asset)하므로 리포지토리를 쪼개지 않고 한 곳에 둔다.
 */
@Injectable()
export class MediaRepository {
  constructor(private readonly db: DbService) {}

  // ── 이미지 에셋 ──

  async findImageById(id: string): Promise<ImageAssetVo | null> {
    const r = await this.db.query<ImageAssetVo>('SELECT * FROM image_assets WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async findImagesByCharacter(
    characterId: string, o: { status?: string; limit?: number; offset?: number } = {},
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

  /**
   * 대표 이미지 교체 — **강등과 승격을 한 트랜잭션으로**.
   * 나눠 실행하면 중간에 끊겼을 때 master가 0개(대표 없음)이거나 2개(어느 쪽이 대표인지 불명)가 된다.
   */
  async setMasterImage(characterId: string, newMasterId: string): Promise<void> {
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

  // ── 영상 에셋 ──

  async findVideoById(id: string): Promise<VideoAssetVo | null> {
    const r = await this.db.query<VideoAssetVo>('SELECT * FROM video_assets WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async findVideosByCharacter(
    characterId: string, o: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<VideoAssetVo[]> {
    const { status, limit = 50, offset = 0 } = o;
    const conditions = ['character_id = $1'];
    const params: unknown[] = [characterId];
    let idx = 2;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    const r = await this.db.query<VideoAssetVo>(
      `SELECT * FROM video_assets WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]);
    return r.rows;
  }

  // ── 생성 Job 이력 ──

  async findImageJobsByCharacter(characterId: string): Promise<GenerationJobVo[]> {
    const r = await this.db.query<GenerationJobVo>(
      'SELECT * FROM generation_jobs WHERE character_id = $1 ORDER BY created_at DESC', [characterId]);
    return r.rows;
  }

  async findVideoJobsByCharacter(characterId: string): Promise<VideoJobVo[]> {
    const r = await this.db.query<VideoJobVo>(
      'SELECT * FROM video_generation_jobs WHERE character_id = $1 ORDER BY created_at DESC', [characterId]);
    return r.rows;
  }

  async findVideoJobById(id: string): Promise<VideoJobVo | null> {
    const r = await this.db.query<VideoJobVo>(
      'SELECT * FROM video_generation_jobs WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  // ── 비주얼 속성 ──

  async listCategories(): Promise<VisualCategoryVo[]> {
    const r = await this.db.query<VisualCategoryVo>(
      'SELECT * FROM visual_attribute_categories ORDER BY sort_order');
    return r.rows;
  }

  async findAttributesByCategory(categoryId: string): Promise<VisualAttributeVo[]> {
    const r = await this.db.query<VisualAttributeVo>(
      'SELECT * FROM visual_attributes WHERE category_id = $1 ORDER BY key', [categoryId]);
    return r.rows;
  }

  /** tags && $1 — 배열이 하나라도 겹치면 매칭(OR 검색) */
  async findAttributesByTags(tags: string[]): Promise<VisualAttributeVo[]> {
    const r = await this.db.query<VisualAttributeVo>(
      'SELECT * FROM visual_attributes WHERE tags && $1 ORDER BY category_id, key', [tags]);
    return r.rows;
  }

  async findAttributesByIds(ids: string[]): Promise<VisualAttributeVo[]> {
    if (!ids || ids.length === 0) return [];   // ANY(빈 배열)은 항상 공집합이라 쿼리 자체를 아낀다
    const r = await this.db.query<VisualAttributeVo>(
      'SELECT * FROM visual_attributes WHERE id = ANY($1) ORDER BY category_id, key', [ids]);
    return r.rows;
  }

  async findAllAttributes(): Promise<VisualAttributeVo[]> {
    const r = await this.db.query<VisualAttributeVo>(
      `SELECT va.*, vac.name_ko as category_name_ko, vac.name_en as category_name_en
         FROM visual_attributes va
         JOIN visual_attribute_categories vac ON vac.id = va.category_id
        ORDER BY vac.sort_order, va.key`);
    return r.rows;
  }

  async insertAttribute(a: {
    categoryId: string; key: string; value: string; promptFragment: string;
    tags?: string[]; metadata?: Record<string, unknown>;
  }): Promise<VisualAttributeVo> {
    const r = await this.db.query<VisualAttributeVo>(
      `INSERT INTO visual_attributes (category_id, key, value, prompt_fragment, tags, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [a.categoryId, a.key, a.value, a.promptFragment, a.tags || [], JSON.stringify(a.metadata || {})]);
    return r.rows[0];
  }

  // ── 비주얼 프리셋(캐릭터별 조합) ──

  async insertPreset(p: {
    characterId: string; name: string; description?: string;
    attributeIds: string[]; compiledPrompt: string; isDefault?: boolean;
  }): Promise<VisualPresetVo> {
    const r = await this.db.query<VisualPresetVo>(
      `INSERT INTO character_visual_presets
         (character_id, name, description, attribute_ids, compiled_prompt, is_default)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [p.characterId, p.name, p.description || '', p.attributeIds, p.compiledPrompt, p.isDefault || false]);
    return r.rows[0];
  }

  async findPresetsByCharacter(characterId: string): Promise<VisualPresetVo[]> {
    const r = await this.db.query<VisualPresetVo>(
      `SELECT * FROM character_visual_presets WHERE character_id = $1
        ORDER BY is_default DESC, created_at`, [characterId]);
    return r.rows;
  }
}
