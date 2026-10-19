import { SiteModel, actionBar, addressOf, clip, credits, esc, head, paras, splitHours, TODAY_SCRIPT, telHref, directionsHref } from './shared';

/**
 * 미용실·네일·피부관리·스파 — "아치".
 *   색: 블러시 그레이지 #F3ECEA 바탕, 자두 #3E2A35 글자, 로즈 #B07D7A, 돌 #DCCFCB, 흰 #FFFFFF
 *   서체: 나눔명조(얇은 제목) + IBM Plex Sans KR(가벼운 본문)
 *   기억에 남는 것 하나 = 사진을 아치(위가 둥근 창) 모양으로 자른 것. 가운데 정렬, 여백 넉넉히.
 */
export function renderBeauty(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const [hero, ...rest] = m.photos;
  const css = `
:root{--bg:#F3ECEA;--ink:#3E2A35;--rose:#B07D7A;--stone:#DCCFCB;--white:#FFFFFF;--mute:#7A6670}
body{background:var(--bg);color:var(--ink);font:300 17px/1.85 'IBM Plex Sans KR',sans-serif;padding-bottom:72px}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.top{text-align:center;padding:28px 0 8px;font:700 19px/1 'Nanum Myeongjo',serif;letter-spacing:.18em}
.hero{text-align:center;padding:28px 0 80px}
.arch{border-radius:999px 999px 0 0;overflow:hidden;background:var(--stone)}
.arch img{width:100%;height:100%;object-fit:cover}
.hero .arch{width:min(440px,82vw);aspect-ratio:3/4;margin:0 auto 40px}
.hero h1{font:400 clamp(32px,5vw,58px)/1.3 'Nanum Myeongjo',serif;margin:0 auto 16px;max-width:15em;word-break:keep-all}
.hero p{color:var(--mute);margin:0 auto 30px;max-width:30em;word-break:keep-all}
.btn{display:inline-block;text-decoration:none;font-weight:500;padding:14px 30px;border-radius:999px;background:var(--ink);color:var(--white);margin:4px}
.btn.line{background:none;color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
section{padding:80px 0;border-top:1px solid var(--stone)}
h2{font:400 clamp(26px,3.4vw,38px)/1.4 'Nanum Myeongjo',serif;margin:0 0 28px;text-align:center;word-break:keep-all}
.about .txt{max-width:36em;margin:0 auto;text-align:center}
.about .txt p{margin:0 0 1em;word-break:keep-all}
.hl{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;list-style:none;margin:48px 0 0;padding:0;text-align:center}
.hl b{display:block;font:700 18px/1.5 'Nanum Myeongjo',serif;margin-bottom:6px}
.hl span{color:var(--mute);font-size:15px}
.price{max-width:680px;margin:0 auto;background:var(--white);padding:40px 44px}
.price div{display:flex;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid var(--stone)}
.price div:last-child{border-bottom:none}
.price b{font-weight:500}
.price small{display:block;color:var(--mute);font-size:14px}
.price .p{color:var(--rose);font-weight:500;white-space:nowrap}
.gal{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.gal .arch{aspect-ratio:3/4}
.rev .sum{max-width:34em;margin:0 auto 40px;text-align:center;font:400 20px/1.8 'Nanum Myeongjo',serif;word-break:keep-all}
.qs{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.qs blockquote{margin:0;background:var(--white);padding:26px}
.qs p{margin:0 0 12px;font-size:15px}
.qs cite{font-style:normal;color:var(--mute);font-size:13px}
.blogs{list-style:none;padding:0;margin:32px auto 0;max-width:680px;text-align:center}
.blogs li{margin:6px 0}
.blogs a{text-decoration:none;border-bottom:1px solid var(--rose)}
.visit{text-align:center}
.visit address{font-style:normal;margin:0 0 6px}
.visit .tel{display:inline-block;margin:0 0 28px;text-decoration:none;border-bottom:1px solid var(--rose)}
.hours{list-style:none;margin:0 auto;padding:0;max-width:420px}
.hours li{display:flex;justify-content:space-between;padding:8px 0;color:var(--mute);border-bottom:1px solid var(--stone)}
.hours li.today{color:var(--ink);font-weight:500}
footer{text-align:center;padding:40px 0 60px;color:var(--mute);font-size:13px}
.credits{font-size:12px;margin:8px 0 0}
.abar{position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:8px;z-index:20}
.abar a{flex:1;text-align:center;background:var(--ink);color:#fff;text-decoration:none;font-weight:500;padding:15px;border-radius:999px}
.abar a+a{background:var(--rose)}
@media (max-width:820px){
 .hl,.qs{grid-template-columns:1fr;gap:20px}
 .gal{grid-template-columns:1fr 1fr;gap:12px}
 .price{padding:24px}
 section{padding:56px 0}
 .hero .btns{display:none}
 .abar{display:flex}
}`;
  const fonts = 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;500&display=swap';
  const tel = telHref(f.phone);
  const dir = directionsHref(m);

  return `${head(m, fonts, css)}
<div class="wrap">
<div class="top">${esc(m.name)}</div>
<section class="hero" style="border-top:none">
  ${hero ? `<div class="arch"><img src="${esc(hero.url)}" alt="${esc(m.name)}" fetchpriority="high"></div>` : ''}
  <h1>${esc(c.headline || m.name)}</h1>
  ${c.sub ? `<p>${esc(c.sub)}</p>` : ''}
  <div class="btns">${tel ? `<a class="btn" href="${esc(tel)}">${esc(c.ctaLabel || '예약 전화')}</a>` : ''}${dir ? `<a class="btn line" href="${esc(dir)}" target="_blank" rel="noopener">오시는 길</a>` : ''}</div>
</section>

${c.about ? `<section class="about">
  <h2>${esc(c.aboutTitle || '소개')}</h2>
  <div class="txt">${paras(c.about)}</div>
  ${c.highlights?.length ? `<ul class="hl">${c.highlights.slice(0, 3).map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}
</section>` : ''}

${c.services?.length ? `<section>
  <h2>${esc(c.servicesTitle || '시술 안내')}</h2>
  <div class="price">${c.services.map((s) => `<div><span><b>${esc(s.name)}</b>${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</span>${s.price ? `<span class="p">${esc(s.price)}</span>` : ''}</div>`).join('')}</div>
</section>` : ''}

${rest.length ? `<section aria-label="사진"><div class="gal">${rest.slice(0, 6).map((p) => `<div class="arch"><img src="${esc(p.url)}" alt="" loading="lazy" decoding="async"></div>`).join('')}</div></section>` : ''}

${c.reviewSummary || m.reviews.length ? `<section class="rev">
  <h2>${esc(c.reviewTitle || '고객 후기')}</h2>
  ${c.reviewSummary ? `<p class="sum">${esc(c.reviewSummary)}</p>` : ''}
  ${m.reviews.length ? `<div class="qs">${m.reviews.slice(0, 3).map((r) => `<blockquote><p>${esc(clip(r.text, 140))}</p><cite>${esc(r.author)} · ${esc(r.source)} 리뷰</cite></blockquote>`).join('')}</div>` : ''}
  ${m.blogs.length ? `<ul class="blogs">${m.blogs.slice(0, 4).map((b) => `<li><a href="${esc(b.link)}" target="_blank" rel="nofollow noopener">${esc(b.title)}</a></li>`).join('')}</ul>` : ''}
</section>` : ''}

<section class="visit">
  <h2>오시는 길</h2>
  ${addressOf(f) ? `<address>${esc(addressOf(f))}</address>` : ''}
  ${f.phone ? `<a class="tel" href="${esc(tel)}">${esc(f.phone)}</a>` : ''}
  ${f.hours?.length ? `<ul class="hours">${f.hours.map((h) => { const s = splitHours(h); return `<li data-day="${esc(s.day)}"><span>${esc(s.label)}</span><span>${esc(s.time)}</span></li>`; }).join('')}</ul>` : ''}
</section>
<footer>© ${esc(m.name)}${credits(m)}</footer>
</div>
${actionBar(m)}
${TODAY_SCRIPT}
</body></html>`;
}
