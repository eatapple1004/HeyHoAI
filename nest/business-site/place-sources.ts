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
const PAGE_HINT = /(company|about|intro|summary|greeting|ceo|history|vision|business|product|service|certif|patent|contact|location|sub\/|회사|소개|연혁|인사|사업|제품|인증|오시는)/i;

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
   *   의뢰 회사 자신의 사이트라 글을 AI 자료로 쓰는 건 괜찮지만, 사진은 가져오지 않는다(원본은 회사에서 받는다).
   */
  async website(raw: string): Promise<{ url: string; pages: WebPage[] } | null> {
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
    const home = await get(base.href);
    if (!home) throw new Error('홈페이지를 열지 못했습니다');
    const links = [...home.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => {
      try { return new URL(m[1], base).href; } catch { return ''; }
    }).filter((h) => h && new URL(h).hostname === base.hostname && !/\.(jpe?g|png|gif|pdf|zip|hwp|docx?)$/i.test(h));
    // 회사소개·연혁·인증 페이지를 먼저, 같은 페이지의 쿼리 변형(제품 상세 ?it_id=…)은 경로당 2개까지만
    const score = (h: string) => (/(summary|about|intro|company|회사|소개)/i.test(h) ? 5 : 0) + (/(history|연혁)/i.test(h) ? 5 : 0)
      + (/(greeting|ceo|인사)/i.test(h) ? 4 : 0) + (/(certif|patent|인증|특허)/i.test(h) ? 4 : 0)
      + (/(business|product|prod|사업|제품)/i.test(h) ? 2 : 0) + (/(contact|location|오시는)/i.test(h) ? 1 : 0) - (new URL(h).search ? 1 : 0);
    const perPath = new Map<string, number>();
    const picked = [...new Set(links)].filter((h) => h !== base.href && PAGE_HINT.test(h))
      .sort((a, b) => score(b) - score(a))
      .filter((h) => { const k = new URL(h).pathname; const n = perPath.get(k) || 0; perPath.set(k, n + 1); return n < 2; })
      .slice(0, 10);
    const pages: WebPage[] = [{ url: base.href, ...htmlToText(home) }];
    for (const url of picked) {
      const html = await get(url);
      if (html) pages.push({ url, ...htmlToText(html) });
    }
    // 페이지마다 같은 메뉴·푸터 줄이 반복된다 — 세 페이지 이상에 나온 줄은 뺀다
    const count = new Map<string, number>();
    pages.forEach((p) => new Set(p.text.split('\n')).forEach((l) => count.set(l, (count.get(l) || 0) + 1)));
    const common = pages.length >= 3 ? new Set([...count].filter(([, n]) => n >= 3).map(([l]) => l)) : new Set<string>();
    return {
      url: base.href,
      pages: pages.map((p) => ({ ...p, text: p.text.split('\n').filter((l) => !common.has(l)).join('\n').slice(0, 4000) })),
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
