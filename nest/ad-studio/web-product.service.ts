import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { DbService } from '../db/db.service';
import { WebProductVo } from './vo/ad-studio.vo';

// 수집기·추출기는 엔진 성격(외부 사이트 상대) — src 단일소스를 재사용한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const collectors = require(path.join(__dirname, '..', '..', 'src', 'ad-studio', 'collectors'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extract } = require(path.join(__dirname, '..', '..', 'src', 'ad-studio', 'productExtract.service.js'));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsMod = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cryptoMod = require('crypto');

/** 제품 이미지 업로드 — tmp/images에 저장하고 /images/<file>로 서빙한다(기존 미디어 규약과 동일). */
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'images');
fsMod.mkdirSync(UPLOAD_DIR, { recursive: true });
export const AD_UPLOAD_OPTIONS = {
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req: any, file: any, cb: any) =>
      cb(null, `${cryptoMod.randomUUID()}${path.extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) =>
    cb(null, /^image\//.test(file.mimetype || '')),   // 이미지가 아니면 조용히 거른다
};

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * URL → 제품. 수집(사이트 상대)과 속성 추출(vision)을 한 흐름으로 묶는다.
 *
 * ⚠️ 수집은 **동기로 끝낸다**(HTTP 요청 안에서). 사이트 하나당 12초 타임아웃이라
 *   Cloudflare 100초 안에 들어온다. vision 추출까지 합쳐도 30초 안쪽이다.
 *   실패해도 행을 남긴다 — 어떤 사이트가 왜 막혔는지가 다음 수집기 결정의 근거다.
 */
@Injectable()
export class WebProductService {
  constructor(private readonly db: DbService) {}

  async collect(userId: string, url: string): Promise<WebProductVo> {
    const result = await collectors.collect(url);

    if (!result.ok) {
      const row = await this.insert(userId, {
        url, status: 'failed', error: result.reason,
        collector: (result.attempts || []).map((a: any) => a.collector).join(','),
      });
      // 400이 아니라 422 — 요청은 정상이고 대상 사이트가 문제다(수동 입력으로 안내).
      throw Object.assign(httpError(422, result.reason), { data: { webProductId: row.id, fallback: 'manual' } });
    }

    const d = result.data;
    let attributes: Record<string, any> = {};
    try {
      attributes = await extract(d);
    } catch (e: any) {
      // 속성 추출이 실패해도 수집 자체는 성공이다 — 사용자가 직접 채울 수 있게 ready로 둔다.
      attributes = { _error: e.message };
    }

    return this.insert(userId, {
      url: d.url,
      // 수집기(HTML title·meta)가 우선. 못 가져왔으면 비전이 사진에서 읽은 값으로 채운다.
      //   이미지만 있는 상품·비표준 쇼핑몰에서 이름이 비는 걸 막는다.
      name: (d.name || '').trim() || attributes.name || null,
      description: (d.description || '').trim() || attributes.description || null,
      price: d.price,
      images: d.images, screenshots: d.screenshots, attributes,
      collector: result.collector, status: 'ready',
    });
  }

  /** 수동 입력 폴백 — 수집이 막힌 사이트(쿠팡 등)는 사용자가 직접 넣는다. */
  async manual(userId: string, d: { url?: string; name?: string; price?: string; images: string[] }): Promise<WebProductVo> {
    if (!d.images?.length) throw httpError(400, '제품 이미지가 최소 1장 필요합니다.');
    let attributes: Record<string, any> = {};
    try { attributes = await extract(d); } catch (e: any) { attributes = { _error: e.message }; }
    // 이름을 안 적었으면 vision이 읽은 카테고리로 채운다 — 이미지만 고르고 바로 시작할 수 있어야 한다.
    // 사용자가 이름을 안 적으면 비전이 지은 이름을 쓴다. category('핸드크림')나 '제품'은 최후 폴백 —
    //   상품 목록에서 "제품"만 여러 개 보이면 고를 수가 없다.
    const name = (d.name || '').trim() || attributes.name || attributes.category || '제품';
    return this.insert(userId, {
      url: d.url || '', name, description: attributes.description || null,
      price: d.price, images: d.images,
      attributes, collector: 'manual', status: 'ready',
    });
  }

  async find(userId: string, id: string): Promise<WebProductVo> {
    const r = await this.db.query<WebProductVo>(
      'SELECT * FROM web_products WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!r.rows[0]) throw httpError(404, '수집된 제품을 찾을 수 없습니다.');
    return r.rows[0];
  }

  list(userId: string): Promise<WebProductVo[]> {
    return this.db.query<WebProductVo>(
      `SELECT * FROM web_products WHERE user_id = $1 AND status = 'ready'
        ORDER BY created_at DESC LIMIT 20`, [userId]).then((r) => r.rows);
  }

  /**
   * 이름·설명 수정. 자동 추출은 출발점일 뿐이라 사람이 고칠 수 있어야 한다 —
   * 비전이 지은 이름이 어색하거나, 판매명이 따로 있는 경우가 흔하다.
   * 본인 소유만 수정 가능(user_id 조건). 없으면 404.
   */
  async rename(userId: string, id: string, d: { name?: string; description?: string }): Promise<WebProductVo> {
    const name = typeof d.name === 'string' ? d.name.trim().slice(0, 120) : undefined;
    const description = typeof d.description === 'string' ? d.description.trim().slice(0, 2000) : undefined;
    if (name !== undefined && !name) {
      throw Object.assign(new Error('상품명은 비울 수 없습니다.'), { statusCode: 400 });
    }
    const r = await this.db.query<WebProductVo>(
      `UPDATE web_products
          SET name = COALESCE($3, name), description = COALESCE($4, description), updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [id, userId, name ?? null, description ?? null]);
    if (!r.rows[0]) throw Object.assign(new Error('상품을 찾을 수 없습니다.'), { statusCode: 404 });
    return r.rows[0];
  }

  /**
   * 비어 있는 이름·설명을 사진으로 채운다.
   *
   * 자동 생성(#272)이 붙기 전에 만든 상품은 이름이 '제품'이고 설명이 비어 있다. 그런 행은
   * 목록에서 무엇인지 알아볼 수가 없다. 사진은 그대로 있으니 다시 읽으면 채울 수 있다.
   *
   * @param force true면 값이 있어도 다시 짓는다(사용자가 '자동으로 채우기'를 누른 경우).
   */
  async autofill(userId: string, id: string, force = false): Promise<WebProductVo> {
    const cur = await this.find(userId, id);
    if (!cur) throw Object.assign(new Error('상품을 찾을 수 없습니다.'), { statusCode: 404 });

    // 이름이 '제품'·'상품'처럼 무의미하거나 설명이 비었을 때만 부른다 — 불필요한 API 호출은 돈이다.
    const nameIsPlaceholder = !cur.name || ['제품', '상품'].includes(String(cur.name).trim());
    if (!force && !nameIsPlaceholder && cur.description) return cur;

    const images = (cur.images as string[]) || [];
    if (!images.length) return cur;

    let attrs: any = {};
    try { attrs = await extract({ name: cur.name, description: cur.description, images }); }
    catch (e: any) { throw Object.assign(new Error(`자동 생성에 실패했습니다: ${e.message}`), { statusCode: 503 }); }

    const name = force || nameIsPlaceholder ? (attrs.name || cur.name) : cur.name;
    const description = force || !cur.description ? (attrs.description || cur.description) : cur.description;
    const r = await this.db.query<WebProductVo>(
      `UPDATE web_products SET name = $3, description = $4, attributes = $5, updated_at = now()
        WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, name, description, JSON.stringify({ ...(cur.attributes || {}), ...attrs })]);
    return r.rows[0];
  }

  private async insert(userId: string, d: any): Promise<WebProductVo> {
    const r = await this.db.query<WebProductVo>(
      `INSERT INTO web_products (user_id, url, name, description, price, screenshots, images, attributes, collector, status, error)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11) RETURNING *`,
      [userId, d.url || '', d.name || null, d.description || null, d.price || null,
       JSON.stringify(d.screenshots || []), JSON.stringify(d.images || []),
       JSON.stringify(d.attributes || {}), d.collector || null, d.status, d.error || null]);
    return r.rows[0];
  }
}
