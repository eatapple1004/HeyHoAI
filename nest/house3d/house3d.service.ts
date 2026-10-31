import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { House3dRepository, House3dRequestRow } from './house3d.repository';

/** 에러는 LegacyErrorFilter가 그대로 내보내므로 레거시 형식 `{success:false,error}`로 던진다 */
function fail(status: number, error: string): never {
  throw new HttpException({ success: false, error }, status);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 전화: 숫자 7자리 이상(국가번호·하이픈·공백·괄호 허용) */
const PHONE_RE = /^\+?[\d\s\-().]{7,25}$/;
const KINDS = ['분양 상담', '시공 요청', '신축 시공', '리모델링', '상담'];
const SOURCES = ['homepage', 'tour'];
export const STATUSES = ['신규', '상담중', '계약', '보류'];
const MAT_ID_RE = /^[a-z0-9-]{1,40}$/;
const MAX_PAYLOAD = 200 * 1024;          // 요청 1건(마감 목록·견적 포함) 상한
const MAX_SETTINGS = 6 * 1024 * 1024;    // 업체 설정 전체(자재 사진 포함) 상한
const MAX_PHOTO = 400 * 1024;            // 자재 사진 1장(data URL) 상한 — 화면에서 768px JPEG로 줄여 올린다

/**
 * IP당 횟수 제한 — 무인증 공개 엔드포인트라 봇·반복 호출을 막는다(diagnose와 같은 방식, 프로세스 메모리 기준).
 */
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 10;
const hits = new Map<string, number[]>();
function allow(ipHash: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ipHash) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) { hits.set(ipHash, arr); return false; }
  arr.push(now); hits.set(ipHash, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export interface House3dSettings {
  prices: Record<string, number>;
  edits: Record<string, { name?: string; spec?: string; src?: string }>;
  hidden: string[];
}

@Injectable()
export class House3dService {
  constructor(private readonly repo: House3dRepository) {}

  /** IP는 원문을 저장하지 않는다 — 해시만(남용 추적용) */
  private ipHash(ip: string | undefined): string {
    return createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 32);
  }

  /**
   * 상담·시공 요청 접수. 본문은 화면이 만든 요청 객체 그대로(이름·연락처·마감 목록·견적)이며,
   *   목록·검색에 필요한 값만 컬럼으로 뽑고 원본은 payload(JSONB)에 둔다.
   */
  async createRequest(body: any, ip: string | undefined): Promise<{ id: string; createdAt: string }> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'invalid body');
    if (JSON.stringify(body).length > MAX_PAYLOAD) fail(413, 'request too large');
    const req = body.request && typeof body.request === 'object' ? body.request : {};
    const name = str(req.name, 40), phone = str(req.phone, 25);
    if (!name) fail(400, '이름을 입력해 주세요');
    if (!phone || !PHONE_RE.test(phone)) fail(400, '연락처 형식을 확인해 주세요');
    const kind = KINDS.includes(body.type) ? body.type : KINDS.includes(req.type) ? req.type : '상담';
    const source = SOURCES.includes(body.source) ? body.source : 'homepage';
    const total = Number(body.estimate?.total);
    const ipHash = this.ipHash(ip);
    if (!allow(ipHash)) fail(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요');
    const r = await this.repo.insertRequest({
      kind, source, name, phone, ipHash,
      homeId: str(body.home, 80), homeName: str(body.homeName ?? body.plan, 120),
      estimateTotal: Number.isFinite(total) && total >= 0 && total < 1e12 ? Math.round(total) : null,
      payload: body,
    });
    return { id: r.id, createdAt: r.created_at };
  }

  async listRequests(limit: number): Promise<House3dRequestRow[]> {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(500, Math.floor(limit)) : 200;
    return this.repo.listRequests(n);
  }

  async setStatus(id: string, status: unknown): Promise<void> {
    if (!UUID_RE.test(id)) fail(400, 'invalid id');
    if (typeof status !== 'string' || !STATUSES.includes(status)) fail(400, 'invalid status');
    if (!(await this.repo.setStatus(id, status))) fail(404, 'not found');
  }

  async deleteRequest(id: string): Promise<void> {
    if (!UUID_RE.test(id)) fail(400, 'invalid id');
    if (!(await this.repo.deleteRequest(id))) fail(404, 'not found');
  }

  /** 업체 설정(자재 단가·이름·사진·숨김) — 체험 화면이 처음 열릴 때 읽는다(공개) */
  async getSettings(): Promise<{ value: House3dSettings | null; updatedAt: string | null }> {
    const r = await this.repo.getSetting('materials');
    return { value: (r?.value as House3dSettings) ?? null, updatedAt: r?.updated_at ?? null };
  }

  /** 모양을 검사해 알려진 필드만 남긴다 — 공개로 내려가는 값이라 임의 데이터가 섞이면 안 된다 */
  async putSettings(body: any, userId: string): Promise<{ updatedAt: string }> {
    if (!body || typeof body !== 'object') fail(400, 'invalid body');
    if (JSON.stringify(body).length > MAX_SETTINGS) fail(413, '설정이 너무 큽니다(사진 수를 줄여 주세요)');
    const out: House3dSettings = { prices: {}, edits: {}, hidden: [] };
    for (const [id, v] of Object.entries(body.prices || {})) {
      const n = Number(v);
      if (!MAT_ID_RE.test(id) || !Number.isFinite(n) || n < 0 || n > 10_000_000) fail(400, `invalid price: ${id}`);
      out.prices[id] = Math.round(n);
    }
    for (const [id, v] of Object.entries(body.edits || {}) as [string, any][]) {
      if (!MAT_ID_RE.test(id) || !v || typeof v !== 'object') fail(400, `invalid edit: ${id}`);
      const e: { name?: string; spec?: string; src?: string } = {};
      const name = str(v.name, 40), spec = str(v.spec, 60);
      if (name) e.name = name;
      if (spec) e.spec = spec;
      if (v.src != null) {
        if (typeof v.src !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v.src)) fail(400, `invalid photo: ${id}`);
        if (v.src.length > MAX_PHOTO) fail(413, `사진이 너무 큽니다: ${id}`);
        e.src = v.src;
      }
      if (Object.keys(e).length) out.edits[id] = e;
    }
    const hidden = Array.isArray(body.hidden) ? body.hidden : [];
    if (hidden.length > 200 || hidden.some((x: unknown) => typeof x !== 'string' || !MAT_ID_RE.test(x))) fail(400, 'invalid hidden');
    out.hidden = [...new Set(hidden as string[])];
    return { updatedAt: await this.repo.putSetting('materials', out, userId) };
  }
}
