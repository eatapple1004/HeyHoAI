import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { BrandKitVo } from './vo/brand-kit.vo';
import { UpdateBrandKitDto } from './dto/brand-kit.dto';

/** 브랜드킷 데이터 접근 — brand_kits 테이블(사용자당 1행, upsert). */
@Injectable()
export class BrandkitRepository {
  constructor(private readonly db: DbService) {}

  /** 조회 — 행이 없으면 기본값(프론트가 항상 같은 shape을 받도록) */
  async find(userId: string): Promise<BrandKitVo> {
    const r = await this.db.query<BrandKitVo>(
      'SELECT logo_url, primary_color, font_name, enabled FROM brand_kits WHERE user_id = $1',
      [userId],
    );
    return r.rows[0] || { logo_url: null, primary_color: null, font_name: null, enabled: false };
  }

  /** 색상·폰트·사용여부 부분 수정(upsert) — 미전달 필드는 COALESCE로 기존값 유지 */
  async upsert(userId: string, f: UpdateBrandKitDto): Promise<BrandKitVo> {
    const r = await this.db.query<BrandKitVo>(
      `INSERT INTO brand_kits (user_id, primary_color, font_name, enabled, updated_at)
       VALUES ($1, $2, $3, COALESCE($4, false), now())
       ON CONFLICT (user_id) DO UPDATE SET
         primary_color = COALESCE($2, brand_kits.primary_color),
         font_name     = COALESCE($3, brand_kits.font_name),
         enabled       = COALESCE($4, brand_kits.enabled),
         updated_at    = now()
       RETURNING logo_url, primary_color, font_name, enabled`,
      [userId, f.primaryColor || null, f.fontName || null, typeof f.enabled === 'boolean' ? f.enabled : null],
    );
    return r.rows[0];
  }

  /** 업로드된 로고 반영(upsert) */
  async setLogo(userId: string, logoUrl: string): Promise<BrandKitVo> {
    const r = await this.db.query<BrandKitVo>(
      `INSERT INTO brand_kits (user_id, logo_url, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET logo_url = $2, updated_at = now()
       RETURNING logo_url, primary_color, font_name, enabled`,
      [userId, logoUrl],
    );
    return r.rows[0];
  }
}
