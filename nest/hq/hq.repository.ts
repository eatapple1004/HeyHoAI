import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { HqDecisionRowVo, HqLeadRowVo, HqLogRowVo, HqStateRowVo } from './vo/hq.vo';

/**
 * HQ 저장소.
 *   테이블은 migrate.js에 넣지 않고 DbService.ensureSchema로 **지연 생성**한다(진단 퍼널과 같은 방식) —
 *   3환경 공통 migrate.js를 건드리지 않아 다른 환경 배포에 영향이 없다.
 *   hq_state   : key 별 JSON(지금은 'board' 하나 — 방향·흐름·무기·상품·원칙·링크·고객 단계)
 *   hq_decisions: 결정할 것(code = D1, D2 …)
 *   hq_leads   : 고객·후보 보드. business_id 로 사업체(businesses)와 이을 수 있다(선택)
 *   hq_log     : 기록(사람이 쓴 메모 + 바뀐 것 자동 한 줄)
 */
const SCHEMA_KEY = 'hq.v1';
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS hq_state (
     key         VARCHAR(40) PRIMARY KEY,
     value       JSONB NOT NULL,
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_by  TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS hq_decisions (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     code        VARCHAR(10) NOT NULL UNIQUE,
     question    TEXT NOT NULL,
     options     TEXT NOT NULL DEFAULT '',
     recommend   TEXT NOT NULL DEFAULT '',
     status      VARCHAR(10) NOT NULL DEFAULT '대기',
     answer      TEXT NOT NULL DEFAULT '',
     opened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
     decided_at  TIMESTAMPTZ
   )`,
  `CREATE TABLE IF NOT EXISTS hq_leads (
     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name         TEXT NOT NULL,
     kind         TEXT NOT NULL DEFAULT '',
     source       TEXT NOT NULL DEFAULT '',
     stage        TEXT NOT NULL,
     contact      TEXT NOT NULL DEFAULT '',
     note         TEXT NOT NULL DEFAULT '',
     business_id  UUID REFERENCES businesses(id) ON DELETE SET NULL,
     created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hq_log (
     id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     at    TIMESTAMPTZ NOT NULL DEFAULT now(),
     who   TEXT NOT NULL DEFAULT '',
     kind  VARCHAR(20) NOT NULL DEFAULT '메모',
     text  TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_hq_log_at ON hq_log(at DESC)`,
];

@Injectable()
export class HqRepository {
  constructor(private readonly db: DbService) {}

  private ensure(): Promise<void> {
    return this.db.ensureSchema(SCHEMA_KEY, SCHEMA_SQL);
  }

  // ─── 판(board) ───
  async getState(key: string): Promise<HqStateRowVo | null> {
    await this.ensure();
    const r = await this.db.query<HqStateRowVo>(`SELECT key, value, updated_at, updated_by FROM hq_state WHERE key = $1`, [key]);
    return r.rows[0] || null;
  }

  async putState(key: string, value: unknown, who: string): Promise<void> {
    await this.ensure();
    await this.db.query(
      `INSERT INTO hq_state (key, value, updated_by) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, JSON.stringify(value), who],
    );
  }

  // ─── 결정 ───
  async listDecisions(): Promise<HqDecisionRowVo[]> {
    await this.ensure();
    const r = await this.db.query<HqDecisionRowVo>(
      `SELECT id, code, question, options, recommend, status, answer, opened_at, decided_at
         FROM hq_decisions ORDER BY (substring(code from 2))::int`,
    );
    return r.rows;
  }

  async insertDecision(d: { code: string; question: string; options: string; recommend: string; status: string; answer: string; openedAt?: string | null; decidedAt?: string | null }): Promise<HqDecisionRowVo> {
    await this.ensure();
    const r = await this.db.query<HqDecisionRowVo>(
      `INSERT INTO hq_decisions (code, question, options, recommend, status, answer, opened_at, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()), $8::timestamptz)
       RETURNING id, code, question, options, recommend, status, answer, opened_at, decided_at`,
      [d.code, d.question, d.options, d.recommend, d.status, d.answer, d.openedAt || null, d.decidedAt || null],
    );
    return r.rows[0];
  }

  async nextDecisionCode(): Promise<string> {
    await this.ensure();
    const r = await this.db.query<{ n: number }>(`SELECT COALESCE(MAX((substring(code from 2))::int), 0) + 1 AS n FROM hq_decisions`);
    return `D${r.rows[0].n}`;
  }

  async findDecision(code: string): Promise<HqDecisionRowVo | null> {
    await this.ensure();
    const r = await this.db.query<HqDecisionRowVo>(
      `SELECT id, code, question, options, recommend, status, answer, opened_at, decided_at FROM hq_decisions WHERE code = $1`, [code]);
    return r.rows[0] || null;
  }

  async updateDecision(code: string, status: string, answer: string, decidedAt: 'now' | 'keep' | 'clear'): Promise<HqDecisionRowVo> {
    const decided = decidedAt === 'now' ? 'now()' : decidedAt === 'clear' ? 'NULL' : 'decided_at';
    const r = await this.db.query<HqDecisionRowVo>(
      `UPDATE hq_decisions SET status = $2, answer = $3, decided_at = ${decided} WHERE code = $1
       RETURNING id, code, question, options, recommend, status, answer, opened_at, decided_at`,
      [code, status, answer],
    );
    return r.rows[0];
  }

  // ─── 고객 ───
  async listLeads(): Promise<HqLeadRowVo[]> {
    await this.ensure();
    const r = await this.db.query<HqLeadRowVo>(
      `SELECT id, name, kind, source, stage, contact, note, business_id, created_at, updated_at FROM hq_leads ORDER BY updated_at DESC`,
    );
    return r.rows;
  }

  async insertLead(d: { name: string; kind: string; source: string; stage: string; contact: string; note: string; businessId: string | null; createdAt?: string | null; updatedAt?: string | null }): Promise<HqLeadRowVo> {
    await this.ensure();
    const r = await this.db.query<HqLeadRowVo>(
      `INSERT INTO hq_leads (name, kind, source, stage, contact, note, business_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()), COALESCE($9::timestamptz, now()))
       RETURNING id, name, kind, source, stage, contact, note, business_id, created_at, updated_at`,
      [d.name, d.kind, d.source, d.stage, d.contact, d.note, d.businessId, d.createdAt || null, d.updatedAt || null],
    );
    return r.rows[0];
  }

  async findLead(id: string): Promise<HqLeadRowVo | null> {
    await this.ensure();
    const r = await this.db.query<HqLeadRowVo>(
      `SELECT id, name, kind, source, stage, contact, note, business_id, created_at, updated_at FROM hq_leads WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async updateLead(id: string, d: { name: string; kind: string; source: string; stage: string; contact: string; note: string; businessId: string | null }): Promise<HqLeadRowVo> {
    const r = await this.db.query<HqLeadRowVo>(
      `UPDATE hq_leads SET name = $2, kind = $3, source = $4, stage = $5, contact = $6, note = $7, business_id = $8, updated_at = now()
        WHERE id = $1
       RETURNING id, name, kind, source, stage, contact, note, business_id, created_at, updated_at`,
      [id, d.name, d.kind, d.source, d.stage, d.contact, d.note, d.businessId],
    );
    return r.rows[0];
  }

  async deleteLead(id: string): Promise<void> {
    await this.db.query(`DELETE FROM hq_leads WHERE id = $1`, [id]);
  }

  // ─── 기록 ───
  async listLog(limit: number): Promise<HqLogRowVo[]> {
    await this.ensure();
    const r = await this.db.query<HqLogRowVo>(`SELECT id, at, who, kind, text FROM hq_log ORDER BY at DESC LIMIT $1`, [limit]);
    return r.rows;
  }

  async insertLog(d: { who: string; kind: string; text: string; at?: string | null }): Promise<void> {
    await this.ensure();
    await this.db.query(
      `INSERT INTO hq_log (at, who, kind, text) VALUES (COALESCE($1::timestamptz, now()), $2, $3, $4)`,
      [d.at || null, d.who, d.kind, d.text],
    );
  }

  /** 사업체 id 가 실제로 있는지 — 없는 id 를 이으면 FK 오류 대신 400 으로 알려 주려고 */
  async businessExists(id: string): Promise<boolean> {
    const r = await this.db.query(`SELECT 1 FROM businesses WHERE id = $1`, [id]);
    return r.rows.length > 0;
  }

  /** 관리자 토큰에는 id 만 있어서, 기록에 남길 이메일을 찾는다 */
  async emailOf(userId: string): Promise<string | null> {
    const r = await this.db.query<{ email: string }>(`SELECT email FROM users WHERE id = $1`, [userId]);
    return r.rows[0]?.email || null;
  }
}
