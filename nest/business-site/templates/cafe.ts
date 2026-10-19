import {
  SiteModel, SitePhoto, actionBar, addressOf, clip, credits, esc, fmtCount, head, mapEmbed, paras, photosOf,
  splitHours, stars, TODAY_SCRIPT, telHref, directionsHref,
} from './shared';

/**
 * 카페·베이커리·디저트 — "창가 자리".
 *   색: 세이지 안개 #EEF2EC 바탕, 숲 잉크 #23302A, 버터 #EFC94C(히어로 사진 뒤 블록 하나에만), 잎 #7E9C86, 종이 #FFFFFF
 *   서체: 고운바탕(제목·메뉴 이름·인용) + Pretendard(본문)
 *   기억에 남는 것 하나 = 히어로 사진 뒤로 비켜 놓인 버터색 블록. 나머지는 조용히.
 *
 * 사진은 AI가 붙인 종류(kind)로 섹션에 나눠 쓴다 — 한 장은 한 번만 나온다.
 *   대표 메뉴(메뉴↔사진 연결) → 공간(interior·exterior) → 나머지는 사진 모음.
 *   자료가 적은 가게도 빈 상자가 생기지 않게: 메뉴가 2개 미만이면 메뉴 섹션 대신 소개 안에 한 줄로 넣는다.
 */
