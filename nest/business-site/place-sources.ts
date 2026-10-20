import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 사업체 홈페이지 자료 수집 — **공식 API만** 쓴다(크롤링 금지: 네이버 플레이스·구글 리뷰 페이지 긁기는 약관 위반).
 *
 *   카카오 로컬   : 장소명·주소·전화·분류·카카오맵 링크·좌표 (사진·리뷰는 API에 없다)
 *   Google Places : 사진·리뷰(최대 5개)·평점·영업시간·웹사이트 — 사진·리뷰는 **작성자 표기 필수**
 *   네이버 검색   : 지역(분류·주소) + 블로그 후기 제목·요약 — 블로그는 링크로만 내보낸다(본문 복제 X)
 *
 * 키가 없는 출처는 조용히 건너뛴다(available()로 화면에 "키 없음"을 보여준다).
 */

const TIMEOUT_MS = 10000;

export interface KakaoPlace {
  id: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  roadAddress: string;
  x: string;
  y: string;
  url: string;
}

export interface GooglePlaceSummary {
  id: string;
  name: string;
  address: string;
  rating?: number;
  ratingCount?: number;
}

export interface GooglePhoto {
  /** places/<id>/photos/<ref> — 화면에는 우리 프록시(/site/:slug/photo/:n)로만 나간다(키 노출 방지) */
  name: string;
  width?: number;
  height?: number;
  authors: { name: string; uri?: string }[];
}

export interface GoogleReview {
  author: string;
  authorUri?: string;
  rating?: number;
  text: string;
  when?: string;
}

export interface GooglePlaceDetail extends GooglePlaceSummary {
  phone?: string;
  website?: string;
  mapsUrl?: string;
  type?: string;
  summary?: string;
  hours?: string[];
  lat?: number;
  lng?: number;
  photos: GooglePhoto[];
  reviews: GoogleReview[];
}

export interface NaverLocal {
  name: string;
  category: string;
  phone: string;
  address: string;
  roadAddress: string;
  link: string;
}

export interface WebPage { url: string; title: string; text: string }
/** 기존 홈페이지의 본문 이미지 — 조사 단계에서 AI가 글 이미지(옮겨 적기)와 사진(가져오기)으로 나눈다 */
export interface WebImage { url: string; page: string; alt?: string; /** 이미지 바로 뒤 글(제품명 등) */ near?: string }

export interface NaverBlog {
  title: string;
  snippet: string;
  link: string;
  blogger: string;
  date: string;
}

async function getJson(url: string, init: RequestInit = {}): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(t);
  }
}

/** 네이버 검색 결과의 <b>강조</b>·엔티티 제거 */
const stripTags = (s: string) => String(s || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
  .trim();


/** 사이트 글 추출 — 스크립트·스타일·메뉴 반복을 걷어내고 본문 글자만 */
function htmlToText(html: string): { title: string; text: string } {
  const title = (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || '').trim();
  const text = html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1).join('\n');
  return { title, text };
}

/** 회사 사이트 안에서 회사소개·연혁·제품 쪽 링크를 먼저 고른다 */
const PAGE_HINT = /(company|about|intro|summary|greeting|ceo|history|vision|business|product|service|certif|patent|contact|location|sub\/|회사|소개|연혁|인사|사업|제품|인증|오시는|story|menu|restaurant|store|shop|info|brand|매장|메뉴|이야기|브랜드)/i;

/** SSRF 방지 — 공개 도메인만(IP 직접·내부 이름 차단). 관리자 전용 기능이지만 서버가 대신 요청하므로 막는다 */
function publicHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':') || !h.includes('.')) return null;
    return u;
  } catch { return null; }
}

