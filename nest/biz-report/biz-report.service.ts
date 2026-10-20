import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BizReportRepository } from './biz-report.repository';
import { BizReportWriterService, ReportStory } from './biz-report-writer.service';
import { sources } from '../business-site/place-sources';
import { numbers, loosely, norm } from '../business-site/site-qa';

/**
 * 사업체 마케팅 진단 리포트(2026-10-20).
 *   1) 모으기(facts): 홈페이지 제작에서 모은 지도 정보·Google 리뷰·조사 시트 + 카카오 주변 시설 수 + Google 주변 같은 업종 평점 + 도피아 운영 현황
 *   2) 점수(scores): 정해진 공식으로 계산 — AI가 매기지 않는다. 점수마다 근거 줄을 남긴다. 자료가 없으면 null(빈칸)
 *   3) 해석(story): AI가 facts·scores만 보고 결론·발견·할 일·90일 계획을 쓴다. 글 속 숫자는 facts 와 대조해 출처 없는 숫자를 표시
 * 공개 API로 못 구하는 것(매출·시간대별 방문·네이버 리뷰 수 등)은 지어내지 않고 "받아야 할 자료"로 둔다.
 */

const NEAR = 500;
const CATS: { code: string; label: string }[] = [
  { code: 'FD6', label: '음식점' }, { code: 'CE7', label: '카페' }, { code: 'SW8', label: '지하철역' }, { code: 'AT4', label: '관광명소' },
  { code: 'AD5', label: '숙박' }, { code: 'PK6', label: '주차장' }, { code: 'BK9', label: '은행' }, { code: 'SC4', label: '학교' },
];

export interface Score { key: string; label: string; score: number | null; basis: string[] }

@Injectable()
export class BizReportService {
  constructor(private readonly repo: BizReportRepository, private readonly writer: BizReportWriterService) {}

  async get(businessId: string) {
    const business = await this.repo.business(businessId);
    if (!business) throw new NotFoundException('사업체를 찾을 수 없습니다.');
    const list = await this.repo.list(businessId);
    for (const r of list) if (r.status === 'running' && Date.now() - Date.parse(r.updated_at) > 10 * 60 * 1000) {
      await this.repo.patch(r.id, { status: 'error', error: '시간이 너무 오래 걸려 중단됐습니다. 다시 진단하세요.' });
      r.status = 'error';
    }
    return { business, reports: list.map((r) => ({ id: r.id, status: r.status, step: r.step, error: r.error, created_at: r.created_at })), latest: list.find((r) => r.status === 'done') || null, running: list.find((r) => r.status === 'running') || null };
  }

  async create(businessId: string) {
    const b = await this.repo.business(businessId);
    if (!b) throw new NotFoundException('사업체를 찾을 수 없습니다.');
    const site = await this.repo.site(businessId);
    if (!site?.source?.kakao && !site?.source?.google) throw new BadRequestException('홈페이지 제작 1단계(자료 수집)에서 지도 장소를 먼저 고르세요. 진단은 그 자료로 합니다.');
    const cur = await this.get(businessId);
    if (cur.running) throw new ConflictException('진단을 만드는 중입니다.');
    const row = await this.repo.add(businessId);
    this.build(row.id, businessId).catch(async (e) => {
      console.error('[biz-report] failed', e);
      await this.repo.patch(row.id, { status: 'error', error: String(e?.message || e).slice(0, 300) });
    });
    return this.get(businessId);
  }

  private async build(id: string, businessId: string) {
    const facts = await this.gather(businessId);
    await this.repo.patch(id, { step: '점수를 계산하는 중', data: { facts } });
    const scores = score(facts);
    await this.repo.patch(id, { step: 'AI가 해석을 쓰는 중', data: { facts, scores } });
    const story: ReportStory = await this.writer.write({ facts, scores });
    // 글 속 숫자 대조 — 모은 자료(facts) 어디에도 없는 숫자는 표시(목표치처럼 제안한 숫자는 metrics.target 에만 허용)
    const src = norm(JSON.stringify(facts) + JSON.stringify(scores));
    const texts = [story.summary, ...story.findings.map((f) => `${f.title} ${f.body}`), ...story.actions.map((a) => `${a.title} ${a.why}`),
      ...story.metrics.map((m) => `${m.name} ${m.now}`)];
    const unsourced = [...new Set(texts.flatMap((t) => numbers(t)))].filter((n) => !src.includes(n) && !loosely(src, n) && !/^(30|60|90|100|1|2|3)$/.test(n));
    await this.repo.patch(id, { status: 'done', step: null, data: { facts, scores, story, check: { unsourced } } });
  }

