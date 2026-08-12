import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { TemplateDataVo } from './vo/template-data.vo';

/** 사용자 저장 템플릿 데이터 접근 — template_data 테이블. 전부 user_id로 스코프된다. */
@Injectable()
export class TemplateDataRepository {
  constructor(private readonly db: DbService) {}

  async insert(userId: string, d: {
    templateType: string; characterId?: string | null; name: string; data?: Record<string, unknown>;
  }): Promise<TemplateDataVo> {
    const r = await this.db.query<TemplateDataVo>(
      `INSERT INTO template_data (user_id, template_type, character_id, name, data)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, d.templateType, d.characterId || null, d.name, JSON.stringify(d.data || {})],
    );
    return r.rows[0];
  }

  /** 목록 — templateType·characterId 선택 필터 */
  async findAll(userId: string, f: { templateType?: string; characterId?: string } = {}): Promise<TemplateDataVo[]> {
    const conditions = ['user_id = $1'];
    const params: unknown[] = [userId];
    let i = 2;
    if (f.templateType) { conditions.push(`template_type = $${i++}`); params.push(f.templateType); }
    if (f.characterId) { conditions.push(`character_id = $${i++}`); params.push(f.characterId); }
    const r = await this.db.query<TemplateDataVo>(
      `SELECT * FROM template_data WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`, params,
    );
    return r.rows;
  }

  async findById(userId: string, id: string): Promise<TemplateDataVo | null> {
    const r = await this.db.query<TemplateDataVo>(
      'SELECT * FROM template_data WHERE id = $1 AND user_id = $2', [id, userId],
    );
    return r.rows[0] || null;
  }

  /** 부분 수정 — 전달된 필드만 SET에 넣는다 */
  async update(userId: string, id: string, f: { name?: string; data?: Record<string, unknown> }): Promise<TemplateDataVo | null> {
    const sets = ['updated_at = now()'];
    const params: unknown[] = [id, userId];
    let i = 3;
    if (f.name !== undefined) { sets.push(`name = $${i++}`); params.push(f.name); }
    if (f.data !== undefined) { sets.push(`data = $${i++}`); params.push(JSON.stringify(f.data)); }
    const r = await this.db.query<TemplateDataVo>(
      `UPDATE template_data SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`, params,
    );
    return r.rows[0] || null;
  }

  async remove(userId: string, id: string): Promise<TemplateDataVo | null> {
    const r = await this.db.query<TemplateDataVo>(
      'DELETE FROM template_data WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId],
    );
    return r.rows[0] || null;
  }
}
