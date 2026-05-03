const { env } = require('../config');
const logger = require('../lib/logger');
const log = logger('Zernio');

const BASE_URL = 'https://zernio.com/api/v1';

function headers() {
  if (!env.ZERNIO_API_KEY) throw new Error('ZERNIO_API_KEY not configured');
  return {
    'Authorization': `Bearer ${env.ZERNIO_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Zernio에 연결된 계정 목록 조회
 */
async function listAccounts() {
  log.info('Fetching accounts');
  const res = await fetch(`${BASE_URL}/accounts`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) {
    log.error('List accounts failed:', res.status, JSON.stringify(data));
    throw new Error(data.message || `Zernio API error ${res.status}`);
  }
  log.info('Accounts found:', data.accounts?.length || 0);
  return data.accounts || [];
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

  log.info('Posting to Instagram:', accountId, 'media:', mediaItems?.length, 'scheduled:', !!scheduledFor);
  const res = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    log.error('Post failed:', res.status, JSON.stringify(data).slice(0, 500));
    throw new Error(data.message || `Zernio post failed ${res.status}`);
  }
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
  const res = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    log.error('Reel post failed:', res.status, JSON.stringify(data).slice(0, 500));
    throw new Error(data.message || `Zernio reel failed ${res.status}`);
  }
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
  const res = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    log.error('Story post failed:', res.status, JSON.stringify(data).slice(0, 500));
    throw new Error(data.message || `Zernio story failed ${res.status}`);
  }
  return data.post;
}

module.exports = { listAccounts, postToInstagram, postReelToInstagram, postStoryToInstagram };
