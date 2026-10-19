import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { BusinessSiteRepository, BusinessSiteRow } from './business-site.repository';
import { SiteWriterService } from './site-writer.service';
import { sources, GooglePlaceDetail, KakaoPlace, NaverBlog, NaverLocal } from './place-sources';
import { TEMPLATES, TEMPLATE_KEYS, guessTemplate, renderSite, SiteModel, SitePhoto, SiteReview } from './templates';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/** AI에 첨부하는 사진 한도 — 장수·용량이 커지면 응답이 느려지고 비싸진다 */
const MAX_VISION_PHOTOS = 10;
const MAX_VISION_BYTES = 3 * 1024 * 1024;

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;
/** 서비스 경로와 겹치면 안 되는 이름 */
const RESERVED = new Set(['admin', 'api', 'site', 'www', 'doppia', 'login', 'signup', 'preview', 'photo']);

/** 사진 한 장 — ref로 원천을 가리키고 url은 그릴 때 만든다(slug·저장소가 바뀌어도 안 깨진다) */
export interface PhotoEntry { ref: string; hidden?: boolean }

export interface SiteSource {
  query?: string;
  collectedAt?: string;
  kakao?: KakaoPlace | null;
  google?: GooglePlaceDetail | null;
  naver?: { local: NaverLocal | null; blogs: NaverBlog[] };
  errors?: Record<string, string>;
}

@Injectable()
export class BusinessSiteService {
  constructor(
    private readonly repo: BusinessSiteRepository,
    private readonly writer: SiteWriterService,
  ) {}

  private async biz(id: string) {
    const b = await this.repo.business(id);
    if (!b) throw new NotFoundException('사업체를 찾을 수 없습니다.');
    return b;
  }

  /** 관리자 화면용 — 사이트 행 + 사진 목록(url 포함) + 템플릿 목록 + 출처 키 상태 */
  async get(businessId: string) {
    const b = await this.biz(businessId);
    const site = await this.repo.byBusiness(businessId);
    return {
      business: b,
      site,
      photos: site ? await this.photoList(site) : [],
      templates: TEMPLATE_KEYS.map((k) => ({ key: k, label: TEMPLATES[k].label, fits: TEMPLATES[k].fits })),
      sources: sources.available(),
      publicUrl: site?.slug ? this.canonical(site.slug) : null,
    };
  }

  /** 1단계: 이름(+동네)으로 세 출처에서 후보를 찾는다. 출처 하나가 실패해도 나머지는 보여준다 */
  async search(businessId: string, q: string) {
    await this.biz(businessId);
    const query = String(q || '').trim().slice(0, 80);
    if (!query) throw new BadRequestException('검색어를 입력하세요.');
    const errors: Record<string, string> = {};
    const safe = async <T>(key: string, fn: () => Promise<T[]>): Promise<T[]> => {
      try { return await fn(); } catch (e: any) { errors[key] = String(e?.message || e).slice(0, 200); return []; }
    };
    const [kakao, google, naver] = await Promise.all([
      safe('kakao', () => sources.kakaoSearch(query)),
      safe('google', () => sources.googleSearch(query)),
      safe('naver', () => sources.naverLocal(query)),
    ]);
    return { kakao, google, naver, errors, available: sources.available() };
  }

  /**
   * 2단계: 고른 후보의 상세를 모아 source 로 저장하고 사진 목록을 다시 만든다.
   *   카카오 후보는 검색 결과 객체를 그대로 받는다(카카오 로컬엔 단건 조회 API가 없다).
   */
  async collect(businessId: string, body: { query?: string; kakao?: KakaoPlace; googlePlaceId?: string; naver?: NaverLocal }) {
    const b = await this.biz(businessId);
    const errors: Record<string, string> = {};
    const kakao = body.kakao && body.kakao.id ? pickKakao(body.kakao) : null;
    const name = kakao?.name || body.naver?.name || b.name;
    // 블로그는 "가게 이름 + 동네"로 찾아야 같은 이름의 다른 지점 글이 덜 섞인다
    const dong = (kakao?.address || body.naver?.address || '').split(' ').find((w) => /[동읍면가]$/.test(w)) || '';

    let google: GooglePlaceDetail | null = null;
    if (body.googlePlaceId) {
      try { google = await sources.googleDetail(body.googlePlaceId); } catch (e: any) { errors.google = String(e?.message || e).slice(0, 200); }
    }
    let blogs: NaverBlog[] = [];
    try { blogs = await sources.naverBlogs(`${name} ${dong}`.trim()); } catch (e: any) { errors.naver = String(e?.message || e).slice(0, 200); }

    const source: SiteSource = {
      query: body.query, collectedAt: new Date().toISOString(),
      kakao, google, naver: { local: body.naver ? pickNaver(body.naver) : null, blogs }, errors,
    };
    const site = await this.repo.ensure(businessId, guessTemplate(kakao?.category || body.naver?.category, b.industry || ''));
    const photos = await this.mergePhotos(businessId, site.photos as PhotoEntry[], source);
    if (!site.slug) await this.repo.update(businessId, { slug: await this.defaultSlug(businessId, kakao) });
    await this.repo.update(businessId, { source, photos });
    return this.get(businessId);
  }