export function renderCafe(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const used = new Set<string>();
  const take = (list: SitePhoto[], n: number) => {
    const out = list.filter((p) => !used.has(p.url)).slice(0, n);
    out.forEach((p) => used.add(p.url));
    return out;
  };

  const hero = take(m.photos, 1)[0];
  const services = c.services || [];
  const withPhoto = services.filter((s) => s.photoUrl && !used.has(s.photoUrl)).slice(0, 6);
  withPhoto.forEach((s) => used.add(s.photoUrl as string));
  const plainMenu = services.filter((s) => !withPhoto.includes(s));
  // 메뉴 사진이 없을 때는 음식 사진을 "진열대"로 대신 보여준다
  const counter = withPhoto.length < 2 ? take(photosOf(m, 'food'), 4) : [];
  const aboutPhoto = take(photosOf(m, 'interior'), 1)[0];
  const space = take(photosOf(m, 'interior', 'exterior'), 3);
  const rest = take(m.photos.filter((p) => p.kind !== 'people'), 8);

  const css = `
:root{--bg:#EEF2EC;--ink:#23302A;--butter:#EFC94C;--leaf:#7E9C86;--paper:#FFFFFF;--soft:#56655C;--rule:#D6DED8}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font:400 17px/1.75 'Pretendard Variable',Pretendard,sans-serif;padding-bottom:84px}
.serif{font-family:'Gowun Batang',serif}
.wrap{max-width:1160px;margin:0 auto;padding:0 24px}
header.top{display:flex;align-items:center;gap:28px;padding:22px 0}
header.top b{font:700 21px/1 'Gowun Batang',serif;margin-right:auto}
header.top a{font-size:15px;text-decoration:none;color:var(--soft)}
header.top a:hover{color:var(--ink)}
header.top .tel{color:var(--ink);border-bottom:1px solid var(--leaf)}

.hero{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;padding:40px 0 112px}
.hero.solo{grid-template-columns:1fr;padding-bottom:72px}
.hero h1{font:700 clamp(42px,5.8vw,80px)/1.14 'Gowun Batang',serif;margin:0 0 24px;letter-spacing:-.015em;word-break:keep-all}
.hero p.lead{font-size:20px;color:var(--soft);max-width:28em;margin:0 0 28px;word-break:keep-all}
.score{display:flex;align-items:center;gap:10px;margin:0 0 34px;font-size:15px;color:var(--soft)}
.score b{font:700 22px/1 'Gowun Batang',serif;color:var(--ink)}
.score .st{color:#C79A1E;letter-spacing:.08em}
.hero .ph{position:relative}
.hero .ph::before{content:'';position:absolute;inset:32px -26px -26px 32px;background:var(--butter);border-radius:4px}
.hero .ph img{position:relative;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:4px}
.btn{display:inline-block;background:var(--ink);color:var(--paper);text-decoration:none;font-weight:600;padding:15px 26px;border-radius:999px;margin:0 8px 8px 0}
.btn.line{background:none;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}

section{padding:96px 0}
section+section{border-top:1px solid var(--rule)}
h2{font:700 clamp(30px,3.6vw,44px)/1.25 'Gowun Batang',serif;margin:0 0 28px;word-break:keep-all}
.intro{display:grid;grid-template-columns:.9fr 1.1fr;gap:72px;align-items:start}
.intro.solo{grid-template-columns:minmax(0,720px)}
.intro figure{margin:0}
.intro figure img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:4px}
figcaption{font-size:14px;color:var(--soft);margin-top:10px}
.intro .txt p{margin:0 0 1.1em;max-width:32em;word-break:keep-all}
.hl{list-style:none;margin:36px 0 0;padding:0;display:grid;gap:20px}
.hl li{padding-left:20px;border-left:3px solid var(--leaf)}
.hl b{display:block;font-size:18px}
.hl span{color:var(--soft);font-size:16px}
.also{margin:28px 0 0;color:var(--soft);font-size:16px}
.also b{color:var(--ink);font-weight:600}

.sig{display:grid;grid-template-columns:repeat(3,1fr);gap:40px 28px}
.sig figure{margin:0}
.sig img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;margin-bottom:16px}
.sig b{display:flex;justify-content:space-between;gap:12px;font:700 21px/1.4 'Gowun Batang',serif}
.sig b span{font:600 15px/1.9 'Pretendard Variable',sans-serif;color:var(--soft);white-space:nowrap}
.sig p{margin:6px 0 0;color:var(--soft);font-size:16px;word-break:keep-all}
.counter{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.counter img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:4px}
.menu{margin:48px 0 0;display:grid;grid-template-columns:repeat(2,1fr);gap:0 56px}
.menu div{display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px dotted #bcc8bf}
.menu small{display:block;color:var(--soft);font-size:14px}

.space{display:grid;grid-template-columns:1.5fr 1fr;grid-template-rows:auto auto;gap:20px}
.space figure{margin:0}
.space figure:first-child{grid-row:span 2}
.space img{width:100%;height:100%;object-fit:cover;border-radius:4px}
.space figure:first-child img{aspect-ratio:4/5}
.space figure:not(:first-child) img{aspect-ratio:4/3}
.space.one{grid-template-columns:1fr}
.space.one figure:first-child img{aspect-ratio:16/9}

.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px}

.rev{display:grid;grid-template-columns:300px 1fr;gap:64px;align-items:start}
.big{font:700 96px/1 'Gowun Batang',serif}
.big small{display:block;font:400 15px/1.6 'Pretendard Variable',sans-serif;color:var(--soft);margin-top:14px}
.big .st{display:block;font-size:20px;color:#C79A1E;letter-spacing:.1em;margin-top:8px}
.rev .sum{font:400 22px/1.75 'Gowun Batang',serif;margin:0 0 22px;max-width:30em;word-break:keep-all}
.kw{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 40px;padding:0}
.kw li{background:var(--paper);padding:7px 14px;border-radius:999px;font-size:15px}
.quotes{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
blockquote{margin:0;background:var(--paper);border-radius:4px;padding:24px}
blockquote p{margin:0 0 14px;font:400 16px/1.75 'Gowun Batang',serif}
blockquote cite{font-style:normal;color:var(--soft);font-size:13px}
.blogs{margin:28px 0 0;padding:0;list-style:none;display:grid;gap:6px;font-size:15px}
.blogs a{text-decoration:none;border-bottom:1px solid var(--leaf)}

.visit{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:stretch}
.visit.solo{grid-template-columns:minmax(0,560px)}
.map{width:100%;height:100%;min-height:380px;border:0;border-radius:4px;background:var(--paper);filter:saturate(.75)}
.card{background:var(--paper);border-radius:4px;padding:36px}
.card dl{margin:0 0 28px}
.card dt{font-weight:700;margin-top:16px}
.card dt:first-child{margin-top:0}
.card dd{margin:2px 0 0;color:var(--soft)}
.hours{list-style:none;margin:0;padding:0}
.hours li{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #E6ECE8;color:var(--soft);font-size:16px}
.hours li.today{color:var(--ink);font-weight:700}
footer{padding:40px 0 64px;color:var(--soft);font-size:14px;border-top:1px solid var(--rule)}
.credits{font-size:13px;color:var(--soft);margin:8px 0 0}
.credits a{color:inherit}
.abar{position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:8px;z-index:20}
.abar a{flex:1;text-align:center;background:var(--ink);color:#fff;text-decoration:none;font-weight:700;padding:15px;border-radius:999px}
.abar a+a{background:var(--butter);color:var(--ink)}
@media (max-width:900px){
 header.top a:not(.tel){display:none}
 .hero,.intro,.visit,.rev{grid-template-columns:1fr;gap:36px}
 .hero{padding:8px 0 72px}
 .hero .ph::before{inset:18px -10px -10px 18px}
 .hero .btns{display:none}
 .sig{grid-template-columns:1fr 1fr;gap:28px 16px}
 .sig b{font-size:18px;flex-direction:column;gap:0}
 .counter,.grid{grid-template-columns:1fr 1fr}
 .menu,.quotes{grid-template-columns:1fr}
 .space{grid-template-columns:1fr}
 .space figure:first-child{grid-row:auto}
 .big{font-size:72px}
 .map{min-height:280px}
 .card{padding:26px}
 section{padding:64px 0}
 .abar{display:flex}
}`;
  const fonts = 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap';
  const tel = telHref(f.phone);
  const dir = directionsHref(m);
  const map = mapEmbed(m);
  const img = (p: SitePhoto, alt = '', eager = false) =>
    `<img src="${esc(p.url)}" alt="${esc(alt || p.caption || '')}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
  const fig = (p: SitePhoto) => `<figure>${img(p)}${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`;

  const hasMenuSection = withPhoto.length >= 2 || plainMenu.length >= 2 || counter.length >= 2;
  const showReviews = Boolean(c.reviewSummary || m.reviews.length);
  const nav = [
    hasMenuSection && ['#menu', c.servicesTitle || '메뉴'],
    space.length && ['#space', '공간'],
    showReviews && ['#reviews', '후기'],
    ['#visit', '오시는 길'],
  ].filter(Boolean) as string[][];

  return `${head(m, fonts, css)}
<div class="wrap">
<header class="top"><b>${esc(m.name)}</b>${nav.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('')}${tel ? `<a class="tel" href="${esc(tel)}">${esc(f.phone)}</a>` : ''}</header>

<section class="hero${hero ? '' : ' solo'}" style="border:0">
  <div>
    <h1>${esc(c.headline || m.name)}</h1>
    ${c.sub ? `<p class="lead">${esc(c.sub)}</p>` : ''}
    ${f.rating ? `<p class="score"><b>${esc(f.rating.toFixed(1))}</b><span class="st">${stars(f.rating)}</span><span>Google 리뷰 ${esc(fmtCount(f.ratingCount))}개</span></p>` : ''}
    <div class="btns">${dir ? `<a class="btn" href="${esc(dir)}" target="_blank" rel="noopener">${esc(c.ctaLabel || '찾아오는 길')}</a>` : ''}${tel ? `<a class="btn line" href="${esc(tel)}">전화하기</a>` : ''}</div>
  </div>
  ${hero ? `<div class="ph">${img(hero, m.name, true)}</div>` : ''}
</section>

${c.about ? `<section class="intro${aboutPhoto ? '' : ' solo'}">
  ${aboutPhoto ? fig(aboutPhoto) : ''}
  <div class="txt">
    <h2>${esc(c.aboutTitle || '우리 가게 이야기')}</h2>
    ${paras(c.about)}
    ${c.highlights?.length ? `<ul class="hl">${c.highlights.map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}
    ${!hasMenuSection && services.length ? `<p class="also"><b>${esc(c.servicesTitle || '메뉴')}</b> ${services.map((s) => esc(s.name)).join(', ')}</p>` : ''}
  </div>
</section>` : ''}

${hasMenuSection ? `<section id="menu">
  <h2>${esc(c.servicesTitle || '대표 메뉴')}</h2>
  ${withPhoto.length >= 2 ? `<div class="sig">${withPhoto.map((s) => `<figure><img src="${esc(s.photoUrl)}" alt="${esc(s.name)}" loading="lazy" decoding="async"><b>${esc(s.name)}${s.price ? `<span>${esc(s.price)}</span>` : ''}</b>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}</figure>`).join('')}</div>` : ''}
  ${counter.length >= 2 ? `<div class="counter">${counter.map((p) => fig(p)).join('')}</div>` : ''}
  ${(withPhoto.length >= 2 ? plainMenu : services).length ? `<div class="menu">${(withPhoto.length >= 2 ? plainMenu : services).map((s) => `<div><span>${esc(s.name)}${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</span>${s.price ? `<b>${esc(s.price)}</b>` : ''}</div>`).join('')}</div>` : ''}
</section>` : ''}

${space.length ? `<section id="space">
  <h2>공간</h2>
  <div class="space${space.length === 1 ? ' one' : ''}">${space.map((p) => fig(p)).join('')}</div>
</section>` : ''}

${rest.length >= 2 ? `<section aria-label="사진 더 보기"><div class="grid">${rest.slice(0, rest.length >= 8 ? 8 : 4).map((p) => img(p)).join('')}</div></section>` : ''}

${showReviews ? `<section id="reviews" class="rev">
  <div>
    <h2>${esc(c.reviewTitle || '다녀간 분들의 이야기')}</h2>
    ${f.rating ? `<div class="big">${esc(f.rating.toFixed(1))}<span class="st">${stars(f.rating)}</span><small>Google 리뷰 ${esc(fmtCount(f.ratingCount))}개 기준</small></div>` : ''}
  </div>
  <div>
    ${c.reviewSummary ? `<p class="sum">${esc(c.reviewSummary)}</p>` : ''}
    ${c.keywords?.length ? `<ul class="kw">${c.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
    ${m.reviews.length ? `<div class="quotes">${m.reviews.slice(0, 3).map((r) => `<blockquote><p>“${esc(clip(r.text, 140))}”</p><cite>${esc(r.author)} · ${esc(r.source)} 리뷰</cite></blockquote>`).join('')}</div>` : ''}
    ${m.blogs.length ? `<ul class="blogs">${m.blogs.slice(0, 4).map((b) => `<li><a href="${esc(b.link)}" target="_blank" rel="nofollow noopener">${esc(b.title)}</a></li>`).join('')}</ul>` : ''}
  </div>
</section>` : ''}

<section id="visit">
  <h2>오시는 길</h2>
  <div class="visit${map ? '' : ' solo'}">
    ${map}
    <div class="card">
      <dl>
        ${addressOf(f) ? `<dt>주소</dt><dd>${esc(addressOf(f))}</dd>` : ''}
        ${f.phone ? `<dt>전화</dt><dd><a href="${esc(tel)}">${esc(f.phone)}</a></dd>` : ''}
        ${dir ? `<dt>길찾기</dt><dd><a href="${esc(dir)}" target="_blank" rel="noopener">카카오맵에서 길찾기</a></dd>` : ''}
      </dl>
      ${f.hours?.length ? `<ul class="hours">${f.hours.map((h) => { const s = splitHours(h); return `<li data-day="${esc(s.day)}"><span>${esc(s.label)}</span><span>${esc(s.time)}</span></li>`; }).join('')}</ul>` : ''}
    </div>
  </div>
</section>

<footer>© ${esc(m.name)}${credits(m)}</footer>
</div>
${actionBar(m)}
${TODAY_SCRIPT}
</body></html>`;
}
