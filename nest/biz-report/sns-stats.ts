import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * SNS 분석 수치 — 공식 경로만(2026-10-21).
 *   A 인스타(도피아에 연결된 계정): Instagram API — 프로필(팔로워·게시물 수) + 최근 게시물별 좋아요·댓글
 *   B 인스타 인사이트(연결 계정): 도달·반응·조회 — 연결할 때 인사이트 권한을 받았을 때만(없으면 "다시 연결" 안내)
 *   C 인스타(연결 안 된 계정): Business Discovery — Facebook 로그인 방식 토큰(META_DISCOVERY_*)이 있을 때만
 *   D 유튜브: YouTube Data API v3(YOUTUBE_API_KEY) — 구독자·영상 수·최근 영상 조회·좋아요·댓글
 *   네이버 블로그: 공식 RSS(rss.blog.naver.com) — 최근 글 날짜로 게시 주기
 *   틱톡: 공식 조회 API가 없다 → 외부 수집(Apify, APIFY_TOKEN 있을 때만, 사업자 결정 2026-10-21). 화면에 "외부 수집" 표기
 *   스레드·X·페이스북·카카오채널: 남의 계정을 볼 공식 API가 없다 → 검색 결과에 보인 수치만(sns.ts 쪽)
 * 공식 API가 없을 때(2026-10-22 사업자 결정: API 없어도 SNS 분석) — 화면에 "공개 페이지 수집 · 공식 API 아님" 표기
 *   유튜브: 채널 공개 페이지(구독자·영상 수 + 동영상 탭의 최근 영상 조회수·올린 시기)
 *   페이스북: 공개 페이지 미리보기 정보(팔로워 수)
 *   인스타: 서버에서 열면 로그인 화면만 나와 공개 페이지로는 못 읽는다 → 외부 수집(Apify Instagram Profile Scraper, APIFY_TOKEN)
 */

export interface Post { at: string; likes: number | null; comments: number | null; views?: number | null; type?: string; url?: string; caption?: string; reach?: number | null; saved?: number | null }
export interface SnsStats {
  source: string; followers: number | null; following?: number | null; posts: number | null; name?: string; bio?: string;
  recent: Post[]; summary: ReturnType<typeof summarize>; insights?: Record<string, number> | null; note?: string; fetchedAt: string;
}

const TIMEOUT = 20000;
async function getJson(url: string): Promise<any> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || j.error) throw Object.assign(new Error(String(j?.error?.message || res.status).slice(0, 200)), { code: j?.error?.code });
    return j;
  } finally { clearTimeout(t); }
}
/** 날짜 문자열 → ISO. 못 읽으면 '' (new Date('').toISOString() 은 예외를 던진다) */
const iso = (v: string) => { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : ''; };
/** ISO 8601 길이(PT1M5S) → 초 */
const secs = (d?: string) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || ''); return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : Infinity; };
const n = (v: unknown) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/** 게시 주기·반응 요약 — 최근 게시물 목록으로 */
export function summarize(posts: Post[], followers: number | null) {
  const now = Date.now(); const day = 86400000;
  const ts = posts.map((p) => Date.parse(p.at)).filter((x) => Number.isFinite(x)).sort((a, b) => b - a);
  const gaps = ts.slice(1).map((t, i) => (ts[i] - t) / day);
  const avg = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === 'number'); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const likes = avg(posts.map((p) => p.likes)); const comments = avg(posts.map((p) => p.comments)); const views = avg(posts.map((p) => p.views));
  return {
    sample: posts.length,
    last30: ts.filter((t) => now - t <= 30 * day).length,
    last90: ts.filter((t) => now - t <= 90 * day).length,
    lastPostAt: ts[0] ? new Date(ts[0]).toISOString() : null,
    daysSinceLast: ts[0] ? Math.floor((now - ts[0]) / day) : null,
    avgGapDays: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null,
    avgLikes: likes, avgComments: comments, avgViews: views,
    // 반응률 = 게시물당 (좋아요+댓글) ÷ 팔로워 — 인스타에서 흔히 쓰는 기준
    engagementPct: followers && likes != null ? Math.round((((likes || 0) + (comments || 0)) / followers) * 10000) / 100 : null,
    best: [...posts].filter((p) => p.likes != null || p.views != null).sort((a, b) => ((b.likes || 0) + (b.comments || 0) * 3 + (b.views || 0) / 100) - ((a.likes || 0) + (a.comments || 0) * 3 + (a.views || 0) / 100)).slice(0, 3),
    types: posts.reduce((m: Record<string, number>, p) => { if (p.type) m[p.type] = (m[p.type] || 0) + 1; return m; }, {}),
  };
}

