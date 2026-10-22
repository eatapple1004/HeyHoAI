import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface TeamRow {
  business_id: string;
  settings: TeamSettings;
  notes: string;
  auto: boolean;
  last_run_at: string | null;
}

export interface TeamSettings {
  /** 켜진 에이전트 */
  agents?: { instagram?: boolean; trends?: boolean; reviews?: boolean };
  /** 인스타 담당이 한 번에 만드는 초안 수 */
  postsPerRun?: number;
  /** 게시 시각(KST, "19:00") */
  postTime?: string;
}

export interface TaskRow {
  id: string;
  business_id: string;
  agent: string;
  kind: string;
  status: string;
  title: string;
  body: any;
  feedback: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MarketingRepository {
  constructor(private readonly db: DbService) {}

  async business(id: string): Promise<{ id: string; name: string; industry: string | null; memo: string | null } | null> {
    const r = await this.db.query('SELECT id, name, industry, memo FROM businesses WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async team(businessId: string): Promise<TeamRow> {
    const r = await this.db.query<TeamRow>(
      `INSERT INTO marketing_teams (business_id) VALUES ($1)
       ON CONFLICT (business_id) DO UPDATE SET business_id = EXCLUDED.business_id RETURNING *`, [businessId]);
    return r.rows[0];
  }

  async updateTeam(businessId: string, p: { settings?: TeamSettings; notes?: string; auto?: boolean }) {
    await this.team(businessId);
    await this.db.query(
      `UPDATE marketing_teams SET settings = COALESCE($2::jsonb, settings), notes = COALESCE($3, notes), auto = COALESCE($4, auto), updated_at = now()
        WHERE business_id = $1`,
      [businessId, p.settings ? JSON.stringify(p.settings) : null, p.notes ?? null, p.auto ?? null]);
  }

  /** 주간 자동 실행 차례인 팀을 하나씩 가져간다 — UPDATE … RETURNING 으로 잡아서 두 프로세스가 같은 팀을 돌리지 않는다 */
  async claimDue(): Promise<string | null> {
    const r = await this.db.query<{ business_id: string }>(
      `UPDATE marketing_teams SET last_run_at = now()
        WHERE business_id = (SELECT business_id FROM marketing_teams
                              WHERE auto = true AND (last_run_at IS NULL OR last_run_at < now() - interval '7 days')
                              ORDER BY last_run_at NULLS FIRST LIMIT 1 FOR UPDATE SKIP LOCKED)
        RETURNING business_id`);
    return r.rows[0]?.business_id || null;
  }

  async touchRun(businessId: string) {
    await this.db.query('UPDATE marketing_teams SET last_run_at = now() WHERE business_id = $1', [businessId]);
  }

  async tasks(businessId: string, limit = 80): Promise<TaskRow[]> {
    const r = await this.db.query<TaskRow>('SELECT * FROM marketing_tasks WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2', [businessId, limit]);
    return r.rows;
  }

  async task(id: string): Promise<TaskRow | null> {
    const r = await this.db.query<TaskRow>('SELECT * FROM marketing_tasks WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async addTask(t: { businessId: string; agent: string; kind: string; title: string; status?: string; body?: any }): Promise<TaskRow> {
    const r = await this.db.query<TaskRow>(
      `INSERT INTO marketing_tasks (business_id, agent, kind, status, title, body) VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
      [t.businessId, t.agent, t.kind, t.status || 'running', t.title, JSON.stringify(t.body || {})]);
    return r.rows[0];
  }

  async updateTask(id: string, p: { status?: string; title?: string; body?: any; feedback?: string | null; error?: string | null }) {
    await this.db.query(
      `UPDATE marketing_tasks SET status = COALESCE($2, status), title = COALESCE($3, title), body = COALESCE($4::jsonb, body),
              feedback = COALESCE($5, feedback), error = $6, updated_at = now() WHERE id = $1`,
      [id, p.status ?? null, p.title ?? null, p.body ? JSON.stringify(p.body) : null, p.feedback ?? null, p.error ?? null]);
  }

  /** 아직 쓰지 않은 사진 — 게시 큐에 들어갔거나 최근 초안에 쓴 사진은 뺀다 */
  async freshImages(businessId: string, limit: number): Promise<{ id: string; file_path: string; caption: string | null; source: string | null; metadata: any }[]> {
    const r = await this.db.query(
      `SELECT m.id, m.file_path, m.caption, m.source, m.metadata
         FROM account_media m
         LEFT JOIN social_accounts sa ON sa.id = m.account_id
        WHERE (m.business_id = $1 OR sa.business_id = $1) AND m.media_type = 'image'
          AND NOT EXISTS (SELECT 1 FROM post_queue q WHERE q.image_media_id = m.id OR m.id = ANY(COALESCE(q.image_media_ids, ARRAY[]::uuid[])))
          AND NOT EXISTS (SELECT 1 FROM marketing_tasks t WHERE t.business_id = $1 AND t.kind = 'post' AND t.status <> 'rejected' AND t.body->>'mediaId' = m.id::text)
        ORDER BY COALESCE(m.is_base, false) DESC, m.created_at DESC
        LIMIT $2`, [businessId, limit]);
    return r.rows;
  }

  /** 홈페이지 제작에서 모은 자료(지도 정보·Google 리뷰·홈페이지 주소) — 없으면 null */
  async siteSource(businessId: string): Promise<any | null> {
    const r = await this.db.query('SELECT source, slug, status FROM business_sites WHERE business_id = $1', [businessId]);
    return r.rows[0] || null;
  }

  /** AI로 다시 만든 게시용 사진 — 사업체 사진으로 넣는다(source 'ai', 참고 원본은 metadata) */
  async insertAiMedia(businessId: string, filePath: string, caption: string, metadata: Record<string, unknown>): Promise<string> {
    const r = await this.db.query(
      `INSERT INTO account_media (business_id, file_path, media_type, caption, is_base, source, metadata)
       VALUES ($1, $2, 'image', $3, false, 'ai', $4) RETURNING id`, [businessId, filePath, caption, JSON.stringify(metadata)]);
    return r.rows[0].id;
  }

  /** 가장 최근에 끝난 마케팅 진단(biz-report) — 마케팅 팀이 할 일로 이어받는다 */
  async latestReport(businessId: string): Promise<{ id: string; data: any; created_at: string } | null> {
    const r = await this.db.query(
      `SELECT id, data, created_at FROM business_reports WHERE business_id = $1 AND status = 'done' ORDER BY created_at DESC LIMIT 1`, [businessId]);
    return r.rows[0] || null;
  }

  /** 최근 30일 게시 현황 — 동향 담당이 "다음 할 일"을 정할 때 본다 */
  async postStats(businessId: string): Promise<{ posted: number; failed: number; scheduled: number; lastPosted: string | null }> {
    const r = await this.db.query(
      `SELECT COUNT(*) FILTER (WHERE q.status = 'posted' AND q.posted_at > now() - interval '30 days')::int AS posted,
              COUNT(*) FILTER (WHERE q.status = 'failed' AND q.updated_at > now() - interval '30 days')::int AS failed,
              COUNT(*) FILTER (WHERE q.status IN ('scheduled','confirmed'))::int AS scheduled,
              MAX(q.posted_at) AS "lastPosted"
         FROM post_queue q JOIN social_accounts sa ON sa.id = q.account_id WHERE sa.business_id = $1`, [businessId]);
    return r.rows[0];
  }

  async hasAccount(businessId: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM social_accounts WHERE business_id = $1 LIMIT 1', [businessId]);
    return r.rows.length > 0;
  }
}
