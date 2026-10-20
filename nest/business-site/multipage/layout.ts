import { esc } from '../templates/shared';
import { CorpSite } from './model';

/**
 * 기업 사이트 공통 틀 — 머리말(드롭다운 메뉴)·서브 페이지 제목 띠·꼬리말·디자인 토큰.
 *   디자인 계획(frontend-design): "사양서".
 *     색 — 알루미늄 #F3F4F5 바탕, 그라파이트 #15191E, 강철 #5B6570, 선 #D6DADF, 강조색 1개(회사 색)
 *     서체 — IBM Plex Sans KR(제목·수치) + Pretendard(본문)
 *     기억에 남는 것 — 홈 첫 화면 사진 아래 걸쳐 놓인 수치 띠, 서브 페이지는 조용한 제목 띠
 *   메뉴는 자료가 있는 페이지만 보인다(연혁·인증이 없으면 메뉴에서도 빠진다).
 */

export const href = (m: CorpSite, path = '') => `${m.base}/${path.replace(/^\//, '')}`;

export interface PageOpts {
  /** 경로(검색엔진 canonical·메뉴 활성 표시) — '' = 홈 */
  path: string;
  title: string;
  description?: string;
  /** 서브 페이지 제목 띠 — 홈은 없음 */
  band?: { kicker?: string; title: string; crumbs?: { label: string; path?: string }[] };
  body: string;
  /** 홈 — 머리말이 첫 화면 사진 위에 투명하게 뜬다 */
  home?: boolean;
  ogImage?: string;
  noindex?: boolean;
}

export function aboutPages(m: CorpSite) {
  return [
    { path: 'about', label: m.profile.aboutPage },
    m.history.length ? { path: 'about/history', label: '연혁' } : null,
    m.certifications.length ? { path: 'about/certifications', label: certLabel(m) } : null,
    { path: 'about/location', label: '오시는 길' },
  ].filter(Boolean) as { path: string; label: string }[];
}

/** 인증 페이지 이름 — 가게는 표창·지정이 대부분이라 "수상·인증" */
export const certLabel = (m: CorpSite) => (m.profile.store ? '수상·인증' : '인증·특허');

/** 제품마다 상세 페이지가 있는 제품들(매장형 메뉴는 목록 페이지만) */
export const itemPages = (m: CorpSite) => (m.profile.itemDetail ? m.products : []);
/** 후기 페이지가 있는가 */
export const hasReviews = (m: CorpSite) => m.profile.reviews && (m.reviews.length > 0 || m.blogs.length > 0);

/** 사이트의 모든 페이지(경로·이름) — 점검·사이트맵·관리자 목록·AI 시안이 같이 쓴다 */
export function sitePages(m: CorpSite): { path: string; label: string }[] {
  return [
    { path: '', label: '홈' },
    ...aboutPages(m),
    ...(m.products.length ? [{ path: 'products', label: `${m.profile.items} 목록` }, ...itemPages(m).map((p) => ({ path: `products/${p.id}`, label: `└ ${p.name}` }))] : []),
    ...(hasReviews(m) ? [{ path: 'reviews', label: '방문 후기' }] : []),
    { path: 'contact', label: '문의' },
    { path: 'privacy', label: '개인정보처리방침' },
  ];
}

/** 머리말 메뉴 묶음 — 템플릿 사이트와 AI 시안이 같이 쓴다 */
export function navGroups(m: CorpSite) {
  const productSub = m.categories.length > 1
    ? m.categories.map((c) => ({ path: `products?c=${c.id}`, label: c.name }))
    : itemPages(m).slice(0, 8).map((p) => ({ path: `products/${p.id}`, label: p.name }));
  return [
    { key: 'about', label: m.profile.aboutMenu, path: 'about', sub: aboutPages(m) },
    m.products.length ? { key: 'products', label: m.profile.items, path: 'products', sub: productSub.length ? [{ path: 'products', label: m.profile.itemsAll }, ...productSub] : [] } : null,
    hasReviews(m) ? { key: 'reviews', label: '후기', path: 'reviews', sub: [] } : null,
    { key: 'contact', label: '문의', path: 'contact', sub: [] },
  ].filter(Boolean) as { key: string; label: string; path: string; sub: { path: string; label: string }[] }[];
}

