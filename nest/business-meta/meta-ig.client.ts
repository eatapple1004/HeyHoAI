import * as path from 'path';

/**
 * Instagram Business Login 직결 클라이언트 — Zernio 같은 중개 없이 Meta에 바로 붙는다.
 *
 * 왜 만들었나 — Zernio는 **연결 프로필당 과금**이라 고객이 늘면 그대로 사용자당 원가가 된다.
 *   직결이 가능한지, 그리고 어디까지 되는지를 실제로 재보려고 `/admin-business-meta`를 따로 뒀다.
 *   기존 Zernio 경로(`/admin-business`)는 한 줄도 건드리지 않는다 — 나란히 놓고 비교하는 게 목적이다.
 *
 * ⚠️ 아래 상수·처리는 전부 **실측으로 얻은 함정**이다(2026-08-17~18 ADAM HQ 연동 기록).
 *   문서만 보고 고치면 다시 밟는다.
 *   ① client_id는 **Instagram 앱 ID**다 — Meta 앱 ID와 다른 숫자.
 *   ② 콜백 `code` 끝에 `#_`가 붙어 온다. 그대로 교환하면 거절당한다.
 *   ③ 토큰 종류에 따라 호스트가 갈린다(instagram ↔ facebook). 안 맞추면 전부 401.
 *   ④ 리디렉션 URI는 **HTTPS**여야 한다. 개발 모드여도 http를 거절한다(Facebook 로그인과 다름).
 *   ⑤ 개발 모드에선 **앱에 역할이 있는(테스터 수락한) 계정만** 인증된다.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_IG = 'https://graph.instagram.com';
const GRAPH_FB = 'https://graph.facebook.com';
const API_VERSION = 'v23.0';

/** 게시·댓글까지 필요한 최소 스코프. 늘리면 사용자가 동의 화면을 다시 통과해야 한다. */
export const SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
].join(',');

export type AuthMode = 'instagram' | 'facebook';

export interface IgProfile {
  id: string;
  username: string;
  accountType?: string;
  profilePictureUrl?: string | null;
  followersCount?: number;
}

export interface IgTokenResult {
  accessToken: string;
  /** 만료까지 남은 초. 장기 토큰이면 약 60일. */
  expiresIn: number | null;
  permissions?: string;
}

/** 자격증명이 설정됐는가 — 미설정이면 화면에서 연결 버튼을 잠근다. */
export function isConfigured(): boolean {
  return Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET);
}

/**
 * authorize와 token 교환에서 **완전히 같은 값**이어야 하고, Meta 콘솔 등록값과도 같아야 한다.
 * 한 글자라도 다르면 교환 단계에서 거절된다(에러 메시지가 원인을 알려주지 않는다).
 */
export function redirectUri(req?: any): string {
  if (env.INSTAGRAM_REDIRECT_URI) return env.INSTAGRAM_REDIRECT_URI;
  const base = env.PUBLIC_URL || (req ? `${req.protocol}://${req.get('host')}` : '');
  return `${String(base).replace(/\/$/, '')}/api/admin/business-meta/oauth/callback`;
}

/** 동의 화면 URL */
export function authorizeUrl(state: string, req?: any): string {
  const params = new URLSearchParams({
    client_id: String(env.INSTAGRAM_APP_ID),
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * 콜백 code 정리 — 끝의 `#_`를 떼지 않으면 교환이 거절된다(실측).
 * 브라우저가 프래그먼트로 처리하지 않고 쿼리값에 그대로 실어 보낸다.
 */
export function cleanCode(code: string): string {
  return String(code || '').replace(/#_$/, '');
}

/** 응답 본문을 항상 읽어서 에러에 실어 준다 — Meta 에러는 본문에만 원인이 있다. */
async function readOrThrow(res: Response, what: string): Promise<any> {
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* HTML 에러 페이지일 수 있다 */ }
  if (!res.ok) {
    const detail = body?.error_message || body?.error?.message || body?.error_description
      || (text || '').slice(0, 300);
    throw new Error(`${what} 실패 (${res.status}): ${detail}`);
  }
  return body ?? {};
}

/** ① code → 단기 토큰(약 1시간) */
export async function exchangeCode(code: string, req?: any): Promise<{ accessToken: string; userId: string; permissions?: string }> {
  const form = new URLSearchParams({
    client_id: String(env.INSTAGRAM_APP_ID),
    client_secret: String(env.INSTAGRAM_APP_SECRET),
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(req),
    code: cleanCode(code),
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await readOrThrow(res, '단기 토큰 교환');
  if (!data.access_token) throw new Error('단기 토큰 교환 실패: access_token이 없습니다');
  return { accessToken: data.access_token, userId: String(data.user_id ?? ''), permissions: data.permissions };
}

/** ② 단기 → 장기 토큰(약 60일). 이걸 저장한다. */
export async function exchangeLongLived(shortToken: string): Promise<IgTokenResult> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: String(env.INSTAGRAM_APP_SECRET),
    access_token: shortToken,
  });
  const res = await fetch(`${GRAPH_IG}/access_token?${params.toString()}`);
  const data = await readOrThrow(res, '장기 토큰 교환');
  return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || null };
}

/**
 * ③ 장기 토큰 갱신(60일 연장).
 * ⚠️ Meta는 "발급 후 24시간이 지났고 아직 만료되지 않은" 토큰만 갱신을 받아준다.
 *   만료된 뒤에는 갱신이 불가능하고 사용자를 다시 OAuth에 태워야 한다 —
 *   그래서 갱신은 만료 임박이 아니라 **여유 있게(기본 7일 전)** 돌린다.
 */
export async function refreshLongLived(token: string): Promise<IgTokenResult> {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token });
  const res = await fetch(`${GRAPH_IG}/refresh_access_token?${params.toString()}`);
  const data = await readOrThrow(res, '토큰 갱신');
  return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || null };
}

/** 토큰 종류에 맞는 그래프 호스트 — 안 맞추면 모든 호출이 401이 된다(실측). */
export function graphBase(mode: AuthMode = 'instagram'): string {
  return `${mode === 'facebook' ? GRAPH_FB : GRAPH_IG}/${API_VERSION}`;
}

/**
 * 내 프로필. followers_count·profile_picture_url은 계정 유형·권한에 따라 안 내려올 수 있어,
 * 실패하면 필수 필드만으로 한 번 더 시도한다 — 부가 필드 때문에 연결 자체가 깨지면 안 된다.
 */
export async function me(token: string, mode: AuthMode = 'instagram'): Promise<IgProfile> {
  const call = async (fields: string) => {
    const params = new URLSearchParams({ fields, access_token: token });
    const res = await fetch(`${graphBase(mode)}/me?${params.toString()}`);
    return readOrThrow(res, '프로필 조회');
  };
  let data: any;
  try {
    data = await call('id,username,account_type,profile_picture_url,followers_count');
  } catch {
    data = await call('id,username');
  }
  return {
    id: String(data.id),
    username: data.username,
    accountType: data.account_type,
    profilePictureUrl: data.profile_picture_url ?? null,
    followersCount: Number(data.followers_count) || 0,
  };
}
