import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AdSetupItemVo, SetupItemType, WebProductVo } from './vo/ad-studio.vo';

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

  async findWebProduct(id: string, userId: string): Promise<WebProductVo | null> {
    const r = await this.db.query<WebProductVo>(
      'SELECT * FROM web_products WHERE id = $1 AND user_id = $2', [id, userId]);
    return r.rows[0] || null;
  }
}
