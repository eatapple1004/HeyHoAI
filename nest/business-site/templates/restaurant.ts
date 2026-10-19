import { SiteModel, actionBar, addressOf, clip, credits, esc, head, paras, splitHours, stars, TODAY_SCRIPT, telHref, directionsHref } from './shared';

/**
 * 식당·주점·분식 — "간판".
 *   색: 흰 바탕 #FFFFFF, 먹 #201A17, 고추 #B5301F(간판 띠), 겨자 #E0A526(가격·별점), 숯 회색 #6B625D
 *   서체: 검은고딕(Black Han Sans — 한국 간판 글자) 제목 + Pretendard 본문
 *   기억에 남는 것 하나 = 사진 위 왼쪽 아래에 걸린 빨간 간판 띠(가게 이름). 메뉴판은 점선 리더로 정직하게.
 */
export function renderRestaurant(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const [hero, ...rest] = m.photos;
  const css = `
:root{--bg:#FFFFFF;--ink:#201A17;--chili:#B5301F;--mustard:#E0A526;--ash:#6B625D;--line:#E8E2DD}
body{background:var(--bg);color:var(--ink);font:400 17px/1.7 'Pretendard Variable',Pretendard,sans-serif;padding-bottom:72px}
.disp{font-family:'Black Han Sans',sans-serif;font-weight:400}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.hero{position:relative;min-height:min(86vh,760px);display:flex;align-items:flex-end;background:var(--ink) center/cover no-repeat}
.hero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(32,26,23,0) 45%,rgba(32,26,23,.55))}
.hero .sign{position:relative;z-index:1;background:var(--chili);color:#fff;padding:26px 34px 30px;margin:0 0 40px 20px;max-width:min(760px,calc(100% - 40px))}
.hero h1{font:400 clamp(44px,8vw,104px)/1 'Black Han Sans',sans-serif;margin:0;word-break:keep-all}
.hero p{margin:14px 0 0;font-size:19px;opacity:.92;word-break:keep-all}
.bar{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center;padding:20px 0;border-bottom:2px solid var(--ink);font-weight:600}
.bar .rate{color:var(--mustard);letter-spacing:.06em}
.bar a{text-decoration:none}
.bar .go{margin-left:auto;background:var(--ink);color:#fff;padding:12px 20px}
section{padding:76px 0}
h2{font:400 clamp(30px,4vw,46px)/1.15 'Black Han Sans',sans-serif;margin:0 0 26px}
.about{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
.about p{margin:0 0 1em;max-width:34em;word-break:keep-all}
.hl{display:grid;gap:0;margin:0;padding:0;list-style:none;border-top:1px solid var(--line)}
.hl li{padding:16px 0;border-bottom:1px solid var(--line)}
.hl b{font-size:19px}
.hl span{display:block;color:var(--ash)}
.menu{columns:2;column-gap:64px}
.menu .it{break-inside:avoid;padding:14px 0}
.menu .row{display:flex;align-items:baseline;gap:10px;font-weight:700;font-size:19px}
.menu .row i{flex:1;border-bottom:2px dotted #cfc6bf;transform:translateY(-5px)}
.menu .row b{color:var(--chili)}
.menu small{display:block;color:var(--ash);font-size:15px;margin-top:2px}
.gal{display:grid;grid-template-columns:2fr 1fr 1fr;grid-auto-rows:220px;gap:8px}
.gal img{width:100%;height:100%;object-fit:cover}
.gal img:first-child{grid-row:span 2}
.rev{background:var(--ink);color:#fff}
.rev h2{color:#fff}
.rev .sum{font-size:21px;max-width:34em;margin:0 0 34px;word-break:keep-all}
.kw{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 34px;padding:0;list-style:none}
.kw li{border:1.5px solid var(--mustard);color:var(--mustard);padding:6px 14px;font-weight:700;font-size:15px}
.qs{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.qs blockquote{margin:0;border-top:3px solid var(--chili);padding-top:16px}
.qs p{margin:0 0 12px}
.qs cite{font-style:normal;color:#bdb3ad;font-size:14px}
.blogs{list-style:none;padding:0;margin:30px 0 0;display:grid;gap:8px}
.blogs a{color:#fff;text-decoration:none;border-bottom:1px solid var(--chili)}
.info{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.info dl{margin:0}
.info dt{font-weight:800;margin-top:20px}
.info dt:first-child{margin-top:0}
.info dd{margin:4px 0 0;color:var(--ash)}
.hours{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}
.hours li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)}
.hours li.today{background:#FBEFEC;font-weight:800;padding-left:10px;padding-right:10px}
footer{padding:36px 0 64px;color:var(--ash);font-size:14px;border-top:1px solid var(--line)}
.credits{font-size:13px;margin:8px 0 0}
.abar{position:fixed;left:0;right:0;bottom:0;display:none;z-index:20}
.abar a{flex:1;text-align:center;background:var(--ink);color:#fff;text-decoration:none;font-weight:800;padding:18px}
.abar a+a{background:var(--chili)}
@media (max-width:820px){
 .about,.info{grid-template-columns:1fr;gap:28px}
 .menu{columns:1}
 .qs{grid-template-columns:1fr}
 .gal{grid-template-columns:1fr 1fr;grid-auto-rows:160px}
 .gal img:first-child{grid-column:span 2;grid-row:span 1}
 .hero .sign{margin:0 0 24px 12px;padding:20px 22px}
 .bar .go{display:none}
 section{padding:56px 0}
 .abar{display:flex}
}`;
  const fonts = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap';
  const tel = telHref(f.phone);
  const dir = directionsHref(m);

  return `${head(m, fonts, css)}
<header class="hero"${hero ? ` style="background-image:url('${esc(hero.url)}')"` : ''}>
  <div class="sign"><h1>${esc(m.name)}</h1>${c.headline ? `<p>${esc(c.headline)}</p>` : ''}</div>
</header>
<div class="wrap">
  <div class="bar">
    ${f.rating ? `<span><span class="rate">${stars(f.rating)}</span> ${esc(f.rating.toFixed(1))}${f.ratingCount ? ` (${esc(f.ratingCount)})` : ''}</span>` : ''}
    ${addressOf(f) ? `<span>${esc(addressOf(f))}</span>` : ''}
    ${tel ? `<a href="${esc(tel)}">${esc(f.phone)}</a>` : ''}
    ${dir ? `<a class="go" href="${esc(dir)}" target="_blank" rel="noopener">${esc(c.ctaLabel || '길찾기')}</a>` : ''}
  </div>

  ${c.about ? `<section class="about">
    <div><h2>${esc(c.aboutTitle || '이 집 이야기')}</h2>${c.sub ? `<p>${esc(c.sub)}</p>` : ''}${paras(c.about)}</div>
    ${c.highlights?.length ? `<ul class="hl">${c.highlights.map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}
  </section>` : ''}

  ${c.services?.length ? `<section>
    <h2>${esc(c.servicesTitle || '메뉴')}</h2>
    <div class="menu">${c.services.map((s) => `<div class="it"><div class="row"><span>${esc(s.name)}</span><i></i>${s.price ? `<b>${esc(s.price)}</b>` : ''}</div>${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</div>`).join('')}</div>
  </section>` : ''}

  ${rest.length ? `<section aria-label="사진"><div class="gal">${rest.slice(0, 5).map((p) => `<img src="${esc(p.url)}" alt="" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}
</div>

${c.reviewSummary || m.reviews.length ? `<section class="rev"><div class="wrap">
  <h2>${esc(c.reviewTitle || '손님들이 남긴 말')}</h2>
  ${c.reviewSummary ? `<p class="sum">${esc(c.reviewSummary)}</p>` : ''}
  ${c.keywords?.length ? `<ul class="kw">${c.keywords.slice(0, 6).map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
  ${m.reviews.length ? `<div class="qs">${m.reviews.slice(0, 3).map((r) => `<blockquote><p>${esc(clip(r.text, 160))}</p><cite>${esc(r.author)} · ${esc(r.source)} 리뷰${r.rating ? ` ${stars(r.rating)}` : ''}</cite></blockquote>`).join('')}</div>` : ''}
  ${m.blogs.length ? `<ul class="blogs">${m.blogs.slice(0, 4).map((b) => `<li><a href="${esc(b.link)}" target="_blank" rel="nofollow noopener">${esc(b.title)}</a></li>`).join('')}</ul>` : ''}
</div></section>` : ''}

<div class="wrap">
  <section class="info">
    <div><h2>찾아오시는 길</h2><dl>
      ${addressOf(f) ? `<dt>주소</dt><dd>${esc(addressOf(f))}</dd>` : ''}
      ${f.phone ? `<dt>전화</dt><dd><a href="${esc(tel)}">${esc(f.phone)}</a></dd>` : ''}
      ${dir ? `<dt>지도</dt><dd><a href="${esc(dir)}" target="_blank" rel="noopener">지도에서 보기</a></dd>` : ''}
    </dl></div>
    ${f.hours?.length ? `<div><h2>영업시간</h2><ul class="hours">${f.hours.map((h) => { const s = splitHours(h); return `<li data-day="${esc(s.day)}"><span>${esc(s.label)}</span><span>${esc(s.time)}</span></li>`; }).join('')}</ul></div>` : ''}
  </section>
  <footer>© ${esc(m.name)}${credits(m)}</footer>
</div>
${actionBar(m)}
${TODAY_SCRIPT}
</body></html>`;
}
