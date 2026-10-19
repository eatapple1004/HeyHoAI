import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { DbService } from '../../db/db.service';
import { BusinessSiteRepository, BusinessSiteRow } from '../business-site.repository';
import { BusinessSiteService } from '../business-site.service';
import { CorpSite, CorpPhoto } from '../multipage';
import { privacy as privacyPage } from '../multipage/pages';
import { esc, mapEmbed } from '../templates/shared';
import { numbers, loosely } from '../site-qa';
import { DesignWriterService, DesignSystem } from './design-writer.service';
import { cleanCss, cleanHtml, rebase, FONT_CSS } from './sanitize';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', '..', 'src', 'config'));

/**
 * AI 맞춤 디자인 시안 — 같은 사이트에 시안을 여러 개 만들고(방향을 바꿔 가며) 비교한 뒤 하나를 공개한다.
 *   입력은 템플릿 사이트와 같다: 승인된 기획안 + 검증된 문구(content) + 가져온 사진. 시안은 만든 시점의 스냅숏이다.
 *   공개: process.design = 시안 번호. 비우면 다시 템플릿 사이트가 나간다.
 */

export interface DesignRow {
  id: string; site_id: string; n: number; direction: string | null; status: string; step: string | null; error: string | null;
  design: DesignSystem & { pretendard?: boolean }; pages: Record<string, string>; qa: any; created_at: string; updated_at: string;
}

interface PageSpec { path: string; key: string; title: string; data: unknown; placeholders?: string[] }

const PRETENDARD = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

@Injectable()
export class DesignService {
  constructor(
    private readonly db: DbService,
    private readonly repo: BusinessSiteRepository,
    private readonly sites: BusinessSiteService,
    private readonly writer: DesignWriterService,
  ) {}

  // ── 저장소 ──
  private async rows(siteId: string): Promise<DesignRow[]> {
    return (await this.db.query<DesignRow>('SELECT * FROM business_site_designs WHERE site_id = $1 ORDER BY n DESC', [siteId])).rows;
  }

  private async row(siteId: string, n: number): Promise<DesignRow | null> {
    return (await this.db.query<DesignRow>('SELECT * FROM business_site_designs WHERE site_id = $1 AND n = $2', [siteId, n])).rows[0] || null;
  }

  private async patch(id: string, p: Partial<Record<'status' | 'step' | 'error' | 'design' | 'pages' | 'qa', unknown>>) {
    const keys = Object.keys(p);
    const json = new Set(['design', 'pages', 'qa']);
    const sets = keys.map((k, i) => `${k} = $${i + 2}${json.has(k) ? '::jsonb' : ''}`);
    await this.db.query(`UPDATE business_site_designs SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`,
      [id, ...keys.map((k) => (json.has(k) ? JSON.stringify((p as any)[k]) : (p as any)[k]))]);
  }

  private async site(businessId: string): Promise<BusinessSiteRow> {
    const site = await this.repo.byBusiness(businessId);
    if (!site) throw new NotFoundException('사이트가 없습니다.');
    return site;
  }

  // ── 관리자 ──
  async list(businessId: string) {
    const site = await this.site(businessId);
    const list = await this.rows(site.id);
    return {
      published: site.process?.design ?? null,
      designs: list.map((d) => ({ n: d.n, direction: d.direction, status: d.status, step: d.step, error: d.error, note: d.design?.note || '', qa: d.qa, pages: Object.keys(d.pages || {}).length, created_at: d.created_at })),
    };
  }

