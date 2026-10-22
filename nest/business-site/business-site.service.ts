import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { BusinessSiteRepository, BusinessSiteRow } from './business-site.repository';
import { SiteWriterService } from './site-writer.service';
import { CorpWriterService } from './corp-writer.service';
import { ProcessWriterService, ResearchFact, ResearchSheet, SitePlan } from './process-writer.service';
import { runQa } from './site-qa';
import { visualCheck } from './visual-qa';
import { randomBytes, randomUUID } from 'crypto';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
import { CorpSite, CorpPhoto, routeCorp, RouteResult, profileOf, planPages, sitePages } from './multipage';
import { sources, GooglePlaceDetail, KakaoPlace, NaverBlog, NaverLocal, WebPage, WebImage } from './place-sources';
import { TEMPLATES, TEMPLATE_KEYS, guessTemplate, renderSite, SiteModel, SitePhoto, SiteReview } from './templates';
import { naverPack, categoryType } from './naver-pack';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));

/** AI에 첨부하는 사진 한도 — 장수·용량이 커지면 응답이 느려지고 비싸진다 */
const MAX_VISION_PHOTOS = 10;
/** 여러 페이지 기업 사이트는 제품마다 사진을 짝지어야 해서 더 많이 본다(480px 썸네일이라 가볍다) */
const MAX_CORP_PHOTOS = 24;
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
  /** 회사 기존 홈페이지 글 + 본문 이미지. ocr = 글 이미지를 옮겨 적은 것, imported = 가져온 사진(이미지 주소 → 사업체 사진 id) */
  web?: { url: string; pages: WebPage[]; images?: WebImage[]; ocr?: { url: string; page: string; text: string }[]; imported?: Record<string, string>; read?: string[] } | null;
  errors?: Record<string, string>;
}

@Injectable()
export class BusinessSiteService {
  constructor(
    private readonly repo: BusinessSiteRepository,
    private readonly writer: SiteWriterService,
    private readonly corpWriter: CorpWriterService,
    private readonly procWriter: ProcessWriterService,
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
      versions: site ? await this.repo.versions(site.id) : [],
      planPages: planPages(this.profile(site)),
      profile: (({ key, store, items, aboutPage }) => ({ key, store, items, aboutPage }))(this.profile(site)),
      // 관리자 페이지 목록 — 사이트가 실제로 가진 페이지
      sitePages: site?.content?.multipage ? sitePages(await this.corpModel(site, '', true)) : [],
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
    const googleWebsiteLater = body.website === undefined || !String(body.website).trim();
    const name = kakao?.name || body.naver?.name || b.name;
    // 블로그는 "가게 이름 + 동네"로 찾아야 같은 이름의 다른 지점 글이 덜 섞인다
    const dong = (kakao?.address || body.naver?.address || '').split(' ').find((w) => /[동읍면가]$/.test(w)) || '';

    let google: GooglePlaceDetail | null = null;
    if (body.googlePlaceId) {
      try { google = await sources.googleDetail(body.googlePlaceId); } catch (e: any) { errors.google = String(e?.message || e).slice(0, 200); }
    }
    let blogs: NaverBlog[] = [];
    try { blogs = await sources.naverBlogs(`${name} ${dong}`.trim()); } catch (e: any) { errors.naver = String(e?.message || e).slice(0, 200); }

    // 홈페이지 주소를 안 넣었는데 Google 장소에 홈페이지가 있으면 그걸 읽는다(회사 자신의 사이트)
    if (!web && googleWebsiteLater && google?.website) {
      try { web = await sources.website(google.website); } catch (e: any) { errors.web = `Google에 등록된 홈페이지(${google.website})를 열지 못했습니다: ${String(e?.message || e).slice(0, 120)}`; }
    }
    // 같은 홈페이지를 다시 읽었으면 이미 읽은 이미지(옮겨 적은 글·가져온 사진)는 이어 쓴다 — 사진이 두 번 들어오지 않게
    if (web && prev.web && prev.web.url === web.url) web = { ...web, ocr: prev.web.ocr, imported: prev.web.imported, read: prev.web.read };
    const source: SiteSource = {
      query: body.query, collectedAt: new Date().toISOString(),
      kakao, google, naver: { local: body.naver ? pickNaver(body.naver) : null, blogs }, manual, web, errors,
    };
    // 업종 칸이 비어 있으면 지도 분류로 채운다(브랜드 칸은 건너뜀 — "제과,베이커리 > 뚜레쥬르" → 제과·베이커리)
    const autoIndustry = categoryType(kakao?.category || body.naver?.category || '', name) || google?.type || '';
    if (!b.industry && autoIndustry) { await this.repo.fillIndustry(businessId, autoIndustry); b.industry = autoIndustry; }
    const site = await this.repo.ensure(businessId, guessTemplate(kakao?.category || body.naver?.category, b.industry || ''));
    const photos = await this.mergePhotos(businessId, site.photos as PhotoEntry[], source);
    if (!site.slug) await this.repo.update(businessId, { slug: await this.defaultSlug(businessId, kakao) });
    await this.repo.update(businessId, { source, photos });
    return this.get(businessId);
  }

