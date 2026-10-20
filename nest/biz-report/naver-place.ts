import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 네이버 플레이스 리뷰 — 네이버는 플레이스 리뷰 공식 API가 없다(2026-10 조사). 외부 수집 서비스 ReefAPI 를 부른다.
 *   ⚠️ 공식 API가 아니다 — "공식 API만" 원칙의 예외로 사업자가 결정(2026-10-21, 방법 ⑤). 키(REEF_API_KEY)가 있을 때만 동작하고,
 *      화면에는 "외부 수집"으로 출처를 따로 적는다. 우리 서버가 네이버를 직접 긁지 않는다.
 *   흐름: resolve(이름 → place_id, 후보) → 카카오 주소·좌표와 맞는 후보만 채택 → detail(평점) → reviews(별점 분포·최근 리뷰)
 *   진단 1회 3크레딧. 응답 필드 이름이 문서와 조금 달라도 읽히게 여러 이름을 본다.
 */

const BASE = 'https://api.reefapi.com/naver/v1';

async function call(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45000);
  try {
    const res = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'x-api-key': env.REEF_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || j.ok === false) throw new Error(`ReefAPI ${endpoint} ${res.status} ${String(j?.error?.message || j?.error || '').slice(0, 120)}`);
    return j.data || {};
  } finally { clearTimeout(t); }
}

export const naverPlaceAvailable = () => Boolean(env.REEF_API_KEY);

const num = (v: unknown) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const addrKey = (a: string) => String(a || '').replace(/\s+/g, '').replace(/^(서울특별시|서울시|서울)/, '서울').replace(/(\d+)(-\d+)?(번지)?.*/, '$1$2');

function pick(c: any) {
  return {
    placeId: String(c.place_id ?? c.id ?? ''), name: String(c.name ?? ''),
    address: String(c.road_address ?? c.address ?? c.short_address ?? ''), jibun: String(c.jibun_address ?? ''),
    lat: num(c.latitude ?? c.lat ?? c.y), lng: num(c.longitude ?? c.lng ?? c.x), reviewCount: num(c.review_count),
  };
}

/** 카카오가 고른 장소와 같은 곳인가 — 도로명/지번 주소 앞부분이 같거나 150m 안 */
function same(c: ReturnType<typeof pick>, target: { roadAddress: string; address: string; lat?: number; lng?: number }) {
  // 네이버 카드 주소는 "강남대로 465 (서초동)"처럼 시·구가 빠지기도 한다 — 끝부분(도로명+번호)이 같으면 같은 곳
  const a = addrKey(c.address); const j = addrKey(c.jibun); const t = addrKey(target.roadAddress); const tj = addrKey(target.address);
  const tail = (x: string, y: string) => Boolean(x && y && x.length >= 4 && y.length >= 4 && (x.endsWith(y) || y.endsWith(x)));
  if (tail(a, t) || tail(j, tj)) return true;
  if (c.lat && c.lng && target.lat && target.lng) {
    const d = Math.hypot((c.lat - target.lat) * 111320, (c.lng - target.lng) * 111320 * Math.cos((target.lat * Math.PI) / 180));
    return d < 150;
  }
  return false;
}

export async function naverPlaceReviews(target: { name: string; roadAddress: string; address: string; lat?: number; lng?: number }) {
  const r = await call('place/resolve', { query: target.name });
  const cands = [pick(r), ...((r.candidates || r.rejected || []) as any[]).map(pick)].filter((c) => c.placeId);
  const hit = cands.find((c) => same(c, target));
  if (!hit) return { matched: false as const, tried: cands.slice(0, 5).map((c) => `${c.name} — ${c.address}`) };
  const [d, rv] = await Promise.all([call('place/detail', { place_id: hit.placeId }), call('place/reviews', { place_id: hit.placeId, limit: 20 })]);
  const place = d.place || d;
  const list = (rv.reviews || rv.items || []) as any[];
  const dist = rv.star_distribution || rv.rating_distribution || rv.stats?.distribution || null;
  return {
    matched: true as const,
    placeId: hit.placeId, name: hit.name || place.name, address: hit.address,
    url: `https://map.naver.com/p/entry/place/${hit.placeId}`,
    rating: num(place.rating ?? place.visitor_rating ?? rv.rating ?? rv.average_rating),
    visitorReviews: num(rv.total ?? rv.total_count ?? place.visitor_review_count ?? place.review_count ?? hit.reviewCount),
    blogReviews: num(place.blog_review_count ?? rv.blog_review_count),
    starDist: dist && typeof dist === 'object' ? Object.fromEntries(Object.entries(dist).map(([k, v]) => [String(k).replace(/\D/g, ''), num(v) || 0]).filter(([k]) => k)) : null,
    keywords: ((rv.keywords || rv.keyword_stats || place.keywords || []) as any[]).slice(0, 10).map((k) => (typeof k === 'string' ? { label: k, count: null } : { label: String(k.label ?? k.name ?? k.keyword ?? ''), count: num(k.count ?? k.votes) })).filter((k) => k.label),
    recent: list.slice(0, 12).map((x) => ({ rating: num(x.rating ?? x.score), text: String(x.body ?? x.text ?? x.content ?? '').slice(0, 400), when: String(x.visit_date ?? x.visited ?? x.created ?? x.date ?? ''), keywords: (x.keywords || x.selected_keywords || []).slice?.(0, 5) || [] })).filter((x) => x.text),
    provider: 'ReefAPI(외부 수집)', fetchedAt: new Date().toISOString(),
  };
}