  /** 새 시안 — 템플릿 사이트(검증된 문구)가 있어야 한다. 뒤에서 수 분 걸린다 */
  async create(businessId: string, direction: string) {
    const site = await this.site(businessId);
    if (!site.content?.multipage) throw new BadRequestException('먼저 4. 제작에서 여러 페이지 사이트(검증된 문구)를 만드세요. 시안은 그 문구로 디자인만 새로 합니다.');
    const running = (await this.rows(site.id)).find((d) => d.status === 'running' && Date.now() - Date.parse(d.updated_at) < 10 * 60 * 1000);
    if (running) throw new ConflictException(`시안 ${running.n}을 만드는 중입니다.`);
    const r = await this.db.query<DesignRow>(
      `INSERT INTO business_site_designs (site_id, n, direction, status, step)
       SELECT $1, COALESCE(MAX(n), 0) + 1, $2, 'running', '디자인 시스템을 만드는 중' FROM business_site_designs WHERE site_id = $1 RETURNING *`,
      [site.id, String(direction || '').trim().slice(0, 500) || null]);
    const row = r.rows[0];
    this.build(businessId, row).catch(async (e) => {
      console.error('[design] build failed', e);
      await this.patch(row.id, { status: 'error', error: String(e?.message || e).slice(0, 300) });
    });
    return this.list(businessId);
  }

  async publish(businessId: string, n: number | null) {
    const site = await this.site(businessId);
    if (n !== null) {
      const d = await this.row(site.id, n);
      if (!d || d.status !== 'done') throw new BadRequestException('완성된 시안만 공개할 수 있습니다.');
    }
    await this.repo.update(businessId, { process: { ...(site.process || {}), design: n } });
    return this.list(businessId);
  }

