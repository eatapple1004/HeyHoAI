import { SiteModel, actionBar, addressOf, clip, credits, esc, head, paras, splitHours, TODAY_SCRIPT, telHref, directionsHref } from './shared';

/**
 * 카페·베이커리·디저트 — "창가 자리".
 *   색: 세이지 안개 #EEF2EC 바탕, 숲 잉크 #23302A, 버터 #EFC94C(히어로 사진 뒤 블록 하나에만), 잎 #7E9C86, 종이 #FFFFFF
 *   서체: 고운바탕(제목·인용) + Pretendard(본문)
 *   기억에 남는 것 하나 = 히어로 사진 뒤로 비켜 놓인 버터색 블록. 나머지는 조용히.
 */
export function renderCafe(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const [hero, ...rest] = m.photos;
  const css = `
:root{--bg:#EEF2EC;--ink:#23302A;--butter:#EFC94C;--leaf:#7E9C86;--paper:#FFFFFF;--soft:#5A6A61}
body{background:var(--bg);color:var(--ink);font:400 17px/1.75 'Pretendard Variable',Pretendard,sans-serif;padding-bottom:72px}
.serif{font-family:'Gowun Batang',serif}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
header.top{display:flex;justify-content:space-between;align-items:center;padding:20px 0}
header.top b{font:700 20px/1 'Gowun Batang',serif}
header.top a{font-size:15px;text-decoration:none;border-bottom:1px solid var(--leaf)}
.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;padding:32px 0 88px}
.hero h1{font:700 clamp(40px,6.4vw,84px)/1.12 'Gowun Batang',serif;margin:0 0 22px;letter-spacing:-.01em;word-break:keep-all}
.hero p{font-size:19px;color:var(--soft);max-width:30em;margin:0 0 30px;word-break:keep-all}
.hero .ph{position:relative}
.hero .ph::before{content:'';position:absolute;inset:28px -22px -22px 28px;background:var(--butter);border-radius:4px}
.hero .ph img{position:relative;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:4px}
.btn{display:inline-block;background:var(--ink);color:var(--paper);text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px;margin-right:10px}
.btn.line{background:none;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
section{padding:72px 0}
h2{font:700 clamp(28px,3.6vw,40px)/1.3 'Gowun Batang',serif;margin:0 0 20px;word-break:keep-all}
.about{display:grid;grid-template-columns:1fr 1.3fr;gap:56px}
.about .txt p{margin:0 0 1em;max-width:34em;word-break:keep-all}
.hl{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:18px}
.hl li{padding-left:18px;border-left:3px solid var(--leaf)}
.hl b{display:block;font-size:18px}
.hl span{color:var(--soft);font-size:16px}
.strip{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 20px 20px;margin:0 -20px}
.strip img{flex:none;width:min(300px,72vw);aspect-ratio:3/4;object-fit:cover;border-radius:4px;scroll-snap-align:start}
.menu{background:var(--paper);border-radius:4px;padding:40px;display:grid;grid-template-columns:repeat(2,1fr);gap:22px 48px}
.menu div{display:flex;justify-content:space-between;gap:16px;border-bottom:1px dotted #c9d3cc;padding-bottom:12px}
.menu small{display:block;color:var(--soft);font-size:14px}
.reviews .sum{font:400 22px/1.7 'Gowun Batang',serif;max-width:32em;margin:0 0 36px;word-break:keep-all}
.quotes{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
blockquote{margin:0;font-size:16px}
blockquote p{margin:0 0 10px}
blockquote cite{font-style:normal;color:var(--soft);font-size:14px}
.blogs{margin:32px 0 0;padding:0;list-style:none;display:grid;gap:8px}
.blogs a{text-decoration:none;border-bottom:1px solid var(--leaf)}
.visit{display:grid;grid-template-columns:1fr 1fr;gap:40px;background:var(--paper);border-radius:4px;padding:44px}
.visit dt{font-weight:700;margin-top:18px}
.visit dt:first-child{margin-top:0}
.visit dd{margin:4px 0 0;color:var(--soft)}
.hours{list-style:none;margin:0;padding:0}
.hours li{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e3e9e4;color:var(--soft)}
.hours li.today{color:var(--ink);font-weight:700}
footer{padding:40px 0 60px;color:var(--soft);font-size:14px}
.credits{font-size:13px;color:var(--soft);margin:8px 0 0}
.abar{position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:8px;z-index:20}
.abar a{flex:1;text-align:center;background:var(--ink);color:#fff;text-decoration:none;font-weight:700;padding:15px;border-radius:999px}
.abar a+a{background:var(--butter);color:var(--ink)}
@media (max-width:820px){
 .hero,.about,.visit{grid-template-columns:1fr;gap:32px}
 .hero{padding-top:8px}
 .hero .ph::before{inset:18px -10px -10px 18px}
 .quotes,.menu{grid-template-columns:1fr}
 .menu,.visit{padding:26px}
 section{padding:52px 0}
 .abar{display:flex}
 .hero .btns{display:none}
}`;
  const fonts = 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap';
  const tel = telHref(f.phone);
  const dir = directionsHref(m);

  return `${head(m, fonts, css)}
<div class="wrap">
<header class="top"><b>${esc(m.name)}</b>${tel ? `<a href="${esc(tel)}">${esc(f.phone)}</a>` : ''}</header>
<section class="hero" style="padding-top:24px">
  <div>
    <h1>${esc(c.headline || m.name)}</h1>
    ${c.sub ? `<p>${esc(c.sub)}</p>` : ''}
    <div class="btns">${dir ? `<a class="btn" href="${esc(dir)}" target="_blank" rel="noopener">${esc(c.ctaLabel || '찾아오는 길')}</a>` : ''}${tel ? `<a class="btn line" href="${esc(tel)}">전화하기</a>` : ''}</div>
  </div>
  ${hero ? `<div class="ph"><img src="${esc(hero.url)}" alt="${esc(m.name)}" fetchpriority="high"></div>` : ''}
</section>

${c.about ? `<section class="about">
  <h2>${esc(c.aboutTitle || '우리 가게 이야기')}</h2>
  <div class="txt">${paras(c.about)}
  ${c.highlights?.length ? `<ul class="hl">${c.highlights.map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}</div>
</section>` : ''}

${rest.length ? `<section aria-label="사진"><div class="strip">${rest.map((p) => `<img src="${esc(p.url)}" alt="" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}

${c.services?.length ? `<section>
  <h2>${esc(c.servicesTitle || '메뉴')}</h2>
  <div class="menu">${c.services.map((s) => `<div><span>${esc(s.name)}${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</span>${s.price ? `<b>${esc(s.price)}</b>` : ''}</div>`).join('')}</div>
</section>` : ''}

${c.reviewSummary || m.reviews.length ? `<section class="reviews">
  <h2>${esc(c.reviewTitle || '다녀간 분들의 이야기')}</h2>
  ${c.reviewSummary ? `<p class="sum">${esc(c.reviewSummary)}</p>` : ''}
  ${m.reviews.length ? `<div class="quotes">${m.reviews.slice(0, 3).map((r) => `<blockquote><p class="serif">“${esc(clip(r.text, 150))}”</p><cite>${esc(r.author)} · ${esc(r.source)} 리뷰</cite></blockquote>`).join('')}</div>` : ''}
  ${m.blogs.length ? `<ul class="blogs">${m.blogs.slice(0, 4).map((b) => `<li><a href="${esc(b.link)}" target="_blank" rel="nofollow noopener">${esc(b.title)}</a></li>`).join('')}</ul>` : ''}
</section>` : ''}

<section>
  <h2>오시는 길</h2>
  <div class="visit">
    <dl>
      ${addressOf(f) ? `<dt>주소</dt><dd>${esc(addressOf(f))}</dd>` : ''}
      ${f.phone ? `<dt>전화</dt><dd><a href="${esc(tel)}">${esc(f.phone)}</a></dd>` : ''}
      ${dir ? `<dt>지도</dt><dd><a href="${esc(dir)}" target="_blank" rel="noopener">지도에서 보기</a></dd>` : ''}
    </dl>
    ${f.hours?.length ? `<ul class="hours">${f.hours.map((h) => { const s = splitHours(h); return `<li data-day="${esc(s.day)}"><span>${esc(s.label)}</span><span>${esc(s.time)}</span></li>`; }).join('')}</ul>` : ''}
  </div>
</section>

<footer>© ${esc(m.name)}${credits(m)}</footer>
</div>
${actionBar(m)}
${TODAY_SCRIPT}
</body></html>`;
}
