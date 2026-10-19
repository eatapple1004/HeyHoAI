import { esc, paras, mapEmbed } from '../templates/shared';
import { CorpPhoto, CorpProduct, CorpSite } from './model';
import { href, layout } from './layout';

/**
 * 기업 사이트 페이지들. 자료가 없는 블록·페이지는 그리지 않는다(라우터가 404로 돌린다).
 *   페이지별 CSS는 그 페이지 본문 안 <style>로 둔다 — 공통 틀(layout.ts)은 모든 페이지가 같이 쓰는 것만.
 */

const img = (p: CorpPhoto, alt = '', eager = false) =>
  `<img src="${esc(p.url)}" alt="${esc(alt || p.caption || '')}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;

const productCard = (m: CorpSite, p: CorpProduct) => `<a class="pcard" href="${esc(href(m, `products/${p.id}`))}">
  <div class="ph">${p.photos[0] ? img(p.photos[0], p.name) : '<span class="noimg">사진 준비 중</span>'}</div>
  <div class="tx"><b>${esc(p.name)}</b>${p.summary ? `<span>${esc(p.summary)}</span>` : ''}${p.keySpec ? `<em>${esc(p.keySpec)}</em>` : ''}</div>
</a>`;

const PCARD_CSS = `
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.pcard{display:block;text-decoration:none;background:var(--white);border:1px solid var(--line);transition:border-color .15s}
.pcard:hover{border-color:var(--accent)}
.pcard .ph{aspect-ratio:3/2;background:#E4E7EA;display:flex;align-items:center;justify-content:center}
.pcard .ph img{width:100%;height:100%;object-fit:cover}
.pcard .noimg{color:var(--steel);font-size:14px}
.pcard .tx{padding:20px 22px 24px}
.pcard b{display:block;font:700 20px/1.35 'IBM Plex Sans KR',sans-serif;margin-bottom:6px}
.pcard span{display:block;color:var(--steel);font-size:15px;line-height:1.6}
.pcard em{display:block;font-style:normal;font-weight:600;color:var(--accent);font-size:14px;margin-top:10px}
@media (max-width:960px){.pgrid{grid-template-columns:1fr 1fr;gap:14px}.pcard .tx{padding:14px}.pcard b{font-size:17px}.pcard span{display:none}}`;

const ctaBand = (m: CorpSite) => `<section class="cta"><div class="wrap">
  <div><h2>제품 사양과 견적이 궁금하신가요?</h2><p class="lead">용도와 운송 조건을 알려 주시면 담당자가 확인해 연락드립니다.</p></div>
  <div><a class="btn" href="${esc(href(m, 'contact'))}">견적 문의하기</a>${m.facts.phone || m.company.phone ? `<a class="btn line" style="color:#fff;box-shadow:inset 0 0 0 1.5px #fff" href="tel:${esc((m.facts.phone || m.company.phone || '').replace(/[^\d+]/g, ''))}">${esc(m.facts.phone || m.company.phone || '')}</a>` : ''}</div>
</div></section>
<style>.cta{background:var(--accent);color:#fff}.cta .wrap{display:flex;justify-content:space-between;align-items:center;gap:32px;flex-wrap:wrap}.cta h2{margin:0 0 8px;color:#fff}.cta .lead{color:rgba(255,255,255,.85);margin:0}.cta .btn{background:#fff;color:var(--ink)}</style>`;

// ── 홈 ──
export function home(m: CorpSite): string {
  const stats = m.stats.slice(0, 4);
  const featured = m.products.slice(0, 6);
  const body = `
<style>
.hero{position:relative;min-height:min(92vh,820px);display:flex;align-items:flex-end;background:#1d232b center/cover no-repeat;color:#fff}
.hero::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,17,22,.84) 0%,rgba(13,17,22,.45) 55%,rgba(13,17,22,.12) 100%)}
.hero .wrap{position:relative;width:100%;padding-bottom:${stats.length ? '160px' : '96px'}}
.hero h1{font:700 clamp(40px,5.4vw,72px)/1.18 'IBM Plex Sans KR',sans-serif;margin:0 0 22px;max-width:14em;letter-spacing:-.02em;word-break:keep-all}
.hero p{font-size:20px;max-width:32em;margin:0 0 34px;color:rgba(255,255,255,.88)}
.stats{position:relative;z-index:2;margin-top:-96px}
.stats .band2{display:grid;grid-template-columns:repeat(${Math.max(stats.length, 1)},1fr);background:var(--white);border-top:4px solid var(--accent);box-shadow:0 20px 40px -24px rgba(21,25,30,.35)}
.stats .it{padding:32px 30px 30px;border-left:1px solid var(--line)}
.stats .it:first-child{border-left:0}
.stats .v{font:700 clamp(30px,3.4vw,48px)/1.1 'IBM Plex Sans KR',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.stats .l{margin-top:10px;font-weight:600}
.stats .n{color:var(--steel);font-size:14px}
.intro{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.intro img{width:100%;aspect-ratio:4/3;object-fit:cover}
.hl{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:56px 0 0;padding:0;list-style:none;border-top:1px solid var(--line)}
.hl li{padding:24px 28px 0 0}
.hl b{display:block;font:600 19px/1.4 'IBM Plex Sans KR',sans-serif;margin-bottom:6px}
.hl span{color:var(--steel);font-size:16px}
.cats{display:grid;grid-template-columns:repeat(${Math.min(Math.max(m.categories.length, 1), 3)},1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:56px}
.cats a{display:block;background:var(--white);padding:32px 30px;text-decoration:none}
.cats a:hover b{color:var(--accent)}
.cats b{display:block;font:700 22px/1.3 'IBM Plex Sans KR',sans-serif;margin-bottom:8px}
.cats span{color:var(--steel);font-size:15px}
.head-row{display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
.head-row h2{margin:0}
.hist2{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:2px solid var(--ink)}
.hist2 div{padding:22px 24px 0 0}
.hist2 b{display:block;font:700 30px/1 'IBM Plex Sans KR',sans-serif;color:var(--accent);margin-bottom:10px}
.certs-strip{display:flex;flex-wrap:wrap;gap:10px;list-style:none;margin:0;padding:0}
.certs-strip li{border:1px solid var(--line);background:var(--white);padding:10px 16px;font-weight:600;font-size:15px}
${PCARD_CSS}
@media (max-width:960px){
 .hero{min-height:620px}.hero .btns{display:none}
 .stats{margin-top:-64px}.stats .band2{grid-template-columns:1fr 1fr}
 .stats .it{padding:20px;border-left:0;border-top:1px solid var(--line)}.stats .it:nth-child(-n+2){border-top:0}.stats .it:nth-child(even){border-left:1px solid var(--line)}
 .intro{grid-template-columns:1fr;gap:28px}.hl{grid-template-columns:1fr}
 .cats{grid-template-columns:1fr}.hist2{grid-template-columns:1fr 1fr;gap:20px 0}
}
</style>
<div class="hero"${m.heroPhoto ? ` style="background-image:url('${esc(m.heroPhoto.url)}')"` : ''}>
  <div class="wrap">
    <h1>${esc(m.headline || m.name)}</h1>
    ${m.sub ? `<p>${esc(m.sub)}</p>` : ''}
    <div class="btns"><a class="btn" href="${esc(href(m, 'contact'))}">${esc(m.ctaLabel || '견적 문의')}</a>${m.products.length ? `<a class="btn ghost" href="${esc(href(m, 'products'))}">제품 보기</a>` : ''}</div>
  </div>
</div>
${stats.length ? `<div class="stats"><div class="wrap"><div class="band2">${stats.map((s) => `<div class="it"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div>${s.note ? `<div class="n">${esc(s.note)}</div>` : ''}</div>`).join('')}</div></div></div>` : ''}

${m.about ? `<section><div class="wrap">
  <div class="intro">
    <div><p class="kicker">회사소개</p><h2>${esc(m.aboutTitle || m.name)}</h2>${paras(m.about.split(/\n{2,}/)[0])}<a class="more-link" href="${esc(href(m, 'about'))}">회사 개요 보기</a></div>
    ${m.aboutPhoto ? `<div>${img(m.aboutPhoto)}</div>` : ''}
  </div>
  ${m.highlights.length ? `<ul class="hl">${m.highlights.slice(0, 3).map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}
</div></section>` : ''}

${m.products.length ? `<section class="white"><div class="wrap">
  <div class="head-row"><div><p class="kicker">제품</p><h2>주요 제품</h2></div><a class="more-link" href="${esc(href(m, 'products'))}">전체 제품 ${m.products.length}종 보기</a></div>
  ${m.categories.length > 1 ? `<div class="cats">${m.categories.map((c) => `<a href="${esc(href(m, `products?c=${c.id}`))}"><b>${esc(c.name)}</b>${c.summary ? `<span>${esc(c.summary)}</span>` : ''}</a>`).join('')}</div>` : ''}
  <div class="pgrid">${featured.map((p) => productCard(m, p)).join('')}</div>
</div></section>` : ''}

${m.history.length ? `<section><div class="wrap">
  <div class="head-row"><div><p class="kicker">연혁</p><h2>걸어온 길</h2></div><a class="more-link" href="${esc(href(m, 'about/history'))}">전체 연혁 보기</a></div>
  <div class="hist2">${pickMilestones(m.history).map((h) => `<div><b>${esc(h.year)}</b><span>${esc(h.text)}</span></div>`).join('')}</div>
</div></section>` : ''}

${m.certifications.length ? `<section class="white" style="padding:72px 0"><div class="wrap">
  <div class="head-row"><div><p class="kicker">인증·특허</p><h2 style="font-size:28px">공인된 기술력</h2></div><a class="more-link" href="${esc(href(m, 'about/certifications'))}">인증 전체 보기</a></div>
  <ul class="certs-strip">${m.certifications.slice(0, 10).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
</div></section>` : ''}
${ctaBand(m)}`;
  return layout(m, { path: '', title: m.name + (m.headline ? ` — ${m.headline}` : ''), body, home: true, ogImage: m.heroPhoto?.url });
}

/** 홈 연혁 요약 — 처음·마지막과 그 사이를 고르게 4개 */
function pickMilestones(h: { year: string; text: string }[]) {
  if (h.length <= 4) return h;
  const idx = [0, Math.round((h.length - 1) / 3), Math.round(((h.length - 1) * 2) / 3), h.length - 1];
  return [...new Set(idx)].map((i) => h[i]);
}

// ── 회사소개 ──
export function about(m: CorpSite): string {
  const rows = [['회사명', m.name], ['대표', m.company.ceo], ['설립', m.company.founded], ['본사', m.facts.address || m.company.address],
    ['전화', m.facts.phone || m.company.phone], ['팩스', m.company.fax], ['이메일', m.company.email]].filter(([, v]) => v);
  const body = `
<style>
.ov{display:grid;grid-template-columns:1.1fr .9fr;gap:72px;align-items:start}
.ov img{width:100%;aspect-ratio:4/3;object-fit:cover}
.ov p{max-width:34em}
.ceo{display:grid;grid-template-columns:280px 1fr;gap:64px}
.ceo .sig{margin-top:28px;font:600 18px/1.4 'IBM Plex Sans KR',sans-serif;text-align:right}
.ceo blockquote{margin:0;font-size:18px}
.info{width:100%;border-collapse:collapse;background:var(--white)}
.info th{width:160px;text-align:left;font-weight:500;color:var(--steel);padding:18px 24px;border-bottom:1px solid var(--line);background:#FAFAFB}
.info td{padding:18px 24px;border-bottom:1px solid var(--line);font-weight:600}
.hl{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;list-style:none;margin:0;padding:0}
.hl li{background:var(--white);border-top:3px solid var(--accent);padding:28px}
.hl b{display:block;font:700 20px/1.4 'IBM Plex Sans KR',sans-serif;margin-bottom:8px}
.hl span{color:var(--steel)}
@media (max-width:960px){.ov,.ceo{grid-template-columns:1fr;gap:28px}.hl{grid-template-columns:1fr}.info th{width:96px;padding:14px}.info td{padding:14px}}
</style>
<section><div class="wrap ov">
  <div><p class="kicker">회사 개요</p><h2>${esc(m.aboutTitle || m.name)}</h2>${paras(m.about)}</div>
  ${m.aboutPhoto ? `<div>${img(m.aboutPhoto)}</div>` : ''}
</div></section>
${m.highlights.length ? `<section class="white" style="padding-top:72px;padding-bottom:72px"><div class="wrap"><h2 style="font-size:28px">우리의 강점</h2><ul class="hl">${m.highlights.slice(0, 3).map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul></div></section>` : ''}
${m.ceo?.body ? `<section><div class="wrap ceo">
  <div><p class="kicker">인사말</p><h2>${esc(m.ceo.title || '대표 인사말')}</h2></div>
  <div><blockquote>${paras(m.ceo.body)}</blockquote>${m.ceo.name || m.company.ceo ? `<p class="sig">대표이사 ${esc(m.ceo.name || m.company.ceo)}</p>` : ''}</div>
</div></section>` : ''}
<section class="white"><div class="wrap">
  <p class="kicker">회사 정보</p><h2>기업 정보</h2>
  <table class="info">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
</div></section>
${ctaBand(m)}`;
  return layout(m, { path: 'about', title: '회사 개요', description: m.about.slice(0, 150), body, band: { kicker: '회사소개', title: '회사 개요', crumbs: [{ label: '회사소개' }] } });
}

export function history(m: CorpSite): string {
  // 연대별로 묶는다(1990년대·2000년대 …) — 긴 연혁도 한눈에
  const groups = new Map<string, { year: string; text: string }[]>();
  for (const h of m.history) {
    const y = parseInt(h.year, 10);
    const key = Number.isFinite(y) ? `${Math.floor(y / 10) * 10}년대` : '기타';
    groups.set(key, [...(groups.get(key) || []), h]);
  }
  const body = `
<style>
.dec{display:grid;grid-template-columns:240px 1fr;gap:56px;padding:48px 0;border-top:1px solid var(--line)}
.dec:first-child{border-top:2px solid var(--ink)}
.dec h2{font-size:36px;color:var(--accent);margin:0}
.dec ol{list-style:none;margin:0;padding:0}
.dec li{display:grid;grid-template-columns:90px 1fr;gap:20px;padding:12px 0}
.dec b{font:700 19px/1.6 'IBM Plex Sans KR',sans-serif;font-variant-numeric:tabular-nums}
@media (max-width:960px){.dec{grid-template-columns:1fr;gap:16px;padding:32px 0}.dec li{grid-template-columns:64px 1fr}}
</style>
<section><div class="wrap">
${[...groups].map(([k, list]) => `<div class="dec"><h2>${esc(k)}</h2><ol>${list.map((h) => `<li><b>${esc(h.year)}</b><span>${esc(h.text)}</span></li>`).join('')}</ol></div>`).join('')}
</div></section>`;
  return layout(m, { path: 'about/history', title: '연혁', body, band: { kicker: '회사소개', title: '연혁', crumbs: [{ label: '회사소개', path: 'about' }, { label: '연혁' }] } });
}

export function certifications(m: CorpSite): string {
  const body = `
<style>
.cgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;list-style:none;margin:0;padding:0}
.cgrid li{background:var(--white);border:1px solid var(--line);padding:28px 26px;display:flex;gap:16px;align-items:flex-start;font:600 18px/1.45 'IBM Plex Sans KR',sans-serif;word-break:keep-all}
.cgrid li::before{content:'';flex:none;width:10px;height:10px;margin-top:9px;background:var(--accent)}
@media (max-width:960px){.cgrid{grid-template-columns:1fr}}
</style>
<section><div class="wrap">
  <p class="lead" style="margin:0 0 40px">${esc(m.name)}이(가) 보유한 인증·특허·지정 현황입니다.</p>
  <ul class="cgrid">${m.certifications.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
</div></section>
${ctaBand(m)}`;
  return layout(m, { path: 'about/certifications', title: '인증·특허', body, band: { kicker: '회사소개', title: '인증·특허', crumbs: [{ label: '회사소개', path: 'about' }, { label: '인증·특허' }] } });
}

export function location(m: CorpSite): string {
  const map = mapEmbed({ name: m.name, facts: { lat: m.facts.lat, lng: m.facts.lng } } as any);
  const address = m.facts.address || m.company.address || '';
  const phone = m.facts.phone || m.company.phone || '';
  const dir = m.facts.lat && m.facts.lng ? `https://map.kakao.com/link/to/${encodeURIComponent(m.name)},${m.facts.lat},${m.facts.lng}` : m.facts.kakaoUrl || m.facts.googleUrl || '';
  const body = `
<style>
.loc{display:grid;grid-template-columns:1.3fr .7fr;gap:40px;align-items:stretch}
.loc .map{width:100%;height:100%;min-height:460px;border:0}
.loc dl{margin:0;background:var(--white);padding:36px}
.loc dt{color:var(--steel);font-size:15px;margin-top:22px}
.loc dt:first-child{margin-top:0}
.loc dd{margin:4px 0 0;font:600 19px/1.5 'IBM Plex Sans KR',sans-serif;word-break:keep-all}
@media (max-width:960px){.loc{grid-template-columns:1fr}.loc .map{min-height:300px}}
</style>
<section><div class="wrap loc">
  ${map}
  <dl>
    ${address ? `<dt>주소</dt><dd>${esc(address)}</dd>` : ''}
    ${phone ? `<dt>대표전화</dt><dd><a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${esc(phone)}</a></dd>` : ''}
    ${m.company.fax ? `<dt>팩스</dt><dd>${esc(m.company.fax)}</dd>` : ''}
    ${m.company.email ? `<dt>이메일</dt><dd><a href="mailto:${esc(m.company.email)}">${esc(m.company.email)}</a></dd>` : ''}
    ${dir ? `<dd style="margin-top:28px"><a class="btn" href="${esc(dir)}" target="_blank" rel="noopener">카카오맵 길찾기</a></dd>` : ''}
  </dl>
</div></section>`;
  return layout(m, { path: 'about/location', title: '오시는 길', description: `${m.name} 오시는 길 — ${address}`, body, band: { kicker: '회사소개', title: '오시는 길', crumbs: [{ label: '회사소개', path: 'about' }, { label: '오시는 길' }] } });
}

// ── 제품 ──
export function products(m: CorpSite, cat?: string): string {
  const current = m.categories.find((c) => c.id === cat);
  const list = current ? m.products.filter((p) => p.category === current.id) : m.products;
  const body = `
<style>
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 36px;padding:0;list-style:none}
.tabs a{display:block;padding:10px 18px;border:1px solid var(--line);background:var(--white);text-decoration:none;font-weight:600;font-size:15px}
.tabs a.on{background:var(--ink);border-color:var(--ink);color:#fff}
${PCARD_CSS}
</style>
<section><div class="wrap">
  ${current?.summary ? `<p class="lead" style="margin:0 0 32px">${esc(current.summary)}</p>` : ''}
  ${m.categories.length > 1 ? `<ul class="tabs"><li><a class="${current ? '' : 'on'}" href="${esc(href(m, 'products'))}">전체 (${m.products.length})</a></li>${m.categories.map((c) => `<li><a class="${c.id === current?.id ? 'on' : ''}" href="${esc(href(m, `products?c=${c.id}`))}">${esc(c.name)} (${m.products.filter((p) => p.category === c.id).length})</a></li>`).join('')}</ul>` : ''}
  <div class="pgrid">${list.map((p) => productCard(m, p)).join('')}</div>
</div></section>
${ctaBand(m)}`;
  return layout(m, {
    path: 'products', title: current ? current.name : '제품', description: current?.summary, body,
    band: { kicker: '제품', title: current ? current.name : '전체 제품', crumbs: current ? [{ label: '제품', path: 'products' }, { label: current.name }] : [{ label: '제품' }] },
  });
}

export function product(m: CorpSite, p: CorpProduct): string {
  const cat = m.categories.find((c) => c.id === p.category);
  const related = m.products.filter((x) => x.id !== p.id && (!p.category || x.category === p.category)).slice(0, 3);
  const i = m.products.indexOf(p);
  const prev = m.products[(i - 1 + m.products.length) % m.products.length];
  const next = m.products[(i + 1) % m.products.length];
  const body = `
<style>
.pd{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:start}
.gal .main{aspect-ratio:3/2;background:#E4E7EA}
.gal .main img{width:100%;height:100%;object-fit:cover}
.gal .th{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px}
.gal .th button{padding:0;border:2px solid transparent;background:none;cursor:pointer;aspect-ratio:1}
.gal .th button.on{border-color:var(--accent)}
.gal .th img{width:100%;height:100%;object-fit:cover}
.pd .cat{color:var(--accent);font-weight:600;margin:0 0 10px}
.pd h2{margin:0 0 16px}
.pd .sum{font-size:18px;color:var(--steel);margin:0 0 24px}
.key{list-style:none;margin:0 0 32px;padding:0;border-top:1px solid var(--line)}
.key li{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--line)}
.key span{color:var(--steel)}
.key b{text-align:right}
.feat{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;list-style:none;margin:0;padding:0}
.feat li{background:var(--white);padding:28px;border-top:3px solid var(--accent)}
.feat b{display:block;font:700 19px/1.4 'IBM Plex Sans KR',sans-serif;margin-bottom:6px}
.feat span{color:var(--steel);font-size:16px}
.spec{width:100%;border-collapse:collapse;background:var(--white)}
.spec th{width:34%;text-align:left;font-weight:500;color:var(--steel);padding:16px 22px;border-bottom:1px solid var(--line);background:#FAFAFB}
.spec td{padding:16px 22px;border-bottom:1px solid var(--line);font-weight:600}
.pnav{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding-top:24px;margin-top:56px}
.pnav a{text-decoration:none;font-weight:600}
${PCARD_CSS}
@media (max-width:960px){.pd{grid-template-columns:1fr;gap:28px}.feat{grid-template-columns:1fr}.spec th{width:40%;padding:12px}.spec td{padding:12px}}
</style>
<section><div class="wrap">
  <div class="pd">
    <div class="gal">
      <div class="main">${p.photos[0] ? img(p.photos[0], p.name, true) : ''}</div>
      ${p.photos.length > 1 ? `<div class="th">${p.photos.slice(0, 10).map((ph, k) => `<button type="button" class="${k ? '' : 'on'}" data-src="${esc(ph.url)}" aria-label="사진 ${k + 1}">${img(ph)}</button>`).join('')}</div>` : ''}
    </div>
    <div>
      ${cat ? `<p class="cat">${esc(cat.name)}</p>` : ''}
      <h2>${esc(p.name)}</h2>
      ${p.summary ? `<p class="sum">${esc(p.summary)}</p>` : ''}
      ${p.specs?.length ? `<ul class="key">${p.specs.slice(0, 4).map((s) => `<li><span>${esc(s.k)}</span><b>${esc(s.v)}</b></li>`).join('')}</ul>` : ''}
      <a class="btn" href="${esc(href(m, `contact?product=${encodeURIComponent(p.id)}`))}">이 제품 견적 문의</a>
      ${m.facts.phone || m.company.phone ? `<a class="btn line" href="tel:${esc((m.facts.phone || m.company.phone || '').replace(/[^\d+]/g, ''))}">전화 문의</a>` : ''}
    </div>
  </div>
</div></section>
${p.body ? `<section class="white"><div class="wrap" style="max-width:880px"><p class="kicker">제품 소개</p>${paras(p.body)}</div></section>` : ''}
${p.features?.length ? `<section><div class="wrap"><p class="kicker">주요 특징</p><h2>이 제품이 다른 점</h2><ul class="feat">${p.features.map((f) => `<li><b>${esc(f.title)}</b>${f.body ? `<span>${esc(f.body)}</span>` : ''}</li>`).join('')}</ul></div></section>` : ''}
${p.specs?.length ? `<section class="white"><div class="wrap" style="max-width:880px"><p class="kicker">사양</p><h2>제품 사양</h2><table class="spec">${p.specs.map((s) => `<tr><th>${esc(s.k)}</th><td>${esc(s.v)}</td></tr>`).join('')}</table><p style="color:var(--steel);font-size:14px;margin-top:14px">사양은 옵션·주문 조건에 따라 달라질 수 있습니다. 정확한 사양은 문의해 주세요.</p></div></section>` : ''}
${related.length ? `<section><div class="wrap"><h2 style="font-size:28px">관련 제품</h2><div class="pgrid">${related.map((x) => productCard(m, x)).join('')}</div>
  ${m.products.length > 1 ? `<div class="pnav"><a href="${esc(href(m, `products/${prev.id}`))}">← ${esc(prev.name)}</a><a href="${esc(href(m, 'products'))}">전체 제품</a><a href="${esc(href(m, `products/${next.id}`))}">${esc(next.name)} →</a></div>` : ''}
</div></section>` : ''}
${ctaBand(m)}
<script>document.querySelectorAll('.gal .th button').forEach(function(b){b.addEventListener('click',function(){var main=document.querySelector('.gal .main img');if(main){main.src=b.dataset.src;}document.querySelectorAll('.gal .th button').forEach(function(x){x.classList.toggle('on',x===b)})})});</script>`;
  return layout(m, {
    path: `products/${p.id}`, title: p.name, description: p.summary, body, ogImage: p.photos[0]?.url,
    band: { kicker: cat?.name || '제품', title: p.name, crumbs: [{ label: '제품', path: 'products' }, ...(cat ? [{ label: cat.name, path: `products?c=${cat.id}` }] : []), { label: p.name }] },
  });
}

// ── 문의 ──
export function contact(m: CorpSite, q: { sent?: boolean; error?: string; product?: string }): string {
  const phone = m.facts.phone || m.company.phone || '';
  const body = `
<style>
.ct{display:grid;grid-template-columns:.8fr 1.2fr;gap:64px;align-items:start}
.ct dl{margin:0}
.ct dt{color:var(--steel);font-size:15px;margin-top:20px}
.ct dd{margin:4px 0 0;font:600 20px/1.5 'IBM Plex Sans KR',sans-serif}
form{background:var(--white);padding:40px;border-top:4px solid var(--accent)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
label{display:block;font-weight:600;font-size:15px;margin:0 0 6px}
label i{color:var(--accent);font-style:normal}
input,select,textarea{width:100%;font:inherit;font-size:16px;padding:13px 14px;border:1px solid var(--line);background:#FAFAFB;color:var(--ink);border-radius:2px;margin-bottom:18px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:-1px;background:#fff}
textarea{min-height:160px;resize:vertical}
.agree{display:flex;gap:10px;align-items:flex-start;font-size:15px;background:#FAFAFB;border:1px solid var(--line);padding:16px;margin-bottom:22px}
.agree input{width:auto;margin:4px 0 0}
.agree small{display:block;color:var(--steel);margin-top:4px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.note{padding:20px 22px;margin-bottom:24px;font-weight:600}
.note.ok{background:#E8F4EC;color:#14532D}
.note.err{background:#FDECEC;color:#7F1D1D}
@media (max-width:960px){.ct{grid-template-columns:1fr;gap:28px}.row2{grid-template-columns:1fr;gap:0}form{padding:24px}}
</style>
<section><div class="wrap ct">
  <div>
    <h2>무엇이든 문의해 주세요</h2>
    <p class="lead">제품 사양·견적·납기 문의를 남겨 주시면 담당자가 확인 후 연락드립니다.</p>
    <dl>
      ${phone ? `<dt>대표전화</dt><dd><a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${esc(phone)}</a></dd>` : ''}
      ${m.company.fax ? `<dt>팩스</dt><dd>${esc(m.company.fax)}</dd>` : ''}
      ${m.company.email ? `<dt>이메일</dt><dd><a href="mailto:${esc(m.company.email)}">${esc(m.company.email)}</a></dd>` : ''}
    </dl>
  </div>
  <form method="post" action="${esc(href(m, 'contact'))}">
    ${q.sent ? '<p class="note ok">문의가 접수됐습니다. 담당자가 확인 후 연락드리겠습니다.</p>' : ''}
    ${q.error ? `<p class="note err">${esc(q.error)}</p>` : ''}
    <div class="row2">
      <div><label for="f-name">이름 <i>*</i></label><input id="f-name" name="name" required maxlength="40" autocomplete="name"></div>
      <div><label for="f-co">회사명</label><input id="f-co" name="company" maxlength="60" autocomplete="organization"></div>
    </div>
    <div class="row2">
      <div><label for="f-tel">연락처 <i>*</i></label><input id="f-tel" name="phone" required maxlength="30" inputmode="tel" autocomplete="tel"></div>
      <div><label for="f-mail">이메일</label><input id="f-mail" name="email" type="email" maxlength="80" autocomplete="email"></div>
    </div>
    ${m.products.length ? `<label for="f-prod">관심 제품</label><select id="f-prod" name="product"><option value="">선택 안 함</option>${m.products.map((p) => `<option value="${esc(p.id)}"${p.id === q.product ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
    <label for="f-msg">문의 내용 <i>*</i></label><textarea id="f-msg" name="message" required maxlength="3000" placeholder="용도, 수량, 희망 납기 등을 적어 주시면 더 정확히 안내드릴 수 있습니다."></textarea>
    <div class="hp" aria-hidden="true"><label>홈페이지<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <label class="agree"><input type="checkbox" name="agree" value="1" required><span>개인정보 수집·이용에 동의합니다 <i>*</i><small>수집 항목: 이름, 연락처, 회사명, 이메일 · 목적: 문의 응대 · 보관: 응대 완료 후 1년. <a href="${esc(href(m, 'privacy'))}">개인정보처리방침</a></small></span></label>
    <button class="btn" type="submit">문의 보내기</button>
  </form>
</div></section>`;
  return layout(m, { path: 'contact', title: '문의하기', body, noindex: Boolean(q.sent || q.error), band: { kicker: '고객지원', title: '문의하기', crumbs: [{ label: '문의하기' }] } });
}

// ── 개인정보처리방침 ──
export function privacy(m: CorpSite): string {
  const officer = m.company.ceo ? `대표 ${m.company.ceo}` : '대표자';
  const phone = m.facts.phone || m.company.phone || '';
  const body = `
<style>.doc{max-width:860px}.doc h2{font-size:22px;margin:40px 0 12px}.doc p,.doc li{color:#33393F}.doc table{width:100%;border-collapse:collapse;margin:8px 0}.doc th,.doc td{border:1px solid var(--line);padding:10px 12px;text-align:left;font-size:15px}.doc th{background:#FAFAFB}</style>
<section><div class="wrap doc">
  <p>${esc(m.name)}(이하 "회사")는 「개인정보 보호법」에 따라 정보주체의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 둡니다.</p>
  <h2>1. 수집하는 개인정보와 목적</h2>
  <table><tr><th>수집 항목</th><th>목적</th><th>보관 기간</th></tr>
  <tr><td>이름, 연락처(필수), 회사명, 이메일(선택), 문의 내용</td><td>제품·견적 문의 응대</td><td>응대 완료 후 1년</td></tr></table>
  <p>홈페이지 문의 양식으로만 수집하며, 정보주체의 동의를 받습니다.</p>
  <h2>2. 제3자 제공</h2><p>회사는 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 법령에 특별한 규정이 있는 경우는 예외입니다.</p>
  <h2>3. 처리 위탁</h2><p>홈페이지 운영과 문의 접수 시스템 관리를 위해 아래와 같이 처리를 위탁합니다.</p>
  <table><tr><th>수탁자</th><th>위탁 업무</th></tr><tr><td>도피아(Doppia)</td><td>홈페이지 호스팅, 문의 접수 시스템 운영</td></tr></table>
  <h2>4. 파기</h2><p>보관 기간이 지나거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자 파일은 복구할 수 없는 방법으로 삭제합니다.</p>
  <h2>5. 정보주체의 권리</h2><p>정보주체는 언제든지 개인정보의 열람·정정·삭제·처리정지를 요구할 수 있으며, 아래 연락처로 요청하시면 지체 없이 조치합니다.</p>
  <h2>6. 개인정보 보호책임자</h2>
  <table><tr><th>책임자</th><td>${esc(officer)}</td></tr>${phone ? `<tr><th>연락처</th><td>${esc(phone)}</td></tr>` : ''}${m.company.email ? `<tr><th>이메일</th><td>${esc(m.company.email)}</td></tr>` : ''}</table>
  <p>개인정보 침해 신고·상담: 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보분쟁조정위원회(www.kopico.go.kr, 1833-6972)</p>
  <h2>7. 시행일</h2><p>이 방침은 홈페이지 공개일부터 적용합니다.</p>
</div></section>`;
  return layout(m, { path: 'privacy', title: '개인정보처리방침', body, band: { title: '개인정보처리방침', crumbs: [{ label: '개인정보처리방침' }] } });
}

export function notFound(m: CorpSite): string {
  const body = `<section><div class="wrap" style="min-height:40vh"><h2>페이지를 찾을 수 없습니다</h2><p class="lead">주소가 바뀌었거나 없는 페이지입니다.</p><a class="btn" href="${esc(href(m))}">홈으로</a></div></section>`;
  return layout(m, { path: '404', title: '페이지를 찾을 수 없습니다', body, noindex: true });
}
