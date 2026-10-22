import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BizReportRepository } from './biz-report.repository';
import { BizReportWriterService, ReportStory, normUrl } from './biz-report-writer.service';
import { SNS_LABEL, SnsLink, snsFromHtml, toSns } from './sns';
import { naverPlaceAvailable, naverPlaceReviews } from './naver-place';
import { instagramConnected, instagramDiscovery, discoveryAvailable, youtubeChannel, youtubeAvailable, naverBlogRss, tiktokExternal, tiktokAvailable, SnsStats,
  youtubePublic, facebookPublic, instagramExternal, instagramExternalAvailable } from './sns-stats';
import { sources } from '../business-site/place-sources';
import { naverPack, splitName, squash } from '../business-site/naver-pack';
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
    // "365K"를 "36.5만"처럼 단위만 바꿔 쓴 수치도 출처 있는 숫자로 본다
    const src0 = JSON.stringify(facts) + JSON.stringify(scores);
    const src = norm(src0) + ' ' + unitVariants(src0).join(' ');
    const texts = [story.summary, ...story.findings.map((f) => `${f.title} ${f.body}`), ...story.actions.map((a) => `${a.title} ${a.why}`),
      ...story.metrics.map((m) => `${m.name} ${m.now}`)];
    const unsourced = [...new Set(texts.flatMap((t) => numbers(t)))].filter((n) => !src.includes(n) && !loosely(src, n) && !/^(30|60|90|100|1|2|3)$/.test(n));
    await this.repo.patch(id, { status: 'done', step: null, data: { facts, scores, story, check: { unsourced } } });
  }

  /**
   * SNS 계정 찾기 — ① 홈페이지에 걸린 링크(·Google 장소 웹사이트 칸) ② 네이버 웹 검색(키 있을 때) ③ 웹 검색.
   *   ①은 업체가 직접 건 링크라 "확인", ③은 검색 결과에 주소가 실제로 있을 때만 "검색 결과 확인"(없으면 "출처 미확인", 점수에 안 씀).
   *   팔로워·게시물 수는 검색 결과에 보인 글자 그대로(날짜와 함께) — 인스타 공식 조회(Business Discovery)는 우리 연동 방식에서 막혀 있다(2026-10-21 실측).
   */
  private async sns(businessId: string, input: { name: string; address: string; category: string; websites: string[] }) {
    type Acc = SnsLink & { found: string[]; level: string; official?: string; followers?: string; posts?: string; lastActive?: string; evidence?: string };
    const accs = new Map<string, Acc>();
    const add = (l: SnsLink | null, how: string, extra: Partial<Acc> = {}) => {
      if (!l) return;
      const key = `${l.platform}:${l.handle.toLowerCase()}`;
      const cur = accs.get(key);
      if (cur) { if (!cur.found.includes(how)) cur.found.push(how); Object.assign(cur, Object.fromEntries(Object.entries(extra).filter(([k2, v]) => v && !(cur as any)[k2]))); }
      else accs.set(key, { ...l, found: [how], level: extra.level || '확인', ...extra });
    };
    // ① 홈페이지 — 웹사이트 칸이 아예 SNS 주소인 가게도 많다. Google 이 https 로 적었는데 사이트는 http 뿐인 경우(명동교자)가 있어
    //   Google 주소 → 수집 때 연 주소 순으로 열리는 것 하나를 읽는다
    const website = input.websites[0] || '';
    for (const w of input.websites) add(toSns(w), 'Google 장소 웹사이트');
    for (const w of input.websites.filter((x) => !toSns(x) && /^https?:\/\/[^/]+\.[^/]+/i.test(x) && !/\/\/(localhost|[\d.]+)(:|\/|$)/i.test(x))) {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
        const res = await fetch(w, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (DoppiaSiteBuilder)' } }).finally(() => clearTimeout(t));
        if (!res.ok) continue;
        for (const l of snsFromHtml(await res.text())) add(l, '홈페이지 링크');
        break;
      } catch { /* 다음 주소 */ }
    }
    // ② 네이버 웹 검색(키가 있을 때만) — 결과에는 그 가게를 언급한 남의 계정도 섞여 나온다(명동교자 검색에 무관한 인스타 7개, 2026-10-22 실측).
    //   계정 이름(제목)에 가게 이름이 들어 있을 때만 받는다
    const naverAvailable = sources.available().naver;
    if (naverAvailable) {
      const nameKey = squash(baseName(input.name));
      for (const q of [`${input.name} 인스타그램`, `${input.name} 공식 블로그`]) {
        try {
          for (const r of await sources.naverWeb(q)) {
            if (nameKey.length < 2 || !squash(r.title.replace(/\s+[-|:]\s+(Instagram|YouTube|Facebook|TikTok|네이버 블로그).*$/i, '')).includes(nameKey)) continue;
            add(toSns(r.link), '네이버 검색', { level: '검색 결과 확인', evidence: `${r.title} — ${r.link}` });
          }
        } catch { /* 다음 검색어 */ }
      }
    }
    // ③ 웹 검색
    const found = await this.writer.findSns({ name: input.name, address: input.address, category: input.category, website, known: [...accs.values()].map((a) => a.url) });
    for (const a of found.accounts) {
      const l = toSns(String(a?.url || ''));
      if (!l) continue;
      const seen = found.urls.has(normUrl(l.url)) || (a.evidence && found.urls.has(normUrl(String(a.evidence))));
      const clip = (v: unknown, n = 40) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
      add(l, '웹 검색', {
        level: seen ? '검색 결과 확인' : '출처 미확인', official: clip(a.official, 10),
        // 숫자는 출처가 확인된 계정에서만
        ...(seen ? { followers: clip(a.followers), posts: clip(a.posts), lastActive: clip(a.lastActive) } : {}),
        evidence: clip(a.evidence, 300),
      });
    }
    // 도피아에 연결된 인스타는 찾지 않아도 우리 계정이다
    const connected = await this.repo.connectedInstagram(businessId);
    for (const c of connected) add(toSns(`https://www.instagram.com/${c.username}/`), '도피아 연결', { level: '확인', official: 'branch' });

    // 계정별 분석 수치 — 공식 경로가 있는 채널만(최대 6개 계정)
    const stats = async (a: Acc): Promise<{ stats?: SnsStats; statsNote?: string }> => {
      if (a.level === '출처 미확인') return { statsNote: '출처가 확인되지 않은 계정이라 수치를 받지 않음' };
      try {
        if (a.platform === 'instagram') {
          const c = connected.find((x) => x.username.toLowerCase() === a.handle.toLowerCase());
          if (c) return { stats: await instagramConnected(c) };
          if (discoveryAvailable()) return { stats: await instagramDiscovery(a.handle) };
          if (instagramExternalAvailable()) return { stats: await instagramExternal(a.handle) };
          return { statsNote: '인스타는 서버에서 공개 페이지가 열리지 않습니다 — Business Discovery 토큰(META_DISCOVERY_*) 또는 외부 수집 키(APIFY_TOKEN)가 필요합니다' };
        }
        // 유튜브: 공식 API 키가 있으면 API, 없으면 공개 채널 페이지
        if (a.platform === 'youtube') return { stats: youtubeAvailable() ? await youtubeChannel(a.handle) : await youtubePublic(a.handle) };
        if (a.platform === 'facebook') return { stats: await facebookPublic(a.handle) };
        if (a.platform === 'naverBlog') return { stats: await naverBlogRss(a.handle) };
        if (a.platform === 'tiktok') return tiktokAvailable() ? { stats: await tiktokExternal(a.handle) } : { statsNote: '틱톡은 외부 수집 키(APIFY_TOKEN)가 필요합니다' };
        return { statsNote: '공식 조회 API가 없는 채널 — 검색 결과에 보인 수치만' };
      } catch (e: any) {
        return { statsNote: `수치를 받지 못했습니다: ${String(e?.message || e).slice(0, 100)}${/business_discovery|Unsupported get|does not exist/i.test(String(e?.message)) ? ' (비즈니스·크리에이터 계정이 아니면 조회되지 않습니다)' : ''}` };
      }
    };
    const list = [...accs.values()].slice(0, 6);
    const withStats = await Promise.all(list.map(async (a) => {
      const r = await stats(a);
      // 저장 크기를 줄인다 — 최근 게시물 15개, 글은 짧게
      if (r.stats) r.stats.recent = r.stats.recent.slice(0, 15);
      return { ...a, ...r };
    }));
    for (const a of [...accs.values()].slice(6)) withStats.push({ ...a, statsNote: '계정이 많아 수치는 앞 6개만 받음' });

    const order: Record<string, number> = { 확인: 0, '검색 결과 확인': 1, '출처 미확인': 2 };
    return {
      accounts: withStats.map((a) => ({ ...a, label: SNS_LABEL[a.platform] })).sort((x, y) => order[x.level] - order[y.level]),
      setup: { youtube: youtubeAvailable(), discovery: discoveryAvailable(), tiktok: tiktokAvailable(), connectedInstagram: connected.map((c) => c.username) },
      searches: found.searches.slice(0, 8), naverAvailable, checkedAt: new Date().toISOString(),
    };
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
    const selfName = String(k?.name || g?.name || b.name);
    const competitors = sameGoogle
      .filter((c) => c.id !== g?.id && c.rating)
      .map((c) => ({ name: c.name, rating: c.rating as number, reviews: c.ratingCount || 0, address: c.address, distance: x && c.lat ? Math.round(dist(Number(y), Number(x), c.lat, c.lng as number)) : null, sameBrand: brandOf(c.name) === brandOf(selfName) }))
      .sort((a, b2) => b2.reviews - a.reviews).slice(0, 10);

    const sns = await safe('sns', () => this.sns(businessId, { name: siteName(k?.name || b.name), address: k?.roadAddress || k?.address || g?.address || '', category: k?.category || b.industry || '', websites: [...new Set([g?.website, s.web?.url].filter(Boolean))] as string[] }), { accounts: [], searches: [], naverAvailable: false, checkedAt: '', setup: { youtube: false, discovery: false, tiktok: false, connectedInstagram: [] as string[] } });

    // 네이버 플레이스(외부 수집) — 키가 있을 때만, 카카오 장소와 주소·좌표가 맞는 곳만
    const naver = naverPlaceAvailable() && k
      ? await safe('naver-place', () => naverPlaceReviews({ name: siteName(k.name || b.name), roadAddress: k.roadAddress || '', address: k.address || '', lat: Number(k.y) || undefined, lng: Number(k.x) || undefined }), null)
      : null;

    // 네이버 블로그 언급 — 진단 때마다 새로 찾는다(자료 수집 때 저장분은 키가 없던 때 것일 수 있다).
    //   최신순 100개 중 제목·요약에 가게 이름이 있는 글만 세고, 그중 최근 30일 건수를 점수에 쓴다
    // 네이버는 필수 단계 — 키가 없거나 실패하면 진단을 멈추고 이유를 보여 준다(조용히 빼고 점수 내지 않는다)
    const naverPk = await naverPack(k?.name || g?.name || b.name, k?.roadAddress || k?.address || g?.address || '');
    const naverHere = naverPk.local.find((l) => l.match) || null;
    const blog = await (async () => {
          // 프랜차이즈 지점이면 브랜드 언급이 아니라 "브랜드 + 지점" 언급만 센다(본사 인스타를 지점 것으로 치지 않는 것과 같은 기준)
          const nm = splitName(siteName(k?.name || b.name));
          const name = nm.branch ? `${nm.brand} ${nm.branch}` : nm.brand;
          const r = await sources.naverBlogRecent(nm.branch ? `"${nm.brand}" ${nm.branch}` : `"${nm.brand}"`);
          const hit = r.items.filter((i) => { const t = squash(`${i.title} ${i.snippet}`); return t.includes(squash(nm.brand)) && (!nm.branch || t.includes(squash(nm.branch))); });
          const cut = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
          const recent = hit.filter((i) => String(i.date || '') >= cut);
          const oldest = r.items[r.items.length - 1]?.date || '';
          return { query: name, total: r.total, recent30: recent.length, capped: r.items.length >= 100 && oldest >= cut,
            sample: recent.slice(0, 5).map((i) => ({ title: i.title.slice(0, 80), link: i.link, date: i.date, blogger: i.blogger })) };
        })().catch((e) => { throw new Error(`네이버 검색은 필수 단계입니다 — 블로그 검색 실패(${String(e?.message || e).slice(0, 100)})`); });

    const reviews = (g?.reviews || []).map((r: any) => ({ author: r.author, rating: r.rating, when: r.when, text: String(r.text || '').slice(0, 600), lang: langOf(r.text) }));
    const sheet = site?.process?.research?.sheet;
    const posts = await this.repo.postStats(businessId);
    const social = await this.repo.social(businessId);
    // 번호는 원래 표기로 보여 주고, 같은지는 숫자만 비교
    const phones = [...new Map([k?.phone, g?.phone, naverHere?.phone].filter(Boolean).map((p: string) => [p.replace(/[^\d]/g, ''), p])).values()];

    return {
      at: new Date().toISOString(),
      business: { name: siteName(k?.name || b.name), industry: b.industry || leaf, category: k?.category || g?.type || '', address: k?.roadAddress || k?.address || g?.address || '', phone: k?.phone || g?.phone || '', website: g?.website || s.web?.url || '', hours: g?.hours || [], kakaoUrl: k?.url || '', googleUrl: g?.mapsUrl || '' },
      reputation: { googleRating: g?.rating ?? null, googleReviews: g?.ratingCount ?? null, sample: reviews, blogMentions: blog ? blog.recent30 : null, blog, naverAvailable: sources.available().naver,
        // 네이버 블로그 후기(공식 검색 API, 요약 글) — 리뷰 분석에 Google 리뷰와 함께 쓴다
        naver: { query: naverPk.query, at: naverPk.at, reviews: naverPk.blog.reviews.slice(0, 10).map((i) => ({ title: i.title.slice(0, 100), text: i.snippet.slice(0, 240), link: i.link, date: i.date, by: i.by })),
          blogTotal: naverPk.blog.total, news: { total: naverPk.news.total, items: naverPk.news.items.slice(0, 5) }, cafe: { total: naverPk.cafe.total, items: naverPk.cafe.items.slice(0, 5) } },
        naverPlace: naver ? naver : { skipped: naverPlaceAvailable() ? '카카오 장소가 없어 찾지 않음' : '외부 수집 키(REEF_API_KEY) 없음' } },
      nearby: { radius: NEAR, categories: nearby, sameCategory: { keyword: leaf, kakaoCount: sameKakao.total, nearest: sameKakao.places.filter((p) => p.id !== k?.id).slice(0, 8).map((p) => ({ name: p.name, distance: p.distance })) } },
      competitors,
      sns,
      presence: {
        kakaoPlace: Boolean(k), googlePlace: Boolean(g), naverPlace: Boolean(naverHere), naverPlaceName: naverHere ? `${naverHere.name} · ${naverHere.roadAddress || naverHere.address}` : '', hours: (g?.hours || []).length > 0, website: Boolean(g?.website || s.web?.url),
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
    const gR = f.reputation.googleRating; const gN = f.reputation.googleReviews || 0; const sample = f.reputation.sample || [];
    // 네이버 플레이스(외부 수집)가 있으면 리뷰 양에 더하고, 평점이 있으면 리뷰 수로 가중 평균
    const nv = f.reputation.naverPlace?.matched ? f.reputation.naverPlace : null;
    const nR = nv?.rating ?? null; const nN = nv?.visitorReviews || 0;
    const r = gR != null && nR != null ? (gR * gN + nR * nN) / Math.max(1, gN + nN) : gR ?? nR;
    const n = gN + nN;
    if (r == null) out.push({ key: 'reputation', label: '평판', score: null, basis: ['평점이 없습니다 — 지도 장소를 고르거나 리뷰를 모아야 합니다'] });
    else {
      const neg = sample.length ? sample.filter((x: any) => (x.rating || 5) <= 2).length / sample.length : 0;
      const sc = Math.round(clamp((r - 3) / 2) * 60 + Math.min(1, Math.log10(n + 1) / Math.log10(5000)) * 25 + (1 - neg) * 15);
      out.push({ key: 'reputation', label: '평판', score: sc, basis: [
        nR != null && gR != null ? `평점 ${r.toFixed(2)} — Google ${gR}·네이버 ${nR} 리뷰 수 가중 평균 (3.0=0점, 5.0=60점)` : `${gR != null ? 'Google' : '네이버'} 평점 ${r} (3.0=0점, 5.0=60점)`,
        `리뷰 ${n.toLocaleString('ko-KR')}개${nv ? ` (Google ${gN.toLocaleString('ko-KR')} + 네이버 방문자 ${nN.toLocaleString('ko-KR')})` : ''} (5,000개 이상 25점)`,
        `최근 Google 리뷰 표본 ${sample.length}개 중 2점 이하 ${Math.round(neg * sample.length)}개`,
        ...(nv ? ['네이버 수치는 외부 수집 서비스(ReefAPI) 기준'] : []),
      ] });
    }
  }
  // 2) 온라인 노출: 지도·영업시간·홈페이지·인스타·최근 게시·블로그·전화번호 일치
  {
    const p = f.presence; const posts = f.operations.posts?.posted30 || 0; const blogs = f.reputation.blogMentions || 0;
    // 점수에는 출처가 확인된 계정만(출처 미확인·다른 지점 계정 제외)
    const okSns = (f.sns?.accounts || []).filter((a: any) => a.level !== '출처 미확인' && a.official !== 'brand');
    const insta = okSns.filter((a: any) => a.platform === 'instagram');
    // 최근 30일 게시 — 인스타 공식 수치가 있으면 그걸로(다른 도구로 올린 것도 센다), 없으면 도피아 게시 기록
    const igLast30 = Math.max(0, ...insta.map((a: any) => a.stats?.summary?.last30 ?? 0));
    const other = okSns.filter((a: any) => a.platform !== 'instagram');
    // null = 확인할 수 없음(출처 키 없음) — 점수 계산에서 빼고 남은 항목으로 100점 환산
    const items: [boolean | null, number, string][] = [
      [p.kakaoPlace, 10, '카카오맵 등록'], [p.googlePlace, 10, 'Google 지도 등록'],
      [p.naverPlace ?? null, 10, p.naverPlace ? '네이버 지도 등록' : p.naverPlace === false ? '네이버 지도 — 이름·주소가 맞는 장소를 찾지 못함' : '네이버 지도 — 확인 전 진단'], [p.hours, 10, '영업시간 등록(Google)'],
      [p.website, 10, '홈페이지 있음'], [p.doppiaSite === 'published', 10, '도피아 홈페이지 공개'],
      [insta.length > 0 || p.instagram.length > 0, 10, insta.length ? `공식 인스타 있음(@${insta[0].handle})` : '공식 인스타 — 찾지 못함'],
      [p.instagram.length > 0, 5, '인스타를 도피아에 연결(게시 예약 가능)'], [Math.max(posts, igLast30) >= 4, 15, insta.some((a: any) => a.stats) ? `최근 30일 인스타 게시 ${Math.max(posts, igLast30)}건(4건 이상, 인스타 공식 수치)` : `최근 30일 도피아로 인스타 게시 ${posts}건(4건 이상)`],
      [other.length > 0, 5, other.length ? `다른 SNS ${other.map((a: any) => a.label).join('·')}` : '다른 SNS(유튜브·페이스북·블로그·카카오채널) — 찾지 못함'],
      [f.reputation.blogMentions == null ? null : blogs >= 5, 10, f.reputation.blogMentions == null
        ? `네이버 블로그 언급 — 확인 불가(${f.reputation.naverAvailable ? '검색 실패' : '네이버 검색 키 없음'})`
        : `네이버 블로그 최근 30일 '${f.reputation.blog?.query || ''}' 언급 ${blogs}건${f.reputation.blog?.capped ? ' 이상' : ''}(5건 이상)`],
      [p.phonesConsistent, 5, p.phonesConsistent ? '지도 서비스 전화번호 일치' : `지도 서비스 전화번호 불일치(${p.phones.join(' / ')})`],
    ];
    const known = items.filter(([ok]) => ok !== null);
    const max = known.reduce((s2, [, w]) => s2 + w, 0);
    const got = known.reduce((s2, [ok, w]) => s2 + (ok ? w : 0), 0);
    out.push({ key: 'presence', label: '온라인 노출', score: max ? Math.round((got / max) * 100) : null,
      basis: [...items.map(([ok, w, t]) => `${ok === null ? '–' : ok ? '✓' : '✗'} ${t}${ok === null ? '' : ` (${w}점)`}`), ...(max < 100 ? [`확인 가능한 ${max}점 만점을 100점으로 환산`] : [])] });
  }
  // 2-1) SNS 활동 — 이 가게(지점) 계정의 실제 수치(공식 API·공개 페이지·외부 수집). 본사 계정은 참고로만 적고 점수에는 안 넣는다
  {
    const all = (f.sns?.accounts || []).filter((a: any) => a.level !== '출처 미확인');
    const own = all.filter((a: any) => a.official !== 'brand');
    const brand = all.filter((a: any) => a.official === 'brand');
    const st = own.filter((a: any) => a.stats);
    const last30 = st.filter((a: any) => a.stats.recent?.length).map((a: any) => a.stats.summary?.last30 ?? 0);
    const since = st.map((a: any) => a.stats.summary?.daysSinceLast).filter((x: any) => typeof x === 'number');
    const fol = st.map((a: any) => a.stats.followers).filter((x: any) => typeof x === 'number');
    const eng = st.map((a: any) => a.stats.summary?.engagementPct).filter((x: any) => typeof x === 'number');
    const items: [boolean | null, number, string][] = [
      [own.length > 0, 25, own.length ? `이 가게 계정 ${own.map((a: any) => `${a.label} ${a.handle}`).join(', ')}` : `이 가게 계정 — 찾지 못함${brand.length ? `(본사 계정 ${brand.map((a: any) => `${a.label} ${a.handle}`).join(', ')}만 있음 — 점수 제외)` : ''}`],
      [last30.length ? Math.max(...last30) >= 4 : own.length ? null : false, 30, last30.length ? `최근 30일 게시 ${Math.max(...last30)}건(4건 이상)` : '최근 30일 게시 — 수치 없음'],
      [since.length ? Math.min(...since) <= 14 : own.length ? null : false, 15, since.length ? `마지막 게시 ${Math.min(...since)}일 전(14일 이내)` : '마지막 게시 — 수치 없음'],
      [fol.length ? Math.max(...fol) >= 300 : own.length ? null : false, 15, fol.length ? `팔로워(구독자) ${Math.max(...fol).toLocaleString('ko-KR')}명(300명 이상)` : '팔로워 — 수치 없음'],
      [eng.length ? Math.max(...eng) >= 1 : null, 15, eng.length ? `반응률 ${Math.max(...eng)}%(게시물당 좋아요+댓글 ÷ 팔로워, 1% 이상)` : '반응률 — 수치 없음'],
    ];
    const known = items.filter(([ok]) => ok !== null);
    const max = known.reduce((s2, [, w]) => s2 + w, 0);
    const got = known.reduce((s2, [ok, w]) => s2 + (ok ? w : 0), 0);
    const srcs = [...new Set(st.map((a: any) => a.stats.source))];
    out.push({ key: 'sns', label: 'SNS 활동', score: max ? Math.round((got / max) * 100) : null,
      basis: [...items.map(([ok, w, t]) => `${ok === null ? '–' : ok ? '✓' : '✗'} ${t}${ok === null ? '' : ` (${w}점)`}`),
        ...(max && max < 100 ? [`확인 가능한 ${max}점 만점을 100점으로 환산`] : []), ...(srcs.length ? [`수치 출처: ${srcs.join(' / ')}`] : [])] });
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
/** 같은 브랜드 판별용 — 이름의 첫 단어(지점명은 보통 뒤에 붙는다: "명동교자 분점", "효담칼국수 명동본점") */
const brandOf = (n: string) => String(n || '').trim().split(/[\s(/]+/)[0].replace(/(본점|분점|\d+호점)$/, '');
const langOf = (t: string) => (/[぀-ヿ]/.test(t) ? 'ja' : /[가-힣]/.test(t) ? 'ko' : /[一-鿿]/.test(t) ? 'zh' : 'en');
const siteName = (n: string) => String(n || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || n;
/** 이름 비교용 — 띄어쓰기·기호 없이 소문자. 지점 꼬리("명동교자 본점", "뚜레쥬르 명동점")는 뗀다 */
/** 자료 속 "365K"·"1.2M"·"17.3만"·"6.8천" → 같은 값을 다른 단위로 쓴 표기들(36.5만, 365000, 0.37M …) */
function unitVariants(text: string): string[] {
  const mul: Record<string, number> = { k: 1e3, m: 1e6, 천: 1e3, 만: 1e4, 억: 1e8 };
  const out = new Set<string>();
  const fmt = (v: number) => String(Math.round(v * 100) / 100);
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*([KkMm천만억])/g)) {
    const v = Number(m[1].replace(/,/g, '')) * mul[m[2].toLowerCase()];
    if (!Number.isFinite(v)) continue;
    out.add(String(Math.round(v)));
    for (const u of [1e3, 1e4, 1e6, 1e8]) { const x = v / u; if (x >= 0.1 && x < 100000) { out.add(fmt(x)); if (x >= 1) out.add(String(Math.round(x * 10) / 10)); } }
  }
  return [...out];
}

const baseName = (n: string) => splitName(n).brand;
