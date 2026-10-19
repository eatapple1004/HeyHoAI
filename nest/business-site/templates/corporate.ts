import {
  SiteModel, SitePhoto, actionBar, addressOf, credits, esc, head, mapEmbed, paras, photosOf, telHref, directionsHref,
} from './shared';

/**
 * 중소기업·제조·건설 — "사양서".
 *   손님이 아니라 발주처·구매 담당·협력사가 보는 사이트다. 리뷰 대신 증명(수치·연혁·인증·실물 사진)으로 설득한다.
 *   색: 알루미늄 #F3F4F5 바탕, 그라파이트 #15191E 글자, 강철 #5B6570 보조, 선 #D6DADF,
 *       강조색 1개(--accent) — AI가 로고·제품 사진에서 고른 회사 색, 없으면 #2D5B8C
 *   서체: IBM Plex Sans KR(제목·수치, 반듯한 공업용 인상) + Pretendard(본문)
 *   기억에 남는 것 하나 = 첫 화면 사진 아래에 걸쳐 놓인 핵심 수치 띠. 나머지는 정돈된 사양서처럼 조용히.
 *
 * 자료가 없는 섹션은 통째로 숨긴다(한성·재노바 원칙) — 지어낸 수치·연혁으로 칸을 채우지 않는다.
 */
