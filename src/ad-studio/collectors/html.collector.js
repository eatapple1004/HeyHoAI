const { URL } = require('url');

/**
 * html.collector — 브라우저 없이 HTML만 받아 제품 정보를 긁는다.
 * ============================================================================
 * 가장 싸고 빠르지만 **JS로 그리는 쇼핑몰에는 무력하다.** 서버가 주는 최초 HTML만 보기 때문에
 * React/Vue로 렌더하는 상세페이지는 빈 껍데기로 온다. 그래서 성공 판정을 엄격히 하고
 * (제품명 + 이미지 1장 이상), 실패하면 상위 라우터가 다음 수집기로 넘긴다.
 *
 * 실측(2026-08-14): 쿠팡 403(봇 차단) · 스마트스토어 SPA 셸. 자사몰·SEO 잘 된 몰은 og 태그가
 * 서버 렌더로 오는 경우가 많아 이 경로로 처리된다.
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12_000;
const MAX_IMAGES = 6;
const MAX_HTML = 2_000_000;   // 2MB 넘는 문서는 앞부분만 본다(메타·본문 상단이면 충분)

/** <meta property="og:x" content="y"> / name= 둘 다. 속성 순서가 뒤바뀐 경우도 잡는다. */
function meta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return '';
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function absolutize(src, base) {
  try { return new URL(src, base).href; } catch { return null; }
}

/** 추적 픽셀·아이콘·로고를 걸러낸다 — 제품 이미지만 남겨야 vision이 헛짚지 않는다. */
const JUNK_IMAGE = /(sprite|icon|logo|favicon|pixel|blank|dummy|loading|placeholder|1x1|spacer|banner_ad)/i;

function extractImages(html, baseUrl) {
  const urls = [];
  const push = (raw) => {
    if (!raw || raw.startsWith('data:')) return;
    const abs = absolutize(raw.split('?')[0], baseUrl);
    if (!abs || JUNK_IMAGE.test(abs)) return;
    if (!/\.(jpe?g|png|webp|avif)$/i.test(abs)) return;
    if (!urls.includes(abs)) urls.push(abs);
  };

  const og = meta(html, 'og:image');
  if (og) push(og);

  // 지연로딩 쇼핑몰이 많아 data-src 계열을 src보다 먼저 본다.
  for (const attr of ['data-src', 'data-original', 'data-lazy-src', 'src']) {
    const re = new RegExp(`<img[^>]+${attr}=["']([^"']+)["']`, 'gi');
    let m;
    while ((m = re.exec(html)) && urls.length < MAX_IMAGES * 3) push(m[1]);
  }
  return urls.slice(0, MAX_IMAGES);
}

/** JSON-LD Product — 있으면 가장 신뢰도가 높다(구조화 데이터라 파싱 오차가 없다). */
function fromJsonLd(html) {
  const out = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const n of nodes) {
      if (!n || String(n['@type'] || '').toLowerCase() !== 'product') continue;
      if (n.name) out.name = String(n.name).trim();
      if (n.description) out.description = String(n.description).trim();
      const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      if (offer && offer.price) out.price = `${offer.price}${offer.priceCurrency ? ' ' + offer.priceCurrency : ''}`;
      const img = Array.isArray(n.image) ? n.image : (n.image ? [n.image] : []);
      if (img.length) out.images = img.filter((x) => typeof x === 'string');
      if (out.name) return out;   // Product 하나면 충분
    }
  }
  return out;
}

/** ₩12,900 / 12,900원 / KRW 12900 — 본문에서 가장 먼저 보이는 가격 표기 */
function guessPrice(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const m = text.match(/(?:₩|KRW\s*)([0-9][0-9,]{2,})|([0-9][0-9,]{2,})\s*원/);
  if (!m) return '';
  return (m[1] || m[2]).replace(/,$/, '');
}

const htmlCollector = {
  name: 'html',

  async collect(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : `fetch 실패: ${e.message}` };
    }
    clearTimeout(timer);

    if (!res.ok) {
      // 403·429는 봇 차단 — 브라우저 수집기로 넘겨야 한다(상위 라우터가 판단하도록 명시)
      return { ok: false, reason: `HTTP ${res.status}`, blocked: res.status === 403 || res.status === 429 };
    }

    const html = (await res.text()).slice(0, MAX_HTML);
    const finalUrl = res.url || url;

    const ld = fromJsonLd(html);
    const name = ld.name || meta(html, 'og:title') || (html.match(/<title[^>]*>([^<]*)</i)?.[1] || '').trim();
    const description = ld.description || meta(html, 'og:description') || '';
    const price = ld.price || guessPrice(html);

    const images = [];
    for (const u of (ld.images || [])) {
      const abs = absolutize(u, finalUrl);
      if (abs && !images.includes(abs)) images.push(abs);
    }
    for (const u of extractImages(html, finalUrl)) {
      if (!images.includes(u)) images.push(u);
    }

    // 성공 기준을 엄격히 — 이름·이미지가 없으면 SPA 셸을 받은 것이다.
    if (!name || !images.length) {
      return { ok: false, reason: 'JS 렌더 페이지로 보임(제품명·이미지 없음)', needsBrowser: true };
    }

    // ⚠️ og:title이 **사이트명**인 경우가 흔하다(29CM "감도 깊은 취향 셀렉트샵 29CM", Apple "Apple (KR)").
    //   이걸 제품명으로 받아들이면 대본이 "29CM를 소개합니다"가 된다. 반드시 걸러야 한다.
    //   og:site_name이 없는 사이트도 많아(29CM 실측) 호스트명에서 상호 토큰을 뽑아 함께 본다.
    const hostToken = (() => {
      try {
        const parts = new URL(finalUrl).hostname.toLowerCase()
          .replace(/^(www|m|shop|store|product)\./, '').split('.');
        return parts[0] || '';
      } catch { return ''; }
    })();
    const siteName = meta(html, 'og:site_name');
    const cleaned = decodeEntities(name).trim();
    const lower = cleaned.toLowerCase();
    const looksLikeSiteName =
      (!!siteName && (lower === siteName.toLowerCase().trim()
        || lower.replace(/\s+/g, '') === siteName.toLowerCase().replace(/\s+/g, '')
        || (lower.includes(siteName.toLowerCase().trim()) && cleaned.length <= siteName.trim().length + 12)))
      || (hostToken.length >= 3 && lower.includes(hostToken));

    // 제품 페이지라는 **양성 신호** — 구조화 데이터의 제품명 또는 가격.
    //   홈·카테고리 페이지에는 둘 다 없는 게 보통이다.
    const hasProductSignal = !!ld.name || !!price;
    if (!hasProductSignal && looksLikeSiteName) {
      return {
        ok: false,
        reason: `제품 페이지로 보이지 않음(제목="${cleaned.slice(0, 26)}", 가격 없음)`,
        needsBrowser: true,
      };
    }

    return {
      ok: true,
      collector: 'html',
      data: {
        url: finalUrl,
        name: decodeEntities(name).slice(0, 300),
        description: decodeEntities(description).slice(0, 2000),
        price: String(price || '').slice(0, 40),
        images: images.slice(0, MAX_IMAGES),
        screenshots: [],   // 이 수집기는 스크린샷을 못 찍는다
      },
    };
  },
};

module.exports = htmlCollector;
