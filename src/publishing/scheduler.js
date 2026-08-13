const postQueueRepo = require('./postQueue.repository');
const accountRepo = require('./account.repository');
const zernio = require('./zernio.client');
const logger = require('../lib/logger');
const log = logger('Scheduler');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { env } = require('../config');
const mediaStore = require('../storage/mediaStore');

/** 예약 발행 폴링 주기 — 예약은 분 단위라 1분이면 충분하다 */
const DUE_POLL_MS = 60 * 1000;

/** 발행 파일이 공개되는 베이스 URL(Zernio가 여기로 미디어를 가져간다) */
const baseUrl = () => env.PUBLIC_URL || `http://13.209.72.131:${env.PORT}`;

/**
 * 릴스에 BGM을 입힌다. 실패하면 원본 파일명을 그대로 돌려준다 —
 * BGM은 부가 요소라 여기서 막히면 발행 자체를 못 하는 게 더 손해다.
 * @returns {Promise<string>} 업로드에 쓸 파일명
 */
async function mergeBgm(reelPath, bgmPath) {
  const reelFilename = reelPath.split('/').pop();
  if (!bgmPath) return reelFilename;

  try {
    const reelFullPath = path.join(process.cwd(), reelPath);
    const bgmFullPath = path.join(process.cwd(), bgmPath);
    if (!fs.existsSync(reelFullPath) || !fs.existsSync(bgmFullPath)) {
      log.warn('BGM or reel file not found, uploading without BGM');
      return reelFilename;
    }

    const mergedFilename = `merged_${crypto.randomUUID()}.mp4`;
    const mergedPath = path.join(process.cwd(), 'tmp', 'images', mergedFilename);
    execSync(
      `ffmpeg -i "${reelFullPath}" -i "${bgmFullPath}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest -y "${mergedPath}" 2>/dev/null`,
      { timeout: 30000 }
    );
    await mediaStore.putFile(mergedPath); // 영속 스토리지 best-effort(미설정 시 no-op)
    log.info(`BGM merged: ${mergedFilename}`);
    return mergedFilename;
  } catch (err) {
    log.warn(`BGM merge failed: ${err.message}, uploading without BGM`);
    return reelFilename;
  }
}

/**
 * 큐 한 건을 인스타그램에 올리고 결과를 기록한다.
 *
 * 확정(FIFO 루프)·예약(시각 도래)·수동 즉시 발행 세 경로가 전부 이 함수를 탄다 —
 * 발행 로직이 세 벌로 갈라지면 BGM·캡션 폴백 같은 수정이 한쪽에만 반영된다.
 *
 * 이미지/릴스 각각의 업로드 실패는 삼킨다(한쪽만 성공해도 나머지는 올려야 하므로).
 *
 * @param {object} item  post_queue 행(+ image_path/reel_path/bgm_path 조인)
 * @param {string} zernioAccountId  Zernio 계정 ID(social_accounts.account_id)
 * @param {object} accMeta  계정 metadata(기본 캡션 폴백)
 */
async function publishItem(item, zernioAccountId, accMeta = {}) {
  const imageCaption = item.image_caption || accMeta.defaultImageCaption || '';
  const reelCaption = item.reel_caption || accMeta.defaultReelCaption || '';
  const tags = (item.hashtags || []).join(' ');

  let imagePostUrl = null;
  let reelPostUrl = null;

  // 1) 이미지 → 피드 게시물
  if (item.image_path) {
    try {
      const imageFilename = item.image_path.split('/').pop();
      const post = await zernio.postToInstagram({
        accountId: zernioAccountId,
        content: `${imageCaption}\n${tags}`,
        mediaItems: [{ type: 'image', url: `${baseUrl()}/images/${imageFilename}` }],
      });
      imagePostUrl = post?.platformPostUrl || post?._id || 'posted';
      log.info(`Image posted: ${imagePostUrl}`);
    } catch (err) {
      log.error(`Image post failed: ${err.message}`);
    }
  }

  // 2) 릴스 → BGM 합치기 → 릴스 업로드
  if (item.reel_path) {
    try {
      const reelFilename = await mergeBgm(item.reel_path, item.bgm_path);
      const post = await zernio.postReelToInstagram({
        accountId: zernioAccountId,
        content: `${reelCaption}\n${tags}`,
        videoUrl: `${baseUrl()}/images/${reelFilename}`,
      });
      reelPostUrl = post?.platformPostUrl || post?._id || 'posted';
      log.info(`Reel posted: ${reelPostUrl}`);
    } catch (err) {
      log.error(`Reel post failed: ${err.message}`);
    }
  }

  await postQueueRepo.update(item.id, {
    status: 'posted',
    postedAt: new Date().toISOString(),
    imagePostUrl,
    reelPostUrl,
  });
  log.info(`Queue ${item.id} marked as posted`);

  return { imagePostUrl, reelPostUrl };
}

