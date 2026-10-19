import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 화면 점검 — 실제 브라우저(Playwright chromium headless shell)로 페이지를 PC(1440)·모바일(390) 폭에서 그려 보고 잰다.
 *   - 가로 넘침: 화면 밖으로 나가는 요소(모바일 레이아웃 붕괴, 머리말 버튼 밀림)
 *   - 글자 대비: 글자색과 실제 배경색의 대비가 4.5:1(큰 글자 3:1) 미만
 *   - 깨진 이미지
 *   - 첫 화면 캡처(PC·모바일) → tmp/images 에 저장해 관리자 화면에 보여 준다
 * ⚠️ dev 서버에만 브라우저가 설치돼 있다(같은 EC2에 prd·staging이 같이 돈다). 브라우저가 없으면 점검을 건너뛴다.
 *   메모리 때문에 한 번에 하나만 돈다(모듈 잠금), 점검이 끝나면 브라우저를 바로 닫는다.
 */

export interface VisualItem { level: 'fail' | 'warn' | 'ok'; area: string; msg: string; path?: string }
export interface VisualReport { items: VisualItem[]; shots: { label: string; url: string }[]; skipped?: string; ms: number }

let busy: Promise<unknown> = Promise.resolve();

/** pages: 경로 → 완성된 HTML. 상대 주소(/images/…)는 이 서버(127.0.0.1:PORT) 기준으로 풀린다 */
export async function visualCheck(pages: { path: string; html: string }[], opts: { shotPaths?: string[] } = {}): Promise<VisualReport> {
  const run = busy.then(() => doCheck(pages, opts));
  busy = run.catch(() => undefined);
  return run;
}

async function doCheck(pages: { path: string; html: string }[], opts: { shotPaths?: string[] }): Promise<VisualReport> {
  const t0 = Date.now();
  let chromium: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    chromium = require('playwright-core').chromium;
  } catch {
    return { items: [], shots: [], skipped: 'playwright-core 없음', ms: 0 };
  }
  let browser: any;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  } catch (e: any) {
    // staging·prd 처럼 브라우저를 설치하지 않은 서버
    return { items: [], shots: [], skipped: `브라우저를 띄우지 못함: ${String(e?.message || e).split('\n')[0].slice(0, 160)}`, ms: Date.now() - t0 };
  }
  const items: VisualItem[] = [];
  const shots: { label: string; url: string }[] = [];
  const origin = `http://127.0.0.1:${env.PORT}`;
  const dir = path.join(process.cwd(), 'tmp', 'images');
  fs.mkdirSync(dir, { recursive: true });
  try {
    for (const vp of [{ name: 'PC', width: 1440, height: 900 }, { name: '모바일', width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
      const page = await ctx.newPage();
      // 바깥 요청 차단 — 폰트(Google·jsdelivr)와 이 서버만. 지도(OSM)는 느리고 점검 대상이 아니라 막는다
      await page.route('**/*', (route: any) => {
        const u = route.request().url();
        return /^(http:\/\/127\.0\.0\.1:|https:\/\/fonts\.(googleapis|gstatic)\.com|https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus)/.test(u) || u.startsWith('data:') ? route.continue() : route.abort();
      });
      await page.goto(`${origin}/health`, { timeout: 15000 });
      for (const pg of pages) {
        const where = pg.path || '/';
        try {
          await page.setContent(pg.html, { waitUntil: 'load', timeout: 20000 });
          await page.waitForTimeout(150);
          const r = await page.evaluate(MEASURE);
          if (r.overflow > 1) {
            items.push({ level: 'fail', area: `${vp.name} 가로 넘침`, msg: `${where}: 화면보다 ${r.overflow}px 넓음 — ${r.wide.slice(0, 3).join(' / ')}`, path: pg.path });
          }
          for (const c of r.contrast.slice(0, 3)) {
            items.push({ level: c.ratio < 3 ? 'fail' : 'warn', area: `${vp.name} 글자 대비`, msg: `${where}: "${c.text}" ${c.ratio.toFixed(1)}:1 (글자 ${c.fg} / 배경 ${c.bg})`, path: pg.path });
          }
          if (r.brokenImgs) items.push({ level: 'fail', area: '깨진 이미지', msg: `${where}: ${r.brokenImgs}장`, path: pg.path });
          if ((opts.shotPaths || ['']).includes(pg.path)) {
            const file = `qa-${randomUUID()}.jpg`;
            await page.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 70 });
            shots.push({ label: `${vp.name} ${where}`, url: `/images/${file}` });
          }
        } catch (e: any) {
          items.push({ level: 'warn', area: '화면 점검', msg: `${where} (${vp.name}) 점검 실패: ${String(e?.message || e).split('\n')[0].slice(0, 120)}`, path: pg.path });
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
  for (const area of ['PC 가로 넘침', '모바일 가로 넘침', 'PC 글자 대비', '모바일 글자 대비']) {
    if (!items.some((i) => i.area === area)) items.push({ level: 'ok', area, msg: `${pages.length}개 페이지 문제 없음` });
  }
  return { items, shots, ms: Date.now() - t0 };
}

/**
 * 브라우저 안에서 도는 측정 — 문자열로 넘긴다(서버 번들과 분리).
 *   대비: 글자를 가진 보이는 요소마다 글자색과, 조상으로 올라가며 처음 만나는 불투명 배경색을 비교.
 *   배경 이미지(사진 위 글자)를 만나면 판단할 수 없어 건너뛴다.
 */
const MEASURE = `(() => {
  const W = window.innerWidth;
  const de = document.documentElement;
  const overflow = Math.max(de.scrollWidth, document.body.scrollWidth) - W;
  const wide = [];
  if (overflow > 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > W + 1 && !el.closest('[aria-hidden="true"]')) {
        const name = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
        const t = (el.innerText || '').trim().slice(0, 20);
        wide.push(name + (t ? ' "' + t + '"' : ''));
        if (wide.length > 6) break;
      }
    }
  }
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0.85) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const ratioOf = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
  const stackBg = (el) => {
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const stack = document.elementsFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
    const i = stack.indexOf(el);
    for (const e of stack.slice(i < 0 ? 0 : i)) {
      if (/^(IMG|VIDEO|CANVAS|IFRAME|PICTURE|SVG)$/i.test(e.tagName)) return null;
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0.85) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const seen = new Set(); const contrast = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
    own = own.trim();
    if (own.length < 2) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.3) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.closest('.dp-pv,[aria-hidden="true"]')) continue;
    const fg = parse(s.color); let bg = bgOf(el);
    if (!fg || !bg) continue;
    const size = parseFloat(s.fontSize); const bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    let ratio = ratioOf(fg, bg);
    if (ratio < need) {
      // 조상 배경만 보면 겹쳐 놓인 요소(사진 위 로고·글자)를 잘못 본다 — 그 자리에 실제로 깔린 것으로 다시 잰다
      bg = stackBg(el);
      if (!bg) continue;
      ratio = ratioOf(fg, bg);
    }
    if (ratio < need) {
      const key = hex(fg) + hex(bg);
      if (seen.has(key)) continue;
      seen.add(key);
      contrast.push({ text: own.slice(0, 24), ratio, fg: hex(fg), bg: hex(bg) });
    }
  }
  contrast.sort((a, b) => a.ratio - b.ratio);
  window.scrollTo(0, 0);
  const brokenImgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length;
  return { overflow: Math.round(overflow), wide, contrast, brokenImgs };
})()`;
