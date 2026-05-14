const postQueueRepo = require('./postQueue.repository');
const zernio = require('./zernio.client');
const logger = require('../lib/logger');
const log = logger('Scheduler');
const path = require('path');
const fs = require('fs');
const { env } = require('../config');

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

        const zernioAccountId = acc.zernio_account_id;
        log.info(`Publishing queue ${item.id} for account ${acc.account_id}`);

        // 기본 캡션 fallback
        const accountRepo = require('./account.repository');
        const account = await accountRepo.findById(acc.account_id);
        const accMeta = account?.metadata || {};
        const imageCaption = item.image_caption || accMeta.defaultImageCaption || '';
        const reelCaption = item.reel_caption || accMeta.defaultReelCaption || '';

        let imagePostUrl = null;
        let reelPostUrl = null;
        const baseUrl = env.PUBLIC_URL || `http://13.209.72.131:${env.PORT}`;

        // 1) 이미지 → 게시물 업로드
        if (item.image_path) {
          try {
            const imageFilename = item.image_path.split('/').pop();
            const imageUrl = `${baseUrl}/images/${imageFilename}`;
            const post = await zernio.postToInstagram({
              accountId: zernioAccountId,
              content: imageCaption + '\n' + (item.hashtags || []).join(' '),
              mediaItems: [{ type: 'image', url: imageUrl }],
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
            let reelFilename = item.reel_path.split('/').pop();

            // BGM이 있으면 ffmpeg로 합치기
            if (item.bgm_path) {
              try {
                const { execSync } = require('child_process');
                const crypto = require('crypto');
                const reelFullPath = path.join(process.cwd(), item.reel_path);
                const bgmFullPath = path.join(process.cwd(), item.bgm_path);
                const mergedFilename = `merged_${crypto.randomUUID()}.mp4`;
                const mergedPath = path.join(process.cwd(), 'tmp', 'images', mergedFilename);

                if (fs.existsSync(reelFullPath) && fs.existsSync(bgmFullPath)) {
                  execSync(`ffmpeg -i "${reelFullPath}" -i "${bgmFullPath}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest -y "${mergedPath}" 2>/dev/null`, { timeout: 30000 });
                  reelFilename = mergedFilename;
                  log.info(`BGM merged: ${mergedFilename}`);
                } else {
                  log.warn('BGM or reel file not found, uploading without BGM');
                }
              } catch (ffErr) {
                log.warn(`BGM merge failed: ${ffErr.message}, uploading without BGM`);
              }
            }

            const reelUrl = `${baseUrl}/images/${reelFilename}`;
            const post = await zernio.postReelToInstagram({
              accountId: zernioAccountId,
              content: reelCaption + '\n' + (item.hashtags || []).join(' '),
              videoUrl: reelUrl,
            });
            reelPostUrl = post?.platformPostUrl || post?._id || 'posted';
            log.info(`Reel posted: ${reelPostUrl}`);
          } catch (err) {
            log.error(`Reel post failed: ${err.message}`);
          }
        }

        // 상태 업데이트
        await postQueueRepo.update(item.id, {
          status: 'posted',
          postedAt: new Date().toISOString(),
          imagePostUrl,
          reelPostUrl,
        });
        log.info(`Queue ${item.id} marked as posted`);

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
 * 매일 18:00 KST에 실행하는 타이머 시작
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
  log.info('Scheduler started (daily 18:00 KST)');
}

/**
 * 개별 Queue 아이템 즉시 업로드
 */
async function publishSingleItem(queueId) {
  const item = await postQueueRepo.findById(queueId);
  if (!item) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });

  const accountRepo = require('./account.repository');
  const account = await accountRepo.findById(item.account_id);
  if (!account) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  const zernioAccountId = account.account_id;
  const accMeta = account.metadata || {};
  const imageCaption = item.image_caption || accMeta.defaultImageCaption || '';
  const reelCaption = item.reel_caption || accMeta.defaultReelCaption || '';
  const baseUrl = env.PUBLIC_URL || `http://13.209.72.131:${env.PORT}`;

  let imagePostUrl = null;
  let reelPostUrl = null;

  log.info(`Publishing single queue ${queueId}`);

  // 1) 이미지
  if (item.image_path) {
    try {
      const imageFilename = item.image_path.split('/').pop();
      const post = await zernio.postToInstagram({
        accountId: zernioAccountId,
        content: imageCaption + '\n' + (item.hashtags || []).join(' '),
        mediaItems: [{ type: 'image', url: `${baseUrl}/images/${imageFilename}` }],
      });
      imagePostUrl = post?.platformPostUrl || post?._id || 'posted';
      log.info(`Image posted: ${imagePostUrl}`);
    } catch (err) {
      log.error(`Image post failed: ${err.message}`);
    }
  }

  // 2) 릴스 + BGM
  if (item.reel_path) {
    try {
      let reelFilename = item.reel_path.split('/').pop();

      if (item.bgm_path) {
        try {
          const { execSync } = require('child_process');
          const crypto = require('crypto');
          const reelFullPath = path.join(process.cwd(), item.reel_path);
          const bgmFullPath = path.join(process.cwd(), item.bgm_path);
          const mergedFilename = `merged_${crypto.randomUUID()}.mp4`;
          const mergedPath = path.join(process.cwd(), 'tmp', 'images', mergedFilename);

          if (fs.existsSync(reelFullPath) && fs.existsSync(bgmFullPath)) {
            execSync(`ffmpeg -i "${reelFullPath}" -i "${bgmFullPath}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest -y "${mergedPath}" 2>/dev/null`, { timeout: 30000 });
            reelFilename = mergedFilename;
            log.info(`BGM merged: ${mergedFilename}`);
          }
        } catch (ffErr) {
          log.warn(`BGM merge failed: ${ffErr.message}`);
        }
      }

      const post = await zernio.postReelToInstagram({
        accountId: zernioAccountId,
        content: reelCaption + '\n' + (item.hashtags || []).join(' '),
        videoUrl: `${baseUrl}/images/${reelFilename}`,
      });
      reelPostUrl = post?.platformPostUrl || post?._id || 'posted';
      log.info(`Reel posted: ${reelPostUrl}`);
    } catch (err) {
      log.error(`Reel post failed: ${err.message}`);
    }
  }

  await postQueueRepo.update(queueId, {
    status: 'posted',
    postedAt: new Date().toISOString(),
    imagePostUrl,
    reelPostUrl,
  });

  log.info(`Queue ${queueId} published`);
  return { imagePostUrl, reelPostUrl };
}

module.exports = { publishConfirmedItems, publishSingleItem, startScheduler };
