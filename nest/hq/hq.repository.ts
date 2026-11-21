import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { HqDecisionRowVo, HqLeadRowVo, HqLogRowVo, HqRefRowVo, HqStateRowVo } from './vo/hq.vo';

/**
 * HQ 저장소.
 *   테이블은 migrate.js에 넣지 않고 DbService.ensureSchema로 **지연 생성**한다(진단 퍼널과 같은 방식) —
 *   3환경 공통 migrate.js를 건드리지 않아 다른 환경 배포에 영향이 없다.
 *   hq_state   : key 별 JSON(지금은 'board' 하나 — 방향·흐름·무기·상품·원칙·링크·고객 단계)
 *   hq_decisions: 결정할 것(code = D1, D2 …)
 *   hq_leads   : 고객·후보 보드. business_id 로 사업체(businesses)와 이을 수 있다(선택). next_action·next_date = 다음 할 일
 *   hq_log     : 기록(사람이 쓴 메모 + 바뀐 것 자동 한 줄)
 *   hq_refs    : 레퍼런스(작업 중·완성·권리 확인·공개). 목표 = 우리 작업을 알리고 레퍼런스를 쌓는 것
 */
const SCHEMA_KEY = 'hq.v3';
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
  // v2(2026-11-20) 고객 다음 할 일·날짜 — 영업 보드에서 "무엇을 언제" 를 놓치지 않게
  `ALTER TABLE hq_leads ADD COLUMN IF NOT EXISTS next_action TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE hq_leads ADD COLUMN IF NOT EXISTS next_date DATE`,
  // v3(2026-11-21) 레퍼런스 — 작업 하나가 작업 중→완성→권리 확인→공개를 지나 도피아의 레퍼런스가 된다
  //   published = 어디에 올렸나 [{channel, url, date}] · lead_id 로 고객과 이을 수 있다(선택)
  `CREATE TABLE IF NOT EXISTS hq_refs (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title       TEXT NOT NULL,
     client      TEXT NOT NULL DEFAULT '',
     kind        TEXT NOT NULL DEFAULT '',
     source      TEXT NOT NULL DEFAULT '도피아',
     stage       TEXT NOT NULL,
     lead_id     UUID REFERENCES hq_leads(id) ON DELETE SET NULL,
     result_url  TEXT NOT NULL DEFAULT '',
     note        TEXT NOT NULL DEFAULT '',
     published   JSONB NOT NULL DEFAULT '[]',
     done_date   DATE,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
];

/** 레퍼런스 행 SELECT 목록 — 날짜는 'YYYY-MM-DD' 문자열 */
const REF_COLS = `id, title, client, kind, source, stage, lead_id, result_url, note, published, to_char(done_date, 'YYYY-MM-DD') AS done_date, created_at, updated_at`;

/** 고객 행 SELECT 목록 — 날짜는 시간대 밀림이 없게 'YYYY-MM-DD' 문자열로 낸다 */
const LEAD_COLS = `id, name, kind, source, stage, contact, note, business_id, next_action, to_char(next_date, 'YYYY-MM-DD') AS next_date, created_at, updated_at`;

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

  /**
   * 판 한 덩어리를 **잠근 채** 읽고 고쳐 쓴다 — 두 사람이 동시에 다른 칸을 고쳐도 한쪽이 사라지지 않는다.
   *   change 가 null 을 돌려주면 아무것도 쓰지 않는다. 행이 없으면 null.
   */
  async updateState<T>(key: string, who: string, change: (value: any) => T | null): Promise<T | null> {
    await this.ensure();
    const conn = await this.db.connect();
    try {
      await conn.query('BEGIN');
      const r = await conn.query(`SELECT value FROM hq_state WHERE key = $1 FOR UPDATE`, [key]);
      if (!r.rows[0]) { await conn.query('ROLLBACK'); return null; }
      const value = r.rows[0].value;
      const result = change(value);
      if (result === null) { await conn.query('ROLLBACK'); return null; }
      await conn.query(`UPDATE hq_state SET value = $2, updated_by = $3, updated_at = now() WHERE key = $1`, [key, JSON.stringify(value), who]);
      await conn.query('COMMIT');
      return result;
    } catch (err) {
      await conn.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      conn.release();
    }
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
      `SELECT ${LEAD_COLS} FROM hq_leads ORDER BY updated_at DESC`,
    );
    return r.rows;
  }

  async insertLead(d: { name: string; kind: string; source: string; stage: string; contact: string; note: string; businessId: string | null; nextAction?: string; nextDate?: string | null; createdAt?: string | null; updatedAt?: string | null }): Promise<HqLeadRowVo> {
    await this.ensure();
    const r = await this.db.query<HqLeadRowVo>(
      `INSERT INTO hq_leads (name, kind, source, stage, contact, note, business_id, next_action, next_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, COALESCE($10::timestamptz, now()), COALESCE($11::timestamptz, now()))
       RETURNING ${LEAD_COLS}`,
      [d.name, d.kind, d.source, d.stage, d.contact, d.note, d.businessId, d.nextAction || '', d.nextDate || null, d.createdAt || null, d.updatedAt || null],
    );
    return r.rows[0];
  }

  async findLead(id: string): Promise<HqLeadRowVo | null> {
    await this.ensure();
    const r = await this.db.query<HqLeadRowVo>(
      `SELECT ${LEAD_COLS} FROM hq_leads WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async updateLead(id: string, d: { name: string; kind: string; source: string; stage: string; contact: string; note: string; businessId: string | null; nextAction: string; nextDate: string | null }): Promise<HqLeadRowVo> {
    const r = await this.db.query<HqLeadRowVo>(
      `UPDATE hq_leads SET name = $2, kind = $3, source = $4, stage = $5, contact = $6, note = $7, business_id = $8,
              next_action = $9, next_date = $10::date, updated_at = now()
        WHERE id = $1
       RETURNING ${LEAD_COLS}`,
      [id, d.name, d.kind, d.source, d.stage, d.contact, d.note, d.businessId, d.nextAction, d.nextDate],
    );
    return r.rows[0];
  }

  async deleteLead(id: string): Promise<void> {
    await this.db.query(`DELETE FROM hq_leads WHERE id = $1`, [id]);
  }

  // ─── 레퍼런스 ───
  async listRefs(): Promise<HqRefRowVo[]> {
    await this.ensure();
    const r = await this.db.query<HqRefRowVo>(`SELECT ${REF_COLS} FROM hq_refs ORDER BY updated_at DESC`);
    return r.rows;
  }

  async findRef(id: string): Promise<HqRefRowVo | null> {
    await this.ensure();
    const r = await this.db.query<HqRefRowVo>(`SELECT ${REF_COLS} FROM hq_refs WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async insertRef(d: { title: string; client: string; kind: string; source: string; stage: string; leadId: string | null; resultUrl: string; note: string; published: unknown[]; doneDate: string | null }): Promise<HqRefRowVo> {
    await this.ensure();
    const r = await this.db.query<HqRefRowVo>(
      `INSERT INTO hq_refs (title, client, kind, source, stage, lead_id, result_url, note, published, done_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date)
       RETURNING ${REF_COLS}`,
      [d.title, d.client, d.kind, d.source, d.stage, d.leadId, d.resultUrl, d.note, JSON.stringify(d.published), d.doneDate],
    );
    return r.rows[0];
  }

  async updateRef(id: string, d: { title: string; client: string; kind: string; source: string; stage: string; leadId: string | null; resultUrl: string; note: string; published: unknown[]; doneDate: string | null }): Promise<HqRefRowVo> {
    const r = await this.db.query<HqRefRowVo>(
      `UPDATE hq_refs SET title = $2, client = $3, kind = $4, source = $5, stage = $6, lead_id = $7, result_url = $8, note = $9,
              published = $10, done_date = $11::date, updated_at = now()
        WHERE id = $1
       RETURNING ${REF_COLS}`,
      [id, d.title, d.client, d.kind, d.source, d.stage, d.leadId, d.resultUrl, d.note, JSON.stringify(d.published), d.doneDate],
    );
    return r.rows[0];
  }

  async deleteRef(id: string): Promise<void> {
    await this.db.query(`DELETE FROM hq_refs WHERE id = $1`, [id]);
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
