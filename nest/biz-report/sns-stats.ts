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
