import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * 고급 주택 3D 마감 체험(/house3d) 저장소 — 상담 요청과 업체 설정(단가·자재 사진·숨김).
 *   diagnose 와 같은 이유로 migrate.js 대신 ensureSchema 로 **지연 생성**한다(dev 전용 시안이라
 *   3환경 공통 마이그레이션을 건드리지 않는다).
 */
const SCHEMA_KEY = 'house3d.v1';
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS house3d_requests (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     status      VARCHAR(20) NOT NULL DEFAULT '신규',
     kind        VARCHAR(30) NOT NULL,
     source      VARCHAR(20) NOT NULL,
     home_id     VARCHAR(80),
     home_name   VARCHAR(120),
     name        TEXT NOT NULL,
     phone       TEXT NOT NULL,
     estimate_total BIGINT,
     payload     JSONB NOT NULL,
     ip_hash     VARCHAR(64),
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_house3d_requests_created ON house3d_requests(created_at)`,
  `CREATE TABLE IF NOT EXISTS house3d_settings (
     key         VARCHAR(40) PRIMARY KEY,
     value       JSONB NOT NULL,
     updated_by  UUID,
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
];

export interface House3dRequestRow {
  id: string;
  status: string;
  kind: string;
  source: string;
  home_id: string | null;
  home_name: string | null;
  name: string;
  phone: string;
  estimate_total: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class House3dRepository {
  constructor(private readonly db: DbService) {}

  private ensure(): Promise<void> {
    return this.db.ensureSchema(SCHEMA_KEY, SCHEMA_SQL);
  }

  async insertRequest(d: {
    kind: string; source: string; homeId: string | null; homeName: string | null; name: string; phone: string;
    estimateTotal: number | null; payload: Record<string, unknown>; ipHash: string;
  }): Promise<{ id: string; created_at: string }> {
    await this.ensure();
    const r = await this.db.query<{ id: string; created_at: string }>(
      `INSERT INTO house3d_requests (kind, source, home_id, home_name, name, phone, estimate_total, payload, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`,
      [d.kind, d.source, d.homeId, d.homeName, d.name, d.phone, d.estimateTotal, JSON.stringify(d.payload), d.ipHash],
    );
    return r.rows[0];
  }

  async listRequests(limit: number): Promise<House3dRequestRow[]> {
    await this.ensure();
    const r = await this.db.query<House3dRequestRow>(
      `SELECT id, status, kind, source, home_id, home_name, name, phone, estimate_total, payload, created_at, updated_at
         FROM house3d_requests ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  }

  async setStatus(id: string, status: string): Promise<boolean> {
    await this.ensure();
    const r = await this.db.query('UPDATE house3d_requests SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
    return r.rowCount > 0;
  }

  async deleteRequest(id: string): Promise<boolean> {
    await this.ensure();
    const r = await this.db.query('DELETE FROM house3d_requests WHERE id = $1', [id]);
    return r.rowCount > 0;
  }

  async getSetting(key: string): Promise<{ value: unknown; updated_at: string } | null> {
    await this.ensure();
    const r = await this.db.query<{ value: unknown; updated_at: string }>('SELECT value, updated_at FROM house3d_settings WHERE key = $1', [key]);
    return r.rows[0] || null;
  }

  async putSetting(key: string, value: unknown, userId: string): Promise<string> {
    await this.ensure();
    const r = await this.db.query<{ updated_at: string }>(
      `INSERT INTO house3d_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
       RETURNING updated_at`,
      [key, JSON.stringify(value), userId],
    );
    return r.rows[0].updated_at;
  }
}
