import { SiteModel, actionBar, addressOf, credits, esc, head, paras, splitHours, TODAY_SCRIPT, telHref, directionsHref } from './shared';

/**
 * 병원·의원·치과·한의원·약국 — "진료 안내판".
 *   색: 흰 #FFFFFF, 남색 #12304D, 청록 #1F8A8A, 안개 #EAF3F6, 선 #D3E2EA
 *   서체: Pretendard 한 가지(400/600/800) — 읽기 쉬움이 곧 신뢰
 *   기억에 남는 것 하나 = 첫 화면 오른쪽의 진료시간 패널(오늘 요일 강조). 환자가 제일 먼저 찾는 정보가 맨 위.
 *   ⚠️ 의료광고 규정: 효과·치료 결과 단정, 비교·최상급, 후기 이용 유인 금지 — 리뷰 인용을 싣지 않고 요약도 쓰지 않는다.
 */
export function renderClinic(m: SiteModel): string {
  const c = m.content;
  const f = m.facts;
  const [hero, ...rest] = m.photos;
  const css = `
:root{--bg:#FFFFFF;--ink:#12304D;--teal:#1F8A8A;--mist:#EAF3F6;--line:#D3E2EA;--mute:#4F6577}
body{background:var(--bg);color:var(--ink);font:400 17px/1.7 'Pretendard Variable',Pretendard,sans-serif;padding-bottom:72px}
.wrap{max-width:1160px;margin:0 auto;padding:0 20px}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid var(--line)}
.top b{font-size:20px;font-weight:800}
.top a{font-weight:700;color:var(--teal);text-decoration:none;font-size:18px}
.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:40px;padding:56px 0 64px}
.hero h1{font-size:clamp(34px,4.6vw,56px);line-height:1.25;font-weight:800;margin:0 0 18px;letter-spacing:-.02em;word-break:keep-all}
.hero p{font-size:19px;color:var(--mute);margin:0 0 30px;max-width:30em;word-break:keep-all}
.hero .ph img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:16px;margin-top:32px}
.btn{display:inline-block;text-decoration:none;font-weight:700;padding:15px 26px;border-radius:12px;background:var(--teal);color:#fff;margin:0 8px 8px 0}
.btn.line{background:var(--mist);color:var(--ink)}
.panel{background:var(--mist);border-radius:16px;padding:28px;align-self:start}
.panel h2{font-size:20px;margin:0 0 14px}
.hours{list-style:none;margin:0;padding:0}
.hours li{display:flex;justify-content:space-between;gap:12px;padding:9px 12px;border-radius:8px;color:var(--mute);font-size:16px}
.hours li.today{background:#fff;color:var(--ink);font-weight:700;box-shadow:inset 3px 0 0 var(--teal)}
.panel .tel{display:block;margin-top:18px;font-size:24px;font-weight:800;color:var(--ink);text-decoration:none}
.panel .addr{color:var(--mute);font-size:15px;margin:6px 0 0}
section{padding:72px 0;border-top:1px solid var(--line)}
section h2{font-size:clamp(26px,3vw,34px);font-weight:800;margin:0 0 24px;letter-spacing:-.01em}
.about{display:grid;grid-template-columns:.8fr 1.2fr;gap:48px}
.about p{margin:0 0 1em;max-width:36em;word-break:keep-all}
.svc{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.svc div{border:1px solid var(--line);border-radius:12px;padding:22px}
.svc b{display:block;font-size:18px;margin-bottom:6px}
.svc span{color:var(--mute);font-size:15px}
.svc .p{display:block;margin-top:10px;color:var(--teal);font-weight:700;font-size:15px}
.hl{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;list-style:none;padding:0;margin:0}
.hl b{display:block;font-size:18px;margin-bottom:4px}
.hl span{color:var(--mute);font-size:15px}
.gal{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px}
footer{padding:36px 0 64px;color:var(--mute);font-size:14px;border-top:1px solid var(--line)}
.credits{font-size:13px;margin:8px 0 0}
.abar{position:fixed;left:0;right:0;bottom:0;display:none;z-index:20;background:#fff;border-top:1px solid var(--line);padding:10px;gap:8px}
.abar a{flex:1;text-align:center;background:var(--teal);color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:12px}
.abar a+a{background:var(--mist);color:var(--ink)}
@media (max-width:860px){
 .hero,.about{grid-template-columns:1fr;gap:28px}
 .hero{padding-top:32px}
 .svc,.hl{grid-template-columns:1fr}
 .gal{grid-template-columns:1fr 1fr}
 section{padding:52px 0}
 .hero .btns{display:none}
 .abar{display:flex}
}`;
  const tel = telHref(f.phone);
  const dir = directionsHref(m);

  return `${head(m, '', css)}
<div class="wrap">
<header class="top"><b>${esc(m.name)}</b>${tel ? `<a href="${esc(tel)}">${esc(f.phone)}</a>` : ''}</header>
<section class="hero" style="border-top:none">
  <div>
    <h1>${esc(c.headline || m.name)}</h1>
    ${c.sub ? `<p>${esc(c.sub)}</p>` : ''}
    <div class="btns">${tel ? `<a class="btn" href="${esc(tel)}">${esc(c.ctaLabel || '전화 예약')}</a>` : ''}${dir ? `<a class="btn line" href="${esc(dir)}" target="_blank" rel="noopener">오시는 길</a>` : ''}</div>
    ${hero ? `<div class="ph"><img src="${esc(hero.url)}" alt="${esc(m.name)}" fetchpriority="high"></div>` : ''}
  </div>
  <aside class="panel">
    <h2>진료시간</h2>
    ${f.hours?.length ? `<ul class="hours">${f.hours.map((h) => { const s = splitHours(h); return `<li data-day="${esc(s.day)}"><span>${esc(s.label)}</span><span>${esc(s.time)}</span></li>`; }).join('')}</ul>` : '<p class="addr">진료시간은 전화로 확인해 주세요.</p>'}
    ${f.phone ? `<a class="tel" href="${esc(tel)}">${esc(f.phone)}</a>` : ''}
    ${addressOf(f) ? `<p class="addr">${esc(addressOf(f))}</p>` : ''}
  </aside>
</section>

${c.services?.length ? `<section>
  <h2>${esc(c.servicesTitle || '진료 과목')}</h2>
  <div class="svc">${c.services.map((s) => `<div><b>${esc(s.name)}</b>${s.desc ? `<span>${esc(s.desc)}</span>` : ''}${s.price ? `<span class="p">${esc(s.price)}</span>` : ''}</div>`).join('')}</div>
</section>` : ''}

${c.about ? `<section class="about">
  <h2>${esc(c.aboutTitle || '병원 소개')}</h2>
  <div>${paras(c.about)}</div>
</section>` : ''}

${c.highlights?.length ? `<section><ul class="hl">${c.highlights.slice(0, 3).map((h) => `<li><b>${esc(h.title)}</b><span>${esc(h.body)}</span></li>`).join('')}</ul></section>` : ''}

${rest.length ? `<section aria-label="병원 둘러보기"><h2>둘러보기</h2><div class="gal">${rest.slice(0, 6).map((p) => `<img src="${esc(p.url)}" alt="" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}

<section>
  <h2>오시는 길</h2>
  ${addressOf(f) ? `<p>${esc(addressOf(f))}</p>` : ''}
  ${dir ? `<p><a class="btn line" href="${esc(dir)}" target="_blank" rel="noopener">지도에서 보기</a></p>` : ''}
</section>
<footer>© ${esc(m.name)}${credits({ ...m, reviews: [], blogs: [] })}</footer>
</div>
${actionBar(m)}
${TODAY_SCRIPT}
</body></html>`;
}