  /** 업종 프로필 — 만든 사이트는 만들 때 정한 것(content.profile), 아직이면 템플릿 */
  private profile(site?: BusinessSiteRow | null) {
    return profileOf(site?.content?.profile || site?.template);
  }

  /**
   * 3단계: 사이트 만들기 — 모든 업종을 여러 페이지로 만든다(회사형: 제품 상세까지, 매장형: 메뉴·후기·영업시간).
   *   template 을 넘기면 그 업종으로 고정. single=true 면 예전 한 장짜리 템플릿(빠른 초안용).
   */
  async generate(businessId: string, body: { template?: string; single?: boolean }) {
    const b = await this.biz(businessId);
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new BadRequestException('먼저 자료를 수집하세요.');
    if (body.template && !TEMPLATES[body.template]) throw new BadRequestException('없는 템플릿입니다.');
    // 여러 페이지 — 골격 + 제품별 상세를 나눠 쓰느라 수 분 걸린다. 요청은 바로 돌려주고 뒤에서 만든다
    //   (Cloudflare 100초 제한에 걸려 화면이 524로 끊기지 않게). 진행 상황은 content.gen 으로 폴링한다.
    if (!body.single) {
      const key = body.template || site.template;
      if (site.content?.gen?.state === 'running' && Date.now() - Date.parse(site.content.gen.at || 0) < 15 * 60 * 1000) {
        throw new ConflictException('이미 만드는 중입니다.');
      }
      // 제작 과정을 밟는 사이트(조사 시트가 있음)는 기획안 승인 뒤에만 만든다 — 방향을 먼저 고정
      const pr = site.process || {};
      if (pr.research?.sheet && !pr.plan?.approvedAt) throw new BadRequestException('기획안을 먼저 승인하세요.');
      await this.setGen(businessId, { state: 'running', step: '사진과 자료를 읽는 중', done: 0, total: 0 }, key);
      this.runMulti(businessId, key).catch(async (e) => {
        console.error('[business-site] multipage generate failed', e);
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
    await this.repo.addVersion((await this.repo.byBusiness(businessId)) as BusinessSiteRow, '한 페이지 초안');
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

  private async runMulti(businessId: string, key: string) {
    const b = await this.biz(businessId);
    const site = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
    const s: SiteSource = site.source || {};
    const prof = profileOf(key);
    // 앞쪽 사진은 AI가 직접 보고, 나머지는 이름(가져온 사진의 제품명 캡션)만으로 제품과 짝짓는다
    const all = (site.photos as PhotoEntry[]).filter((p) => !p.hidden).slice(0, 80);
    const loaded = await Promise.all(all.slice(0, MAX_CORP_PHOTOS).map((p) => this.loadPhoto(site, p.ref)));
    const seen = all.slice(0, MAX_CORP_PHOTOS).filter((_, i) => loaded[i]);
    const refs = [...seen.map((p) => p.ref), ...all.slice(MAX_CORP_PHOTOS).map((p) => p.ref)];
    const images = loaded.filter(Boolean) as { data: string; mediaType: string }[];
    const caps = new Map((await this.repo.businessImages(businessId)).map((m) => [`media:${m.id}`, String(m.caption || '').replace(/^\[홈페이지\]\s*/, '')]));
    const photoNames = refs.map((r) => caps.get(r) || '');
    const material = this.material(site);
    const plan: SitePlan | undefined = site.process?.plan?.approvedAt ? site.process.plan : undefined;

    await this.setGen(businessId, { state: 'running', step: '사이트 구성과 회사 소개를 쓰는 중', done: 0, total: 0 });
    const sk = await this.corpWriter.skeleton({
      name: siteName(b.name), industry: b.industry, memo: b.memo, facts: this.facts(s), material, images, photoNames, plan, profile: prof,
      reviews: prof.store ? (s.google?.reviews || []).map((r) => r.text).filter(Boolean).slice(0, 5) : [],
    });
    // 기획안에서 뺀 페이지는 비운다(라우터·메뉴가 자료 없는 페이지를 숨긴다)
    if (plan) {
      const off = (k: string) => plan.pages.some((p) => p.key === k && !p.include);
      if (off('history')) sk.history = [];
      if (off('certifications')) sk.certifications = [];
      if (off('ceo')) sk.ceo = undefined;
      if (off('products')) { sk.products = []; sk.categories = []; }
      if (off('reviews')) (sk as any).reviewsOff = true;
      if (plan.accent) sk.accent = plan.accent;
    }

    // 제품 상세 — 3개씩 동시에. 매장형 메뉴는 상세 페이지가 없다(목록 카드만)
    const products: any[] = sk.products.map((p) => ({ ...p, photos: p.photos.map((i) => refs[i]).filter(Boolean) }));
    let done = 0;
    if (prof.itemDetail) await this.setGen(businessId, { state: 'running', step: '제품 상세 페이지를 쓰는 중', done, total: products.length });
    const queue = prof.itemDetail ? [...products] : [];
    const worker = async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          Object.assign(p, await this.corpWriter.productDetail({ name: siteName(b.name), material, product: p }));
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
      template: prof.key,
      photos,
      content: {
        ...rest, products, photoNotes,
        aboutPhoto: aboutPhoto == null ? null : refs[aboutPhoto],
        multipage: true, profile: prof.key,
        gen: { state: 'running', step: '버전 저장·자동 점검 중', done, total: products.length, at: new Date().toISOString() },
      },
    });
    // 만들 때마다 버전으로 남기고 바로 자동 점검 — 끝나야 "완료"로 바꾼다(화면이 점검 결과까지 한 번에 받게)
    const fresh = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
    await this.repo.addVersion(fresh, plan ? `AI 제작 — ${plan.concept}` : 'AI 제작');
    await this.qa(businessId);
    await this.setGen(businessId, { state: 'done', done, total: products.length });
  }

  // ── 제작 과정: 조사 → 기획안(승인) → 제작 → 자동 점검 → 고객 검토 → 공개 ──

  /** process 컬럼을 읽고-고치고-쓴다 */
  private async patchProcess(businessId: string, fn: (p: any) => void) {
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new BadRequestException('먼저 자료를 수집하세요.');
    const p = JSON.parse(JSON.stringify(site.process || {}));
    fn(p);
    await this.repo.update(businessId, { process: p });
    return p;
  }

  /** 뒤에서 도는 조사·기획 작업 — 상태는 process.job 으로 폴링 */
  private async startJob(businessId: string, kind: 'research' | 'plan', step: string, work: () => Promise<void>) {
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new BadRequestException('먼저 자료를 수집하세요.');
    const job = site.process?.job;
    if (job?.state === 'running' && Date.now() - Date.parse(job.at || 0) < 10 * 60 * 1000) throw new ConflictException('다른 작업이 진행 중입니다.');
    await this.patchProcess(businessId, (p) => { p.job = { kind, state: 'running', step, at: new Date().toISOString() }; });
    work()
      .then(() => this.patchProcess(businessId, (p) => { p.job = { kind, state: 'done', at: new Date().toISOString() }; }))
      .catch(async (e) => {
        console.error(`[business-site] ${kind} failed`, e);
        await this.patchProcess(businessId, (p) => { p.job = { kind, state: 'error', error: String(e?.message || e).slice(0, 300), at: new Date().toISOString() }; });
      });
    return this.get(businessId);
  }

  /** 1단계: 조사 시트 — 수집 자료 + 웹 검색. 다시 돌리면 기획안 승인은 풀린다(근거가 바뀌므로) */
  async research(businessId: string) {
    const b = await this.biz(businessId);
    return this.startJob(businessId, 'research', '웹 검색과 자료로 회사 사실을 모으는 중', async () => {
      const w0 = (await this.repo.byBusiness(businessId))?.source?.web;
      if (w0?.images?.some((im: WebImage) => !(w0.read || []).includes(im.url))) {
        await this.patchProcess(businessId, (p) => { p.job.step = '기존 홈페이지 이미지를 읽는 중(글 옮겨 적기·사진 가져오기)'; });
        await this.readSiteImages(businessId);
        await this.patchProcess(businessId, (p) => { p.job.step = '웹 검색과 자료로 회사 사실을 모으는 중'; });
      }
      const site = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
      const s: SiteSource = site.source || {};
      const f = this.facts(s);
      const name = siteName(b.name);
      // 같은 이름 다른 업체 — 카카오 검색에서 고른 장소와 주소가 다른 것
      let homonyms: string[] = [];
      try {
        homonyms = (await sources.kakaoSearch(name)).filter((k) => k.id !== s.kakao?.id && k.address !== s.kakao?.address)
          .map((k) => `${k.name} — ${k.roadAddress || k.address} (${k.category})`).slice(0, 8);
      } catch { /* 카카오 실패는 조사를 막지 않는다 */ }
      // 네이버 검색은 필수 — 키가 없거나 실패하면 조사를 멈추고 이유를 보여 준다
      await this.patchProcess(businessId, (p) => { p.job.step = '네이버 검색(지역·블로그·웹문서·뉴스·카페) 중'; });
      const naver = await naverPack(s.kakao?.name || name, f.roadAddress || f.address || '');
      await this.patchProcess(businessId, (p) => { p.job.step = '웹 검색과 자료로 회사 사실을 모으는 중'; });
      const sheet = await this.procWriter.research({
        profile: this.profile(site), name, industry: b.industry, memo: b.memo,
        place: { 이름: s.kakao?.name || s.google?.name, 주소: f.roadAddress || f.address, 전화: f.phone, 분류: f.category, 웹사이트: f.website, 구글평점: f.rating },
        homonyms, material: this.material(site, false),
        reviews: (s.google?.reviews || []).map((r) => `${r.rating}점: ${r.text}`),
        naver,
      });
      await this.patchProcess(businessId, (p) => {
        p.research = { sheet, at: new Date().toISOString() };
        if (p.plan) p.plan.approvedAt = null;
      });
    });
  }

  /** 2단계: 기획안 초안 — 사이트에 쓰기로 둔 사실만 본다 */
  async plan(businessId: string) {
    const b = await this.biz(businessId);
    const site = await this.repo.byBusiness(businessId);
    const sheet: ResearchSheet | undefined = site?.process?.research?.sheet;
    if (!sheet) throw new BadRequestException('조사를 먼저 하세요.');
    return this.startJob(businessId, 'plan', '조사 시트로 기획안을 쓰는 중', async () => {
      const cur = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
      const sh: ResearchSheet = cur.process.research.sheet;
      const photos = (await this.photoList(cur)).filter((p) => !p.hidden);
      const plan = await this.procWriter.plan({
        profile: this.profile(cur), reviewCount: (cur.source?.google?.reviews || []).length, rating: cur.source?.google?.rating, name: siteName(b.name), industry: b.industry, facts: sh.facts.filter((x) => x.use), products: sh.products, gaps: sh.gaps,
        photoCount: photos.length, photoNotes: photos.map((p) => p.caption).filter(Boolean) as string[], benchmarks: sh.benchmarks,
      });
      await this.patchProcess(businessId, (p) => { p.plan = { ...plan, approvedAt: null, at: new Date().toISOString() }; });
    });
  }

  /**
   * 관리자 수정 — 사실 쓰기/빼기, 기획안 고치기, 승인.
   *   사실이나 기획안을 고치면 승인이 풀린다(승인한 내용과 달라지므로).
   */
  async updateProcess(businessId: string, body: { factUse?: Record<string, boolean>; plan?: Partial<SitePlan>; approve?: boolean }) {
    await this.biz(businessId);
    await this.patchProcess(businessId, (p) => {
      if (body.factUse && p.research?.sheet) {
        for (const f of p.research.sheet.facts as ResearchFact[]) if (typeof body.factUse[f.id] === 'boolean') f.use = body.factUse[f.id];
        if (p.plan) p.plan.approvedAt = null;
      }
      if (body.plan && p.plan) {
        const q = body.plan; const s = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
        if (q.concept !== undefined) p.plan.concept = s(q.concept, 60);
        if (q.tone !== undefined) p.plan.tone = s(q.tone, 120);
        if (q.headlineDraft !== undefined) p.plan.headlineDraft = s(q.headlineDraft, 60);
        if (q.accent !== undefined) {
          if (!/^#[0-9a-f]{6}$/i.test(String(q.accent))) throw new BadRequestException('강조색은 #RRGGBB 형식입니다.');
          p.plan.accent = q.accent;
        }
        if (Array.isArray(q.pages)) {
          const inc = new Map(q.pages.map((x: any) => [x?.key, x?.include !== false]));
          p.plan.pages = p.plan.pages.map((x: any) => (inc.has(x.key) ? { ...x, include: inc.get(x.key) } : x));
        }
        if (Array.isArray(q.categories)) p.plan.categories = q.categories.map((c: any) => ({ id: s(c?.id, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-'), name: s(c?.name, 30) })).filter((c: any) => c.id && c.name).slice(0, 4);
        if (Array.isArray(q.products)) p.plan.products = q.products.map((x: unknown) => s(x, 60)).filter(Boolean).slice(0, 40);
        p.plan.approvedAt = null;
      }
      if (body.approve !== undefined) {
        if (body.approve && !p.plan) throw new BadRequestException('기획안이 없습니다.');
        if (p.plan) p.plan.approvedAt = body.approve ? new Date().toISOString() : null;
      }
    });
    return this.get(businessId);
  }

  /** 자동 점검 — 제작 직후 자동, 관리자가 고친 뒤 다시 */
  async qa(businessId: string) {
    const site = await this.repo.byBusiness(businessId);
    if (!site?.content?.multipage) throw new BadRequestException('여러 페이지 사이트를 먼저 만드세요.');
    const m = await this.corpModel(site, `/admin-business/${businessId}/site/preview`, true);
    const pr = site.process || {};
    const report = runQa(m, this.sourceText(site), {
      homonyms: pr.research?.sheet?.homonyms,
      planPages: pr.plan ? Object.fromEntries(pr.plan.pages.map((x: any) => [x.key, x.include])) : undefined,
    });
    const at = report.at;
    await this.patchProcess(businessId, (p) => { p.qa = { ...report, visual: { state: 'running', at } }; });
    // 화면 점검(실제 브라우저, 1분 안팎)은 뒤에서 — 끝나면 같은 점검 회차(at)에만 붙인다
    const paths = sitePages(m).map((x) => x.path);
    const pages = paths.map((x) => ({ path: x, html: routeCorp(m, x, {}).body }));
    visualCheck(pages, { shotPaths: [''] })
      .then((v) => this.patchProcess(businessId, (p) => { if (p.qa?.at === at) p.qa.visual = { state: v.skipped ? 'skipped' : 'done', ...v, at: new Date().toISOString() }; }))
      .catch((e) => console.warn('[business-site] visual qa failed', e?.message));
    return this.get(businessId);
  }

  // ── 버전 ──
  async saveVersion(businessId: string, label: string) {
    const site = await this.repo.byBusiness(businessId);
    if (!site || !Object.keys(site.content || {}).length) throw new BadRequestException('저장할 내용이 없습니다.');
    await this.repo.addVersion(site, String(label || '').trim() || '수동 저장');
    return this.get(businessId);
  }

  /** 되돌리기 — 지금 상태도 버전으로 남긴 뒤 바꾼다(되돌리기를 되돌릴 수 있게) */
  async restoreVersion(businessId: string, n: number) {
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new BadRequestException('사이트가 없습니다.');
    const v = await this.repo.version(site.id, n);
    if (!v) throw new NotFoundException('없는 버전입니다.');
    await this.repo.addVersion(site, `되돌리기 전 자동 저장 (v${n}로 이동)`);
    await this.repo.update(businessId, { template: v.template, content: { ...v.content, gen: { state: 'done', at: new Date().toISOString() } }, photos: v.photos });
    if (v.content?.multipage) await this.qa(businessId);
    return this.get(businessId);
  }

  // ── 고객 검토 링크 ──
  async share(businessId: string, on: boolean) {
    await this.patchProcess(businessId, (p) => {
      p.share = on ? { token: p.share?.token || randomBytes(16).toString('hex'), at: new Date().toISOString() } : null;
    });
    return this.get(businessId);
  }

  async renderSharePath(token: string, path: string, query: Record<string, string>): Promise<RouteResult | null> {
    const site = await this.repo.byShareToken(String(token || ''));
    if (!site || !site.content?.multipage) return null;
    return routeCorp(await this.corpModel(site, `/site-review/${token}`, true), path, query);
  }

  /** 자료 요청서 — 고객사에 보내는 문서(인쇄하면 PDF). 확인할 사실·참고 정보·보내 줄 자료·사이트 구성 */
  async requestDoc(businessId: string): Promise<string> {
    const b = await this.biz(businessId);
    const site = await this.repo.byBusiness(businessId);
    const pr = site?.process || {};
    const sh: ResearchSheet | undefined = pr.research?.sheet;
    const plan: SitePlan | undefined = pr.plan;
    const qa = pr.qa;
    const prof = this.profile(site);
    const PP = planPages(prof);
    const e = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const name = siteName(b.name);
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    const used = (sh?.facts || []).filter((f) => f.use);
    const ref = (sh?.facts || []).filter((f) => !f.use);
    const src = (f: ResearchFact) => (f.source.url ? `<a href="${e(f.source.url)}">${e(f.source.title)}</a>` : e(f.source.title));
    const asks = [
      ...(sh?.gaps || []).map((g) => [g.item, g.why]),
      ...(plan?.photoNeeds || []).map((x) => [x, '사진']),
      ...((qa?.items || []) as any[]).filter((i) => i.level === 'warn' && ['연락처', '회사 정보', '사양', '가격', '영업시간'].includes(i.area)).map((i) => [i.msg, '자동 점검']),
    ];
    const review = pr.share?.token ? `${String(env.PUBLIC_URL || 'https://doppia.ai').replace(/\/$/, '')}/site-review/${pr.share.token}/` : '';
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(name)} 홈페이지 자료 요청서</title><meta name="robots" content="noindex">
<style>
@page{size:A4;margin:16mm 14mm}
body{font:14px/1.7 'Pretendard','Apple SD Gothic Neo',sans-serif;color:#1b1f24;background:#fff;max-width:820px;margin:0 auto;padding:28px 20px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:34px 0 10px;padding-bottom:6px;border-bottom:2px solid #1b1f24}
.meta{color:#5b6570}.box{background:#f3f4f5;padding:14px 16px;border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #d6dadf;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f3f4f5;white-space:nowrap}
td.ck{width:70px;text-align:center;color:#8a929b}a{color:#2d5b8c;word-break:break-all}
.noprint{margin:0 0 20px}@media print{.noprint{display:none}a{color:inherit;text-decoration:none}}
</style></head><body>
<div class="noprint"><button onclick="print()">PDF로 저장 / 인쇄</button></div>
<h1>${e(name)} 홈페이지 제작 — 자료 요청서</h1>
<div class="meta">작성일 ${e(today)} · 도피아(Doppia)</div>
${plan ? `<h2>1. 사이트 방향 (기획안)</h2><div class="box"><b>컨셉</b> ${e(plan.concept)}<br><span class="meta">${e(plan.conceptWhy)}</span><br>
<b>구성</b> 홈 · ${e(prof.aboutPage)} · ${plan.pages.filter((p) => p.include).map((p) => e(PP[p.key] || p.key)).join(' · ')}${plan.categories.length ? `<br><b>${e(prof.items)} 분류</b> ${plan.categories.map((c) => e(c.name)).join(' · ')}` : ''}</div>` : ''}
${review ? `<p>검토용 사이트: <a href="${e(review)}">${e(review)}</a> (검색엔진에 노출되지 않는 주소입니다)</p>` : ''}
<h2>${plan ? 2 : 1}. 사이트에 들어갈 사실 — 맞는지 확인해 주세요</h2>
${used.length ? `<table><tr><th>구분</th><th>내용</th><th>출처</th><th>확인</th></tr>${used.map((f) => `<tr><td>${e(f.topic)}</td><td>${e(f.text)}</td><td>${src(f)}</td><td class="ck">□ 맞음</td></tr>`).join('')}</table>` : '<p class="meta">아직 없습니다.</p>'}
<h2>${plan ? 3 : 2}. 확인되지 않은 정보 — 맞으면 표시해 주세요 (표시한 것만 사이트에 씁니다)</h2>
${ref.length ? `<table><tr><th>구분</th><th>내용</th><th>찾은 곳</th><th>확인</th></tr>${ref.map((f) => `<tr><td>${e(f.topic)}</td><td>${e(f.text)}</td><td>${src(f)}</td><td class="ck">□ 맞음</td></tr>`).join('')}</table>` : '<p class="meta">없습니다.</p>'}
<h2>${plan ? 4 : 3}. 보내 주실 자료</h2>
${asks.length ? `<table><tr><th>#</th><th>자료</th><th>이유</th></tr>${asks.map(([a, w], i) => `<tr><td>${i + 1}</td><td>${e(a)}</td><td>${e(w)}</td></tr>`).join('')}</table>` : '<p class="meta">없습니다.</p>'}
${sh?.homonyms?.length ? `<h2>참고: 이름이 같은 다른 업체</h2><p class="meta">검색에서 아래 업체가 함께 나옵니다. 귀사 정보와 섞이지 않도록 확인했습니다.</p><ul>${sh.homonyms.map((h) => `<li>${e(h)}</li>`).join('')}</ul>` : ''}
<p class="meta" style="margin-top:36px">사진은 귀사가 보유하거나 사용 권한이 있는 것만 받습니다. 수치·연혁·인증은 확인해 주신 것만 사이트에 올립니다.</p>
</body></html>`;
  }

  /** AI에 주는 자료 — 조사 시트에서 "쓰기"로 둔 사실 + 회사 자료 + 기존 홈페이지 글 */
  private material(site: BusinessSiteRow, withResearch = true): string {
    const s: SiteSource = site.source || {};
    const sheet: ResearchSheet | undefined = site.process?.research?.sheet;
    return [
      withResearch && sheet ? `## 조사 시트 — 확인된 사실(이것과 아래 회사 자료만 근거로)\n${sheet.facts.filter((f) => f.use).map((f) => `- [${f.topic}] ${f.text} (출처: ${f.source.title})`).join('\n')}` : '',
      s.manual ? `## 회사가 준 자료\n${s.manual}` : '',
      // 이미지 속 글(인사말·연혁·회사개요)이 페이지 글보다 알차다 — 길이 제한에 잘리지 않게 앞에 둔다
      ...[...new Map((s.web?.ocr || []).map((o) => [o.url, o])).values()].map((o) => `## 기존 홈페이지 이미지 속 글 (${o.page})\n${o.text}`),
      ...(s.web?.pages || []).map((p) => `## 기존 홈페이지: ${p.title || p.url}\n${p.text}`),
    ].filter(Boolean).join('\n\n');
  }

  /**
   * 기존 홈페이지 이미지 — 받아서 크기를 보고(작은 장식 제외), AI가 글 이미지는 옮겨 적고 사진은 사업체 사진으로 가져온다.
   *   이미 읽은 이미지(read)는 건너뛴다. 가져온 사진은 사업체 상세에도 보인다(source='import', 캡션에 [홈페이지]).
   */
  private async readSiteImages(businessId: string) {
    const site = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
    const web = site.source?.web;
    const done = new Set(web?.read || []);
    const todo = (web?.images || []).filter((im) => !done.has(im.url)).slice(0, 80);
    if (!todo.length) return;
    const got: { im: WebImage; buf: Buffer; w: number; h: number }[] = [];
    for (const im of todo) {
      const buf = await fetchImage(im.url);
      if (!buf) continue;
      try {
        const meta = await sharp(buf).metadata();
        if ((meta.width || 0) >= 300 && (meta.height || 0) >= 200) got.push({ im, buf, w: meta.width || 0, h: meta.height || 0 });
      } catch { /* 이미지가 아님 */ }
    }
    const ocr: { url: string; page: string; text: string }[] = [...(web!.ocr || [])];
    const imported: Record<string, string> = { ...(web!.imported || {}) };
    const dir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(dir, { recursive: true });
    for (let k = 0; k < got.length; k += 6) {
      const batch = got.slice(k, k + 6);
      const vis = await Promise.all(batch.map(async (g) => ({
        data: (await sharp(g.buf).flatten({ background: '#ffffff' }).resize({ width: 1400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()).toString('base64'),
        mediaType: 'image/jpeg',
      })));
      let read: { i: number; kind: string; caption: string; text: string }[] = [];
      try { read = await this.procWriter.readImages(vis, batch.map((g) => g.im.near || g.im.alt || '')); } catch (e: any) { console.warn('[business-site] readImages failed', e?.message); continue; }
      for (const r of read) {
        const g = batch[r.i];
        if (r.text) { const k = ocr.findIndex((o) => o.url === g.im.url); if (k >= 0) ocr.splice(k, 1); ocr.push({ url: g.im.url, page: g.im.page, text: r.text }); }
        // 사진만 가져온다 — 너무 작으면(가로 500 미만) 화면에서 깨져 보여 뺀다
        if (['product', 'factory', 'people', 'other'].includes(r.kind) && g.w >= 500 && !imported[g.im.url]) {
          const file = `${randomUUID()}.jpg`;
          await sharp(g.buf).flatten({ background: '#ffffff' }).resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(path.join(dir, file));
          try { await mediaStore.putFile(path.join(dir, file)); } catch { /* 저장소 미설정 환경 */ }
          imported[g.im.url] = await this.repo.insertImportedImage(businessId, `tmp/images/${file}`, `[홈페이지] ${g.im.near || r.caption}`.slice(0, 200));
        }
      }
    }
    const fresh = (await this.repo.byBusiness(businessId)) as BusinessSiteRow;
    const source = { ...fresh.source, web: { ...fresh.source.web, ocr, imported, read: [...done, ...todo.map((im) => im.url)] } };
    const photos = await this.mergePhotos(businessId, fresh.photos as PhotoEntry[], source);
    await this.repo.update(businessId, { source, photos });
  }

  /** 자동 점검의 숫자 대조용 — 사이트에 쓸 수 있는 모든 원문 */
  sourceText(site: BusinessSiteRow): string {
    const f = this.facts(site.source || {});
    // 영업시간(Google)도 원문 — 문구에 "밤 11시까지" 같은 말이 들어간다
    return [this.material(site), f.address, f.roadAddress, f.phone, f.category, ...(f.hours || [])].join('\n');
  }

  /** 렌더 모델 — content(문구) + facts(수집 자료) + 사진. base 는 링크 앞부분 */
  async corpModel(site: BusinessSiteRow, base: string, preview: boolean): Promise<CorpSite> {
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
    const prof = this.profile(site);
    const s: SiteSource = site.source || {};
    // 후기 — Google 리뷰 4점 이상(작성자 표기), 블로그는 링크만. 의료기관·기획안에서 뺀 경우는 싣지 않는다
    const showReviews = prof.reviews && !c.reviewsOff;
    const reviews = showReviews ? (s.google?.reviews || []).filter((r) => (r.rating || 0) >= 4 && r.text).slice(0, 9)
      .map((r) => ({ author: r.author, authorUri: r.authorUri, text: r.text, rating: r.rating, when: r.when })) : [];
    const blogs = showReviews ? (s.naver?.blogs || []).slice(0, 8).map((x) => ({ title: x.title, link: x.link, blogger: x.blogger })) : [];
    const aboutKinds = prof.store ? ['interior', 'exterior'] : ['factory'];
    return {
      name: siteName(b.name), profile: prof, base, origin: String(env.PUBLIC_URL || 'https://doppia.ai').replace(/\/$/, ''), preview,
      accent: /^#[0-9a-f]{6}$/i.test(c.accent || '') ? c.accent : '#2D5B8C',
      headline: c.headline || '', sub: c.sub || '', ctaLabel: c.ctaLabel || prof.cta,
      stats: c.stats || [], highlights: c.highlights || [],
      aboutTitle: c.aboutTitle || '', about: c.about || '', ceo: c.ceo,
      history: c.history || [], certifications: c.certifications || [],
      categories: c.categories || [],
      products: (c.products || []).map((p: any) => ({ ...p, photos: (p.photos || []).map((r: string) => ph(r)).filter(Boolean) })),
      company: c.company || {},
      facts: { address: f.roadAddress || f.address || '', phone: f.phone || '', lat: f.lat, lng: f.lng, kakaoUrl: f.kakaoUrl, googleUrl: f.googleUrl,
        ...(showReviews ? { rating: f.rating, ratingCount: f.ratingCount } : {}) },
      hours: f.hours || [],
      reviews, blogs,
      heroPhoto: ph(list[0]?.ref),
      aboutPhoto: ph(c.aboutPhoto) || ph(list.find((p) => aboutKinds.includes(p.kind || '') && !productPhotoRefs.has(p.ref))?.ref),
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
        // 캡션: AI 메모가 없으면 사진 자체 캡션(홈페이지에서 가져온 사진은 제품명)
        const cap = String(own.get(id)!.caption || '').replace(/^\[홈페이지\]\s*/, '');
        out.push({ ...p, ...(cap ? { caption: cap } : {}), ...notes[p.ref], url: `/images/t/960/${file}` });
      } else if (kind === 'google' && gph[Number(id)]) {
        const a = gph[Number(id)].authors?.[0];
        out.push({ ...p, ...notes[p.ref], url: `/site-photo/${site.id}/${id}`, credit: a?.name, creditUri: a?.uri });
      }
    }
    return out;
  }

  /** AI 첨부용 사진 — Google은 800px로 받고, 원본은 우리 썸네일(480 WebP)을 로컬에서 받는다. 실패하면 null(그 사진만 빠진다) */
  async loadPhoto(site: BusinessSiteRow, ref: string): Promise<{ data: string; mediaType: string } | null> {
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

/** 관리자용 이름표("[예시] ", "[테스트] ")는 사이트에 쓰지 않는다 */
function siteName(name: string): string {
  return String(name || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || name;
}

/** 회사 홈페이지 이미지 받기 — 공개 http(s)만, 5MB·10초 제한 */
async function fetchImage(url: string): Promise<Buffer | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (DoppiaSiteBuilder)' } });
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 5 * 1024 * 1024 ? null : buf;
  } catch { return null; } finally { clearTimeout(t); }
}