const IG_MEDIA_FIELDS = 'id,caption,media_type,timestamp,like_count,comments_count,permalink';
const toPost = (m: any): Post => ({ at: m.timestamp, likes: n(m.like_count), comments: n(m.comments_count), type: ({ IMAGE: '사진', VIDEO: '영상', CAROUSEL_ALBUM: '여러 장', REELS: '릴스' } as any)[m.media_type] || m.media_type, url: m.permalink, caption: String(m.caption || '').slice(0, 120) });

/** A + B — 도피아에 연결된 계정(토큰 보유) */
export async function instagramConnected(acc: { igUserId: string; token: string; authMode: 'instagram' | 'facebook' }): Promise<SnsStats> {
  const host = acc.authMode === 'facebook' ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  const q = (p: string) => `${host}/${p}${p.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(acc.token)}`;
  const me = await getJson(q(`${acc.igUserId}?fields=username,name,biography,followers_count,follows_count,media_count`));
  const media = await getJson(q(`${acc.igUserId}/media?fields=${IG_MEDIA_FIELDS}&limit=25`));
  const recent: Post[] = (media.data || []).map(toPost);
  // B 인사이트 — 권한이 없으면 안내만 남기고 넘어간다
  let insights: Record<string, number> | null = null; let note: string | undefined;
  try {
    const until = Math.floor(Date.now() / 1000); const since = until - 28 * 86400;
    const ins = await getJson(q(`${acc.igUserId}/insights?metric=reach,accounts_engaged,total_interactions,views,profile_views&metric_type=total_value&period=day&since=${since}&until=${until}`));
    insights = Object.fromEntries((ins.data || []).map((d: any) => [d.name, n(d.total_value?.value) ?? 0]));
    // 게시물별 도달·저장(최근 8개)
    for (const p of recent.slice(0, 8)) {
      const id = (media.data || []).find((m: any) => m.permalink === p.url)?.id;
      if (!id) continue;
      try {
        const mi = await getJson(q(`${id}/insights?metric=reach,saved`));
        for (const d of mi.data || []) { const v = n(d.values?.[0]?.value ?? d.total_value?.value); if (d.name === 'reach') p.reach = v; if (d.name === 'saved') p.saved = v; }
      } catch { /* 게시물별 인사이트는 일부 유형(스토리 등)에서 안 된다 */ }
    }
  } catch (e: any) {
    note = /permission|scope|\(#10\)|\(#200\)/i.test(String(e?.message)) ? '인사이트 권한이 없습니다 — 사업체 상세에서 인스타를 다시 연결하면 도달·저장 수치까지 받습니다' : `인사이트를 받지 못했습니다: ${String(e?.message).slice(0, 80)}`;
  }
  const followers = n(me.followers_count);
  return { source: 'Instagram API(도피아 연결 계정)', followers, following: n(me.follows_count), posts: n(me.media_count), name: me.name || me.username, bio: String(me.biography || '').slice(0, 200), recent, summary: summarize(recent, followers), insights, note, fetchedAt: new Date().toISOString() };
}

/** C — 남의 인스타 비즈니스·크리에이터 계정(개인 계정·연령 제한 계정은 안 나온다) */
export const discoveryAvailable = () => Boolean(env.META_DISCOVERY_TOKEN && env.META_DISCOVERY_IG_USER_ID);
export async function instagramDiscovery(username: string): Promise<SnsStats> {
  const u = String(username).replace(/[^\w.]/g, '');
  const fields = `business_discovery.username(${u}){username,name,biography,followers_count,follows_count,media_count,media.limit(25){${IG_MEDIA_FIELDS.replace('id,', '')}}}`;
  const j = await getJson(`https://graph.facebook.com/v23.0/${env.META_DISCOVERY_IG_USER_ID}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(env.META_DISCOVERY_TOKEN)}`);
  const d = j.business_discovery || {};
  const recent: Post[] = (d.media?.data || []).map(toPost);
  const followers = n(d.followers_count);
  return { source: 'Instagram Business Discovery(공식)', followers, following: n(d.follows_count), posts: n(d.media_count), name: d.name || d.username, bio: String(d.biography || '').slice(0, 200), recent, summary: summarize(recent, followers), fetchedAt: new Date().toISOString() };
}

// ── 공개 페이지 수집(공식 API 아님) ──
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
async function getText(url: string, ua = BROWSER_UA): Promise<string> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': ua, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
    if (!res.ok) throw new Error(`페이지 ${res.status}`);
    return await res.text();
  } finally { clearTimeout(t); }
}
const unent = (x: string) => x.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
/** "17.3만" "1.2천" "3,456" "1.2K" → 숫자 */
export function koNum(v: string): number | null {
  const m = /([\d.,]+)\s*(만|천|억|K|M)?/i.exec(String(v || '')); if (!m) return null;
  const x = Number(m[1].replace(/,/g, '')); if (!Number.isFinite(x)) return null;
  const mul = { 만: 1e4, 천: 1e3, 억: 1e8, k: 1e3, m: 1e6 }[(m[2] || '').toLowerCase() as '만'] || 1;
  return Math.round(x * mul);
}
/** "3일 전" "2주 전" "1개월 전" "5시간 전" → 대략 날짜(ISO) */
function agoIso(t: string): string {
  const m = /(\d+)\s*(초|분|시간|일|주|개월|년)/.exec(t || ''); if (!m) return '';
  const d = { 초: 1 / 86400, 분: 1 / 1440, 시간: 1 / 24, 일: 1, 주: 7, 개월: 30, 년: 365 }[m[2] as '일'] * Number(m[1]);
  return new Date(Date.now() - d * 86400000).toISOString();
}

