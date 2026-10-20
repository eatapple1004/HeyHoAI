/**
 * SNS 계정 주소 다루기 — 홈페이지 HTML·검색 결과에서 공식 계정 링크를 골라 플랫폼별로 정리한다.
 *   공유 버튼(sharer.php, intent/tweet)·게시물 하나 링크(/p/…)·로그인 링크는 계정이 아니라서 뺀다.
 */
export type SnsPlatform = 'instagram' | 'facebook' | 'youtube' | 'naverBlog' | 'kakaoChannel' | 'threads' | 'tiktok' | 'x';
export interface SnsLink { platform: SnsPlatform; handle: string; url: string }

export const SNS_LABEL: Record<SnsPlatform, string> = {
  instagram: '인스타그램', facebook: '페이스북', youtube: '유튜브', naverBlog: '네이버 블로그', kakaoChannel: '카카오톡 채널', threads: '스레드', tiktok: '틱톡', x: 'X(트위터)',
};

const NOT_ACCOUNT = /^(p|reel|reels|explore|stories|accounts|share|sharer|sharer\.php|intent|hashtag|watch|results|embed|plugins|dialog|login|home|search|tv|tr|policies|legal|about|help)$/i;

/** 주소 하나 → 계정. 계정이 아니면 null */
export function toSns(raw: string): SnsLink | null {
  let u: URL;
  try { u = new URL(raw.replace(/&amp;/g, '&')); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|mobile)\./, '').toLowerCase();
  const seg = u.pathname.split('/').filter(Boolean);
  const first = decodeURIComponent(seg[0] || '');
  const mk = (platform: SnsPlatform, handle: string, url: string): SnsLink | null =>
    handle && !NOT_ACCOUNT.test(handle.replace(/^@/, '')) ? { platform, handle: handle.replace(/^@/, ''), url } : null;
  if (host === 'instagram.com' || host === 'instagr.am') return mk('instagram', first, `https://www.instagram.com/${first}/`);
  if (host === 'threads.net' || host === 'threads.com') return mk('threads', first, `https://www.threads.net/${first.startsWith('@') ? first : `@${first}`}`);
  if (host === 'facebook.com' || host === 'fb.com') {
    if (first === 'profile.php') return u.searchParams.get('id') ? { platform: 'facebook', handle: u.searchParams.get('id') as string, url: u.href } : null;
    if (first === 'pages' && seg[1]) return mk('facebook', seg[1], `https://www.facebook.com/${seg.slice(0, 3).join('/')}`);
    return mk('facebook', first, `https://www.facebook.com/${first}`);
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    if (first.startsWith('@')) return mk('youtube', first, `https://www.youtube.com/${first}`);
    if (['channel', 'c', 'user'].includes(first) && seg[1]) return mk('youtube', seg[1], `https://www.youtube.com/${first}/${seg[1]}`);
    return null;
  }
  if (host === 'blog.naver.com') {
    // 글 하나 링크(PostView·logNo·/아이디/숫자)는 손님 후기일 때가 많다 — 계정으로 치지 않는다
    if (/PostView|PostList/i.test(u.pathname) || u.searchParams.get('logNo') || /^\d{6,}$/.test(seg[1] || '')) return null;
    const id = u.searchParams.get('blogId') || first;
    return id && !/\.naver$|PostView|PostList/i.test(id) ? mk('naverBlog', id, `https://blog.naver.com/${id}`) : null;
  }
  if (host === 'pf.kakao.com') return mk('kakaoChannel', first, `https://pf.kakao.com/${first}`);
  if (host === 'tiktok.com') return first.startsWith('@') ? mk('tiktok', first, `https://www.tiktok.com/${first}`) : null;
  if (host === 'x.com' || host === 'twitter.com') return mk('x', first, `https://x.com/${first}`);
  return null;
}

/** HTML 안 링크에서 SNS 계정만 */
export function snsFromHtml(html: string): SnsLink[] {
  const out = new Map<string, SnsLink>();
  for (const m of String(html || '').matchAll(/https?:\/\/[^\s"'<>()]+/gi)) {
    const l = toSns(m[0]);
    if (l) out.set(`${l.platform}:${l.handle.toLowerCase()}`, l);
  }
  return [...out.values()];
}