export const sources = {
  available() {
    return {
      kakao: Boolean(env.KAKAO_REST_KEY),
      google: Boolean(env.GOOGLE_PLACES_API_KEY),
      naver: Boolean((env.NAVER_HUB_KEY_ID && env.NAVER_HUB_KEY) || (env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET)),
    };
  },

  // ── 카카오 ──
  async kakaoSearch(query: string): Promise<KakaoPlace[]> {
    if (!env.KAKAO_REST_KEY) return [];
    const j = await getJson(
      `https://dapi.kakao.com/v2/local/search/keyword.json?size=8&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` } });
    return (j.documents || []).map((d: any) => ({
      id: d.id, name: d.place_name, category: d.category_name, phone: d.phone,
      address: d.address_name, roadAddress: d.road_address_name, x: d.x, y: d.y, url: d.place_url,
    }));
  },

  // ── Google Places (New) ──
  async googleSearch(query: string): Promise<GooglePlaceSummary[]> {
    if (!env.GOOGLE_PLACES_API_KEY) return [];
    const j = await getJson('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'ko', regionCode: 'KR', pageSize: 6 }),
    });
    return (j.places || []).map((p: any) => ({
      id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '',
      rating: p.rating, ratingCount: p.userRatingCount,
    }));
  },

  async googleDetail(placeId: string): Promise<GooglePlaceDetail | null> {
    if (!env.GOOGLE_PLACES_API_KEY || !/^[\w-]+$/.test(placeId)) return null;
    const fields = [
      'id', 'displayName', 'formattedAddress', 'nationalPhoneNumber', 'rating', 'userRatingCount',
      'regularOpeningHours', 'websiteUri', 'googleMapsUri', 'primaryTypeDisplayName', 'editorialSummary',
      'location', 'photos', 'reviews',
    ].join(',');
    const p = await getJson(`https://places.googleapis.com/v1/places/${placeId}?languageCode=ko&regionCode=KR`, {
      headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': fields },
    });
    return {
      id: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      rating: p.rating,
      ratingCount: p.userRatingCount,
      phone: p.nationalPhoneNumber,
      website: p.websiteUri,
      mapsUrl: p.googleMapsUri,
      type: p.primaryTypeDisplayName?.text,
      summary: p.editorialSummary?.text,
      hours: p.regularOpeningHours?.weekdayDescriptions,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      photos: (p.photos || []).slice(0, 10).map((ph: any) => ({
        name: ph.name, width: ph.widthPx, height: ph.heightPx,
        authors: (ph.authorAttributions || []).map((a: any) => ({ name: a.displayName, uri: a.uri })),
      })),
      reviews: (p.reviews || []).map((r: any) => ({
        author: r.authorAttribution?.displayName || 'Google 사용자',
        authorUri: r.authorAttribution?.uri,
        rating: r.rating,
        text: r.text?.text || r.originalText?.text || '',
        when: r.relativePublishTimeDescription,
      })).filter((r: GoogleReview) => r.text),
    };
  },

  /** 사진 바이트 — 공개 페이지의 프록시가 부른다. 키를 브라우저에 넘기지 않으려고 서버가 대신 받는다 */
  async googlePhoto(name: string, maxWidth = 1600): Promise<{ buf: Buffer; type: string } | null> {
    if (!env.GOOGLE_PLACES_API_KEY || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return null;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${env.GOOGLE_PLACES_API_KEY}`,
        { signal: ctl.signal });
      if (!res.ok) return null;
      return { buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || 'image/jpeg' };
    } finally {
      clearTimeout(t);
    }
  },


  // ── 회사 기존 홈페이지 ──
  /**
   * 첫 화면 + 같은 도메인의 회사소개·연혁·제품 페이지(최대 8개)의 글을 모은다.
   *   의뢰 회사 자신의 사이트라 글을 AI 자료로 쓴다. 본문 이미지 주소도 모아 두고, 조사 단계에서
   *   글 이미지는 옮겨 적고 사진은 사업체 사진으로 가져온다(고객 검토에서 사용 여부를 확인받는다).
   */
  async website(raw: string): Promise<{ url: string; pages: WebPage[]; images: WebImage[] } | null> {
    const base = publicHttpUrl(String(raw || '').trim());
    if (!base) return null;
    const get = async (url: string) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (DoppiaSiteBuilder)' } });
        if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        // 오래된 국내 사이트는 EUC-KR 이 많다
        const head = buf.subarray(0, 2048).toString('latin1');
        const enc = /charset=["']?(euc-kr|ks_c_5601-1987|cp949)/i.test(head + (res.headers.get('content-type') || '')) ? 'euc-kr' : 'utf-8';
        return new TextDecoder(enc).decode(buf);
      } catch { return null; } finally { clearTimeout(t); }
    };
    let home = await get(base.href);
    if (!home) throw new Error('홈페이지를 열지 못했습니다');
    // 옛 사이트는 첫 화면이 프레임 껍데기다 — 글이 거의 없고 같은 도메인 프레임이 있으면 그 안을 첫 화면으로
    let homeUrl = base;
    const frame = [...home.matchAll(/<i?frame[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).find((x) => !/^(about|javascript):/i.test(x));
    if (frame && htmlToText(home).text.length < 300) {
      try {
        const fu = new URL(frame, base);
        const inner = fu.hostname === base.hostname ? await get(fu.href) : null;
        if (inner) { home = inner; homeUrl = fu; }
      } catch { /* 프레임 주소가 이상하면 껍데기 그대로 */ }
    }
    // 세션 파라미터(PHPSESSID 등)는 지운다 — 같은 페이지가 여러 주소로 보이지 않게
    const clean = (h: string) => {
      const u = new URL(h);
      [...u.searchParams.keys()].filter((k) => /sess|^sid$/i.test(k)).forEach((k) => u.searchParams.delete(k));
      u.hash = '';
      return u.href;
    };
    const linksOf = (html: string, from: URL) => [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => {
      try { return clean(new URL(m[1].replace(/&amp;/g, '&'), from).href); } catch { return ''; }
    }).filter((h) => h && new URL(h).hostname === base.hostname && !/\.(jpe?g|png|gif|pdf|zip|hwp|docx?|css|js)$/i.test(h) && !/login|member|bkoff|admin|\/(en|jp|cn|eng|jpn|chn)\//i.test(h));
    const links = linksOf(home, homeUrl);
    // 회사소개·연혁·인증 페이지를 먼저, 같은 페이지의 쿼리 변형(제품 상세 ?it_id=…)은 경로당 2개까지만
    const score = (h: string) => (/(summary|about|intro|company|회사|소개)/i.test(h) ? 5 : 0) + (/(history|연혁)/i.test(h) ? 5 : 0)
      + (/(greeting|ceo|인사)/i.test(h) ? 4 : 0) + (/(certif|patent|인증|특허)/i.test(h) ? 4 : 0)
      + (/(business|product|prod|사업|제품)/i.test(h) ? 2 : 0) + (/(contact|location|오시는)/i.test(h) ? 1 : 0) - (new URL(h).search ? 1 : 0)
      // 가게 사이트 — 메뉴판·매장 안내·가게 이야기(2026-10-20 명동교자: /menu/·/restaurant/·/story/ 를 못 읽었다)
      + (/(menu|메뉴)/i.test(h) ? 4 : 0) + (/(story|brand|이야기|브랜드)/i.test(h) ? 4 : 0) + (/(restaurant|store|shop|매장|info)/i.test(h) ? 2 : 0)
      - (/(recruit|career|채용|board|notice|공지)/i.test(h) ? 4 : 0);
    // 제품 목록은 분류(?ctg=…)마다 다른 제품이 있어 경로당 12개까지, 나머지는 2개
    const perPath = new Map<string, number>();
    const pick = (list: string[], seen: Set<string>, max: number) => [...new Set(list)].filter((h) => h !== homeUrl.href && !seen.has(h) && (PAGE_HINT.test(h) || /facility|gallery|설비|갤러리/i.test(h)))
      .sort((a, b) => score(b) - score(a))
      .filter((h) => { const k = new URL(h).pathname; const n = perPath.get(k) || 0; perPath.set(k, n + 1); return n < (/(product|prod|제품)/i.test(k) ? 12 : 2); })
      .slice(0, max);
    const picked = pick(links, new Set(), 24);
    const pages: WebPage[] = [{ url: homeUrl.href, ...htmlToText(home) }];
    const images = new Map<string, WebImage>();
    // 페이지당 10장까지 — 인증서 스캔 같은 한 페이지의 이미지 묶음이 제품 사진 자리를 다 먹지 않게
    const takeImages = (html: string, pageUrl: string) => {
      let n = 0;
      for (const m of html.matchAll(/<img[^>]+>/gi)) {
        if (n >= 10) break;
        const src = /src=["']([^"']+)["']/i.exec(m[0])?.[1];
        if (!src || !/\.(jpe?g|png|gif|webp)(\?|$)/i.test(src)) continue;
        // 메뉴·버튼·제목 글자·아이콘 이미지는 뺀다. "menu"는 파일 이름에서만 본다 — 식당의 메뉴 사진 폴더(/menu/…)까지 빼지 않게
        if (/(btn|button|title|icon|banner|bullet|arrow|blank|spacer|common|location|logo|top_|bg_|_bg|ctg_|quick|sns|footer|header)/i.test(src)) continue;
        // 상단 메뉴 버튼 이미지(nav0101.gif 등)는 파일 이름으로 뺀다. 식당 메뉴 사진(menu01.jpg)은 남기고, 작은 버튼은 가져올 때 크기로 걸러진다
        if (/^(gnb|lnb|nav)[\d_-]/i.test(src.split('/').pop() || '')) continue;
        try {
          const u = new URL(src, pageUrl);
          if (u.hostname !== base.hostname) continue;
          // 게시판 썸네일(…/thumb/104x104_100/…) → 원본
          u.pathname = u.pathname.replace(/\/thumb\/[^/]+\//i, '/');
          if (images.has(u.href)) continue;
          // 목록형 페이지는 이미지 바로 뒤에 제품명이 온다 — 사진과 제품을 짝짓는 단서
          const after = html.slice((m.index || 0) + m[0].length, (m.index || 0) + m[0].length + 800);
          const near = htmlToText(after.replace(/<img[\s\S]*$/i, '').replace(/^[^<]*>/, '')).text.split('\n')
            .find((l) => l.length > 1 && l.length <= 80 && !/[<>]|untitled document/i.test(l));
          images.set(u.href, { url: u.href, page: pageUrl, alt: (/alt=["']([^"']*)["']/i.exec(m[0])?.[1] || '').slice(0, 80) || undefined, near });
          n++;
        } catch { /* 깨진 주소 */ }
      }
    };
    takeImages(home, homeUrl.href);
    // 슬라이드 배경 사진 — <img>가 아니라 스크립트 배열·CSS background 로 넣는 사이트가 많다(명동교자: bgStretcher 의 1310px 매장 사진).
    //   첫 화면에서만, 같은 도메인 사진 파일만 8장까지
    let bgN = 0;
    for (const m of home.matchAll(/["'(]([^"'()\s<>]+\.(?:jpe?g|png|webp))["')]/gi)) {
      if (bgN >= 8) break;
      if (/(btn|button|icon|logo|arrow|bullet|blank|spacer|sns|popup)/i.test(m[1])) continue;
      try {
        const u = new URL(m[1], homeUrl);
        if (u.hostname !== base.hostname || images.has(u.href)) continue;
        images.set(u.href, { url: u.href, page: homeUrl.href, alt: undefined, near: undefined });
        bgN++;
      } catch { /* 깨진 주소 */ }
    }
    // 첫 화면 링크만 따라가면 하위 메뉴(연혁·메뉴 상세)를 놓친다 — 읽은 페이지의 링크도 한 단계 더(전체 24쪽까지)
    const fetched = new Set<string>([homeUrl.href]);
    const deeper: string[] = [];
    for (const url of picked) {
      const html = await get(url);
      fetched.add(url);
      if (html) { pages.push({ url, ...htmlToText(html) }); takeImages(html, url); deeper.push(...linksOf(html, new URL(url))); }
    }
    for (const url of pick(deeper, new Set([...fetched, ...picked]), 24 - pages.length + 1)) {
      const html = await get(url);
      if (html) { pages.push({ url, ...htmlToText(html) }); takeImages(html, url); }
    }
    // 페이지마다 같은 메뉴·푸터 줄이 반복된다 — 세 페이지 이상에 나온 줄은 뺀다
    const count = new Map<string, number>();
    pages.forEach((p) => new Set(p.text.split('\n')).forEach((l) => count.set(l, (count.get(l) || 0) + 1)));
    const common = pages.length >= 3 ? new Set([...count].filter(([, n]) => n >= 3).map(([l]) => l)) : new Set<string>();
    return {
      url: base.href,
      pages: pages.map((p) => ({ ...p, text: p.text.split('\n').filter((l) => !common.has(l)).join('\n').slice(0, 4000) })),
      images: [...images.values()].slice(0, 120),
    };
  },

  // ── 네이버 ──
  /**
   * 네이버 검색 호출 주소 — 2026-07-31부터 신규 키는 NAVER API HUB에서만 나온다.
   *   HUB: naverapihub.apigw.ntruss.com/search/v1/<kind> + X-NCP-APIGW-API-KEY(-ID) (경로의 v1 위치가 뒤로 옮겨감)
   *   구 개발자센터: openapi.naver.com/v1/search/<kind>.json + X-Naver-Client-Id/Secret (2027-06-30 종료)
   *   요청 파라미터·응답 구조는 같다.
   */
  naverRequest(kind: 'local' | 'blog', qs: string): [string, Record<string, string>] {
    if (env.NAVER_HUB_KEY_ID && env.NAVER_HUB_KEY) {
      return [`https://naverapihub.apigw.ntruss.com/search/v1/${kind}?${qs}`,
        { 'X-NCP-APIGW-API-KEY-ID': env.NAVER_HUB_KEY_ID, 'X-NCP-APIGW-API-KEY': env.NAVER_HUB_KEY }];
    }
    return [`https://openapi.naver.com/v1/search/${kind}.json?${qs}`,
      { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET }];
  },

  async naverLocal(query: string): Promise<NaverLocal[]> {
    if (!this.available().naver) return [];
    const [url, headers] = this.naverRequest('local', `display=5&query=${encodeURIComponent(query)}`);
    const j = await getJson(url, { headers });
    return (j.items || []).map((i: any) => ({
      name: stripTags(i.title), category: i.category, phone: i.telephone,
      address: i.address, roadAddress: i.roadAddress, link: i.link,
    }));
  },

  async naverBlogs(query: string): Promise<NaverBlog[]> {
    if (!this.available().naver) return [];
    const [url, headers] = this.naverRequest('blog', `display=15&sort=sim&query=${encodeURIComponent(query)}`);
    const j = await getJson(url, { headers });
    return (j.items || []).map((i: any) => ({
      title: stripTags(i.title), snippet: stripTags(i.description), link: i.link,
      blogger: i.bloggername, date: i.postdate,
    }));
  },
};
