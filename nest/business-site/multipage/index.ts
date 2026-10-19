import { CorpSite } from './model';
import { href, aboutPages } from './layout';
import * as P from './pages';

export * from './model';

export interface RouteResult { status: number; type: string; body: string }

/**
 * 사이트 안 경로 → 페이지. path 는 base 뒤의 부분('' = 홈, 'products/abc' …).
 *   자료가 없는 페이지(연혁·인증 없음, 없는 제품)는 404 — 메뉴에서도 이미 빠져 있다.
 */
export function routeCorp(m: CorpSite, rawPath: string, query: Record<string, string>): RouteResult {
  const path = rawPath.replace(/^\/+|\/+$/g, '');
  const html = (body: string, status = 200) => ({ status, type: 'text/html; charset=utf-8', body });
  if (path === '') return html(P.home(m));
  if (path === 'about') return html(P.about(m));
  if (path === 'about/history' && m.history.length) return html(P.history(m));
  if (path === 'about/certifications' && m.certifications.length) return html(P.certifications(m));
  if (path === 'about/location') return html(P.location(m));
  if (path === 'products' && m.products.length) return html(P.products(m, query.c));
  const pm = /^products\/([a-z0-9-]+)$/.exec(path);
  if (pm) {
    const p = m.products.find((x) => x.id === pm[1]);
    if (p) return html(P.product(m, p));
  }
  if (path === 'contact') return html(P.contact(m, { sent: query.sent === '1', error: query.error, product: query.product }));
  if (path === 'privacy') return html(P.privacy(m));
  if (path === 'sitemap.xml' && !m.preview) return { status: 200, type: 'application/xml; charset=utf-8', body: sitemap(m) };
  if (path === 'robots.txt') {
    return { status: 200, type: 'text/plain; charset=utf-8', body: m.preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${m.origin}${href(m, 'sitemap.xml')}\n` };
  }
  return html(P.notFound(m), 404);
}

function sitemap(m: CorpSite): string {
  const paths = ['', ...aboutPages(m).map((p) => p.path), ...(m.products.length ? ['products', ...m.products.map((p) => `products/${p.id}`)] : []), 'contact', 'privacy'];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${m.origin}${href(m, p)}</loc></url>`).join('\n')}
</urlset>`;
}
