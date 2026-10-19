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