/** 유튜브 — 공개 채널 페이지(API 키 없을 때). 올린 시기는 "2주 전"처럼 대략값 */
export async function youtubePublic(handle: string): Promise<SnsStats> {
  const h = String(handle).replace(/^@/, '');
  const base = /^UC[\w-]{20,}$/.test(h) ? `https://www.youtube.com/channel/${h}` : `https://www.youtube.com/@${encodeURIComponent(h)}`;
  const html = await getText(`${base}/videos`);
  const subs = (/구독자\s*([\d.,]+\s*[만천억]?)명/.exec(html) || [])[1];
  // "동영상 1개를 삭제하시겠어요?" 같은 화면 문구에도 걸려서 가장 큰 값을 쓴다
  const vidCounts = [...html.matchAll(/동영상\s*([\d.,]+\s*[만천억]?)개/g)].map((m) => koNum(m[1]) || 0);
  const name = unent((/<meta property="og:title" content="([^"]*)"/.exec(html) || [])[1] || '');
  if (!subs && !name) throw new Error('채널을 찾지 못했습니다');
  // 동영상 탭 카드(lockupViewModel) — 영상 id·제목·"조회수 6.8천회"·"13일 전"
  const recent: Post[] = [];
  for (const seg of html.split('"lockupViewModel":{').slice(1)) {
    const id = (/"contentId":"([\w-]{11})"/.exec(seg) || [])[1];
    const title = (/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/.exec(seg) || [])[1];
    // 조회수·올린 시기는 제목 뒤 metadataRows 에 있다(카드 앞부분은 썸네일 정보가 길다)
    const mi = seg.indexOf('"lockupMetadataViewModel"');
    const labels = mi < 0 ? [] : [...seg.slice(mi, mi + 3000).matchAll(/"accessibilityLabel":"([^"]{1,40})"/g)].map((m) => m[1]);
    const views = labels.find((l) => /^조회수/.test(l)); const when = labels.find((l) => /전$/.test(l));
    if (!id || !title || !when || recent.some((p) => p.url?.endsWith(id))) continue;
    recent.push({ at: agoIso(when), likes: null, comments: null, views: views ? koNum(views.replace(/조회수\s*/, '')) : null, type: '영상', url: `https://www.youtube.com/watch?v=${id}`, caption: unent(title).slice(0, 120) });
    if (recent.length >= 15) break;
  }
  const followers = subs ? koNum(subs) : null;
  return { source: '유튜브 공개 채널 페이지(공개 페이지 수집 · 공식 API 아님, 올린 시기는 대략)', followers, posts: vidCounts.length ? Math.max(...vidCounts) : null, name,
    recent: recent.filter((p) => p.at), summary: summarize(recent.filter((p) => p.at), followers), fetchedAt: new Date().toISOString() };
}