  /** 모으기 — 실패한 출처는 errors 에 적고 나머지로 진행 */
  private async gather(businessId: string) {
    const b = (await this.repo.business(businessId))!;
    const site = await this.repo.site(businessId);
    const s = site?.source || {};
    const k = s.kakao || null; const g = s.google || null;
    const x = k?.x || g?.lng; const y = k?.y || g?.lat;
    const errors: Record<string, string> = {};
    const leaf = String(k?.category || '').split('>').map((t: string) => t.trim()).filter(Boolean).pop() || b.industry || '';
    const safe = async <T>(key: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch (e: any) { errors[key] = String(e?.message || e).slice(0, 160); return fallback; }
    };

    // 주변 시설 수(반경 500m) — 유입 요인
    const nearby = x && y ? await Promise.all(CATS.map(async (c) => {
      const r = await safe(`kakao:${c.code}`, () => sources.kakaoNearby({ code: c.code, x, y, radius: NEAR }), { total: 0, places: [] });
      return { code: c.code, label: c.label, count: r.total, nearest: r.places.slice(0, c.code === 'SW8' || c.code === 'AT4' || c.code === 'AD5' ? 5 : 0).map((p) => ({ name: p.name, distance: p.distance })) };
    })) : [];
    // 같은 업종(키워드) — 카카오 개수 + Google 평점 비교
    const sameKakao = x && y && leaf ? await safe('kakao:same', () => sources.kakaoNearby({ query: leaf, x, y, radius: NEAR }), { total: 0, places: [] }) : { total: 0, places: [] };
    const sameGoogle = x && y && leaf ? await safe('google:same', () => sources.googleNearby(leaf, Number(y), Number(x), 700), []) : [];
    const selfName = String(k?.name || g?.name || b.name).replace(/\s+/g, '');
    const competitors = sameGoogle
      .filter((c) => c.id !== g?.id && c.rating)
      .map((c) => ({ name: c.name, rating: c.rating as number, reviews: c.ratingCount || 0, address: c.address, distance: x && c.lat ? Math.round(dist(Number(y), Number(x), c.lat, c.lng as number)) : null, sameBrand: brandOf(c.name) === brandOf(selfName) }))
      .sort((a, b2) => b2.reviews - a.reviews).slice(0, 10);

    const reviews = (g?.reviews || []).map((r: any) => ({ author: r.author, rating: r.rating, when: r.when, text: String(r.text || '').slice(0, 600), lang: langOf(r.text) }));
    const sheet = site?.process?.research?.sheet;
    const posts = await this.repo.postStats(businessId);
    const social = await this.repo.social(businessId);
    const phones = [...new Set([k?.phone, g?.phone].filter(Boolean).map((p: string) => p.replace(/[^\d]/g, '')))];

    return {
      at: new Date().toISOString(),
      business: { name: siteName(k?.name || b.name), industry: b.industry || leaf, category: k?.category || g?.type || '', address: k?.roadAddress || k?.address || g?.address || '', phone: k?.phone || g?.phone || '', website: g?.website || s.web?.url || '', hours: g?.hours || [], kakaoUrl: k?.url || '', googleUrl: g?.mapsUrl || '' },
      reputation: { googleRating: g?.rating ?? null, googleReviews: g?.ratingCount ?? null, sample: reviews, blogMentions: (s.naver?.blogs || []).length, naverAvailable: sources.available().naver },
      nearby: { radius: NEAR, categories: nearby, sameCategory: { keyword: leaf, kakaoCount: sameKakao.total, nearest: sameKakao.places.filter((p) => p.id !== k?.id).slice(0, 8).map((p) => ({ name: p.name, distance: p.distance })) } },
      competitors,
      presence: {
        kakaoPlace: Boolean(k), googlePlace: Boolean(g), hours: (g?.hours || []).length > 0, website: Boolean(g?.website || s.web?.url),
        doppiaSite: site?.content?.multipage ? (site.status === 'published' ? 'published' : 'draft') : (site && Object.keys(site.content || {}).length ? 'single' : 'none'),
        doppiaPages: site?.content?.multipage ? null : 0,
        instagram: social.filter((a) => /insta/i.test(a.platform || '')).map((a) => a.username),
        phonesConsistent: phones.length <= 1, phones,
      },
      operations: { ownPhotos: await this.repo.ownPhotos(businessId), posts, drafts: await this.repo.marketingDrafts(businessId),
        menuItems: (site?.content?.products || []).length, menuPrices: (site?.content?.products || []).filter((p: any) => p.price).length },
      research: sheet ? {
        summary: sheet.summary, facts: (sheet.facts || []).filter((f: any) => f.use).slice(0, 30).map((f: any) => ({ topic: f.topic, text: f.text, source: f.source?.title, url: f.source?.url })),
        gaps: (sheet.gaps || []).map((x2: any) => x2.item), homonyms: sheet.homonyms || [],
      } : null,
      errors,
    };
  }
}

