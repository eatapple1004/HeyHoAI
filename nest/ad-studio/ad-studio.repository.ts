import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AdSetupItemVo, SetupItemType, WebProductVo } from './vo/ad-studio.vo';

/**
 * 저장된 값이 `tmp/images/x.jpg` · `/images/x.jpg` · 절대 URL로 뒤섞여 있다(오래된 행일수록 제각각).
 * 화면에서 쓰려면 서빙 URL로 통일해야 한다.
 */
function toServedUrl(raw: string | null): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith('/img/')) return s;
  return '/images/' + s.split('/').pop();
}

/** Ad Studio 데이터 접근 — 훅·장소 라이브러리와 수집된 웹제품 */
@Injectable()
export class AdStudioRepository {
  constructor(private readonly db: DbService) {}

  /** 공식 시드 + 본인이 만든 것만. 남의 커스텀 훅은 보이지 않아야 한다. */
  async listSetupItems(type: SetupItemType, userId: string, locale = 'ko'): Promise<AdSetupItemVo[]> {
    const r = await this.db.query<AdSetupItemVo>(
      `SELECT * FROM ad_setup_items
        WHERE type = $1 AND locale = $3 AND (user_id IS NULL OR user_id = $2)
        ORDER BY is_official DESC, sort_order, name`,
      [type, userId, locale]);
    return r.rows;
  }

  /** 단건 — 컴파일 시 프롬프트를 꺼내려고. 남의 커스텀은 못 읽는다. */
  async findSetupItem(id: string, userId: string): Promise<AdSetupItemVo | null> {
    const r = await this.db.query<AdSetupItemVo>(
      `SELECT * FROM ad_setup_items WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
      [id, userId]);
    return r.rows[0] || null;
  }

  /**
   * 이 사용자가 예전에 올린 이미지들 — Shots(스튜디오)에서 쓴 레퍼런스 + Ad Studio에 등록한 제품.
   * 매번 새로 올리게 하지 않으려는 것이다(Shots가 이미 이렇게 동작한다).
   *   · prompts.reference_image_path = Shots에서 올린 원본
   *   · web_products.images[0]       = Ad Studio에 등록한 제품 대표컷
   */
  async listRecentImages(userId: string, limit = 24): Promise<Array<{ url: string; label: string; productId: string | null }>> {
    const r = await this.db.query<{ url: string; label: string; product_id: string | null; at: string }>(
      `(
         SELECT (wp.images->>0) AS url, COALESCE(wp.name, '등록한 제품') AS label,
                wp.id::text AS product_id, wp.created_at AS at
           FROM web_products wp
          WHERE wp.user_id = $1 AND wp.status = 'ready' AND jsonb_array_length(wp.images) > 0
       )
       UNION ALL
       (
         SELECT p.reference_image_path AS url, '이전 업로드' AS label,
                NULL AS product_id, MAX(p.created_at) AS at
           FROM prompts p
          WHERE p.user_id = $1 AND p.reference_image_path IS NOT NULL AND p.reference_image_path <> ''
          GROUP BY p.reference_image_path
       )
       ORDER BY at DESC LIMIT $2`,
      [userId, limit]);

    // 같은 파일이 양쪽에 있을 수 있다 — 앞선 것(제품 등록본)을 남긴다.
    const seen = new Set<string>();
    const out: Array<{ url: string; label: string; productId: string | null }> = [];
    for (const row of r.rows) {
      const url = toServedUrl(row.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, label: row.label, productId: row.product_id });
    }
    return out;
  }

  async findWebProduct(id: string, userId: string): Promise<WebProductVo | null> {
    const r = await this.db.query<WebProductVo>(
      'SELECT * FROM web_products WHERE id = $1 AND user_id = $2', [id, userId]);
    return r.rows[0] || null;
  }
}