  /** 3단계: AI가 템플릿을 고르고 문구를 쓴다. template 을 넘기면 그 템플릿으로 고정 */
  async generate(businessId: string, body: { template?: string }) {
    const b = await this.biz(businessId);
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new BadRequestException('먼저 자료를 수집하세요.');
    const s: SiteSource = site.source || {};
    const facts = this.facts(s);
    const lock = Boolean(body.template && TEMPLATES[body.template]);
    // AI가 사진을 직접 보게 한다 — 메뉴 이름·공간 특징·대표 사진을 사진에서 고른다(쓰는 사진만, 최대 10장)
    const usable = (site.photos as PhotoEntry[]).filter((p) => !p.hidden).slice(0, MAX_VISION_PHOTOS);
    const loaded = await Promise.all(usable.map((p) => this.loadPhoto(site, p.ref)));
    const refs = usable.filter((_, i) => loaded[i]).map((p) => p.ref);
    const images = loaded.filter(Boolean) as { data: string; mediaType: string }[];
    const out = await this.writer.write({
      name: b.name,
      industry: b.industry,
      memo: b.memo,
      facts: { ...facts, googleSummary: s.google?.summary, googleType: s.google?.type },
      reviews: s.google?.reviews || [],
      blogs: s.naver?.blogs || [],
      suggestedTemplate: lock ? (body.template as string) : site.template,
      lockTemplate: lock,
      images,
    });
    const photoNotes: Record<string, { kind: string; caption: string }> = {};
    for (const p of out.photos) photoNotes[refs[p.i]] = { kind: p.kind, caption: p.caption };
    const services = (out.content.services || []).map((x, k) => {
      const i = out.servicePhotos[k];
      return i == null ? x : { ...x, photo: refs[i] };
    });
    // 대표 사진을 맨 앞으로 — 나머지 순서·숨김은 그대로
    let photos = site.photos as PhotoEntry[];
    const heroRef = out.hero == null ? null : refs[out.hero];
    if (heroRef) photos = [...photos.filter((p) => p.ref === heroRef), ...photos.filter((p) => p.ref !== heroRef)];
    await this.repo.update(businessId, { template: out.template, content: { ...out.content, services, photoNotes }, photos });
    return this.get(businessId);
  }

  /** 관리자 수정 — 문구·템플릿·사진 순서·주소(slug)·공개 상태 */
  async update(businessId: string, body: { slug?: string; template?: string; content?: any; photos?: PhotoEntry[]; status?: string }) {
    await this.biz(businessId);
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new BadRequestException('먼저 자료를 수집하세요.');
    const patch: Record<string, unknown> = {};
    if (body.slug !== undefined) {
      const slug = String(body.slug).trim().toLowerCase();
      if (!SLUG_RE.test(slug) || RESERVED.has(slug)) throw new BadRequestException('주소는 영어 소문자·숫자·하이픈 3~60자로 입력하세요.');
      if (await this.repo.slugTaken(slug, businessId)) throw new ConflictException('이미 다른 사업체가 쓰는 주소입니다.');
      patch.slug = slug;
    }
    if (body.template !== undefined) {
      if (!TEMPLATES[body.template]) throw new BadRequestException('없는 템플릿입니다.');
      patch.template = body.template;
    }
    if (body.content !== undefined) {
      if (typeof body.content !== 'object' || Array.isArray(body.content)) throw new BadRequestException('content 형식이 잘못됐습니다.');
      const next = { ...(site.content || {}), ...body.content };
      // 화면은 메뉴를 "이름 | 설명 | 가격" 글로 고친다 — 사진 연결(photo)은 같은 이름이면 이어 붙인다
      if (Array.isArray(body.content.services)) {
        const prevPhoto = new Map(((site.content || {}).services || []).filter((x: any) => x.photo).map((x: any) => [x.name, x.photo]));
        next.services = body.content.services.map((x: any) => ({ ...x, photo: x.photo || prevPhoto.get(x.name) || undefined }));
      }
      patch.content = next;
    }
    if (body.photos !== undefined) {
      const known = new Set((site.photos as PhotoEntry[]).map((p) => p.ref));
      patch.photos = (Array.isArray(body.photos) ? body.photos : [])
        .filter((p) => p && known.has(p.ref)).map((p) => ({ ref: p.ref, ...(p.hidden ? { hidden: true } : {}) }));
    }
    if (body.status !== undefined) {
      if (!['draft', 'published'].includes(body.status)) throw new BadRequestException('status는 draft 또는 published 입니다.');
      if (body.status === 'published' && !(patch.slug || site.slug)) throw new BadRequestException('공개하려면 주소를 먼저 정하세요.');
      if (body.status === 'published' && !Object.keys(site.content || {}).length && !patch.content) throw new BadRequestException('문구를 먼저 만드세요.');
      patch.status = body.status;
    }
    await this.repo.update(businessId, patch);
    return this.get(businessId);
  }

