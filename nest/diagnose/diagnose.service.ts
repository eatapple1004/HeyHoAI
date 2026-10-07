import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import * as path from 'path';
import { DiagnoseRepository } from './diagnose.repository';
import {
  CreateRequestDto, CreateSessionDto, DiagnoseAnswersDto, DiagnoseRequestRowDto, DiagnoseTrack,
  InstagramMetricsDto, KakaoMetricsDto, LookupDto, LookupResultDto, RequestCreatedDto, SessionCreatedDto,
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
const LIMITS = { session: 30, request: 5, lookup: 8 };
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

/** 링크 종류 판별 — 인스타(URL·@handle) / 카카오(URL·가게 이름) / 못 하는 곳 */
function classifyLink(raw: string): { type: 'instagram'; handle: string } | { type: 'kakao'; query: string } | { type: 'unsupported' } {
  const s = raw.trim();
  const ig = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i) || s.match(/^@([A-Za-z0-9._]{1,30})$/);
  if (ig) return { type: 'instagram', handle: ig[1].replace(/\/$/, '') };
  if (/naver\.(com|me)|smartstore|coupang\.|facebook\.com|fb\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(s)) return { type: 'unsupported' };
  if (/place\.map\.kakao\.com\/\d+|kko\.to|map\.kakao\.com/i.test(s)) return { type: 'kakao', query: s };
  if (/^https?:\/\//i.test(s)) return { type: 'unsupported' };
  // 영문·숫자·점·밑줄만이면 인스타 아이디로 본다(가게 이름은 보통 공백·한글)
  if (/^[A-Za-z0-9._]{2,30}$/.test(s)) return { type: 'instagram', handle: s };
  return { type: 'kakao', query: s };
}

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(String(iso).replace(' ', 'T') + '+09:00');
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
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

    // 채널별 링크 — {channel,url} 또는 옛 클라의 문자열. 최대 15개
    const links = Array.isArray(body.links)
      ? body.links.map((l: any) => (typeof l === 'string'
          ? { channel: 'other', url: this.text(l, 300) }
          : { channel: this.text(l && l.channel, 30) || 'other', url: this.text(l && l.url, 300) }))
        .filter((l) => l.url).slice(0, 15)
      : [];
    const message = this.text(body.message, 1000) || null;
    const d: any = body.details && typeof body.details === 'object' ? body.details : null;
    const details = d ? {
      product: this.text(d.product, 200) || undefined, area: this.text(d.area, 200) || undefined,
      goal: this.text(d.goal, 300) || undefined, budget: this.text(d.budget, 60) || undefined,
      metrics: d.metrics && typeof d.metrics === 'object' ? d.metrics : undefined,
    } : null;

    // 답 스냅샷은 있으면 검증해서 싣고, 깨져 있으면 버린다(신청 자체는 받는다 — 연락처가 더 중요)
    let answers: DiagnoseAnswersDto | null = null;
    if (body.answers) { try { answers = this.validateAnswers(body.answers, track); } catch (e) { answers = null; } }

    let sessionId: string | null = null;
    if (typeof body.sessionId === 'string' && UUID_RE.test(body.sessionId) && (await this.repo.sessionExists(body.sessionId))) {
      sessionId = body.sessionId;
    }

    const id = await this.repo.insertRequest({
      sessionId, track, lang: this.lang(body.lang), businessName, contactName, contact, links, message, answers, ipHash, details,
    });
    return { id };
  }

  // ── 채널 실측 (2단계) ─────────────────────────────────────────────
  //   인스타: HikerAPI(ADAM 시딩에서 실사용) — 프로필 1 + 최근 게시물 1 = 요청 2건
  //   가게:   카카오맵 panel3(인천 3.2만 곳 실측) — Node에선 TLS 지문으로 403이라 python curl_cffi 보조 스크립트
  //   네이버 플레이스·페이스북·스마트스토어·쿠팡은 못 한다(캡차·봇차단) → unsupported
  async lookup(body: LookupDto, ip: string | undefined): Promise<LookupResultDto> {
    const ipHash = this.ipHash(ip);
    if (!allow('lookup', ipHash)) fail(429, 'Too many requests. Please try again later.');
    const link = this.text(body && body.link, 300);
    if (!link) fail(400, 'link is required');
    const kind = classifyLink(link);
    let result: LookupResultDto;
    if (kind.type === 'unsupported') result = { ok: false, reason: 'unsupported' };
    else if (kind.type === 'instagram') result = await this.lookupInstagram(kind.handle);
    else result = await this.lookupKakao(kind.query);
    if (result.ok && body.sessionId && UUID_RE.test(body.sessionId) && (await this.repo.sessionExists(body.sessionId))) {
      await this.repo.saveMetrics(body.sessionId, link, result.metrics);
    }
    return result;
  }

  private async lookupInstagram(handle: string): Promise<LookupResultDto> {
    const key = process.env.HIKER_API_KEY || '';
    if (!key) return { ok: false, reason: 'no_key' };
    const H = { 'x-access-key': key, accept: 'application/json', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129.0 Safari/537.36' };
    const get = async (p: string): Promise<any> => {
      const r = await fetch('https://api.hikerapi.com' + p, { headers: H, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('hiker_' + r.status);
      return r.json();
    };
    try {
      const u = await get('/v1/user/by/username?username=' + encodeURIComponent(handle));
      if (!u || !u.pk) return { ok: false, reason: 'not_found' };
      const base: InstagramMetricsDto = {
        source: 'instagram', username: u.username || handle, is_private: !!u.is_private,
        followers: Number(u.follower_count) || 0, media_count: Number(u.media_count) || 0,
        days_since_last_post: null, posts_30d: 0, engagement_rate: null, reels_ratio: 0, sampled: 0,
      };
      if (base.is_private) return { ok: true, metrics: base };
      const m = await get('/v2/user/medias?user_id=' + u.pk);
      const items: any[] = (m && m.response && m.response.items) || (m && m.items) || [];
      if (items.length) {
        const now = Date.now() / 1000;
        const taken = items.map((it) => Number(it.taken_at) || 0).filter(Boolean);
        const last = Math.max.apply(null, taken);
        base.days_since_last_post = last ? Math.max(0, Math.floor((now - last) / 86400)) : null;
        base.posts_30d = taken.filter((t) => now - t <= 30 * 86400).length;
        const likes = items.reduce((a, it) => a + (Number(it.like_count) || 0), 0);
        const comments = items.reduce((a, it) => a + (Number(it.comment_count) || 0), 0);
        base.engagement_rate = base.followers ? Math.round(((likes + comments) / items.length / base.followers) * 1000) / 10 : null;
        base.reels_ratio = Math.round((items.filter((it) => it.product_type === 'clips' || it.media_type === 2).length / items.length) * 100);
        base.sampled = items.length;
      }
      return { ok: true, metrics: base };
    } catch (e: any) {
      console.error('[diagnose] instagram lookup failed:', e && e.message);
      return { ok: false, reason: 'upstream' };
    }
  }

  private lookupKakao(query: string): Promise<LookupResultDto> {
    const py = process.env.DIAGNOSE_PY || 'python3';
    const script = path.join(__dirname, '..', '..', 'scripts', 'diagnose_kakao.py');
    const env = { ...process.env, KAKAO_REST_KEY: process.env.KAKAO_REST_KEY || '' };
    return new Promise((resolve) => {
      execFile(py, [script, query], { env, timeout: 45000, maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
        if (err && !stdout) { console.error('[diagnose] kakao helper failed:', err.message); return resolve({ ok: false, reason: 'upstream' }); }
        let j: any;
        try { j = JSON.parse(String(stdout).trim().split('\n').pop() || '{}'); } catch { return resolve({ ok: false, reason: 'upstream' }); }
        if (!j.ok) return resolve({ ok: false, reason: j.reason === 'not_found' ? 'not_found' : (j.reason === 'no_kakao_key' ? 'no_key' : 'upstream') });
        const m: KakaoMetricsDto = {
          source: 'kakao', place_id: String(j.place_id), name: j.name || '', status: j.status || '', address: j.address || '',
          category: j.category || '', review_count: Number(j.review_count) || 0, rating: j.rating == null ? null : Number(j.rating),
          photo_count: Number(j.photo_count) || 0, blog_review_count: Number(j.blog_review_count) || 0,
          blog_last_at: j.blog_last_at || '', days_since_blog: daysSince(j.blog_last_at), instagram: j.instagram || '',
          matched_from_search: j.matched_from_search,
        };
        resolve({ ok: true, metrics: m });
      });
    });
  }

  listRequests(limit: number): Promise<DiagnoseRequestRowDto[]> {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 100;
    return this.repo.listRequests(n);
  }
}