function nav(m: CorpSite, active: string): string {
  const top = active.split('/')[0];
  const groups = navGroups(m);
  const desk = groups.map((g) => `<li class="${g.key === top ? 'on' : ''}"><a href="${esc(href(m, g.path))}">${esc(g.label)}</a>${g.sub.length > 1
    ? `<ul>${g.sub.map((s) => `<li><a href="${esc(href(m, s.path))}">${esc(s.label)}</a></li>`).join('')}</ul>` : ''}</li>`).join('');
  const mob = groups.map((g) => `<li><a href="${esc(href(m, g.path))}">${esc(g.label)}</a>${g.sub.length > 1
    ? `<ul>${g.sub.map((s) => `<li><a href="${esc(href(m, s.path))}">${esc(s.label)}</a></li>`).join('')}</ul>` : ''}</li>`).join('');
  return `<nav class="gnb" aria-label="주 메뉴"><ul>${desk}</ul></nav>
  <details class="mnav"><summary aria-label="메뉴 열기"><span></span><span></span><span></span></summary><ul>${mob}</ul></details>`;
}

/**
 * 글자·버튼용 강조색 — 회사 색의 색상은 그대로 두고 밝기만 낮춰 흰 글씨·밝은 바탕 모두와 4.5:1 이상이 되게 한다.
 *   밝은 브랜드색(예: 뚜레쥬르 초록 #008C45)은 흰 글씨 버튼에서 대비가 모자랐다(실측 4.0:1).
 */