/** 점수 — 공식으로 계산. 자료가 없으면 null(빈칸) */
export function score(f: any): Score[] {
  const out: Score[] = [];
  // 1) 평판: 평점(60) + 리뷰 양(25, 5,000개면 만점) + 최근 리뷰 표본의 낮은 별점 비율(15)
  {
    const r = f.reputation.googleRating; const n = f.reputation.googleReviews || 0; const sample = f.reputation.sample || [];
    if (r == null) out.push({ key: 'reputation', label: '평판', score: null, basis: ['Google 평점이 없습니다 — 지도 장소를 고르거나 리뷰를 모아야 합니다'] });
    else {
      const neg = sample.length ? sample.filter((x: any) => (x.rating || 5) <= 2).length / sample.length : 0;
      const sc = Math.round(clamp((r - 3) / 2) * 60 + Math.min(1, Math.log10(n + 1) / Math.log10(5000)) * 25 + (1 - neg) * 15);
      out.push({ key: 'reputation', label: '평판', score: sc, basis: [`Google 평점 ${r} (3.0=0점, 5.0=60점)`, `Google 리뷰 ${n.toLocaleString('ko-KR')}개 (5,000개 이상 25점)`, `최근 리뷰 표본 ${sample.length}개 중 2점 이하 ${Math.round(neg * sample.length)}개`] });
    }
  }
  // 2) 온라인 노출: 지도·영업시간·홈페이지·인스타·최근 게시·블로그·전화번호 일치
  {
    const p = f.presence; const posts = f.operations.posts?.posted30 || 0; const blogs = f.reputation.blogMentions || 0;
    const items: [boolean, number, string][] = [
      [p.kakaoPlace, 10, '카카오맵 등록'], [p.googlePlace, 10, 'Google 지도 등록'], [p.hours, 10, '영업시간 등록(Google)'],
      [p.website, 15, '홈페이지 있음'], [p.doppiaSite === 'published', 10, '도피아 홈페이지 공개'],
      [p.instagram.length > 0, 15, '인스타 계정 연결'], [posts >= 4, 15, `최근 30일 인스타 게시 ${posts}건(4건 이상)`],
      [blogs >= 5, 10, `블로그 언급 ${blogs}건(5건 이상)`], [p.phonesConsistent, 5, p.phonesConsistent ? '지도 서비스 전화번호 일치' : `지도 서비스 전화번호 불일치(${p.phones.join(' / ')})`],
    ];
    out.push({ key: 'presence', label: '온라인 노출', score: items.reduce((s2, [ok, w]) => s2 + (ok ? w : 0), 0), basis: items.map(([ok, w, t]) => `${ok ? '✓' : '✗'} ${t} (${w}점)`) });
  }
  // 3) 콘텐츠·운영: 직접 가진 사진·메뉴 정보·가격·홈페이지·게시 준비
  {
    const o = f.operations; const photos = o.ownPhotos || 0;
    const parts: [number, string][] = [
      [photos >= 10 ? 30 : photos >= 3 ? 20 : photos >= 1 ? 10 : 0, `직접 가진 사진 ${photos}장(10장 이상 30점)`],
      [o.menuItems ? 20 : 0, `메뉴·상품 정리 ${o.menuItems}개`], [o.menuPrices ? 15 : 0, `가격 공개 ${o.menuPrices}개`],
      [f.presence.doppiaSite === 'published' ? 20 : f.presence.doppiaSite === 'draft' ? 10 : 0, `도피아 홈페이지: ${({ published: '공개', draft: '제작됨(미공개)', single: '한 장 초안', none: '없음' } as any)[f.presence.doppiaSite]}`],
      [(o.drafts?.ready || 0) + (o.drafts?.done || 0) > 0 ? 15 : 0, `AI 마케팅 팀 작업 ${(o.drafts?.ready || 0) + (o.drafts?.done || 0)}건`],
    ];
    out.push({ key: 'content', label: '콘텐츠·운영', score: parts.reduce((s2, [v]) => s2 + v, 0), basis: parts.map(([v, t]) => `${t} → ${v}점`) });
  }
  // 4) 주변 유입 요인(반경 500m 시설 수 — 실제 유동 인구가 아니라 시설 기준)
  {
    const c = Object.fromEntries((f.nearby.categories || []).map((x: any) => [x.code, x]));
    if (!f.nearby.categories?.length) out.push({ key: 'locality', label: '주변 유입 요인', score: null, basis: ['좌표가 없어 주변 시설을 셀 수 없습니다'] });
    else {
      const sub = c.SW8?.nearest?.[0]?.distance;
      const parts: [number, string][] = [
        [sub == null ? 0 : sub <= 200 ? 30 : sub <= 400 ? 20 : 10, sub == null ? '반경 500m 안 지하철역 없음' : `가장 가까운 지하철역 ${c.SW8.nearest[0].name} ${sub}m`],
        [Math.min(25, (c.AT4?.count || 0) * 3), `관광명소 ${c.AT4?.count || 0}곳`], [Math.min(15, (c.AD5?.count || 0) * 2), `숙박 ${c.AD5?.count || 0}곳`],
        [Math.min(30, Math.round(((c.FD6?.count || 0) + (c.CE7?.count || 0)) / 15)), `음식점·카페 ${(c.FD6?.count || 0) + (c.CE7?.count || 0)}곳(상권 밀도)`],
      ];
      out.push({ key: 'locality', label: '주변 유입 요인', score: Math.min(100, parts.reduce((s2, [v]) => s2 + v, 0)), basis: [...parts.map(([v, t]) => `${t} → ${v}점`), '시설 수 기준 추정 — 실제 방문자 수는 아닙니다'] });
    }
  }
  // 5) 경쟁 위치: 주변 같은 업종(Google) 중 평점 순위·리뷰 수 순위
  {
    const comp = (f.competitors || []).filter((x: any) => !x.sameBrand);
    const r = f.reputation.googleRating; const n = f.reputation.googleReviews || 0;
    if (r == null || comp.length < 2) out.push({ key: 'competition', label: '경쟁 위치', score: null, basis: [r == null ? 'Google 평점이 없습니다' : `비교할 주변 같은 업종이 ${comp.length}곳뿐입니다`] });
    else {
      const N = comp.length + 1;
      const rRank = 1 + comp.filter((x: any) => x.rating > r).length; const nRank = 1 + comp.filter((x: any) => x.reviews > n).length;
      const sc = Math.round(50 * (1 - (rRank - 1) / (N - 1)) + 50 * (1 - (nRank - 1) / (N - 1)));
      out.push({ key: 'competition', label: '경쟁 위치', score: sc, basis: [`주변 700m 같은 업종 ${comp.length}곳(Google, 같은 브랜드 제외)과 비교`, `평점 ${N}곳 중 ${rRank}위`, `리뷰 수 ${N}곳 중 ${nRank}위`] });
    }
  }
  return out;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; const t = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * t) / 2) ** 2 + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(((lng2 - lng1) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
/** 같은 브랜드 판별용 — 지점명(…점·…본점)과 공백을 뗀 앞부분 */
const brandOf = (n: string) => String(n || '').replace(/\s+/g, '').replace(/(본점|분점|신관|\d+호점|[가-힣A-Za-z0-9]*점)$/, '').slice(0, 6);
const langOf = (t: string) => (/[぀-ヿ]/.test(t) ? 'ja' : /[가-힣]/.test(t) ? 'ko' : /[一-鿿]/.test(t) ? 'zh' : 'en');
const siteName = (n: string) => String(n || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || n;
