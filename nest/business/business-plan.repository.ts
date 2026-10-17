import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** 월간 운영 플랜 — 한 달치 인스타 게시 계획(사업체·월 단위) */
export interface MonthPlanVo {
  id: string;
  business_id: string;
  account_id: string | null;
  month: string;
  posts_per_week: number;
  reel_ratio: string;
  brief: string | null;
  status: string;
  customer_feedback: string | null;
  doppia_approved_at: string | null;
  sent_at: string | null;
  customer_approved_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

/** 플랜의 게시물 한 칸 */
export interface PlanItemVo {
  id: string;
  plan_id: string;
  post_at: string;
  format: string;
  theme: string | null;
  brief: string | null;
  caption: string | null;
  hashtags: string[];
  media_ids: string[];
  /** 이 게시물 전용 원본(칸마다 따로 올린 제품 사진) — 팩은 이걸 우선 쓴다 */
  source_media_ids: string[];
  gen_status: string;
  gen_error: string | null;
  gen_stage: string | null;
  pack_id: string | null;
  video_job_id: string | null;
  updated_at: string;
  feedback: string | null;
  queue_id: string | null;
}

@Injectable()
export class BusinessPlanRepository {
  constructor(private readonly db: DbService) {}

  async plansOf(businessId: string): Promise<MonthPlanVo[]> {
    const r = await this.db.query<MonthPlanVo>(
      `SELECT p.*, (SELECT COUNT(*)::int FROM business_plan_items i WHERE i.plan_id = p.id) AS item_count
         FROM business_month_plans p WHERE p.business_id = $1 ORDER BY p.month DESC`, [businessId]);
    return r.rows;
  }

  async findPlan(planId: string): Promise<MonthPlanVo | null> {
    const r = await this.db.query<MonthPlanVo>('SELECT * FROM business_month_plans WHERE id = $1', [planId]);
    return r.rows[0] || null;
  }

  async insertPlan(d: {
    businessId: string; accountId: string | null; month: string; postsPerWeek: number; reelRatio: number; brief: string | null;
  }): Promise<MonthPlanVo> {
    const r = await this.db.query<MonthPlanVo>(
      `INSERT INTO business_month_plans (business_id, account_id, month, posts_per_week, reel_ratio, brief)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [d.businessId, d.accountId, d.month, d.postsPerWeek, d.reelRatio, d.brief]);
    return r.rows[0];
  }

  /** 설정값(주당 게시 수·릴스 비율·이번 달 강조·계정) 수정 */
  async updatePlan(planId: string, patch: Record<string, unknown>): Promise<MonthPlanVo> {
    const allowed = ['account_id', 'posts_per_week', 'reel_ratio', 'brief', 'status', 'customer_feedback',
      'doppia_approved_at', 'doppia_approved_by', 'sent_at', 'customer_approved_at', 'scheduled_at'];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k));
    if (!keys.length) return (await this.findPlan(planId)) as MonthPlanVo;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`);
    const r = await this.db.query<MonthPlanVo>(
      `UPDATE business_month_plans SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
      [planId, ...keys.map((k) => patch[k])]);
    return r.rows[0];
  }

  async deletePlan(planId: string): Promise<void> {
    await this.db.query('DELETE FROM business_month_plans WHERE id = $1', [planId]);
  }

  async itemsOf(planId: string): Promise<PlanItemVo[]> {
    const r = await this.db.query<PlanItemVo>(
      'SELECT * FROM business_plan_items WHERE plan_id = $1 ORDER BY post_at, created_at', [planId]);
    return r.rows;
  }

  async findItem(itemId: string): Promise<PlanItemVo | null> {
    const r = await this.db.query<PlanItemVo>('SELECT * FROM business_plan_items WHERE id = $1', [itemId]);
    return r.rows[0] || null;
  }

  /** 초안 다시 짜기 — 아직 큐에 안 올라간 항목만 지운다 */
  async clearDraftItems(planId: string): Promise<void> {
    await this.db.query('DELETE FROM business_plan_items WHERE plan_id = $1 AND queue_id IS NULL', [planId]);
  }

  async insertItem(planId: string, d: {
    postAt: string; format: string; theme?: string | null; brief?: string | null; caption?: string | null; hashtags?: string[];
  }): Promise<PlanItemVo> {
    const r = await this.db.query<PlanItemVo>(
      `INSERT INTO business_plan_items (plan_id, post_at, format, theme, brief, caption, hashtags)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [planId, d.postAt, d.format, d.theme || null, d.brief || null, d.caption || null, d.hashtags || []]);
    return r.rows[0];
  }

  async updateItem(itemId: string, patch: Record<string, unknown>): Promise<PlanItemVo> {
    const allowed = ['post_at', 'format', 'theme', 'brief', 'caption', 'hashtags', 'media_ids',
      'gen_status', 'gen_error', 'gen_stage', 'pack_id', 'video_job_id', 'feedback', 'queue_id', 'source_media_ids'];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k));
    if (!keys.length) return (await this.findItem(itemId)) as PlanItemVo;
    const sets = keys.map((k, i) => (k === 'media_ids' || k === 'source_media_ids' ? `${k} = $${i + 2}::uuid[]` : `${k} = $${i + 2}`));
    const r = await this.db.query<PlanItemVo>(
      `UPDATE business_plan_items SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
      [itemId, ...keys.map((k) => patch[k])]);
    return r.rows[0];
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.db.query('DELETE FROM business_plan_items WHERE id = $1', [itemId]);
  }
}
