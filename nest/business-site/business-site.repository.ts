import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface BusinessSiteRow {
  id: string;
  business_id: string;
  slug: string | null;
  template: string;
  status: string;
  source: any;
  content: any;
  photos: any[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** UPDATE 컬럼 화이트리스트 — 호출자 키를 SQL에 그대로 붙이지 않는다 */
const UPDATABLE: Record<string, string> = {
  slug: 'slug',
  template: 'template',
  status: 'status',
  source: 'source',
  content: 'content',
  photos: 'photos',
};
const JSONB = new Set(['source', 'content', 'photos']);

@Injectable()
export class BusinessSiteRepository {
  constructor(private readonly db: DbService) {}

  async business(id: string): Promise<{ id: string; name: string; industry: string | null; memo: string | null } | null> {
    const r = await this.db.query('SELECT id, name, industry, memo FROM businesses WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async byBusiness(businessId: string): Promise<BusinessSiteRow | null> {
    const r = await this.db.query<BusinessSiteRow>('SELECT * FROM business_sites WHERE business_id = $1', [businessId]);
    return r.rows[0] || null;
  }

  async byId(id: string): Promise<BusinessSiteRow | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const r = await this.db.query<BusinessSiteRow>('SELECT * FROM business_sites WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  async publishedBySlug(slug: string): Promise<BusinessSiteRow | null> {
    const r = await this.db.query<BusinessSiteRow>(
      `SELECT * FROM business_sites WHERE slug = $1 AND status = 'published'`, [slug]);
    return r.rows[0] || null;
  }

  async slugTaken(slug: string, exceptBusinessId: string): Promise<boolean> {
    const r = await this.db.query('SELECT 1 FROM business_sites WHERE slug = $1 AND business_id <> $2', [slug, exceptBusinessId]);
    return r.rowCount > 0;
  }

  async ensure(businessId: string, template: string): Promise<BusinessSiteRow> {
    await this.db.query(
      `INSERT INTO business_sites (business_id, template) VALUES ($1, $2) ON CONFLICT (business_id) DO NOTHING`,
      [businessId, template]);
    return (await this.byBusiness(businessId)) as BusinessSiteRow;
  }

  async update(businessId: string, patch: Record<string, unknown>): Promise<BusinessSiteRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [businessId];
    for (const [k, v] of Object.entries(patch)) {
      const col = UPDATABLE[k];
      if (!col || v === undefined) continue;
      params.push(JSONB.has(k) ? JSON.stringify(v) : v);
      sets.push(`${col} = $${params.length}${JSONB.has(k) ? '::jsonb' : ''}`);
    }
    if (patch.status === 'published') sets.push('published_at = COALESCE(published_at, now())');
    if (!sets.length) return this.byBusiness(businessId);
    sets.push('updated_at = now()');
    const r = await this.db.query<BusinessSiteRow>(
      `UPDATE business_sites SET ${sets.join(', ')} WHERE business_id = $1 RETURNING *`, params);
    return r.rows[0] || null;
  }

  // ── 문의 ──
  async recentInquiries(siteId: string, ip: string): Promise<number> {
    const r = await this.db.query(
      `SELECT COUNT(*)::int AS n FROM business_site_inquiries WHERE site_id = $1 AND ip = $2 AND created_at > now() - interval '1 hour'`, [siteId, ip]);
    return r.rows[0]?.n || 0;
  }

  async addInquiry(siteId: string, businessId: string, d: Record<string, string>, ip: string) {
    await this.db.query(
      `INSERT INTO business_site_inquiries (site_id, business_id, name, company, phone, email, product, message, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [siteId, businessId, d.name, d.company || null, d.phone, d.email || null, d.product || null, d.message, ip]);
  }

  async inquiries(businessId: string) {
    const r = await this.db.query(
      `SELECT id, name, company, phone, email, product, message, status, created_at
         FROM business_site_inquiries WHERE business_id = $1 ORDER BY created_at DESC LIMIT 200`, [businessId]);
    return r.rows;
  }

  /** 사업체 원본 사진(관리자가 올린 것) — ★대표 먼저 */
  async businessImages(businessId: string): Promise<{ id: string; file_path: string; is_base: boolean }[]> {
    const r = await this.db.query(
      `SELECT m.id, m.file_path, COALESCE(m.is_base, false) AS is_base
         FROM account_media m
         LEFT JOIN social_accounts sa ON sa.id = m.account_id
        WHERE (m.business_id = $1 OR sa.business_id = $1) AND m.media_type = 'image'
        ORDER BY COALESCE(m.is_base, false) DESC, m.created_at DESC
        LIMIT 24`, [businessId]);
    return r.rows;
  }
}