  // ── 만들기 ──
  private async build(businessId: string, row: DesignRow) {
    const site = await this.site(businessId);
    const m = await this.sites.corpModel(site, '', false);
    const allowed = photoUrls(m);
    const plan = site.process?.plan;
    const sheet = site.process?.research?.sheet;
    const brief = [
      plan ? `컨셉: ${plan.concept}\n읽는 사람: ${(plan.audience || []).join(', ')}\n문체: ${plan.tone}` : '',
      `헤드라인: ${m.headline}\n부제: ${m.sub}`,
      sheet?.summary ? `조사 요약: ${sheet.summary}` : '',
      `제품: ${m.products.map((p) => p.name).join(', ')}`,
    ].filter(Boolean).join('\n');
    const nav = navOf(m);
    const company = Object.fromEntries(Object.entries({
      상호: m.name, 대표: m.company.ceo, 주소: m.facts.address || m.company.address, 전화: m.facts.phone || m.company.phone,
      팩스: m.company.fax, 이메일: m.company.email, 사업자등록번호: m.company.bizNo,
    }).filter(([, v]) => v)) as Record<string, string>;
    const photos = (site.photos as { ref: string; hidden?: boolean }[]).filter((p) => !p.hidden).slice(0, 6);
    const images = (await Promise.all(photos.map((p) => this.sites.loadPhoto(site, p.ref)))).filter(Boolean) as { data: string; mediaType: string }[];

    const ds = await this.writer.system({ name: m.name, brief, direction: row.direction || '', accent: m.accent, nav, company, images });
    const design = {
      note: ds.note.slice(0, 1200),
      fonts: FONT_CSS.test(ds.fonts) ? ds.fonts : '',
      css: cleanCss(ds.css, allowed),
      header: cleanHtml(ds.header, allowed),
      footer: cleanHtml(ds.footer, allowed),
    };
    await this.patch(row.id, { design, step: '페이지를 쓰는 중' });

    const specs = pageSpecs(m);
    const pages: Record<string, string> = {};
    let done = 0;
    const queue = [...specs];
    const links = [...nav.flatMap((g) => [{ label: g.label, href: g.href }, ...(g.sub || [])]), ...m.products.map((p) => ({ label: p.name, href: `/products/${p.id}` }))];
    const worker = async () => {
      for (let s = queue.shift(); s; s = queue.shift()) {
        if (s.key === 'privacy') { pages[s.path] = ''; done++; continue; } // 처리방침은 고정 문안(아래 render)
        let html = '';
        for (let attempt = 0; attempt < 2 && !html; attempt++) {
          try { html = await this.writer.page({ name: m.name, css: design.css, note: design.note, page: { ...s, links } }); } catch (e: any) {
            console.warn('[design] page failed', s.path, attempt, e?.message);
          }
        }
        pages[s.path] = cleanHtml(html, allowed);
        done++;
        await this.patch(row.id, { step: `페이지를 쓰는 중 ${done}/${specs.length}` });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    const failed = specs.filter((s) => s.key !== 'privacy' && !pages[s.path]).map((s) => s.title);
    const qa = this.qa(m, pages, this.sites.sourceText(site), failed);
    await this.patch(row.id, { pages, qa, status: failed.length === specs.length - 1 ? 'error' : 'done', step: null, error: failed.length ? `만들지 못한 페이지: ${failed.join(', ')}` : null });
  }

  /** 시안 점검 — 출처 없는 숫자, 사이트 안 깨진 링크, 제목 없는 페이지, 빠진 자리표시자 */
  private qa(m: CorpSite, pages: Record<string, string>, source: string, failed: string[]) {
    const items: { level: string; area: string; msg: string; path?: string }[] = [];
    const known = new Set(Object.keys(pages).map((p) => `/${p}`.replace(/\/$/, '') || '/'));
    known.add('/');
    for (const f of failed) items.push({ level: 'fail', area: '페이지', msg: `${f} 페이지를 만들지 못함` });
    for (const [p, html] of Object.entries(pages)) {
      if (!html) continue;
      const where = p || '/';
      const text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
      const bad = [...new Set(numbers(text))].filter((n) => !source.includes(n) && !loosely(source, n));
      for (const n of bad.slice(0, 8)) items.push({ level: 'fail', area: '출처 없는 숫자', msg: `"${n}"이(가) 조사 자료에 없음`, path: p });
      if (!/<h1[\s>]/i.test(html)) items.push({ level: 'warn', area: '구조', msg: '페이지 제목(h1)이 없음', path: p });
      for (const h of html.matchAll(/href=["'](\/[^"'#?]*)/g)) {
        const t = h[1].replace(/\/$/, '') || '/';
        if (!known.has(t)) items.push({ level: 'fail', area: '깨진 링크', msg: `${where} → ${h[1]}`, path: p });
      }
      if (p === 'contact' && !html.includes('{{CONTACT_FORM}}')) items.push({ level: 'fail', area: '문의 폼', msg: '문의 폼 자리가 빠짐', path: p });
    }
    if (!items.some((i) => i.area === '출처 없는 숫자')) items.push({ level: 'ok', area: '출처 없는 숫자', msg: '화면의 숫자가 모두 조사 자료에 있음' });
    if (!items.some((i) => i.area === '깨진 링크')) items.push({ level: 'ok', area: '링크', msg: '사이트 안 링크가 모두 열림' });
    const counts = { fail: 0, warn: 0, ok: 0 } as Record<string, number>;
    for (const i of items) counts[i.level]++;
    return { at: new Date().toISOString(), items, counts };
  }

  // ── 렌더 ──
  async renderPreview(businessId: string, n: number, rest: string, query: Record<string, string>) {
    const site = await this.site(businessId);
    const d = await this.row(site.id, n);
    if (!d || d.status !== 'done') return null;
    return this.render(site, d, `/admin-business/${businessId}/site/design/${n}`, rest, query, true);
  }

  async renderShare(token: string, n: number, rest: string, query: Record<string, string>) {
    const site = await this.repo.byShareToken(String(token || ''));
    if (!site) return null;
    const d = await this.row(site.id, n);
    if (!d || d.status !== 'done') return null;
    return this.render(site, d, `/site-review/${token}/d${n}`, rest, query, true);
  }

  /** 공개 사이트 — 시안을 공개해 둔 경우만. 아니면 null(템플릿 사이트가 처리) */
  async renderPublished(slug: string, rest: string, query: Record<string, string>) {
    const site = await this.repo.publishedBySlug(String(slug || '').toLowerCase());
    const n = site?.process?.design;
    if (!site || !n) return null;
    const d = await this.row(site.id, n);
    if (!d || d.status !== 'done') return null;
    return this.render(site, d, `/site/${site.slug}`, rest, query, false);
  }

  private async render(site: BusinessSiteRow, d: DesignRow, base: string, rawPath: string, query: Record<string, string>, preview: boolean) {
    const m = await this.sites.corpModel(site, base, preview);
    const p = rawPath.replace(/^\/+|\/+$/g, '');
    const html = (body: string, status = 200) => ({ status, type: 'text/html; charset=utf-8', body });
    if (p === 'robots.txt') return { status: 200, type: 'text/plain; charset=utf-8', body: preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${m.origin}${base}/sitemap.xml\n` };
    if (p === 'sitemap.xml' && !preview) {
      const urls = Object.keys(d.pages).map((x) => `<url><loc>${m.origin}${base}/${x}</loc></url>`).join('\n');
      return { status: 200, type: 'application/xml; charset=utf-8', body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>` };
    }
    const spec = pageSpecs(m).find((s) => s.path === p);
    if (!spec || !(p in d.pages)) return html(this.shell(m, d, base, { key: 'home', title: '페이지를 찾을 수 없습니다', path: p }, `<section class="wrap" style="padding:120px 0"><h1>페이지를 찾을 수 없습니다</h1><p><a href="${esc(base)}/">첫 화면으로</a></p></section>`, preview), 404);
    let body = spec.key === 'privacy' ? privacyBody(m) : rebase(d.pages[p], base);
    body = body
      .replace(/<!--\s*\{\{CONTACT_FORM\}\}\s*-->/g, contactForm(m, base, query))
      .replace(/<!--\s*\{\{MAP\}\}\s*-->/g, mapEmbed({ name: m.name, facts: { lat: m.facts.lat, lng: m.facts.lng } } as any, 'dp-map'));
    return html(this.shell(m, d, base, spec, body, preview));
  }

  private shell(m: CorpSite, d: DesignRow, base: string, spec: { key: string; title: string; path: string }, body: string, preview: boolean): string {
    const title = spec.key === 'home' && spec.path === '' ? `${m.name}${m.headline ? ` — ${m.headline}` : ''}` : `${spec.title} | ${m.name}`;
    const canonical = `${m.origin}${base}/${spec.path}`;
    const credits = m.credits.length ? `사진: ${m.credits.map((c) => esc(c.name)).join(', ')}` : '';
    const ld = { '@context': 'https://schema.org', '@type': 'Organization', name: m.name, url: `${m.origin}${base}/`, telephone: m.facts.phone || undefined, address: m.facts.address || undefined };
    return `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(m.seoDescription)}">
<link rel="canonical" href="${esc(canonical)}">
${preview ? '<meta name="robots" content="noindex,nofollow">' : ''}
<meta property="og:title" content="${esc(title)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">
${m.heroPhoto ? `<meta property="og:image" content="${esc(m.origin + m.heroPhoto.url)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${PRETENDARD}">
${d.design.fonts ? `<link rel="stylesheet" href="${esc(d.design.fonts)}">` : ''}
<style>${BASE_CSS}</style>
<style>${d.design.css}</style>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body class="pg-${spec.key}">
${rebase(d.design.header, base)}
<main id="main">${body}</main>
${rebase(d.design.footer, base).replace(/<!--\s*\{\{CREDITS\}\}\s*-->/g, credits)}
${preview ? `<div class="dp-pv">시안 ${d.n} 미리보기 — 검색엔진에 노출되지 않습니다</div>` : ''}
</body></html>`;
  }
}

/** 디자인이 쓰기 전 기본값 — 폼·지도·미리보기 띠. AI CSS 가 뒤에 와서 덮는다 */
const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;word-break:keep-all;overflow-x:hidden}img{max-width:100%;height:auto;display:block}
.dp-form{display:grid;gap:14px}.dp-form label{display:block;font-weight:600;font-size:15px}.dp-form input,.dp-form select,.dp-form textarea{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:1px solid #c9ced4;border-radius:2px;background:#fff;color:inherit}
.dp-form textarea{min-height:150px;resize:vertical}.dp-form .dp-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.dp-form .dp-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.dp-agree{display:flex!important;gap:10px;align-items:flex-start;font-weight:400!important}.dp-agree input{width:auto!important;margin-top:4px}.dp-agree small{display:block;opacity:.75}
.dp-form button{font:inherit;font-weight:700;padding:14px 22px;border:0;background:var(--accent,#1d3557);color:#fff;cursor:pointer}
.dp-msg{padding:12px 14px;margin:0}.dp-msg.ok{background:#e8f5ec;color:#14532d}.dp-msg.err{background:#fdecec;color:#7f1d1d}
.dp-map{width:100%;height:420px;border:0;display:block}.dp-legal{max-width:860px;margin:0 auto;padding:64px 24px}.dp-legal table{width:100%;border-collapse:collapse}.dp-legal th,.dp-legal td{border:1px solid #d6dadf;padding:10px;text-align:left}
.dp-pv{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:999;background:#222;color:#fff;font:600 12px/1 sans-serif;padding:8px 12px;border-radius:999px}
@media (max-width:640px){.dp-form .dp-row{grid-template-columns:1fr}.dp-map{height:300px}}`;

function photoUrls(m: CorpSite): Set<string> {
  const all: (CorpPhoto | undefined)[] = [m.heroPhoto, m.aboutPhoto, ...m.gallery, ...m.products.flatMap((p) => p.photos)];
  return new Set(all.filter(Boolean).map((p) => (p as CorpPhoto).url));
}

function navOf(m: CorpSite) {
  const about = [
    { label: '회사 개요', href: '/about' },
    ...(m.history.length ? [{ label: '연혁', href: '/about/history' }] : []),
    ...(m.certifications.length ? [{ label: '인증·특허', href: '/about/certifications' }] : []),
    { label: '오시는 길', href: '/about/location' },
  ];
  return [
    { label: '회사소개', href: '/about', sub: about },
    ...(m.products.length ? [{ label: '제품', href: '/products', sub: [{ label: '전체 제품', href: '/products' }, ...m.products.slice(0, 10).map((p) => ({ label: p.name, href: `/products/${p.id}` }))] }] : []),
    { label: '문의', href: '/contact' },
  ];
}

const ph = (p?: CorpPhoto) => (p ? { url: p.url, 설명: p.caption || '' } : null);

/** 페이지마다 AI에 넘길 데이터 — 사이트에 이미 들어간(검증된) 내용만 */
function pageSpecs(m: CorpSite): PageSpec[] {
  const phone = m.facts.phone || m.company.phone || '';
  const prodBrief = (p: CorpSite['products'][number]) => ({ 이름: p.name, 링크: `/products/${p.id}`, 분류: m.categories.find((c) => c.id === p.category)?.name || '', 요약: p.summary, 대표사양: p.keySpec, 사진: p.photos.slice(0, 1).map(ph) });
  const specs: PageSpec[] = [
    { path: '', key: 'home', title: '홈', data: {
      헤드라인: m.headline, 부제: m.sub, 버튼: m.ctaLabel, 첫화면사진: ph(m.heroPhoto), 핵심수치: m.stats, 강점: m.highlights,
      회사소개_요약: m.about.split(/\n\s*\n/)[0], 소개사진: ph(m.aboutPhoto), 제품분류: m.categories, 대표제품: m.products.slice(0, 8).map(prodBrief),
      최근연혁: m.history.slice(-6), 인증_개수: m.certifications.length, 인증_예시: m.certifications.slice(0, 6), 전화: phone, 문의링크: '/contact',
    } },
    { path: 'about', key: 'about', title: '회사 개요', data: { 제목: m.aboutTitle, 본문: m.about, 강점: m.highlights, 대표인사말: m.ceo || null, 기업정보: { ...m.company, 주소: m.facts.address || m.company.address }, 사진: ph(m.aboutPhoto), 공장사진: m.gallery.filter((g) => g.kind === 'factory').slice(0, 4).map(ph) } },
  ];
  if (m.history.length) specs.push({ path: 'about/history', key: 'history', title: '연혁', data: { 연혁: m.history } });
  if (m.certifications.length) specs.push({ path: 'about/certifications', key: 'certs', title: '인증·특허', data: { 목록: m.certifications } });
  specs.push({ path: 'about/location', key: 'location', title: '오시는 길', data: { 주소: m.facts.address || m.company.address, 전화: phone, 팩스: m.company.fax, 카카오맵: m.facts.kakaoUrl, 구글지도: m.facts.googleUrl }, placeholders: m.facts.lat ? ['<!--{{MAP}}--> (지도가 들어갈 자리, 가로 전체)'] : [] });
  if (m.products.length) {
    specs.push({ path: 'products', key: 'products', title: '제품 소개', data: { 분류: m.categories.map((c) => ({ ...c, 앵커: `c-${c.id}` })), 제품: m.products.map(prodBrief), 안내: '분류마다 id="c-<분류id>" 섹션으로 묶는다' } });
    m.products.forEach((p, i) => specs.push({ path: `products/${p.id}`, key: 'product', title: p.name, data: {
      이름: p.name, 분류: m.categories.find((c) => c.id === p.category)?.name || '', 요약: p.summary, 대표사양: p.keySpec, 소개: p.body, 특징: p.features, 사양표: p.specs,
      사진: p.photos.slice(0, 8).map(ph), 이전제품: m.products[i - 1] ? { 이름: m.products[i - 1].name, 링크: `/products/${m.products[i - 1].id}` } : null,
      다음제품: m.products[i + 1] ? { 이름: m.products[i + 1].name, 링크: `/products/${m.products[i + 1].id}` } : null,
      견적문의링크: '/contact', 목록링크: '/products',
    } }));
  }
  specs.push({ path: 'contact', key: 'contact', title: '문의하기', data: { 전화: phone, 팩스: m.company.fax, 이메일: m.company.email, 주소: m.facts.address || m.company.address }, placeholders: ['<!--{{CONTACT_FORM}}--> (문의 폼 자리)'] });
  specs.push({ path: 'privacy', key: 'privacy', title: '개인정보처리방침', data: {} });
  return specs;
}

function contactForm(m: CorpSite, base: string, q: Record<string, string>): string {
  return `<form class="dp-form" method="post" action="${esc(base)}/contact">
  ${q.sent === '1' ? '<p class="dp-msg ok">문의가 접수됐습니다. 담당자가 확인 후 연락드리겠습니다.</p>' : ''}${q.error ? `<p class="dp-msg err">${esc(q.error)}</p>` : ''}
  <div class="dp-row"><div><label for="f-name">이름 *</label><input id="f-name" name="name" required maxlength="40" autocomplete="name"></div>
  <div><label for="f-co">회사명</label><input id="f-co" name="company" maxlength="60" autocomplete="organization"></div></div>
  <div class="dp-row"><div><label for="f-tel">연락처 *</label><input id="f-tel" name="phone" required maxlength="30" inputmode="tel" autocomplete="tel"></div>
  <div><label for="f-mail">이메일</label><input id="f-mail" name="email" type="email" maxlength="80" autocomplete="email"></div></div>
  ${m.products.length ? `<div><label for="f-prod">관심 제품</label><select id="f-prod" name="product"><option value="">선택 안 함</option>${m.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>` : ''}
  <div><label for="f-msg">문의 내용 *</label><textarea id="f-msg" name="message" required maxlength="3000" placeholder="용도, 수량, 희망 납기 등을 적어 주세요."></textarea></div>
  <div class="dp-hp" aria-hidden="true"><label>홈페이지<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <label class="dp-agree"><input type="checkbox" name="agree" value="1" required><span>개인정보 수집·이용에 동의합니다 *<small>수집 항목: 이름, 연락처, 회사명, 이메일 · 목적: 문의 응대 · 보관: 응대 완료 후 1년. <a href="${esc(base)}/privacy">개인정보처리방침</a></small></span></label>
  <button type="submit">문의 보내기</button>
</form>`;
}

/** 처리방침은 AI가 쓰지 않는다 — 템플릿 사이트와 같은 고정 문안의 본문만 가져온다 */
function privacyBody(m: CorpSite): string {
  const full = privacyPage(m);
  const main = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(full)?.[1] || '';
  const doc = /<div class="wrap doc">([\s\S]*?)<\/div><\/section>/i.exec(main)?.[1] || main.replace(/<style[\s\S]*?<\/style>/gi, '');
  return `<div class="dp-legal"><h1>개인정보처리방침</h1>${doc}</div>`;
}