/** 페이스북 — 공개 페이지 미리보기 정보(팔로워 수만). 게시물은 못 읽는다 */
export async function facebookPublic(handle: string): Promise<SnsStats> {
  const html = await getText(`https://www.facebook.com/${encodeURIComponent(String(handle))}`, 'facebookexternalhit/1.1');
  const desc = unent((/<meta (?:property="og:description"|name="description") content="([^"]*)"/.exec(html) || [])[1] || '');
  const title = unent((/<meta property="og:title" content="([^"]*)"/.exec(html) || [])[1] || '');
  const f = /팔로워\s*([\d.,]+\s*[만천억]?)\s*명/.exec(desc) || /([\d.,]+[KM]?)\s*followers/i.exec(desc);
  if (!f && !title) throw new Error('공개 페이지를 읽지 못했습니다');
  const followers = f ? koNum(f[1]) : null;
  return { source: '페이스북 공개 페이지 정보(공개 페이지 수집 · 공식 API 아님)', followers, posts: null, name: title.replace(/\s*\|.*$/, ''), bio: desc.slice(0, 200),
    recent: [], summary: summarize([], followers), note: '게시물 수·최근 게시는 공개 정보로 볼 수 없습니다', fetchedAt: new Date().toISOString() };
}

/** 인스타(연결 안 된 계정) — 외부 수집(Apify). Business Discovery 토큰이 없을 때 */
export const instagramExternalAvailable = () => Boolean(env.APIFY_TOKEN);
export async function instagramExternal(handle: string): Promise<SnsStats> {
  const h = String(handle).replace(/^@/, '').replace(/[^\w.]/g, '');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 180000);
  let items: any[] = [];
  try {
    const res = await fetch('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?timeout=170', {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: `Bearer ${env.APIFY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [h] }),
    });
    if (!res.ok) throw new Error(`Apify ${res.status} ${(await res.text()).slice(0, 120)}`);
    items = await res.json();
  } finally { clearTimeout(t); }
  const a = (Array.isArray(items) ? items : [])[0];
  if (!a || a.error || (!a.username && !a.followersCount)) throw new Error('계정을 찾지 못했거나 비공개 계정입니다');
  const recent: Post[] = (a.latestPosts || []).map((p: any) => ({
    at: iso(p.timestamp || ''), likes: n(p.likesCount), comments: n(p.commentsCount), views: n(p.videoViewCount),
    type: p.type === 'Video' ? '영상' : p.type === 'Sidecar' ? '여러 장' : '사진', url: p.url, caption: String(p.caption || '').slice(0, 120),
  })).filter((p: Post) => p.at);
  const followers = n(a.followersCount);
  return { source: 'Apify Instagram Profile Scraper(외부 수집 · 공식 API 아님)', followers, following: n(a.followsCount), posts: n(a.postsCount), name: a.fullName || a.username,
    bio: String(a.biography || '').slice(0, 200), recent, summary: summarize(recent, followers), fetchedAt: new Date().toISOString() };
}

/** D — 유튜브 채널(@핸들 또는 채널 id) */
export const youtubeAvailable = () => Boolean(env.YOUTUBE_API_KEY);
export async function youtubeChannel(handle: string): Promise<SnsStats> {
  const key = encodeURIComponent(env.YOUTUBE_API_KEY);
  const by = /^UC[\w-]{20,}$/.test(handle) ? `id=${handle}` : `forHandle=${encodeURIComponent(handle.startsWith('@') ? handle : `@${handle}`)}`;
  const ch = (await getJson(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${by}&key=${key}`)).items?.[0];
  if (!ch) throw new Error('채널을 찾지 못했습니다');
  const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
  const items = uploads ? (await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=${uploads}&key=${key}`)).items || [] : [];
  const ids = items.map((i: any) => i.contentDetails?.videoId).filter(Boolean).join(',');
  const vids = ids ? (await getJson(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${ids}&key=${key}`)).items || [] : [];
  const recent: Post[] = vids.map((v: any) => ({ at: v.snippet?.publishedAt, likes: n(v.statistics?.likeCount), comments: n(v.statistics?.commentCount), views: n(v.statistics?.viewCount),
    type: secs(v.contentDetails?.duration) <= 60 ? '쇼츠(1분 이하)' : '영상', url: `https://www.youtube.com/watch?v=${v.id}`, caption: String(v.snippet?.title || '').slice(0, 120) }));
  const followers = ch.statistics?.hiddenSubscriberCount ? null : n(ch.statistics?.subscriberCount);
  return { source: 'YouTube Data API(공식)', followers, posts: n(ch.statistics?.videoCount), name: ch.snippet?.title, bio: String(ch.snippet?.description || '').slice(0, 200), recent,
    summary: { ...summarize(recent, followers), totalViews: n(ch.statistics?.viewCount) } as any, fetchedAt: new Date().toISOString() };
}