export function renderCorporate(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const co = c.company || {};
  const accent = /^#[0-9a-f]{6}$/i.test(c.accent || '') ? (c.accent as string) : '#2D5B8C';
  const used = new Set<string>();
  const take = (list: SitePhoto[], n: number) => {
    const out = list.filter((p) => !used.has(p.url)).slice(0, n);
    out.forEach((p) => used.add(p.url));
    return out;
  };

  // 첫 화면 사진은 어두운 배경으로 깔리는 용도라 제품 칸에서 다시 써도 된다(대표 제품 사진이 제품 목록에서 빠지지 않게)
  const hero = m.photos[0];
  const services = c.services || [];
  // 사진 있는 제품: 앞 4개는 크게(지그재그), 그다음은 카드 격자 — 사진 있는 제품이 목록으로 밀려나지 않게
  const withPhoto: typeof services = [];
  for (const s of services) {
    if (withPhoto.length >= 12 || !s.photoUrl || used.has(s.photoUrl)) continue;
    used.add(s.photoUrl);
    withPhoto.push(s);
  }
  const areas = withPhoto.slice(0, 4);
  const cards = withPhoto.slice(4);
  const others = services.filter((s) => !withPhoto.includes(s));
  const aboutPhoto = take(photosOf(m, 'interior', 'exterior', 'people'), 1)[0];
  const gallery = take(m.photos.filter((p) => p.kind !== 'people'), 6);
  const stats = (c.stats || []).slice(0, 4);
  const history = c.history || [];
  const certs = c.certifications || [];

  const phone = f.phone || co.phone || '';
  const address = addressOf(f) || co.address || '';
  const tel = telHref(phone);
  const dir = directionsHref(m);
  const map = mapEmbed(m);

  const css = `
:root{--bg:#F3F4F5;--ink:#15191E;--steel:#5B6570;--line:#D6DADF;--white:#FFFFFF;--accent:${accent}}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font:400 17px/1.75 'Pretendard Variable',Pretendard,sans-serif;padding-bottom:84px}
.plex{font-family:'IBM Plex Sans KR',sans-serif}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
header.top{position:absolute;top:0;left:0;right:0;z-index:5;color:#fff}
header.top .wrap{display:flex;align-items:center;gap:28px;height:76px}
header.top b{font:700 20px/1 'IBM Plex Sans KR',sans-serif;margin-right:auto;letter-spacing:-.01em}
header.top a{color:rgba(255,255,255,.86);text-decoration:none;font-size:15px}
header.top a:hover{color:#fff}
header.top .call{background:var(--accent);color:#fff;padding:10px 18px;border-radius:4px;font-weight:600}

.hero{position:relative;min-height:min(88vh,780px);display:flex;align-items:flex-end;background:#1d232b center/cover no-repeat;color:#fff}
.hero::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,17,22,.82) 0%,rgba(13,17,22,.45) 55%,rgba(13,17,22,.15) 100%)}
.hero .wrap{position:relative;width:100%;padding-bottom:${stats.length ? '150px' : '88px'}}
.hero h1{font:700 clamp(38px,5.2vw,68px)/1.2 'IBM Plex Sans KR',sans-serif;margin:0 0 20px;max-width:15em;letter-spacing:-.02em;word-break:keep-all}
.hero p{font-size:19px;max-width:34em;margin:0 0 32px;color:rgba(255,255,255,.88);word-break:keep-all}
.btn{display:inline-block;text-decoration:none;font-weight:600;padding:15px 26px;border-radius:4px;background:var(--accent);color:#fff;margin:0 8px 8px 0}
.btn.ghost{background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
.btn.line{background:none;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}

.stats{position:relative;z-index:2;margin-top:-92px}
.stats .band{display:grid;grid-template-columns:repeat(${Math.max(stats.length, 1)},1fr);background:var(--white);border-top:4px solid var(--accent)}
.stats .it{padding:30px 30px 28px;border-left:1px solid var(--line)}
.stats .it:first-child{border-left:0}
.stats .v{font:700 clamp(30px,3.4vw,46px)/1.1 'IBM Plex Sans KR',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.stats .l{margin-top:10px;font-weight:600;font-size:16px}
.stats .n{color:var(--steel);font-size:14px;margin-top:2px}

section{padding:104px 0}
.kicker{font:600 15px/1 'IBM Plex Sans KR',sans-serif;color:var(--accent);margin:0 0 14px}
h2{font:700 clamp(30px,3.4vw,44px)/1.25 'IBM Plex Sans KR',sans-serif;margin:0 0 28px;letter-spacing:-.02em;word-break:keep-all}
.about{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:start}
.about p{margin:0 0 1.1em;max-width:34em;word-break:keep-all}
.about figure{margin:0}
.about img{width:100%;aspect-ratio:4/3;object-fit:cover}
.facts{display:grid;grid-template-columns:auto 1fr;gap:10px 24px;margin:32px 0 0;padding:24px 0 0;border-top:1px solid var(--line);font-size:16px}
.facts dt{color:var(--steel)}
.facts dd{margin:0;font-weight:600}
.hl{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:56px 0 0;padding:0;list-style:none;border-top:1px solid var(--line)}
.hl li{padding:24px 28px 0 0}
.hl b{display:block;font:600 19px/1.4 'IBM Plex Sans KR',sans-serif;margin-bottom:6px}
.hl span{color:var(--steel);font-size:16px}

.biz{background:var(--white)}
.area{display:grid;grid-template-columns:1.15fr .85fr;gap:64px;align-items:center;padding:40px 0;border-top:1px solid var(--line)}
.area:first-of-type{border-top:0}
.area:nth-of-type(even) figure{order:2}
.area figure{margin:0}
.area img{width:100%;aspect-ratio:3/2;object-fit:cover}
.area h3{font:700 28px/1.3 'IBM Plex Sans KR',sans-serif;margin:0 0 12px;letter-spacing:-.01em;word-break:keep-all}
.area p{margin:0;color:var(--steel);max-width:30em;word-break:keep-all}
.area .spec{display:inline-block;margin-top:16px;font-weight:600;color:var(--accent)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:40px 24px;margin:48px 0 0;padding:48px 0 0;border-top:1px solid var(--line)}
.cards figure{margin:0}
.cards img{width:100%;aspect-ratio:3/2;object-fit:cover;margin-bottom:14px}
.cards b{display:block;font:700 20px/1.35 'IBM Plex Sans KR',sans-serif;margin-bottom:4px}
.cards span{display:block;color:var(--steel);font-size:15px}
.cards em{display:block;font-style:normal;font-weight:600;color:var(--accent);font-size:15px;margin-top:8px}
.more{margin:40px 0 0;padding:28px 0 0;border-top:1px solid var(--line)}
.more h3{font:600 17px/1 'IBM Plex Sans KR',sans-serif;margin:0 0 16px;color:var(--steel)}
.more ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 32px}
.more li{padding:10px 0;border-bottom:1px solid var(--line)}
.more small{display:block;color:var(--steel);font-size:14px}

.gal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.gal img{width:100%;aspect-ratio:4/3;object-fit:cover}

.hist{display:grid;grid-template-columns:280px 1fr;gap:64px}
.tl{list-style:none;margin:0;padding:0;columns:${history.length > 12 ? 2 : 1};column-gap:56px}
.tl li{break-inside:avoid;display:grid;grid-template-columns:72px 1fr;gap:16px;padding:14px 0;border-top:1px solid var(--line)}
.tl b{font:700 18px/1.5 'IBM Plex Sans KR',sans-serif;color:var(--accent);font-variant-numeric:tabular-nums}
.tl span{word-break:keep-all}

.certs{background:var(--ink);color:#fff}
.certs h2{color:#fff}
.certs ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.16)}
.certs li{padding:24px 22px 24px 0;font-weight:600;word-break:keep-all;border-bottom:1px solid rgba(255,255,255,.16)}

.contact{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:stretch}
.map{width:100%;height:100%;min-height:400px;border:0;filter:grayscale(.35)}
.info{background:var(--white);padding:40px}
.info table{width:100%;border-collapse:collapse;font-size:16px;margin:0 0 28px}
.info th{text-align:left;font-weight:500;color:var(--steel);padding:12px 16px 12px 0;width:84px;vertical-align:top;border-bottom:1px solid var(--line)}
.info td{padding:12px 0;border-bottom:1px solid var(--line);font-weight:600}
footer{background:#0F1317;color:#9AA3AD;font-size:14px;padding:44px 0 72px}
footer b{color:#fff;font:600 17px/1 'IBM Plex Sans KR',sans-serif;display:block;margin-bottom:14px}
footer p{margin:4px 0}
footer .credits{font-size:12px;margin-top:16px}
footer a{color:inherit}
.abar{position:fixed;left:0;right:0;bottom:0;display:none;z-index:20}
.abar a{flex:1;text-align:center;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:18px}
.abar a+a{background:var(--ink)}
@media (max-width:900px){
 header.top a:not(.call){display:none}
 .hero{min-height:620px}
 .hero .btns{display:none}
 .stats{margin-top:-64px}
 .stats .band{grid-template-columns:1fr 1fr}
 .stats .it{padding:20px;border-left:0;border-top:1px solid var(--line)}
 .stats .it:nth-child(-n+2){border-top:0}
 .stats .it:nth-child(even){border-left:1px solid var(--line)}
 .about,.area,.hist,.contact{grid-template-columns:1fr;gap:28px}
 .area:nth-of-type(even) figure{order:0}
 .hl,.more ul{grid-template-columns:1fr}
 .cards{grid-template-columns:1fr 1fr;gap:28px 14px}
 .cards b{font-size:17px}
 .gal{grid-template-columns:1fr 1fr}
 .tl{columns:1}
 .certs ul{grid-template-columns:1fr 1fr}
 .map{min-height:280px}
 .info{padding:24px}
 section{padding:68px 0}
 .abar{display:flex}
}`;
  const fonts = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;600;700&display=swap';
  const img = (p: SitePhoto, alt = '') => `<img src="${esc(p.url)}" alt="${esc(alt || p.caption || '')}" loading="lazy" decoding="async">`;
  const nav = [
    c.about && ['#about', '회사소개'],
    (areas.length || others.length) && ['#business', c.servicesTitle || '사업분야'],
    history.length && ['#history', '연혁'],
    certs.length && ['#certs', '인증'],
    ['#contact', '오시는 길'],
  ].filter(Boolean) as string[][];
  const factRows = [
    ['설립', co.founded], ['대표', co.ceo], ['본사', address],
  ].filter(([, v]) => v);
  const infoRows = [
    ['상호', m.name], ['대표', co.ceo], ['주소', address], ['전화', phone], ['팩스', co.fax], ['이메일', co.email],
  ].filter(([, v]) => v);

  return `${head(m, fonts, css)}
<header class="top"><div class="wrap"><b>${esc(m.name)}</b>${nav.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('')}${tel ? `<a class="call" href="${esc(tel)}">전화 문의</a>` : ''}</div></header>

<div class="hero"${hero ? ` style="background-image:url('${esc(hero.url)}')"` : ''}>
  <div class="wrap">
    <h1>${esc(c.headline || m.name)}</h1>
    ${c.sub ? `<p>${esc(c.sub)}</p>` : ''}
    <div class="btns">${tel ? `<a class="btn" href="${esc(tel)}">${esc(c.ctaLabel || '전화 문의')}</a>` : ''}${c.about ? '<a class="btn ghost" href="#about">회사소개 보기</a>' : ''}</div>
  </div>
</div>

${stats.length ? `<div class="stats"><div class="wrap"><div class="band">${stats.map((s) => `<div class="it"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div>${s.note ? `<div class="n">${esc(s.note)}</div>` : ''}</div>`).join('')}</div></div></div>` : ''}

${c.about ? `<section id="about"><div class="wrap">
  <div class="about">
    <div>
      <p class="kicker">회사소개</p>
      <h2>${esc(c.aboutTitle || m.name)}</h2>
      ${aboutPhoto ? `<figure>${img(aboutPhoto)}</figure>` : ''}
    </div>
    <div>${paras(c.about)}
      ${factRows.length ? `<dl class="facts">${factRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
    </div>
  </div>
  ${c.highlights?.length ? `<ul class="hl">${c.highlights.slice(0, 3).map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}
</div></section>` : ''}

${areas.length || others.length ? `<section id="business" class="biz"><div class="wrap">
  <p class="kicker">${esc(c.servicesTitle || '사업분야')}</p>
  <h2>${esc(c.servicesTitle ? `${m.name}의 ${c.servicesTitle}` : '이런 일을 합니다')}</h2>
  ${areas.map((s) => `<div class="area"><figure><img src="${esc(s.photoUrl)}" alt="${esc(s.name)}" loading="lazy" decoding="async"></figure><div><h3>${esc(s.name)}</h3>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}${s.price ? `<span class="spec">${esc(s.price)}</span>` : ''}</div></div>`).join('')}
  ${cards.length ? `<div class="cards">${cards.map((s) => `<figure><img src="${esc(s.photoUrl)}" alt="${esc(s.name)}" loading="lazy" decoding="async"><figcaption><b>${esc(s.name)}</b>${s.desc ? `<span>${esc(s.desc)}</span>` : ''}${s.price ? `<em>${esc(s.price)}</em>` : ''}</figcaption></figure>`).join('')}</div>` : ''}
  ${others.length ? `<div class="more"><h3>${areas.length ? '그 밖의 제품·서비스' : ''}</h3><ul>${others.map((s) => `<li>${esc(s.name)}${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</li>`).join('')}</ul></div>` : ''}
</div></section>` : ''}

${gallery.length >= 3 ? `<section aria-label="현장 사진" style="padding-bottom:0"><div class="wrap"><div class="gal">${gallery.slice(0, gallery.length >= 6 ? 6 : 3).map((p) => img(p)).join('')}</div></div></section>` : ''}

${history.length ? `<section id="history"><div class="wrap hist">
  <div><p class="kicker">연혁</p><h2>걸어온 길</h2></div>
  <ol class="tl">${history.map((h) => `<li><b>${esc(h.year)}</b><span>${esc(h.text)}</span></li>`).join('')}</ol>
</div></section>` : ''}

${certs.length ? `<section id="certs" class="certs"><div class="wrap">
  <p class="kicker" style="color:#fff;opacity:.7">인증·특허</p>
  <h2>공인된 기술력</h2>
  <ul>${certs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</div></section>` : ''}

<section id="contact"><div class="wrap">
  <p class="kicker">오시는 길</p>
  <h2>${esc(address ? address.split(' ').slice(0, 3).join(' ') : '연락처')}</h2>
  <div class="contact"${map ? '' : ' style="grid-template-columns:minmax(0,640px)"'}>
    ${map}
    <div class="info">
      ${infoRows.length ? `<table>${infoRows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${k === '전화' && tel ? `<a href="${esc(tel)}">${esc(v)}</a>` : k === '이메일' ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v)}</td></tr>`).join('')}</table>` : ''}
      ${tel ? `<a class="btn" href="${esc(tel)}">전화 문의</a>` : ''}${dir ? `<a class="btn line" href="${esc(dir)}" target="_blank" rel="noopener">길찾기</a>` : ''}
    </div>
  </div>
</div></section>

<footer><div class="wrap">
  <b>${esc(m.name)}</b>
  <p>${[co.ceo && `대표 ${co.ceo}`, co.bizNo && `사업자등록번호 ${co.bizNo}`].filter(Boolean).map((x) => esc(x)).join(' | ')}</p>
  <p>${[address, phone && `T ${phone}`, co.fax && `F ${co.fax}`, co.email].filter(Boolean).map((x) => esc(x)).join(' | ')}</p>
  ${credits(m)}
</div></footer>
${actionBar({ ...m, facts: { ...f, phone } })}
</body></html>`;
}