export function readableAccent(accent: string, bg: string): string {
  const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return accent;
  const base = rgb(accent); const white = [255, 255, 255]; const paper = /^#[0-9a-f]{6}$/i.test(bg) ? rgb(bg) : white;
  let c = base;
  for (let t = 0; t <= 1.0001 && (ratio(c, white) < 4.6 || ratio(c, paper) < 4.6); t += 0.04) c = base.map((v) => v * (1 - t));
  return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

const CSS = (accent: string, t: CorpSite['profile']['theme']) => `
:root{--bg:${t.bg};--ink:${t.ink};--steel:${t.steel};--line:${t.line};--dark:${t.dark};--white:#FFFFFF;--accent:${readableAccent(accent, t.bg)};--brand:${accent};--display:${t.display}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.75 'Pretendard Variable',Pretendard,sans-serif}
img{display:block;max-width:100%}
a{color:inherit}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.plex{font-family:var(--display)}
.pv{position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:99;background:#222;color:#fff;font:600 12px/1 sans-serif;padding:8px 12px;border-radius:999px}

/* 머리말 */
.hd{position:sticky;top:0;z-index:30;background:var(--white);border-bottom:1px solid var(--line)}
.hd .wrap{display:flex;align-items:center;gap:24px;height:76px}
.hd .logo{font:700 20px/1 var(--display);text-decoration:none;margin-right:auto;letter-spacing:-.01em}
.home .hd{position:absolute;left:0;right:0;background:transparent;border-color:rgba(255,255,255,.18);color:#fff}
.gnb>ul{display:flex;gap:4px;list-style:none;margin:0;padding:0}
.gnb>ul>li{position:relative}
.gnb>ul>li>a{display:block;padding:26px 16px;text-decoration:none;font-weight:600;font-size:16px}
.gnb>ul>li.on>a{color:var(--accent)}
.home .gnb>ul>li.on>a{color:#fff}
.gnb ul ul{position:absolute;top:100%;left:0;min-width:200px;list-style:none;margin:0;padding:10px 0;background:var(--white);color:var(--ink);border:1px solid var(--line);border-top:3px solid var(--accent);display:none}
.gnb li:hover>ul,.gnb li:focus-within>ul{display:block}
.gnb ul ul a{display:block;padding:9px 20px;text-decoration:none;font-size:15px;white-space:nowrap}
.gnb ul ul a:hover{background:var(--bg);color:var(--accent)}
.hd .call{background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:4px;font-size:15px;white-space:nowrap}
.mnav{display:none}

/* 서브 페이지 제목 띠 */
.band{background:var(--ink);color:#fff;padding:72px 0 64px}
.band .kicker{font:600 15px/1 var(--display);color:rgba(255,255,255,.66);margin:0 0 14px}
.band h1{font:700 clamp(32px,4vw,52px)/1.2 var(--display);margin:0;letter-spacing:-.02em;word-break:keep-all}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:20px 0 0;padding:0;font-size:14px;color:rgba(255,255,255,.66)}
.crumbs li+li::before{content:'/';margin-right:8px;opacity:.5}
.crumbs a{text-decoration:none}
.crumbs a:hover{color:#fff}
.subnav{background:var(--white);border-bottom:1px solid var(--line)}
.subnav ul{display:flex;gap:4px;list-style:none;margin:0;padding:0;overflow-x:auto}
.subnav a{display:block;padding:18px 18px;text-decoration:none;font-weight:600;color:var(--steel);white-space:nowrap;border-bottom:3px solid transparent}
.subnav a.on{color:var(--ink);border-color:var(--accent)}

/* 공통 블록 */
section{padding:96px 0}
.kicker{font:600 15px/1 var(--display);color:var(--accent);margin:0 0 14px}
h2{font:700 clamp(28px,3.2vw,42px)/1.25 var(--display);margin:0 0 28px;letter-spacing:-.02em;word-break:keep-all}
h3{font:700 22px/1.35 var(--display);margin:0 0 10px;word-break:keep-all}
p{word-break:keep-all}
.lead{font-size:19px;color:var(--steel);max-width:36em}
.btn{display:inline-block;text-decoration:none;font-weight:600;padding:15px 26px;border-radius:4px;background:var(--accent);color:#fff;margin:0 8px 8px 0;border:0;font-size:16px;cursor:pointer;font-family:inherit}
.btn.ghost{background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5);color:#fff}
.btn.line{background:none;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.more-link{font-weight:600;color:var(--accent);text-decoration:none}
.white{background:var(--white)}

/* 꼬리말 */
.ft{background:var(--dark);color:#9AA3AD;font-size:14px;padding:56px 0 96px}
.ft .cols{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px}
.ft b{color:#fff;font:600 18px/1 var(--display);display:block;margin-bottom:16px}
.ft p{margin:4px 0}
.ft ul{list-style:none;margin:0;padding:0}
.ft li{margin:6px 0}
.ft a{text-decoration:none}
.ft a:hover{color:#fff}
.ft .privacy{color:#fff;font-weight:700}
.ft .copy{margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);font-size:13px}
.abar{position:fixed;left:0;right:0;bottom:0;display:none;z-index:40}
.abar a{flex:1;text-align:center;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:18px}
.abar a+a{background:var(--ink)}

@media (max-width:960px){
 .gnb,.hd .call{display:none}
 .mnav{display:block;position:relative}
 .mnav summary{list-style:none;cursor:pointer;width:44px;height:44px;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:10px}
 .mnav summary::-webkit-details-marker{display:none}
 .mnav summary span{display:block;height:2px;background:currentColor}
 .mnav>ul{position:fixed;left:0;right:0;top:76px;bottom:0;overflow:auto;background:var(--white);color:var(--ink);list-style:none;margin:0;padding:12px 24px 40px}
 .mnav>ul>li{border-bottom:1px solid var(--line);padding:14px 0}
 .mnav>ul>li>a{font:700 19px/1.4 var(--display);text-decoration:none}
 .mnav ul ul{list-style:none;margin:8px 0 0;padding:0}
 .mnav ul ul a{display:block;padding:6px 0;text-decoration:none;color:var(--steel)}
 .band{padding:52px 0 44px}
 section{padding:64px 0}
 .ft .cols{grid-template-columns:1fr}
 .abar{display:flex}
}`;

export function layout(m: CorpSite, o: PageOpts): string {
  const title = o.path ? `${o.title} | ${m.name}` : o.title;
  const desc = o.description || m.seoDescription;
  const canonical = `${m.origin}${href(m, o.path)}`;
  const og = o.ogImage ? new URL(o.ogImage, m.origin).href : '';
  const tel = (m.facts.phone || m.company.phone || '').replace(/[^\d+]/g, '');
  const phone = m.facts.phone || m.company.phone || '';
  const address = m.facts.address || m.company.address || '';
  const ld = o.home ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': m.profile.ldType, name: m.name, url: `${m.origin}${href(m)}`,
    ...(address ? { address } : {}), ...(phone ? { telephone: phone } : {}), ...(m.company.founded ? { foundingDate: m.company.founded } : {}),
  }).replace(/</g, '\\u003c')}</script>` : '';
  const sub = o.band && o.path.startsWith('about') ? aboutPages(m) : null;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${m.preview || o.noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(m.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(m.profile.theme.fontHref)}">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
${ld}
<style>${CSS(m.accent, m.profile.theme)}</style>
</head>
<body class="${o.home ? 'home' : ''}">
${m.preview ? '<div class="pv">미리보기 · 아직 공개 전입니다</div>' : ''}
<header class="hd"><div class="wrap">
  <a class="logo" href="${esc(href(m))}">${esc(m.name)}</a>
  ${nav(m, o.path)}
  ${tel ? `<a class="call" href="tel:${esc(tel)}">${esc(phone)}</a>` : ''}
</div></header>
${o.band ? `<div class="band"><div class="wrap">
  ${o.band.kicker ? `<p class="kicker">${esc(o.band.kicker)}</p>` : ''}
  <h1>${esc(o.band.title)}</h1>
  <ol class="crumbs"><li><a href="${esc(href(m))}">홈</a></li>${(o.band.crumbs || []).map((c) => `<li>${c.path !== undefined ? `<a href="${esc(href(m, c.path))}">${esc(c.label)}</a>` : esc(c.label)}</li>`).join('')}</ol>
