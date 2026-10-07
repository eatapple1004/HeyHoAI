import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { DiagnoseAnswersDto, DiagnoseRequestRowDto } from './dto/diagnose.dto';

/**
 * 진단 퍼널 저장소.
 *   테이블은 migrate.js에 넣지 않고 DbService.ensureSchema로 **지연 생성**한다 — 이 도메인은 dev에서
 *   먼저 돌고, 3환경 공통인 migrate.js를 건드리면 staging/prod 배포에도 영향이 가기 때문.
 *   (ensureSchema는 동시 생성 경쟁을 합치고 "이미 있음"을 성공으로 본다 — db.service 주석 참고)
 */
const SCHEMA_KEY = 'diagnose.v2';
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS diagnose_sessions (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     track       VARCHAR(10) NOT NULL,
     lang        VARCHAR(8),
     answers     JSONB NOT NULL,
     ip_hash     VARCHAR(64),
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_diagnose_sessions_created ON diagnose_sessions(created_at)`,
  // 2026-10-07 추가 컬럼 — 기존 dev 테이블에도 붙도록 ADD COLUMN IF NOT EXISTS
  `ALTER TABLE diagnose_sessions ADD COLUMN IF NOT EXISTS business_name TEXT`,
  `ALTER TABLE diagnose_sessions ADD COLUMN IF NOT EXISTS link TEXT`,
  `CREATE TABLE IF NOT EXISTS diagnose_requests (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id    UUID REFERENCES diagnose_sessions(id) ON DELETE SET NULL,
     track         VARCHAR(10) NOT NULL,
     lang          VARCHAR(8),
     business_name TEXT NOT NULL,
     contact_name  TEXT,
     contact       TEXT NOT NULL,
     links         JSONB NOT NULL DEFAULT '[]',
     message       TEXT,
     answers       JSONB,
     status        VARCHAR(20) NOT NULL DEFAULT 'new',
     ip_hash       VARCHAR(64),
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_diagnose_requests_created ON diagnose_requests(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_diagnose_requests_status ON diagnose_requests(status)`,
];

@Injectable()
export class DiagnoseRepository {
  constructor(private readonly db: DbService) {}

  private ensure(): Promise<void> {
    return this.db.ensureSchema(SCHEMA_KEY, SCHEMA_SQL);
  }

  async insertSession(d: { track: string; lang: string | null; answers: DiagnoseAnswersDto; ipHash: string | null; businessName: string | null; link: string | null }): Promise<string> {
    await this.ensure();
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO diagnose_sessions (track, lang, answers, ip_hash, business_name, link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [d.track, d.lang, JSON.stringify(d.answers), d.ipHash, d.businessName, d.link],
    );
    return r.rows[0].id;
  }

  /** 세션 id가 우리 테이블에 실제로 있는지 — 없는 id를 FK에 넣으면 INSERT가 통째로 죽는다 */
  async sessionExists(id: string): Promise<boolean> {
    await this.ensure();
    const r = await this.db.query('SELECT 1 FROM diagnose_sessions WHERE id = $1', [id]);
    return r.rowCount > 0;
  }

  async insertRequest(d: {
    sessionId: string | null; track: string; lang: string | null; businessName: string; contactName: string | null;
    contact: string; links: string[]; message: string | null; answers: DiagnoseAnswersDto | null; ipHash: string | null;
  }): Promise<string> {
    await this.ensure();
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO diagnose_requests
         (session_id, track, lang, business_name, contact_name, contact, links, message, answers, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [d.sessionId, d.track, d.lang, d.businessName, d.contactName, d.contact, JSON.stringify(d.links),
       d.message, d.answers ? JSON.stringify(d.answers) : null, d.ipHash],
    );
    return r.rows[0].id;
  }

  async listRequests(limit: number): Promise<DiagnoseRequestRowDto[]> {
    await this.ensure();
    const r = await this.db.query<DiagnoseRequestRowDto>(
      `SELECT id, session_id, track, lang, business_name, contact_name, contact, links, message, answers, status, created_at
         FROM diagnose_requests ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  }
}