/** 틱톡 — 외부 수집(Apify clockworks/tiktok-profile-scraper). 최근 영상 20개, 영상·표지 내려받기는 끈다(비용) */
export const tiktokAvailable = () => Boolean(env.APIFY_TOKEN);
export async function tiktokExternal(handle: string): Promise<SnsStats> {
  const h = String(handle).replace(/^@/, '').replace(/[^\w.]/g, '');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 180000);
  let items: any[] = [];
  try {
    const res = await fetch('https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items?timeout=170', {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: `Bearer ${env.APIFY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: [h], resultsPerPage: 20, profileScrapeSections: ['videos'], profileSorting: 'latest', shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false }),
    });
    if (!res.ok) throw new Error(`Apify ${res.status} ${(await res.text()).slice(0, 120)}`);
    items = await res.json();
  } finally { clearTimeout(t); }
  const vids = (Array.isArray(items) ? items : []).filter((x) => x && (x.createTimeISO || x.webVideoUrl));
  const a = vids[0]?.authorMeta || (Array.isArray(items) ? items[0]?.authorMeta : null) || {};
  if (!vids.length && !a.name) throw new Error('계정을 찾지 못했거나 비공개 계정입니다');
  const recent: Post[] = vids.map((v) => ({
    at: iso(v.createTimeISO || ''), likes: n(v.diggCount), comments: n(v.commentCount), views: n(v.playCount),
    type: v.isSlideshow ? '사진 슬라이드' : '영상', url: v.webVideoUrl, caption: String(v.text || '').slice(0, 120),
  })).filter((p) => p.at);
  const followers = n(a.fans);
  return { source: 'Apify TikTok Profile Scraper(외부 수집 · 공식 API 아님)', followers, following: n(a.following), posts: n(a.video), name: a.nickName || a.name,
    bio: String(a.signature || '').slice(0, 200), recent, summary: { ...summarize(recent, followers), totalHearts: n(a.heart) } as any, fetchedAt: new Date().toISOString() };
}

/** 네이버 블로그 — 공식 RSS(최근 글 50개 안팎). 좋아요·댓글 수는 RSS에 없다 */
export async function naverBlogRss(id: string): Promise<SnsStats> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  let xml = '';
  try {
    const res = await fetch(`https://rss.blog.naver.com/${encodeURIComponent(id)}.xml`, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (DoppiaSiteBuilder)' } });
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    xml = await res.text();
  } finally { clearTimeout(t); }
  const cdata = (s: string) => s.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
  const title = cdata((/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/.exec(xml) || [])[1] || '');
  const recent: Post[] = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
    at: iso(cdata((/<pubDate>([\s\S]*?)<\/pubDate>/.exec(m[1]) || [])[1] || '')),
    likes: null, comments: null, type: '글', url: cdata((/<link>([\s\S]*?)<\/link>/.exec(m[1]) || [])[1] || '').replace(/\?fromRss.*$/, ''),
    caption: cdata((/<title>([\s\S]*?)<\/title>/.exec(m[1]) || [])[1] || '').slice(0, 120),
  })).filter((p) => p.at);
  return { source: '네이버 블로그 RSS(공식)', followers: null, posts: null, name: title, recent, summary: summarize(recent, null), fetchedAt: new Date().toISOString() };
}