  // ── 렌더 ──

  async renderPublished(slug: string): Promise<string | null> {
    const site = await this.repo.publishedBySlug(String(slug || '').toLowerCase());
    return site ? this.render(site, false) : null;
  }

  async renderPreview(businessId: string): Promise<string | null> {
    const site = await this.repo.byBusiness(businessId);
    return site ? this.render(site, true) : null;
  }

  private async render(site: BusinessSiteRow, preview: boolean): Promise<string> {
    const b = await this.biz(site.business_id);
    const s: SiteSource = site.source || {};
    const content = site.content || {};
    const usesReviews = TEMPLATES[site.template]?.reviews !== false;
    const gReviews = s.google?.reviews || [];
    const picks: number[] = Array.isArray(content.reviewPicks) ? content.reviewPicks : [];
    const reviews: SiteReview[] = !usesReviews ? [] : (picks.length ? picks.map((i) => gReviews[i]).filter(Boolean)
      : gReviews.filter((r) => (r.rating || 0) >= 4).slice(0, 3))
      .map((r) => ({ author: r.author, authorUri: r.authorUri, text: r.text, rating: r.rating, when: r.when, source: 'Google' }));
    const blogs = s.naver?.blogs || [];
    const bPicks: number[] = Array.isArray(content.blogPicks) ? content.blogPicks : [];
    const photoList = await this.photoList(site);
    const urlOf = new Map(photoList.filter((p) => !p.hidden).map((p) => [p.ref, p.url]));
    const services = (content.services || []).map((x: any) => ({ ...x, photoUrl: x.photo ? urlOf.get(x.photo) : undefined }));
    const model: SiteModel = {
      name: b.name,
      slug: site.slug || '',
      canonical: site.slug ? this.canonical(site.slug) : (env.PUBLIC_URL || 'https://doppia.ai'),
      content: { ...content, services },
      facts: this.facts(s),
      photos: photoList.filter((p) => !p.hidden),
      reviews,
      blogs: !usesReviews ? [] : bPicks.map((i) => blogs[i]).filter(Boolean).map((x) => ({ title: x.title, link: x.link, blogger: x.blogger })),
      preview,
    };
    return renderSite(site.template, model);
  }

  /** Google 사진 프록시 — 사이트 id + 번호. 키를 브라우저에 노출하지 않는다 */
  async googlePhoto(siteId: string, n: number) {
    const site = await this.repo.byId(siteId);
    const ph = site?.source?.google?.photos?.[n];
    if (!ph) return null;
    return sources.googlePhoto(ph.name);
  }

  // ── 내부 ──

  private canonical(slug: string) {
    return `${String(env.PUBLIC_URL || 'https://doppia.ai').replace(/\/$/, '')}/site/${slug}`;
  }

