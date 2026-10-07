import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { DiagnoseRepository } from './diagnose.repository';
import {
  CreateRequestDto, CreateSessionDto, DiagnoseAnswersDto, DiagnoseRequestRowDto, DiagnoseTrack,
  RequestCreatedDto, SessionCreatedDto,
} from './dto/diagnose.dto';

/** 에러는 LegacyErrorFilter가 그대로 내보내므로 레거시 형식 `{success:false,error}`로 던진다 */
function fail(status: number, error: string): never {
  throw new HttpException({ success: false, error }, status);
}

const TRACKS: DiagnoseTrack[] = ['small', 'brand'];
const Q0 = ['fashion', 'beauty', 'food', 'home', 'health', 'pets', 'tech', 'kids', 'local', 'other'];
const Q01 = ['instore', 'online', 'both'];
const Q02 = ['me', 'one', 'team', 'agency'];
const Q1 = ['instagram', 'tiktok', 'facebook', 'youtube', 'influencers', 'maps', 'website', 'marketplaces', 'delivery', 'paidads', 'email', 'offline', 'wom', 'other', 'none'];
const Q2 = ['daily', 'weekly', 'monthly', 'rarely', 'stopped'];
const Q4_SMALL = ['nocust', 'how', 'spend', 'ads', 'nosales', 'compet', 'notime', 'agency', 'content', 'other', 'none'];
const Q4_BRAND = ['volume', 'launch', 'cost', 'tone', 'variants', 'depend', 'local', 'measure', 'other', 'none'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** 전화: 숫자 7자리 이상(국가번호·하이픈·공백·괄호 허용) */
const PHONE_RE = /^\+?[\d\s\-().]{7,25}$/;

/**
 * IP당 횟수 제한 — 무인증 공개 엔드포인트라 봇·반복 호출을 막는다.
 *   프로세스 메모리 기준(pm2 cluster면 인스턴스별). 정교할 필요 없음: 비용이 드는 건 사람이 쓰는 진단서뿐.
 */
const WINDOW_MS = 60 * 60 * 1000;
const LIMITS = { session: 30, request: 5 };
const hits = new Map<string, number[]>();
function allow(kind: keyof typeof LIMITS, ipHash: string): boolean {
  const key = kind + ':' + ipHash;
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMITS[kind]) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear(); // 메모리 상한 — 폭주 시 통째로 리셋(제한이 잠시 풀릴 뿐 안전)
  return true;
}

@Injectable()
export class DiagnoseService {
  constructor(private readonly repo: DiagnoseRepository) {}

  /** IP는 원문을 저장하지 않는다 — 해시만(중복·남용 추적용) */
  ipHash(ip: string | undefined): string {
    return createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 32);
  }

  private validateAnswers(a: unknown, track: DiagnoseTrack): DiagnoseAnswersDto {
    if (!a || typeof a !== 'object') fail(400, 'answers is required');
    const o = a as Record<string, unknown>;
    const one = (v: unknown, allowed: string[], name: string, required: boolean): string | null => {
      if (v == null || v === '') { if (required) fail(400, `${name} is required`); return null; }
      if (typeof v !== 'string' || allowed.indexOf(v) < 0) fail(400, `invalid ${name}`);
      return v;
    };
    const many = (v: unknown, allowed: string[], name: string, max: number): string[] => {
      if (v == null) return [];
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || allowed.indexOf(x) < 0)) fail(400, `invalid ${name}`);
      if (v.length > max) fail(400, `${name}: too many`);
      return v as string[];
    };
    const q0 = one(o.q0, Q0, 'q0', true);
    const free = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : undefined);
    return {
      q0,
      q01: one(o.q01, Q01, 'q01', false),
      q02: one(o.q02, Q02, 'q02', false),
      q1: many(o.q1, Q1, 'q1', Q1.length),
      q2: one(o.q2, Q2, 'q2', false),
      q4: many(o.q4, track === 'brand' ? Q4_BRAND : Q4_SMALL, 'q4', 3),
      q1Other: free(o.q1Other),
      q4Other: free(o.q4Other),
    };
  }

  private track(v: unknown): DiagnoseTrack {
    if (typeof v !== 'string' || (TRACKS as string[]).indexOf(v) < 0) fail(400, 'invalid track');
    return v as DiagnoseTrack;
  }

  private lang(v: unknown): string | null {
    return typeof v === 'string' && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(v) ? v : null;
  }

  private text(v: unknown, max: number): string {
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  }

  async createSession(body: CreateSessionDto, ip: string | undefined): Promise<SessionCreatedDto> {
    const ipHash = this.ipHash(ip);
    if (!allow('session', ipHash)) fail(429, 'Too many requests. Please try again later.');
    const track = this.track(body && body.track);
    const answers = this.validateAnswers(body && body.answers, track);
    const id = await this.repo.insertSession({
      track, lang: this.lang(body.lang), answers, ipHash,
      businessName: this.text(body.businessName, 120) || null, link: this.text(body.link, 300) || null,
    });
    return { id };
  }

  async createRequest(body: CreateRequestDto, ip: string | undefined): Promise<RequestCreatedDto> {
    const ipHash = this.ipHash(ip);
    if (!allow('request', ipHash)) fail(429, 'Too many requests. Please try again later.');
    if (!body || typeof body !== 'object') fail(400, 'body is required');
    const track = this.track(body.track);

    const businessName = this.text(body.businessName, 120);
    if (!businessName) fail(400, 'businessName is required');
    const contact = this.text(body.contact, 120);
    if (!contact) fail(400, 'contact is required');
    if (!EMAIL_RE.test(contact) && !PHONE_RE.test(contact)) fail(400, 'contact must be an email or a phone number');
    const contactName = this.text(body.contactName, 80) || null;
    if (track === 'brand' && !contactName) fail(400, 'contactName is required');

    const links = Array.isArray(body.links)
      ? body.links.map((l) => this.text(l, 300)).filter(Boolean).slice(0, 3)
      : [];
    const message = this.text(body.message, 1000) || null;

    // 답 스냅샷은 있으면 검증해서 싣고, 깨져 있으면 버린다(신청 자체는 받는다 — 연락처가 더 중요)
    let answers: DiagnoseAnswersDto | null = null;
    if (body.answers) { try { answers = this.validateAnswers(body.answers, track); } catch (e) { answers = null; } }

    let sessionId: string | null = null;
    if (typeof body.sessionId === 'string' && UUID_RE.test(body.sessionId) && (await this.repo.sessionExists(body.sessionId))) {
      sessionId = body.sessionId;
    }

    const id = await this.repo.insertRequest({
      sessionId, track, lang: this.lang(body.lang), businessName, contactName, contact, links, message, answers, ipHash,
    });
    return { id };
  }

  listRequests(limit: number): Promise<DiagnoseRequestRowDto[]> {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 100;
    return this.repo.listRequests(n);
  }
}
