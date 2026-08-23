const Zernio = require('@zernio/node').default;
const { env } = require('../config');
const logger = require('../lib/logger');
const log = logger('Zernio');

let client = null;

function getClient() {
  if (!client) {
    if (!env.ZERNIO_API_KEY) throw new Error('ZERNIO_API_KEY not configured');
    client = new Zernio({ apiKey: env.ZERNIO_API_KEY });
  }
  return client;
}

/**
 * Zernio 계정 → 우리 필드명으로 정규화.
 * SDK는 `followersCount`/`profilePicture`로 주는데 우리 DB는 `followers`/`profile_image`다 —
 * 동기화 코드가 각자 acc.followers를 읽다가 전부 0으로 저장되던 원인이라 여기서 한 번만 맞춘다.
 * (followersCount는 analytics 애드온이 있어야 내려온다 — 없으면 0)
 */
function normalizeAccount(acc) {
  return {
    ...acc,
    followers: acc.followersCount ?? acc.followers ?? 0,
    profileImage: acc.profilePicture ?? acc.profileImage ?? null,
  };
}

/**
 * 연결된 계정 목록 조회
 */
async function listAccounts() {
  log.info('Fetching accounts');
  const { data } = await getClient().accounts.listAccounts();
  log.info('Accounts found:', data.accounts?.length || 0);
  return (data.accounts || []).map(normalizeAccount);
}

/**
 * 계정 상세 정보 (목록에서 추출)
 */
async function getAccountDetail(accountId) {
  log.info('Fetching account detail:', accountId);
  const { data } = await getClient().accounts.listAccounts();
  const account = (data.accounts || []).find(a => a._id === accountId);
  if (!account) throw new Error('Account not found in Zernio');
  return normalizeAccount(account);
}

/**
 * 인스타그램 피드 포스트
 */
async function postToInstagram({ accountId, content, mediaItems, scheduledFor, timezone }) {
  const body = {
    content,
    mediaItems,
    platforms: [{ platform: 'instagram', accountId }],
  };

  if (scheduledFor) {
    body.scheduledFor = scheduledFor;
    body.timezone = timezone || 'Asia/Seoul';
  } else {
    body.publishNow = true;
  }

  log.info('Posting to Instagram:', accountId, 'media:', mediaItems?.length);
  const { data } = await getClient().posts.createPost({ body });
  log.info('Post success:', data.post?._id, 'status:', data.post?.status);
  return data.post;
}

/**
 * 인스타그램 릴스 포스트
 */
async function postReelToInstagram({ accountId, content, videoUrl, shareToFeed = true, scheduledFor, timezone }) {
  const body = {
    content,
    mediaItems: [{ type: 'video', url: videoUrl }],
    platforms: [{
      platform: 'instagram',
      accountId,
      platformSpecificData: { contentType: 'reels', shareToFeed },
    }],
  };

  if (scheduledFor) {
    body.scheduledFor = scheduledFor;
    body.timezone = timezone || 'Asia/Seoul';
  } else {
    body.publishNow = true;
  }

  log.info('Posting Reel to Instagram:', accountId);
  const { data } = await getClient().posts.createPost({ body });
  log.info('Reel success:', data.post?._id);
  return data.post;
}

/**
 * 인스타그램 스토리 포스트
 */
async function postStoryToInstagram({ accountId, mediaUrl, mediaType = 'image' }) {
  const body = {
    mediaItems: [{ type: mediaType, url: mediaUrl }],
    platforms: [{
      platform: 'instagram',
      accountId,
      platformSpecificData: { contentType: 'story' },
    }],
    publishNow: true,
  };

  log.info('Posting Story to Instagram:', accountId);
  const { data } = await getClient().posts.createPost({ body });
  return data.post;
}

/**
 * 게시물 목록 조회
 */
async function getPosts(accountId, { limit = 30 } = {}) {
  log.info('Fetching posts:', accountId);
  const { data } = await getClient().posts.listPosts({
    query: { platform: 'instagram', accountId, limit },
  });
  return data;
}

module.exports = {
  listAccounts, getAccountDetail,
  postToInstagram, postReelToInstagram, postStoryToInstagram,
  getPosts,
};