  /** 사실 정보는 출처 우선순위로 합친다: 카카오(국내 주소·전화가 가장 정확) → 구글 → 네이버 */
  private facts(s: SiteSource) {
    const k = s.kakao; const g = s.google; const n = s.naver?.local;
    const num = (v: unknown) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);
    return {
      category: k?.category || n?.category || g?.type || '',
      address: k?.address || n?.address || g?.address || '',
      roadAddress: k?.roadAddress || n?.roadAddress || '',
      phone: k?.phone || n?.phone || g?.phone || '',
      hours: g?.hours || [],
      website: g?.website || '',
      kakaoUrl: k?.url || '',
      googleUrl: g?.mapsUrl || '',
      naverUrl: n?.link || '',
      lat: num(k?.y) ?? g?.lat,
      lng: num(k?.x) ?? g?.lng,
      rating: g?.rating,
      ratingCount: g?.ratingCount,
    };
  }

  /** 사진 목록 = 사업체 원본(★ 먼저) + Google 사진. 기존 순서·숨김은 그대로 두고 새 사진만 뒤에 붙인다 */
  private async mergePhotos(businessId: string, prev: PhotoEntry[], s: SiteSource): Promise<PhotoEntry[]> {
    const own = (await this.repo.businessImages(businessId)).map((m) => `media:${m.id}`);
    const google = (s.google?.photos || []).map((_, i) => `google:${i}`);
    const valid = new Set([...own, ...google]);
    const kept = (prev || []).filter((p) => valid.has(p.ref));
    const seen = new Set(kept.map((p) => p.ref));
    return [...kept, ...[...own, ...google].filter((r) => !seen.has(r)).map((ref) => ({ ref }))];
  }

  private async photoList(site: BusinessSiteRow): Promise<(SitePhoto & PhotoEntry)[]> {
    const own = new Map((await this.repo.businessImages(site.business_id)).map((m) => [m.id, m]));
    const gph = site.source?.google?.photos || [];
    const notes = (site.content && site.content.photoNotes) || {};
    const out: (SitePhoto & PhotoEntry)[] = [];
    for (const p of (site.photos || []) as PhotoEntry[]) {
      const [kind, id] = p.ref.split(':');
      if (kind === 'media' && own.has(id)) {
        const file = String(own.get(id)!.file_path).split('/').pop();
        out.push({ ...p, ...notes[p.ref], url: `/images/t/960/${file}` });
      } else if (kind === 'google' && gph[Number(id)]) {
        const a = gph[Number(id)].authors?.[0];
        out.push({ ...p, ...notes[p.ref], url: `/site-photo/${site.id}/${id}`, credit: a?.name, creditUri: a?.uri });
      }
    }
    return out;
  }

  /** AI 첨부용 사진 — Google은 800px로 받고, 원본은 우리 썸네일(480 WebP)을 로컬에서 받는다. 실패하면 null(그 사진만 빠진다) */
  private async loadPhoto(site: BusinessSiteRow, ref: string): Promise<{ data: string; mediaType: string } | null> {
    try {
      const [kind, id] = ref.split(':');
      if (kind === 'google') {
        const name = site.source?.google?.photos?.[Number(id)]?.name;
        const ph = name ? await sources.googlePhoto(name, 800) : null;
        return ph && ph.buf.length < MAX_VISION_BYTES ? { data: ph.buf.toString('base64'), mediaType: ph.type.split(';')[0] } : null;
      }
      const m = (await this.repo.businessImages(site.business_id)).find((x) => x.id === id);
      if (!m) return null;
      const file = String(m.file_path).split('/').pop();
      const res = await fetch(`http://127.0.0.1:${env.PORT}/images/t/480/${file}`);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const type = (res.headers.get('content-type') || 'image/webp').split(';')[0];
      return buf.length < MAX_VISION_BYTES && /^image\/(jpeg|png|webp|gif)$/.test(type) ? { data: buf.toString('base64'), mediaType: type } : null;
    } catch {
      return null;
    }
  }

  /** 기본 주소 — 영문이 아니면 이름으로 못 만드니 짧은 무작위 주소. 관리자가 바꾼다 */
  private async defaultSlug(businessId: string, kakao: KakaoPlace | null): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const slug = `${kakao?.id ? `k${kakao.id}` : 's'}-${Math.random().toString(36).slice(2, 6)}`;
      if (!(await this.repo.slugTaken(slug, businessId))) return slug;
    }
    return `s-${Date.now().toString(36)}`;
  }
}

/** 클라이언트가 보낸 카카오 객체에서 필요한 필드만 — 임의 키가 source에 쌓이지 않게 */
function pickKakao(k: any): KakaoPlace {
  const s = (v: unknown) => String(v ?? '').slice(0, 300);
  return { id: s(k.id), name: s(k.name), category: s(k.category), phone: s(k.phone), address: s(k.address),
    roadAddress: s(k.roadAddress), x: s(k.x), y: s(k.y), url: /^https?:\/\//.test(k.url) ? s(k.url) : '' };
}

function pickNaver(n: any): NaverLocal {
  const s = (v: unknown) => String(v ?? '').slice(0, 300);
  return { name: s(n.name), category: s(n.category), phone: s(n.phone), address: s(n.address),
    roadAddress: s(n.roadAddress), link: /^https?:\/\//.test(n.link) ? s(n.link) : '' };
}