</div></div>
${sub && sub.length > 1 ? `<div class="subnav"><div class="wrap"><ul>${sub.map((s) => `<li><a class="${s.path === o.path ? 'on' : ''}" href="${esc(href(m, s.path))}">${esc(s.label)}</a></li>`).join('')}</ul></div></div>` : ''}` : ''}
<main>
${o.body}
</main>
<footer class="ft"><div class="wrap">
  <div class="cols">
    <div>
      <b>${esc(m.name)}</b>
      ${[m.company.ceo && `대표 ${m.company.ceo}`, m.company.bizNo && `사업자등록번호 ${m.company.bizNo}`].filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('')}
      ${address ? `<p>${esc(address)}</p>` : ''}
      <p>${[phone && `T ${phone}`, m.company.fax && `F ${m.company.fax}`].filter(Boolean).map((x) => esc(x)).join(' &nbsp; ')}</p>
      ${m.company.email ? `<p><a href="mailto:${esc(m.company.email)}">${esc(m.company.email)}</a></p>` : ''}
    </div>
    <div><ul>${aboutPages(m).map((s) => `<li><a href="${esc(href(m, s.path))}">${esc(s.label)}</a></li>`).join('')}</ul></div>
    <div><ul>
      ${m.products.length ? `<li><a href="${esc(href(m, 'products'))}">${esc(m.profile.items)}</a></li>` : ''}
      ${hasReviews(m) ? `<li><a href="${esc(href(m, 'reviews'))}">방문 후기</a></li>` : ''}
      <li><a href="${esc(href(m, 'contact'))}">문의하기</a></li>
      <li><a class="privacy" href="${esc(href(m, 'privacy'))}">개인정보처리방침</a></li>
    </ul></div>
  </div>
  <p class="copy">© ${new Date().getFullYear()} ${esc(m.name)}. All rights reserved.${m.credits.length ? ` · 일부 사진: ${m.credits.map((c) => (c.uri ? `<a href="${esc(c.uri)}" rel="nofollow noopener" target="_blank">${esc(c.name)}</a>` : esc(c.name))).join(', ')}` : ''}</p>
</div></footer>
${abar(m, tel)}
</body></html>`;
}

/** 모바일 하단 고정 버튼 — 회사는 전화·견적 문의, 매장은 전화·길찾기(동네 가게 방문자가 제일 많이 누르는 두 가지) */
function abar(m: CorpSite, tel: string): string {
  const second = m.profile.store
    ? (directions(m) ? `<a href="${esc(directions(m))}" target="_blank" rel="noopener">길찾기</a>` : '')
    : `<a href="${esc(href(m, 'contact'))}">${esc(m.profile.cta)}</a>`;
  if (!tel && !second) return '';
  return `<nav class="abar" aria-label="바로가기">${tel ? `<a href="tel:${esc(tel)}">${m.profile.store ? '전화하기' : '전화 문의'}</a>` : ''}${second}</nav>`;
}

/** 길찾기 — 좌표가 있으면 카카오맵 길찾기, 없으면 장소 페이지 */
export function directions(m: CorpSite): string {
  return m.facts.lat && m.facts.lng ? `https://map.kakao.com/link/to/${encodeURIComponent(m.name)},${m.facts.lat},${m.facts.lng}` : m.facts.kakaoUrl || m.facts.googleUrl || '';
}
