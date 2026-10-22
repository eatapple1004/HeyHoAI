import { sources, NaverLocal } from './place-sources';

/**
 * 네이버 묶음 검색 — 홈페이지 조사(기획안 근거)·마케팅 진단·AI 마케팅 팀이 반드시 거치는 단계(2026-10-22 사용자 결정: 네이버 필수).
 *   지역(플레이스 등록 여부·전화)·블로그(후기)·웹문서·뉴스·카페를 한 번에 찾는다. 공식 API(NAVER API HUB)만 쓴다.
 *   키가 없거나 한 번 다시 해도 실패하면 오류를 던진다 — 조용히 건너뛰지 않는다.
 *   검색 결과에는 이름만 같은 남의 글이 섞이므로 제목·요약에 가게 이름(지점이면 지점명까지)이 있는 글만 남긴다.
 */

export interface NaverItem { title: string; snippet: string; link: string; date: string; by: string }
export interface NaverPack {
  at: string;
  query: string;
  brand: string;
  branch: string;
  local: (NaverLocal & { match: boolean })[];
  blog: { total: number; items: NaverItem[]; reviews: NaverItem[] };
  web: NaverItem[];
  news: { total: number; items: NaverItem[] };
  cafe: { total: number; items: NaverItem[] };
}

/** 가게 이름을 브랜드와 지점으로 — "명동교자 명동역점 신관 본점" → 명동교자(본점), "뚜레쥬르 송도아트윈점" → 뚜레쥬르 + 송도아트윈 */
export function splitName(n: string) {
  const t = String(n || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim().split(/\s+/).filter(Boolean);
  const i = t.findIndex((w, j) => j > 0 && /(점|관)$/.test(w));
  const brand = (i > 0 ? t.slice(0, i) : t).join(' ');
  const tail = i > 0 ? t.slice(i) : [];
  const flagship = !tail.length || tail.includes('본점');
  return { brand, flagship, branch: flagship ? '' : tail[0].replace(/(지점|점)$/, '') };
}
export const squash = (n: string) => String(n || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');

const REVIEW_WORDS = /(후기|리뷰|방문|다녀|먹었|먹어|맛|솔직|웨이팅|재방문|추천|내돈내산)/;

async function twice<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 800)); return fn(); }
}

/** name: 가게 이름(카카오 이름 그대로 가능), address: 주소(동네·주소 일치 확인용) */
export async function naverPack(name: string, address = ''): Promise<NaverPack> {
  if (!sources.available().naver) throw new Error('네이버 검색은 필수 단계입니다 — 네이버 검색 키(NAVER_HUB_KEY_ID/NAVER_HUB_KEY)가 없어 진행할 수 없습니다.');
  const nm = splitName(name);
  const dong = String(address).split(/\s+/).find((w) => /[동읍면가]$/.test(w) && w.length > 1) || '';
  const where = nm.branch || dong;
  const hit = (i: { title: string; snippet: string }) => {
    const t = squash(`${i.title} ${i.snippet}`);
    return t.includes(squash(nm.brand)) && (!nm.branch || t.includes(squash(nm.branch)));
  };
  const q = nm.branch ? `"${nm.brand}" ${nm.branch}` : `"${nm.brand}"`;
  try {
    const [local, blog, web, news, cafe] = await Promise.all([
      twice(() => sources.naverLocal(`${nm.brand} ${where}`.trim())),
      twice(() => sources.naverSearch('blog', q, { display: 50, sort: 'sim' })),
      twice(() => sources.naverSearch('webkr', `${nm.brand} ${where}`.trim(), { display: 15 })),
      twice(() => sources.naverSearch('news', q, { display: 15, sort: 'date' })),
      twice(() => sources.naverSearch('cafearticle', q, { display: 15, sort: 'sim' })),
    ]);
    const tail = squash(String(address).split(/\s+/).slice(-2).join(''));
    const blogs = blog.items.filter(hit);
    return {
      at: new Date().toISOString(), query: q, brand: nm.brand, branch: nm.branch,
      // 같은 장소인지 — 이름이 들어 있고 주소 끝(번지)이 같으면
      local: local.map((l) => ({ ...l, match: squash(l.name).includes(squash(nm.brand)) && !!tail && squash(`${l.roadAddress} ${l.address}`).includes(tail) })),
      blog: { total: blog.total, items: blogs.slice(0, 20), reviews: blogs.filter((i) => REVIEW_WORDS.test(`${i.title} ${i.snippet}`)).slice(0, 12) },
      web: web.items.filter(hit).slice(0, 10),
      news: { total: news.total, items: news.items.filter(hit).slice(0, 8) },
      cafe: { total: cafe.total, items: cafe.items.filter(hit).slice(0, 8) },
    };
  } catch (e: any) {
    throw new Error(`네이버 검색은 필수 단계입니다 — 네이버 검색에 실패했습니다(${String(e?.message || e).slice(0, 120)}). 잠시 뒤 다시 하세요.`);
  }
}

/** AI 프롬프트에 넣을 글 — 출처 주소를 붙인다 */
export function naverText(p: NaverPack): string {
  const line = (i: NaverItem) => `- ${i.date ? `${i.date.slice(0, 4)}-${i.date.slice(4, 6)}-${i.date.slice(6, 8)} ` : ''}${i.title} — ${i.snippet.slice(0, 160)} (${i.link})`;
  const loc = p.local.filter((l) => l.match);
  return [
    `검색어: ${p.query}`,
    `네이버 지도(플레이스) 등록: ${loc.length ? loc.map((l) => `${l.name} · ${l.roadAddress || l.address} · ${l.category}${l.phone ? ` · ${l.phone}` : ''}`).join(' / ') : '이름·주소가 맞는 장소를 찾지 못함'}`,
    `블로그 글 전체 ${p.blog.total}건 중 가게 이름이 든 글 표본:`, ...p.blog.items.slice(0, 12).map(line),
    `웹문서:`, ...(p.web.length ? p.web.map(line) : ['- 없음']),
    `뉴스(전체 ${p.news.total}건):`, ...(p.news.items.length ? p.news.items.map(line) : ['- 없음']),
    `카페 글(전체 ${p.cafe.total}건):`, ...(p.cafe.items.length ? p.cafe.items.map(line) : ['- 없음']),
  ].join('\n');
}

/** 검색 결과로 나온 주소들 — 출처 확인(지어낸 주소 걸러내기)에 쓴다 */
export function naverLinks(p: NaverPack): string[] {
  return [...p.blog.items, ...p.web, ...p.news.items, ...p.cafe.items].map((i) => i.link).filter(Boolean);
}
