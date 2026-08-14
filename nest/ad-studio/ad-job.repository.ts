import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** ad_jobs 행 — DB 컬럼명(snake_case) 유지 */
export interface AdJobVo {
  readonly id: string;
  readonly user_id: string;
  readonly team_id: string | null;
  readonly mode: string;
  readonly specific_mode: string;
  readonly web_product_id: string | null;
  readonly hook_id: string | null;
  readonly setting_id: string | null;
  readonly avatar_ids: string[];
  readonly duration: number;
  readonly resolution: string;
  readonly aspect_ratio: string;
  readonly generate_audio: boolean;
  readonly enhanced_prompt: string | null;
  readonly shots: Array<{ index: number; startSec: number; endSec: number; action: string; dialogueKo: string }>;
  readonly engine: string | null;
  readonly provider_job_id: string | null;
  readonly provider_meta: Record<string, any>;
  readonly status: string;
  readonly result_url: string | null;
  readonly error: string | null;
  readonly charged: number;
  readonly created_at: string;
  readonly finished_at: string | null;
}

/** 폴링에 필요한 provider 메타(status_url 등) — provider_job_id 하나로는 부족해서 함께 싣는다 */
export interface ProviderMeta {
  [k: string]: any;
}

@Injectable()
export class AdJobRepository {
  constructor(private readonly db: DbService) {}

  async insert(d: {
    userId: string; teamId: string | null; mode: string; specificMode: string;
    webProductId: string | null; hookId: string | null; settingId: string | null;
    avatarIds: string[]; duration: number; resolution: string; aspectRatio: string;
    generateAudio: boolean; enhancedPrompt: string; engine: string; charged: number;
    shots: any[];
  }): Promise<AdJobVo> {
    const r = await this.db.query<AdJobVo>(
      `INSERT INTO ad_jobs
         (user_id, team_id, mode, specific_mode, web_product_id, hook_id, setting_id, avatar_ids,
          duration, resolution, aspect_ratio, generate_audio, enhanced_prompt, engine, charged, shots, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,'pending')
       RETURNING *`,
      [d.userId, d.teamId, d.mode, d.specificMode, d.webProductId, d.hookId, d.settingId,
       JSON.stringify(d.avatarIds || []), d.duration, d.resolution, d.aspectRatio,
       d.generateAudio, d.enhancedPrompt, d.engine, d.charged, JSON.stringify(d.shots || [])]);
    return r.rows[0];
  }

  async findById(id: string, userId: string): Promise<AdJobVo | null> {
    const r = await this.db.query<AdJobVo>(
      'SELECT * FROM ad_jobs WHERE id = $1 AND user_id = $2', [id, userId]);
    return r.rows[0] || null;
  }

  async listByUser(userId: string, limit = 30): Promise<AdJobVo[]> {
    const r = await this.db.query<AdJobVo>(
      'SELECT * FROM ad_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return r.rows;
  }

  /** 제출 직후 — provider job id와 폴링 메타를 함께 저장한다(엔진마다 폴링 방식이 달라 메타가 필요하다) */
  async markSubmitted(id: string, providerJobId: string, meta: ProviderMeta = {}): Promise<void> {
    await this.db.query(
      `UPDATE ad_jobs SET status = 'processing', provider_job_id = $2, provider_meta = $3::jsonb, error = null
        WHERE id = $1`,
      [id, providerJobId, JSON.stringify(meta || {})]);
  }

  async markCompleted(id: string, resultUrl: string): Promise<void> {
    await this.db.query(
      `UPDATE ad_jobs SET status = 'completed', result_url = $2, finished_at = now() WHERE id = $1`,
      [id, resultUrl]);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE ad_jobs SET status = 'failed', error = $2, finished_at = now() WHERE id = $1`,
      [id, String(error).slice(0, 500)]);
  }
}
