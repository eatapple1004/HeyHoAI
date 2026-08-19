import { graphBase, AuthMode } from './meta-ig.client';

/**
 * Instagram 콘텐츠 발행(Graph API 직결).
 *
 * ⚠️ 인스타 발행은 **업로드가 아니라 2단계**다. 파일을 우리가 올리는 게 아니라
 *   URL을 알려주면 **인스타가 그 주소로 가져간다**.
 *     ① 컨테이너 생성  POST /{ig-user-id}/media          → creation_id
 *     ② 발행          POST /{ig-user-id}/media_publish  ← creation_id
 *   이 구조 때문에 미디어는 **공개된 https URL**이어야 한다(우리는 PUBLIC_URL/images/… 로 이미 만족).
 *
 * ⚠️ 영상(릴스·스토리)은 ①과 ② 사이에 **인코딩 시간**이 있다. 바로 ②를 부르면 실패한다.
 *   status_code가 FINISHED가 될 때까지 폴링해야 한다 — 이미지엔 없는 단계다.
 */

/** 이미지 대기 — 인스타가 URL에서 파일을 가져오는 시간. 영상(5분)보다 훨씬 짧게 잡는다. */
const IMAGE_WAIT = { timeoutMs: 90 * 1000, intervalMs: 1500 };

/** 캐러셀 상한 — 넘기면 인스타가 거절한다. */
export const CAROUSEL_MAX = 10;

export type PublishKind = 'image' | 'carousel' | 'reel' | 'story';

export interface PublishResult {
  mediaId: string;
  permalink: string | null;
  /** 영상이면 인코딩을 기다린 시간(초) — 느리면 여기서 드러난다. */
  waitedSec?: number;
}

async function call(url: string, init?: RequestInit, what = '요청'): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* HTML 에러 페이지 */ }
  if (!res.ok) {
    const e = body?.error || {};
    // Meta 에러는 message 말고 error_user_msg에 사람이 읽을 원인이 들어오는 경우가 많다.
    const detail = e.error_user_msg || e.message || (text || '').slice(0, 300);
    throw new Error(`${what} 실패 (${res.status}${e.code ? ` · code ${e.code}` : ''}): ${detail}`);
  }
  return body ?? {};
}

function form(params: Record<string, string | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, v);
  return p;
}

