/**
 * 사업체 홈페이지 템플릿 공용 — 모델 형태·이스케이프·메타·지도 링크·출처 표기.
 *
 * ⚠️ 템플릿에 들어가는 **모든 문자열은 esc()** 를 거친다. 문구는 AI·관리자 입력, 리뷰는 외부 사용자 글이다.
 * ⚠️ 사실 정보(주소·전화·영업시간·평점)는 `facts`에서만 나온다 — AI 문구(content)에서 가져오지 않는다.
 */

export interface SiteContent {
  headline?: string;
  sub?: string;
  aboutTitle?: string;
  about?: string;
  highlights?: { title: string; body: string }[];
  /** photo = 그 메뉴가 찍힌 사진의 ref(google:3 · media:<id>) — 렌더 때 photoUrl 로 바뀐다 */
  services?: { name: string; desc?: string; price?: string; photo?: string; photoUrl?: string }[];
  servicesTitle?: string;
  reviewTitle?: string;
  reviewSummary?: string;
  keywords?: string[];
  ctaLabel?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface SiteFacts {
  category?: string;
  address?: string;
  roadAddress?: string;
  phone?: string;
  hours?: string[];
  website?: string;
  kakaoUrl?: string;
  googleUrl?: string;
  naverUrl?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  ratingCount?: number;
}

/** kind·caption 은 AI가 사진을 직접 보고 붙인 것(content.photoNotes) — 템플릿이 섹션별로 사진을 나눠 쓴다 */
export type PhotoKind = 'food' | 'interior' | 'exterior' | 'people' | 'other';
export interface SitePhoto { url: string; credit?: string; creditUri?: string; kind?: PhotoKind; caption?: string }
export interface SiteReview { author: string; authorUri?: string; text: string; rating?: number; when?: string; source: string }
export interface SiteBlog { title: string; link: string; blogger?: string }

export interface SiteModel {
  name: string;
  slug: string;
  canonical: string;
  content: SiteContent;
  facts: SiteFacts;
  photos: SitePhoto[];
  reviews: SiteReview[];
  blogs: SiteBlog[];
  /** 관리자 미리보기면 상단에 표식 + 검색엔진 차단 */
  preview?: boolean;
}

export const esc = (s: unknown) => String(s == null ? '' : s)
  .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** 줄바꿈 보존 문단 */
export const paras = (s?: string) => String(s || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

export const telHref = (phone?: string) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '');

/** 길찾기 — 좌표가 있으면 카카오맵 길찾기, 없으면 장소 페이지·구글 지도 */
export function directionsHref(m: SiteModel): string {
  const f = m.facts;
  if (f.lat && f.lng) return `https://map.kakao.com/link/to/${encodeURIComponent(m.name)},${f.lat},${f.lng}`;
  return f.kakaoUrl || f.googleUrl || f.naverUrl || '';
}

export const addressOf = (f: SiteFacts) => f.roadAddress || f.address || '';

/** 리뷰 짧게 — 한 카드에 너무 긴 글이 들어가면 레이아웃이 무너진다 */
export const clip = (s: string, n = 180) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export const stars = (r?: number) => (r ? `${'★'.repeat(Math.round(r))}${'☆'.repeat(5 - Math.round(r))}` : '');

export function head(m: SiteModel, fontsHref: string, css: string): string {
  const c = m.content;
  const title = c.seoTitle || `${m.name}${m.facts.category ? ` | ${m.facts.category.split('>').pop()?.trim()}` : ''}`;
  const desc = c.seoDescription || c.sub || '';
  const og = m.photos[0]?.url ? new URL(m.photos[0].url, m.canonical).href : '';
  const ld: any = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: m.name, url: m.canonical,
    ...(addressOf(m.facts) ? { address: addressOf(m.facts) } : {}),
    ...(m.facts.phone ? { telephone: m.facts.phone } : {}),
    ...(og ? { image: og } : {}),
    ...(m.facts.lat ? { geo: { '@type': 'GeoCoordinates', latitude: m.facts.lat, longitude: m.facts.lng } } : {}),
  };
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${m.preview ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${esc(m.canonical)}">`}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
${fontsHref ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(fontsHref)}">` : ''}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
${m.photos[0] ? `<link rel="preload" as="image" href="${esc(m.photos[0].url)}" fetchpriority="high">` : ''}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0}
img{display:block;max-width:100%}
a{color:inherit}
:focus-visible{outline:3px solid currentColor;outline-offset:3px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
.pv{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99;background:#222;color:#fff;font:600 12px/1 Pretendard Variable,sans-serif;padding:8px 12px;border-radius:999px}
${css}
</style>
</head>
<body>
${m.preview ? '<div class="pv">미리보기 · 아직 공개 전입니다</div>' : ''}`;
}

/** 출처 표기 — Google 사진·리뷰는 작성자 표기가 이용 조건이다. 블로그는 링크로만. */
export function credits(m: SiteModel): string {
  const photoCredits = [...new Map(m.photos.filter((p) => p.credit).map((p) => [p.credit, p])).values()];
  const hasGoogle = m.reviews.some((r) => r.source === 'Google') || photoCredits.length > 0;
  if (!hasGoogle && !m.blogs.length) return '';
  return `<p class="credits">${hasGoogle ? '리뷰·사진 일부 출처: Google 지도' : ''}${photoCredits.length
    ? ` · 사진: ${photoCredits.map((p) => (p.creditUri
      ? `<a href="${esc(p.creditUri)}" rel="nofollow noopener" target="_blank">${esc(p.credit)}</a>`
      : esc(p.credit))).join(', ')}`
    : ''}${m.blogs.length ? `${hasGoogle ? ' · ' : ''}블로그 후기는 각 작성자의 글로 연결됩니다` : ''}</p>`;
}

/**
 * 오늘 요일 강조 — Google 영업시간 문자열("월요일: 오전 11:00~오후 9:00")의 요일로 맞춘다.
 * li[data-day] 를 템플릿이 그려 두면 오늘 줄에 .today 를 붙인다.
 */
export const TODAY_SCRIPT = `<script>(function(){var d=['일','월','화','수','목','금','토'][new Date().getDay()];document.querySelectorAll('[data-day]').forEach(function(li){if(li.getAttribute('data-day')===d)li.classList.add('today')})})();</script>`;

/** "월요일: 오전 11:00 ~ 오후 9:00" → { day:'월', label:'월요일', time:'오전 11:00 ~ 오후 9:00' } */
export function splitHours(h: string) {
  const i = h.indexOf(':');
  const label = i > 0 ? h.slice(0, i).trim() : h;
  return { day: label.slice(0, 1), label, time: i > 0 ? h.slice(i + 1).trim() : '' };
}

/** 모바일 하단 고정 버튼 — 동네 가게 사이트에서 방문자가 제일 많이 누르는 두 가지 */
export function actionBar(m: SiteModel, cls = 'abar'): string {
  const tel = telHref(m.facts.phone);
  const dir = directionsHref(m);
  if (!tel && !dir) return '';
  return `<nav class="${cls}" aria-label="바로가기">${tel ? `<a href="${esc(tel)}">전화하기</a>` : ''}${dir
    ? `<a href="${esc(dir)}" target="_blank" rel="noopener">길찾기</a>` : ''}</nav>`;
}

/** 종류별 사진 — 없으면 빈 배열 */
export const photosOf = (m: SiteModel, ...kinds: PhotoKind[]) => m.photos.filter((p) => p.kind && kinds.includes(p.kind));

/**
 * 지도 — OpenStreetMap 임베드(키·과금 없음). 좌표가 없으면 그리지 않는다.
 *   카카오·구글 지도 임베드는 JS 키·도메인 등록이 필요해서 링크(길찾기)로만 보낸다.
 */
export function mapEmbed(m: SiteModel, cls = 'map'): string {
  const { lat, lng } = m.facts;
  if (!lat || !lng) return '';
  const d = 0.0045;
  const bbox = [lng - d, lat - d * 0.6, lng + d, lat + d * 0.6].map((v) => v.toFixed(5)).join('%2C');
  return `<iframe class="${cls}" title="${esc(m.name)} 위치" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
    src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&amp;layer=mapnik&amp;marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}"></iframe>`;
}

export const fmtCount = (n?: number) => (n ? n.toLocaleString('ko-KR') : '');
