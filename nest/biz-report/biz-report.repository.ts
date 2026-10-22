import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface ReportRow { id: string; business_id: string; status: string; step: string | null; error: string | null; data: any; created_at: string; updated_at: string }

@Injectable()
export class BizReportRepository {
  constructor(private readonly db: DbService) {}

  async business(id: string): Promise<{ id: string; name: string; industry: string | null; memo: string | null } | null> {
    return (await this.db.query('SELECT id, name, industry, memo FROM businesses WHERE id = $1', [id])).rows[0] || null;
  }

  async site(businessId: string): Promise<any | null> {
    return (await this.db.query('SELECT * FROM business_sites WHERE business_id = $1', [businessId])).rows[0] || null;
  }

  async list(businessId: string): Promise<ReportRow[]> {
    return (await this.db.query<ReportRow>('SELECT * FROM business_reports WHERE business_id = $1 ORDER BY created_at DESC LIMIT 10', [businessId])).rows;
  }

  async add(businessId: string): Promise<ReportRow> {
    return (await this.db.query<ReportRow>(`INSERT INTO business_reports (business_id, step) VALUES ($1, '자료를 모으는 중') RETURNING *`, [businessId])).rows[0];
  }

  /** 진행 중(running)으로 남은 진단을 실패로 — 서버 시작 때 */
  async failRunning(reason: string): Promise<number> {
    const r = await this.db.query(`UPDATE business_reports SET status = 'error', step = NULL, error = $1, updated_at = now() WHERE status NOT IN ('done', 'error')`, [reason]);
    return r.rowCount || 0;
  }

  async patch(id: string, p: { status?: string; step?: string | null; error?: string | null; data?: any }) {
    await this.db.query(
      `UPDATE business_reports SET status = COALESCE($2, status), step = $3, error = $4, data = COALESCE($5::jsonb, data), updated_at = now() WHERE id = $1`,
      [id, p.status ?? null, p.step ?? null, p.error ?? null, p.data ? safeJson(p.data) : null]);
  }

  /** 사업체가 직접 올린 사진 수 — 인스타·홈페이지에 쓸 수 있는 자산 */
  async ownPhotos(businessId: string): Promise<number> {
    const r = await this.db.query(
      `SELECT COUNT(*)::int AS n FROM account_media m LEFT JOIN social_accounts sa ON sa.id = m.account_id
        WHERE (m.business_id = $1 OR sa.business_id = $1) AND m.media_type = 'image'`, [businessId]);
    return r.rows[0]?.n || 0;
  }

  async social(businessId: string): Promise<{ platform: string; username: string }[]> {
    return (await this.db.query('SELECT platform, username FROM social_accounts WHERE business_id = $1', [businessId])).rows;
  }

  /** 도피아에 연결된 인스타 계정과 토큰 — 토큰은 이 서버 안에서만 쓴다(응답·로그에 내보내지 않음) */
  async connectedInstagram(businessId: string): Promise<{ username: string; igUserId: string; token: string; authMode: 'instagram' | 'facebook' }[]> {
    try {
      const r = await this.db.query(
        `SELECT sa.username, sa.account_id AS "igUserId", t.access_token AS token, t.auth_mode AS "authMode"
           FROM social_accounts sa JOIN meta_ig_tokens t ON t.account_id = sa.id
          WHERE sa.business_id = $1 AND sa.account_id IS NOT NULL`, [businessId]);
      return r.rows;
    } catch { return []; }
  }

  async postStats(businessId: string): Promise<{ posted30: number; failed30: number; scheduled: number; lastPosted: string | null }> {
    const r = await this.db.query(
      `SELECT COUNT(*) FILTER (WHERE q.status = 'posted' AND q.posted_at > now() - interval '30 days')::int AS "posted30",
              COUNT(*) FILTER (WHERE q.status = 'failed' AND q.updated_at > now() - interval '30 days')::int AS "failed30",
              COUNT(*) FILTER (WHERE q.status IN ('scheduled','confirmed'))::int AS scheduled,
              MAX(q.posted_at) AS "lastPosted"
         FROM post_queue q JOIN social_accounts sa ON sa.id = q.account_id WHERE sa.business_id = $1`, [businessId]);
    return r.rows[0];
  }

  async marketingDrafts(businessId: string): Promise<{ ready: number; done: number }> {
    try {
      const r = await this.db.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'ready')::int AS ready, COUNT(*) FILTER (WHERE status = 'done')::int AS done FROM marketing_tasks WHERE business_id = $1`, [businessId]);
      return r.rows[0];
    } catch { return { ready: 0, done: 0 }; }
  }
}

/**
 * jsonb 에 넣을 JSON — 글을 글자 수로 자르다 이모지(서로게이트 쌍)가 반으로 잘린 문자와 NUL 을 지운다.
 *   Postgres 는 짝 없는 서로게이트(\ud83c)·\u0000 이 든 JSON 을 거부한다(인스타 캡션 120자 자르기에서 실측, 2026-10-22)
 */
function safeJson(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (typeof x === 'string'
    ? x.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]|\u0000/g, '')
    : x));
}