/** ① 컨테이너 생성 */
async function createContainer(
  base: string, igUserId: string, token: string, params: Record<string, string | undefined>,
): Promise<string> {
  const body = form({ ...params, access_token: token });
  const data = await call(`${base}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, '컨테이너 생성');
  if (!data.id) throw new Error('컨테이너 생성 실패: id가 없습니다');
  return String(data.id);
}

/**
 * 컨테이너가 준비될 때까지 대기.
 *
 * ⚠️ **영상만이 아니라 이미지·캐러셀도 기다려야 한다**(2026-08-19 실측).
 *   인스타는 우리가 준 URL로 파일을 **가지러 간다**. 그 가져오기가 끝나기 전에 발행을 부르면
 *   `code 9007 — 아직 준비가 완료되지 않아 미디어를 게시할 수 없습니다`로 400이 난다.
 *   이미지는 대개 1~3초면 끝나지만 '대개'에 기대면 간헐적으로 실패한다.
 * 실패를 오래 붙들고 있지 않도록 ERROR면 즉시 던진다 — 타임아웃까지 기다리면 원인이 묻힌다.
 */
async function waitReady(
  base: string, containerId: string, token: string,
  { timeoutMs = 5 * 60 * 1000, intervalMs = 3000 } = {},
): Promise<number> {
  const started = Date.now();
  for (;;) {
    const q = new URLSearchParams({ fields: 'status_code,status', access_token: token });
    const data = await call(`${base}/${containerId}?${q.toString()}`, undefined, '컨테이너 상태 조회');
    const code = String(data.status_code || '');
    if (code === 'FINISHED') return Math.round((Date.now() - started) / 1000);
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`인스타가 영상을 처리하지 못했습니다 (${code}): ${data.status || '사유 미제공'}`);
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`영상 인코딩이 ${Math.round(timeoutMs / 1000)}초 안에 끝나지 않았습니다 (마지막 상태 ${code || '알 수 없음'})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** ② 발행 + 퍼머링크 조회 */
async function publishContainer(
  base: string, igUserId: string, token: string, creationId: string,
): Promise<{ mediaId: string; permalink: string | null }> {
  const data = await call(`${base}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form({ creation_id: creationId, access_token: token }).toString(),
  }, '발행');
  const mediaId = String(data.id || '');
  if (!mediaId) throw new Error('발행 실패: 미디어 id가 없습니다');

  // 퍼머링크는 부가 정보다 — 못 얻어도 발행은 이미 성공이므로 삼킨다.
  let permalink: string | null = null;
  try {
    const q = new URLSearchParams({ fields: 'permalink', access_token: token });
    const info = await call(`${base}/${mediaId}?${q.toString()}`, undefined, '퍼머링크 조회');
    permalink = info.permalink || null;
  } catch { /* 무시 */ }
  return { mediaId, permalink };
}

export interface PublishInput {
  token: string;
  igUserId: string;
  authMode?: AuthMode;
  kind: PublishKind;
  caption?: string;
  /** image·carousel·(이미지)story */
  imageUrls?: string[];
  /** reel·(영상)story */
  videoUrl?: string;
  /** 릴스를 피드에도 노출할지 */
  shareToFeed?: boolean;
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  const base = graphBase(input.authMode || 'instagram');
  const { igUserId, token } = input;
  const caption = input.caption || undefined;

  if (input.kind === 'image') {
    const url = (input.imageUrls || [])[0];
    if (!url) throw new Error('이미지 URL이 필요합니다');
    const c = await createContainer(base, igUserId, token, { image_url: url, caption });
    const waitedSec = await waitReady(base, c, token, IMAGE_WAIT);
    return { ...(await publishContainer(base, igUserId, token, c)), waitedSec };
  }

  if (input.kind === 'carousel') {
    const urls = (input.imageUrls || []).slice(0, CAROUSEL_MAX);
    if (urls.length < 2) throw new Error('캐러셀은 이미지가 2장 이상이어야 합니다');
    // 자식 컨테이너는 is_carousel_item=true 로 만들고 캡션을 달지 않는다(캡션은 부모 것만 쓰인다).
    const children: string[] = [];
    for (const url of urls) {
      const child = await createContainer(base, igUserId, token, { image_url: url, is_carousel_item: 'true' });
      // 자식이 준비되기 전에 부모를 만들면 부모가 통째로 ERROR가 된다 — 한 장씩 확인하고 넘어간다.
      await waitReady(base, child, token, IMAGE_WAIT);
      children.push(child);
    }
    const parent = await createContainer(base, igUserId, token, {
      media_type: 'CAROUSEL', children: children.join(','), caption,
    });
    const waitedSec = await waitReady(base, parent, token, IMAGE_WAIT);
    return { ...(await publishContainer(base, igUserId, token, parent)), waitedSec };
  }

  if (input.kind === 'reel') {
    if (!input.videoUrl) throw new Error('영상 URL이 필요합니다');
    const c = await createContainer(base, igUserId, token, {
      media_type: 'REELS',
      video_url: input.videoUrl,
      caption,
      share_to_feed: input.shareToFeed === false ? 'false' : 'true',
    });
    const waitedSec = await waitReady(base, c, token);
    return { ...(await publishContainer(base, igUserId, token, c)), waitedSec };
  }

  // story — 이미지면 image_url, 영상이면 video_url. 영상은 역시 인코딩을 기다린다.
  const isVideo = Boolean(input.videoUrl);
  const url = isVideo ? input.videoUrl : (input.imageUrls || [])[0];
  if (!url) throw new Error('스토리에 올릴 미디어 URL이 필요합니다');
  const c = await createContainer(base, igUserId, token, {
    media_type: 'STORIES',
    ...(isVideo ? { video_url: url } : { image_url: url }),
  });
  const waitedSec = await waitReady(base, c, token, isVideo ? undefined : IMAGE_WAIT);
  return { ...(await publishContainer(base, igUserId, token, c)), waitedSec };
}

/**
 * 24시간 발행 한도. 인스타는 계정당 하루 게시 수를 막는데,
 * 걸리면 에러 메시지가 "권한" 문제처럼 보여서 원인을 엉뚱한 데서 찾게 된다. 미리 보여준다.
 */
export async function quota(igUserId: string, token: string, mode: AuthMode = 'instagram'): Promise<{ used: number; cap: number | null }> {
  const base = graphBase(mode);
  const q = new URLSearchParams({ fields: 'config,quota_usage', access_token: token });
  const data = await call(`${base}/${igUserId}/content_publishing_limit?${q.toString()}`, undefined, '발행 한도 조회');
  const row = (data.data || [])[0] || {};
  return { used: Number(row.quota_usage) || 0, cap: row.config?.quota_total ?? null };
}
