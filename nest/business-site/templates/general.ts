import { SiteModel, actionBar, addressOf, clip, credits, esc, head, paras, splitHours, stars, TODAY_SCRIPT, telHref, directionsHref } from './shared';

/**
 * 매장·공방·학원·서비스 일반 — "큰 이름".
 *   색: 흰 #FFFFFF, 잉크 #1C2230, 코발트 #2C55D6, 안개 #EEF1F6, 회색 #5B6475
 *   서체: Gothic A1(800, 촘촘한 큰 제목) + Pretendard 본문
 *   기억에 남는 것 하나 = 화면 폭을 꽉 채우는 가게 이름. 그 아래 사진 세 장 모자이크. 나머지는 왼쪽 정렬로 단정하게.
 */
export function renderGeneral(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const ph = m.photos;
  const css = `
:root{--bg:#FFFFFF;--ink:#1C2230;--cobalt:#2C55D6;--fog:#EEF1F6;--gray:#5B6475}
body{background:var(--bg);color:var(--ink);font:400 17px/1.7 'Pretendard Variable',Pretendard,sans-serif;padding-bottom:72px}
.wrap{max-width:1200px;margin:0 auto;padding:0 20px}
.top{display:flex;justify-content:space-between;align-items:center;padding:20px 0;font-weight:600}
.top a{text-decoration:none;color:var(--cobalt)}
.name{font:800 clamp(48px,11vw,150px)/.98 'Gothic A1',sans-serif;letter-spacing:-.045em;margin:24px 0 20px;word-break:keep-all}
.lead{display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px 40px;align-items:end;margin-bottom:36px}
.lead p{font-size:20px;color:var(--gray);margin:0;max-width:30em;word-break:keep-all}
.lead strong{display:block;color:var(--ink);font-size:22px;margin-bottom:6px}
.btn{display:inline-block;text-decoration:none;font-weight:700;padding:15px 26px;border-radius:8px;background:var(--cobalt);color:#fff;margin-left:8px}
.btn.line{background:var(--fog);color:var(--ink)}
.mosaic{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:260px 260px;gap:10px}
.mosaic img{width:100%;height:100%;object-fit:cover;border-radius:8px}
.mosaic img:first-child{grid-row:span 2}
.mosaic.one{grid-template-columns:1fr;grid-template-rows:520px}
.mosaic.one img:first-child{grid-row:auto}
section{padding:80px 0}
h2{font:800 clamp(28px,3.6vw,42px)/1.2 'Gothic A1',sans-serif;letter-spacing:-.03em;margin:0 0 24px;word-break:keep-all}
.about{display:grid;grid-template-columns:1fr 1fr;gap:56px}
.about p{margin:0 0 1em;max-width:34em;word-break:keep-all}
.hl{list-style:none;margin:0;padding:0;display:grid;gap:22px}
.hl b{display:block;font-size:19px}
.hl span{color:var(--gray)}
.svc{display:grid;grid-template-columns:repeat(2,1fr);gap:0 48px}
.svc div{display:flex;justify-content:space-between;gap:16px;padding:18px 0;border-top:1px solid #dfe3ea}
.svc b{font-size:18px}
.svc small{display:block;color:var(--gray);font-size:15px}
.svc .p{font-weight:700;white-space:nowrap}
.rev{background:var(--fog)}
.rev .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:16px;margin-bottom:28px}
.rev .score{font:800 44px/1 'Gothic A1',sans-serif}
.rev .score small{display:block;font:400 15px/1.4 'Pretendard Variable',sans-serif;color:var(--gray);margin-top:6px}
.rev .sum{font-size:20px;max-width:36em;margin:0 0 32px;word-break:keep-all}
.qs{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.qs blockquote{margin:0;background:#fff;border-radius:8px;padding:24px}
.qs p{margin:0 0 12px;font-size:16px}
.qs cite{font-style:normal;color:var(--gray);font-size:14px}
.blogs{list-style:none;padding:0;margin:28px 0 0;display:grid;gap:8px}
.blogs a{text-decoration:none;color:var(--cobalt)}
.visit{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.visit dl{margin:0}
.visit dt{font-weight:700;margin-top:18px}
.visit dt:first-child{margin-top:0}
.visit dd{margin:4px 0 0;color:var(--gray)}
.hours{list-style:none;margin:0;padding:0}
.hours li{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e3e7ee;color:var(--gray)}
.hours li.today{color:var(--cobalt);font-weight:700}
footer{padding:36px 0 64px;color:var(--gray);font-size:14px;border-top:1px solid #e3e7ee}
.credits{font-size:13px;margin:8px 0 0}
.abar{position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:8px;z-index:20}
.abar a{flex:1;text-align:center;background:var(--cobalt);color:#fff;text-decoration:none;font-weight:700;padding:15px;border-radius:8px}
.abar a+a{background:var(--ink)}
@media (max-width:820px){
 .about,.visit{grid-template-columns:1fr;gap:28px}
 .svc,.qs{grid-template-columns:1fr}
 .mosaic{grid-template-columns:1fr 1fr;grid-template-rows:240px 140px}
 .mosaic img:first-child{grid-column:span 2;grid-row:auto}
 .mosaic.one{grid-template-rows:300px}
 .lead .btns{display:none}
 section{padding:56px 0}
 .abar{display:flex}
}`;
  const fonts = 'https://fonts.googleapis.com/css2?family=Gothic+A1:wght@800&display=swap';
  const tel = telHref(f.phone);
  const dir = directionsHref(m);
  const mosaic = ph.slice(0, 3);
  const more = ph.slice(3);

  return `${head(m, fonts, css)}
<div class="wrap">
<header class="top"><span>${esc(f.category?.split('>').pop()?.trim() || '')}</span>${tel ? `<a href="${esc(tel)}">${esc(f.phone)}</a>` : ''}</header>
<h1 class="name">${esc(m.name)}</h1>
<div class="lead">
  <p>${c.headline ? `<strong>${esc(c.headline)}</strong>` : ''}${esc(c.sub || '')}</p>
  <div class="btns">${tel ? `<a class="btn" href="${esc(tel)}">${esc(c.ctaLabel || '문의하기')}</a>` : ''}${dir ? `<a class="btn line" href="${esc(dir)}" target="_blank" rel="noopener">길찾기</a>` : ''}</div>
</div>
${mosaic.length ? `<div class="mosaic${mosaic.length < 3 ? ' one' : ''}">${(mosaic.length < 3 ? mosaic.slice(0, 1) : mosaic).map((p, i) => `<img src="${esc(p.url)}" alt="${i ? '' : esc(m.name)}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">`).join('')}</div>` : ''}

${c.about ? `<section class="about">
  <div><h2>${esc(c.aboutTitle || '소개')}</h2>${paras(c.about)}</div>
  ${c.highlights?.length ? `<ul class="hl">${c.highlights.map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul>` : ''}
</section>` : ''}

${c.services?.length ? `<section>
  <h2>${esc(c.servicesTitle || '서비스')}</h2>
  <div class="svc">${c.services.map((s) => `<div><span><b>${esc(s.name)}</b>${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</span>${s.price ? `<span class="p">${esc(s.price)}</span>` : ''}</div>`).join('')}</div>
</section>` : ''}

${more.length ? `<section aria-label="사진"><div class="mosaic" style="grid-template-rows:220px 220px">${more.slice(0, 3).map((p) => `<img src="${esc(p.url)}" alt="" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}
</div>

${c.reviewSummary || m.reviews.length ? `<section class="rev"><div class="wrap">
  <div class="head"><h2 style="margin:0">${esc(c.reviewTitle || '이용하신 분들의 후기')}</h2>
  ${f.rating ? `<div class="score">${esc(f.rating.toFixed(1))}<small>${stars(f.rating)}${f.ratingCount ? ` · Google 리뷰 ${esc(f.ratingCount)}개` : ''}</small></div>` : ''}</div>
  ${c.reviewSummary ? `<p class="sum">${esc(c.reviewSummary)}</p>` : ''}
  ${m.reviews.length ? `<div class="qs">${m.reviews.slice(0, 3).map((r) => `<blockquote><p>${esc(clip(r.text, 160))}</p><cite>${esc(r.author)} · ${esc(r.source)} 리뷰</cite></blockquote>`).join('')}</div>` : ''}
  ${m.blogs.length ? `<ul class="blogs">${m.blogs.slice(0, 4).map((b) => `<li><a href="${esc(b.link)}" target="_blank" rel="nofollow noopener">${esc(b.title)}</a></li>`).join('')}</ul>` : ''}
</div></section>` : ''}

<div class="wrap">
<section class="visit">
  <div><h2>오시는 길</h2><dl>
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