/**
 * 확정(confirmed) 상태의 큐 항목을 Zernio로 업로드
 * 계정당 가장 오래된 1건씩 (FIFO)
 */
async function publishConfirmedItems() {
  log.info('Starting scheduled publish...');

  try {
    const accounts = await postQueueRepo.findAccountsWithConfirmed();
    if (accounts.length === 0) {
      log.info('No confirmed items to publish');
      return;
    }

    for (const acc of accounts) {
      try {
        const item = await postQueueRepo.findNextConfirmed(acc.account_id);
        if (!item) continue;

        log.info(`Publishing queue ${item.id} for account ${acc.account_id}`);
        const account = await accountRepo.findById(acc.account_id);
        await publishItem(item, acc.zernio_account_id, account?.metadata || {});
      } catch (err) {
        log.error(`Publish error for account ${acc.account_id}: ${err.message}`);
      }
    }

    log.info('Scheduled publish complete');
  } catch (err) {
    log.error('Scheduler error:', err.message);
  }
}

/**
 * 예약 시각(scheduled_at)이 도래한 항목을 발행한다.
 *
 * 확정 루프와 달리 **계정당 1건 제한이 없다** — 관리자가 시각을 직접 정한 건이라
 * 그 시각에 올라가는 게 계약이다.
 */
async function publishDueScheduled() {
  try {
    const reclaimed = await postQueueRepo.reclaimStalePublishing();
    if (reclaimed > 0) log.warn(`Reclaimed ${reclaimed} stale publishing item(s)`);

    const due = await postQueueRepo.claimDueScheduled();
    if (due.length === 0) return;

    log.info(`Publishing ${due.length} due scheduled item(s)`);
    for (const item of due) {
      try {
        const account = await accountRepo.findById(item.account_id);
        if (!account) {
          log.error(`Queue ${item.id}: account ${item.account_id} not found`);
          continue; // 선점 상태로 남았다가 reclaim이 되돌린다
        }
        await publishItem(item, item.zernio_account_id || account.account_id, account.metadata || {});
      } catch (err) {
        log.error(`Scheduled publish error for queue ${item.id}: ${err.message}`);
      }
    }
  } catch (err) {
    log.error('Due-scheduled poll error:', err.message);
  }
}

/**
 * 백그라운드 발행 루프 시작.
 *   ① 매일 18:00 KST — 확정(confirmed) 건을 계정당 1건씩
 *   ② 매 1분 — 예약 시각이 도래한(scheduled) 건
 */
function startScheduler() {
  function scheduleNext() {
    const now = new Date();
    // KST = UTC+9
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const target = new Date(kstNow);
    target.setHours(18, 0, 0, 0);

    // 이미 18시가 지났으면 내일
    if (kstNow >= target) {
      target.setDate(target.getDate() + 1);
    }

    // UTC로 변환
    const targetUtc = new Date(target.getTime() - 9 * 60 * 60 * 1000);
    const delay = targetUtc.getTime() - now.getTime();

    log.info(`Next publish scheduled at ${target.toISOString().replace('Z', '+09:00')} (in ${Math.round(delay / 60000)}min)`);

    setTimeout(async () => {
      await publishConfirmedItems();
      scheduleNext(); // 다음 날 예약
    }, delay);
  }

  scheduleNext();

  // 예약 발행 폴링. 이전 틱이 아직 도는 중이면 건너뛴다 — 겹쳐 돌면
  //   같은 건을 두 번 집을 위험(선점 쿼리가 막지만) 없이 로그만 지저분해진다.
  let polling = false;
  setInterval(async () => {
    if (polling) return;
    polling = true;
    try {
      await publishDueScheduled();
    } finally {
      polling = false;
    }
  }, DUE_POLL_MS);

  log.info(`Scheduler started (daily 18:00 KST · due-scheduled poll every ${DUE_POLL_MS / 1000}s)`);
}

/**
 * 개별 Queue 아이템 즉시 업로드 (관리자 수동 발행)
 */
async function publishSingleItem(queueId) {
  const item = await postQueueRepo.findById(queueId);
  if (!item) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });

  const account = await accountRepo.findById(item.account_id);
  if (!account) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  log.info(`Publishing single queue ${queueId}`);
  return publishItem(item, account.account_id, account.metadata || {});
}

module.exports = { publishConfirmedItems, publishDueScheduled, publishSingleItem, startScheduler };
