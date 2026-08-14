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
      url: d.url, name: d.name, description: d.description, price: d.price,
      images: d.images, screenshots: d.screenshots, attributes,
      collector: result.collector, status: 'ready',
    });
  }

  /** 수동 입력 폴백 — 수집이 막힌 사이트(쿠팡 등)는 사용자가 직접 넣는다. */
  async manual(userId: string, d: { url?: string; name: string; price?: string; images: string[] }): Promise<WebProductVo> {
    if (!d.name) throw httpError(400, '제품명이 필요합니다.');
    if (!d.images?.length) throw httpError(400, '제품 이미지가 최소 1장 필요합니다.');
    let attributes: Record<string, any> = {};
    try { attributes = await extract(d); } catch (e: any) { attributes = { _error: e.message }; }
    return this.insert(userId, {
      url: d.url || '', name: d.name, price: d.price, images: d.images,
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
