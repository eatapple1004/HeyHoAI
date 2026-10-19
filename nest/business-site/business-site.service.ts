import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { BusinessSiteRepository, BusinessSiteRow } from './business-site.repository';
import { SiteWriterService } from './site-writer.service';
import { CorpWriterService } from './corp-writer.service';
import { CorpSite, CorpPhoto, routeCorp, RouteResult } from './multipage';
import { sources, GooglePlaceDetail, KakaoPlace, NaverBlog, NaverLocal, WebPage } from './place-sources';
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
  /** 회사가 준 자료(회사소개서·조사 내용 붙여넣기) — 기업형 사실의 주 출처 */
  manual?: string;
  /** 회사 기존 홈페이지 글 */
  web?: { url: string; pages: WebPage[] } | null;
  errors?: Record<string, string>;
}

@Injectable()
export class BusinessSiteService {
  constructor(
    private readonly repo: BusinessSiteRepository,
    private readonly writer: SiteWriterService,
    private readonly corpWriter: CorpWriterService,
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
  async collect(businessId: string, body: { query?: string; kakao?: KakaoPlace; googlePlaceId?: string; naver?: NaverLocal; manualText?: string; website?: string }) {
    const b = await this.biz(businessId);
    const errors: Record<string, string> = {};
    const prev: SiteSource = (await this.repo.byBusiness(businessId))?.source || {};
    // 회사 자료·홈페이지는 이번에 안 보냈으면 지난번 것을 유지한다(장소만 다시 고르는 경우)
    const manual = body.manualText !== undefined ? String(body.manualText).slice(0, 40000) : prev.manual;
    let web = prev.web || null;
    if (body.website !== undefined) {
      web = null;
      if (String(body.website).trim()) {
        try {
          web = await sources.website(body.website);
          if (!web) errors.web = '주소 형식이 잘못됐습니다(공개 도메인만 가능)';
        } catch (e: any) { errors.web = String(e?.message || e).slice(0, 200); }
      }
    }
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
      kakao, google, naver: { local: body.naver ? pickNaver(body.naver) : null, blogs }, manual, web, errors,
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
    // 기업형은 여러 페이지 — 골격 + 제품별 상세를 나눠 쓰느라 수 분 걸린다. 요청은 바로 돌려주고 뒤에서 만든다
    //   (Cloudflare 100초 제한에 걸려 화면이 524로 끊기지 않게). 진행 상황은 content.gen 으로 폴링한다.
    if ((body.template || site.template) === 'corporate') {
      if (site.content?.gen?.state === 'running' && Date.now() - Date.parse(site.content.gen.at || 0) < 15 * 60 * 1000) {
        throw new ConflictException('이미 만드는 중입니다.');
      }
      await this.setGen(businessId, { state: 'running', step: '사진과 자료를 읽는 중', done: 0, total: 0 }, 'corporate');
      this.runCorporate(businessId).catch(async (e) => {
        console.error('[business-site] corporate generate failed', e);
        await this.setGen(businessId, { state: 'error', error: String(e?.message || e).slice(0, 300) });
      });
      return this.get(businessId);
    }
    const s: SiteSource = site.source || {};
    const facts = this.facts(s);
    const lock = Boolean(body.template && TEMPLATES[body.template]);
    // AI가 사진을 직접 보게 한다 — 메뉴 이름·공간 특징·대표 사진을 사진에서 고른다(쓰는 사진만, 최대 10장)
    const usable = (site.photos as PhotoEntry[]).filter((p) => !p.hidden).slice(0, MAX_VISION_PHOTOS);
    const loaded = await Promise.all(usable.map((p) => this.loadPhoto(site, p.ref)));
    const refs = usable.filter((_, i) => loaded[i]).map((p) => p.ref);
    const images = loaded.filter(Boolean) as { data: string; mediaType: string }[];
    const material = [
      s.manual ? `## 회사가 준 자료\n${s.manual}` : '',
      ...(s.web?.pages || []).map((p) => `## 기존 홈페이지: ${p.title || p.url}\n${p.text}`),
    ].filter(Boolean).join('\n\n');
    const out = await this.writer.write({
      material,
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

  // ── 여러 페이지 기업 사이트 ──

  private async setGen(businessId: string, gen: Record<string, unknown>, template?: string) {
    const site = await this.repo.byBusiness(businessId);
    await this.repo.update(businessId, { content: { ...(site?.content || {}), gen: { ...gen, at: new Date().toISOString() } }, ...(template ? { template } : {}) });
  }

  private async runCorporate(businessId: string) {
    const b = await this.biz(businessId);
    const site = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
    const s: SiteSource = site.source || {};
    const usable = (site.photos as PhotoEntry[]).filter((p) => !p.hidden).slice(0, MAX_VISION_PHOTOS);
    const loaded = await Promise.all(usable.map((p) => this.loadPhoto(site, p.ref)));
    const refs = usable.filter((_, i) => loaded[i]).map((p) => p.ref);
    const images = loaded.filter(Boolean) as { data: string; mediaType: string }[];
    const material = [
      s.manual ? `## 회사가 준 자료\n${s.manual}` : '',
      ...(s.web?.pages || []).map((p) => `## 기존 홈페이지: ${p.title || p.url}\n${p.text}`),
    ].filter(Boolean).join('\n\n');

    await this.setGen(businessId, { state: 'running', step: '사이트 구성과 회사 소개를 쓰는 중', done: 0, total: 0 });
    const sk = await this.corpWriter.skeleton({ name: b.name, industry: b.industry, memo: b.memo, facts: this.facts(s), material, images });

    // 제품 상세 — 3개씩 동시에
    const products: any[] = sk.products.map((p) => ({ ...p, photos: p.photos.map((i) => refs[i]).filter(Boolean) }));
    let done = 0;
    await this.setGen(businessId, { state: 'running', step: '제품 상세 페이지를 쓰는 중', done, total: products.length });
    const queue = [...products];
    const worker = async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          Object.assign(p, await this.corpWriter.productDetail({ name: b.name, material, product: p }));
        } catch (e: any) {
          console.warn('[business-site] product detail failed', p.id, e?.message);
        }
        done += 1;
        await this.setGen(businessId, { state: 'running', step: '제품 상세 페이지를 쓰는 중', done, total: products.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    const photoNotes: Record<string, { kind: string; caption: string }> = {};
    for (const p of sk.photos) photoNotes[refs[p.i]] = { kind: p.kind, caption: p.caption };
    const heroRef = sk.hero == null ? null : refs[sk.hero];
    let photos = site.photos as PhotoEntry[];
    if (heroRef) photos = [...photos.filter((p) => p.ref === heroRef), ...photos.filter((p) => p.ref !== heroRef)];
    const { photos: _ph, hero: _h, aboutPhoto, products: _pr, ...rest } = sk;
    await this.repo.update(businessId, {
      template: 'corporate',
      photos,
      content: {
        ...rest, products, photoNotes,
        aboutPhoto: aboutPhoto == null ? null : refs[aboutPhoto],
        multipage: true,
        gen: { state: 'done', done, total: products.length, at: new Date().toISOString() },
      },
    });
  }

  /** 렌더 모델 — content(문구) + facts(수집 자료) + 사진. base 는 링크 앞부분 */
  private async corpModel(site: BusinessSiteRow, base: string, preview: boolean): Promise<CorpSite> {
    const b = await this.biz(site.business_id);
    const c = site.content || {};
    const f = this.facts(site.source || {});
    const list = (await this.photoList(site)).filter((p) => !p.hidden);
    const byRef = new Map(list.map((p) => [p.ref, p]));
    const ph = (ref?: string | null): CorpPhoto | undefined => {
      const p = ref ? byRef.get(ref) : undefined;
      return p ? { url: p.url, caption: p.caption, kind: p.kind, credit: p.credit, creditUri: p.creditUri } : undefined;
    };
    const productPhotoRefs = new Set((c.products || []).flatMap((p: any) => p.photos || []));
    const credits = [...new Map(list.filter((p) => p.credit).map((p) => [p.credit, { name: p.credit as string, uri: p.creditUri }])).values()];
    return {
      name: b.name, base, origin: String(env.PUBLIC_URL || 'https://doppia.ai').replace(/\/$/, ''), preview,
      accent: /^#[0-9a-f]{6}$/i.test(c.accent || '') ? c.accent : '#2D5B8C',
      headline: c.headline || '', sub: c.sub || '', ctaLabel: c.ctaLabel || '견적 문의',
      stats: c.stats || [], highlights: c.highlights || [],
      aboutTitle: c.aboutTitle || '', about: c.about || '', ceo: c.ceo,
      history: c.history || [], certifications: c.certifications || [],
      categories: c.categories || [],
      products: (c.products || []).map((p: any) => ({ ...p, photos: (p.photos || []).map((r: string) => ph(r)).filter(Boolean) })),
      company: c.company || {},
      facts: { address: f.roadAddress || f.address || '', phone: f.phone || '', lat: f.lat, lng: f.lng, kakaoUrl: f.kakaoUrl, googleUrl: f.googleUrl },
      heroPhoto: ph(list[0]?.ref),
      aboutPhoto: ph(c.aboutPhoto) || ph(list.find((p) => p.kind === 'factory' && !productPhotoRefs.has(p.ref))?.ref),
      gallery: list.filter((p) => !productPhotoRefs.has(p.ref)).map((p) => ph(p.ref)).filter(Boolean) as CorpPhoto[],
      seoDescription: c.seoDescription || c.sub || '',
      credits,
    };
  }

  /** 여러 페이지 사이트면 경로를 렌더, 아니면 null(한 장짜리 템플릿이 처리) */
  async renderSitePath(slug: string, path: string, query: Record<string, string>): Promise<RouteResult | null> {
    const site = await this.repo.publishedBySlug(String(slug || '').toLowerCase());
    if (!site || !site.content?.multipage) return null;
    return routeCorp(await this.corpModel(site, `/site/${site.slug}`, false), path, query);
  }

  async renderPreviewPath(businessId: string, path: string, query: Record<string, string>): Promise<RouteResult | null> {
    const site = await this.repo.byBusiness(businessId);
    if (!site || !site.content?.multipage) return null;
    return routeCorp(await this.corpModel(site, `/admin-business/${businessId}/site/preview`, true), path, query);
  }

  /** 공개 사이트 문의 접수 — 스팸 방지(숨김 칸·IP당 시간당 5건) */
  async submitInquiry(slug: string, form: Record<string, string>, ip: string): Promise<'ok' | string> {
    const site = await this.repo.publishedBySlug(String(slug || '').toLowerCase());
    if (!site) return '사이트를 찾을 수 없습니다.';
    if (form.website) return 'ok'; // 봇 — 조용히 무시
    const t = (k: string, n: number) => String(form[k] || '').trim().slice(0, n);
    const data = { name: t('name', 40), company: t('company', 60), phone: t('phone', 30), email: t('email', 80), product: t('product', 60), message: t('message', 3000) };
    if (!data.name || !data.phone || !data.message) return '이름·연락처·문의 내용을 입력해 주세요.';
    if (form.agree !== '1') return '개인정보 수집·이용에 동의해 주세요.';
    if ((await this.repo.recentInquiries(site.id, ip)) >= 5) return '잠시 후 다시 시도해 주세요.';
    await this.repo.addInquiry(site.id, site.business_id, data, ip);
    return 'ok';
  }

  async inquiries(businessId: string) {
    await this.biz(businessId);
    return this.repo.inquiries(businessId);
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
