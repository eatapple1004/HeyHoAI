const publishJobRepo = require('./publishJob.repository');
const contentRepo = require('./content.repository');

/**
 * 콘텐츠에 대한 게시 Job을 생성한다.
 *
 * - approved 상태의 콘텐츠만 게시 가능
 * - scheduledAt이 있으면 예약 게시, 없으면 즉시 게시 대기
 * - 콘텐츠 상태를 scheduled로 변경
 *
 * @param {string} contentId
 * @param {{ scheduledAt?: string }} [opts]
 * @returns {Promise<{ content: object; publishJob: object }>}
 */
async function schedulePublish(contentId, opts = {}) {
  const content = await contentRepo.findById(contentId);
  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404 });
  }
  if (content.status !== 'approved') {
    throw Object.assign(
      new Error(`Content must be approved before scheduling. Current: "${content.status}"`),
      { statusCode: 400 }
    );
  }

  // 예약 시간 유효성 검사
  if (opts.scheduledAt) {
    const scheduledDate = new Date(opts.scheduledAt);
    if (scheduledDate <= new Date()) {
      throw Object.assign(
        new Error('Scheduled time must be in the future'),
        { statusCode: 400 }
      );
    }
  }

  // Publish Job 생성
  const publishJob = await publishJobRepo.insert({
    contentId,
    characterId: content.character_id,
    scheduledAt: opts.scheduledAt,
  });

  // 콘텐츠 상태 업데이트
  const updatedContent = await contentRepo.update(contentId, {
    status: 'scheduled',
    scheduled_at: opts.scheduledAt || null,
  });

  return { content: updatedContent, publishJob };
}

/**
 * 즉시 게시를 실행한다.
 * 실제 Instagram Graph API 호출은 이 함수에서 수행.
 * (현재는 stub — Instagram API 연동 시 구현)
 *
 * @param {string} publishJobId
 */
async function executePublish(publishJobId) {
  const job = await publishJobRepo.findById(publishJobId);
  if (!job) {
    throw Object.assign(new Error('Publish job not found'), { statusCode: 404 });
  }
  if (job.status !== 'pending') {
    throw Object.assign(
      new Error(`Job is already "${job.status}"`),
      { statusCode: 400 }
    );
  }

  try {
    await publishJobRepo.updateStatus(publishJobId, {
      status: 'publishing',
      attempt: (job.attempt || 0) + 1,
    });

    // ┌─────────────────────────────────────────────────┐
    // │ Instagram Graph API 호출 지점 (추후 구현)         │
    // │                                                   │
    // │ 1. POST /{ig-user-id}/media — 미디어 컨테이너 생성 │
    // │ 2. POST /{ig-user-id}/media_publish — 게시        │
    // │ 3. 반환된 ig_media_id, permalink 저장              │
    // └─────────────────────────────────────────────────┘

    // Stub: 실제 API 연동 전까지 성공 시뮬레이션
    const igResult = {
      igMediaId: `stub_${Date.now()}`,
      igPermalink: `https://www.instagram.com/p/stub_${Date.now()}`,
    };

    // Job 완료
    await publishJobRepo.updateStatus(publishJobId, {
      status: 'published',
      igMediaId: igResult.igMediaId,
      igPermalink: igResult.igPermalink,
    });

    // 콘텐츠 상태 업데이트
    await contentRepo.updateStatus(job.content_id, 'published');

    return publishJobRepo.findById(publishJobId);
  } catch (err) {
    await publishJobRepo.updateStatus(publishJobId, {
      status: 'failed',
      error: err.message,
      attempt: (job.attempt || 0) + 1,
    });

    await contentRepo.updateStatus(job.content_id, 'failed');

    throw err;
  }
}

/**
 * 실패한 게시를 재시도한다.
 */
async function retryPublish(publishJobId) {
  const job = await publishJobRepo.findById(publishJobId);
  if (!job) {
    throw Object.assign(new Error('Publish job not found'), { statusCode: 404 });
  }
  if (job.status !== 'failed') {
    throw Object.assign(
      new Error('Only failed jobs can be retried'),
      { statusCode: 400 }
    );
  }

  // 상태 리셋
  await publishJobRepo.updateStatus(publishJobId, { status: 'pending' });
  await contentRepo.updateStatus(job.content_id, 'scheduled');

  return executePublish(publishJobId);
}

/**
 * 예약된 게시를 취소한다.
 */
async function cancelPublish(publishJobId) {
  const job = await publishJobRepo.findById(publishJobId);
  if (!job) {
    throw Object.assign(new Error('Publish job not found'), { statusCode: 404 });
  }
  if (!['pending', 'scheduled'].includes(job.status)) {
    throw Object.assign(
      new Error(`Cannot cancel job in "${job.status}" status`),
      { statusCode: 400 }
    );
  }

  await publishJobRepo.updateStatus(publishJobId, { status: 'cancelled' });
  await contentRepo.updateStatus(job.content_id, 'approved'); // 승인 상태로 되돌림

  return publishJobRepo.findById(publishJobId);
}

/**
 * 캐릭터의 게시 Job 목록 조회
 */
async function listPublishJobs(characterId, opts) {
  return publishJobRepo.findByCharacterId(characterId, opts);
}

module.exports = {
  schedulePublish,
  executePublish,
  retryPublish,
  cancelPublish,
  listPublishJobs,
};
