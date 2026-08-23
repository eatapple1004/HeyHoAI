const { query } = require('../db/client');

/**
 * 캐러셀(여러 장 게시물) 파일 경로 — 슬라이드 순서 그대로.
 * 한 장짜리·구 데이터는 image_media_ids가 비어 NULL이 나오므로, 호출부는 image_path로 폴백한다.
 */
const CAROUSEL_PATHS = `(SELECT array_agg(am.file_path ORDER BY u.ord)
         FROM unnest(COALESCE(pq.image_media_ids, ARRAY[]::uuid[])) WITH ORDINALITY AS u(mid, ord)
         JOIN account_media am ON am.id = u.mid) AS image_paths`;

async function insert({ accountId, imageMediaId, reelMediaId, imageCaption, reelCaption, hashtags, bgmMediaId }) {
  const result = await query(
    `INSERT INTO post_queue (account_id, image_media_id, reel_media_id, image_caption, reel_caption, hashtags, bgm_media_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
    [accountId, imageMediaId || null, reelMediaId || null, imageCaption || null, reelCaption || null, hashtags || [], bgmMediaId || null]
  );
  return result.rows[0];
}

async function findByAccountId(accountId, { status, limit = 50, offset = 0 } = {}) {
  const conditions = ['pq.account_id = $1'];
  const params = [accountId];
  let i = 2;

  if (status) { conditions.push(`pq.status = $${i++}`); params.push(status); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path,
       ${CAROUSEL_PATHS},
       reel.file_path as reel_path,
       bgm.file_path as bgm_path
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     LEFT JOIN account_media bgm ON bgm.id = pq.bgm_media_id
     ${where}
     ORDER BY pq.created_at DESC LIMIT $${i++} OFFSET $${i}`,
    [...params, limit, offset]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path,
       ${CAROUSEL_PATHS},
       reel.file_path as reel_path,
       bgm.file_path as bgm_path
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     LEFT JOIN account_media bgm ON bgm.id = pq.bgm_media_id
     WHERE pq.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * 확정(confirmed) 상태 중 가장 오래된 항목 조회 (FIFO)
 */
async function findNextConfirmed(accountId) {
  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path,
       ${CAROUSEL_PATHS},
       reel.file_path as reel_path,
       bgm.file_path as bgm_path,
       sa.account_id as zernio_account_id
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     LEFT JOIN account_media bgm ON bgm.id = pq.bgm_media_id
     LEFT JOIN social_accounts sa ON sa.id = pq.account_id
     WHERE pq.account_id = $1 AND pq.status = 'confirmed'
     ORDER BY pq.created_at ASC LIMIT 1`,
    [accountId]
  );
  return result.rows[0] || null;
}

/**
 * 예약 시각이 도래한 항목을 **원자적으로 선점**한다(status: scheduled → publishing).
 *
 * 조회 후 발행하는 2단계로 만들면 폴링 주기가 겹치거나 프로세스가 둘이 될 때 같은 건을 두 번 올린다.
 * `FOR UPDATE SKIP LOCKED` + 조건부 UPDATE로 한 건은 한 워커만 집는다.
 *
 * @param {number} [limit] 한 틱에 집을 최대 건수
 * @returns {Promise<object[]>} 선점된 항목(미디어 경로·Zernio 계정 ID 포함)
 */
async function claimDueScheduled(limit = 20) {
  const claimed = await query(
    `UPDATE post_queue SET status = 'publishing', updated_at = now()
      WHERE id IN (
        SELECT id FROM post_queue
         WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()
         ORDER BY scheduled_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id`,
    [limit]
  );
  if (claimed.rows.length === 0) return [];

  const result = await query(
    `SELECT pq.*,
       img.file_path as image_path,
       ${CAROUSEL_PATHS},
       reel.file_path as reel_path,
       bgm.file_path as bgm_path,
       sa.account_id as zernio_account_id
     FROM post_queue pq
     LEFT JOIN account_media img ON img.id = pq.image_media_id
     LEFT JOIN account_media reel ON reel.id = pq.reel_media_id
     LEFT JOIN account_media bgm ON bgm.id = pq.bgm_media_id
     LEFT JOIN social_accounts sa ON sa.id = pq.account_id
     WHERE pq.id = ANY($1::uuid[])
     ORDER BY pq.scheduled_at`,
    [claimed.rows.map((r) => r.id)]
  );
  return result.rows;
}

/**
 * 선점만 되고 발행되지 못한 채 남은 항목을 되돌린다(프로세스가 발행 중 죽은 경우).
 * 안 되돌리면 'publishing'에 갇혀 영영 안 올라간다.
 */
async function reclaimStalePublishing(minutes = 30) {
  const result = await query(
    `UPDATE post_queue SET status = 'scheduled', updated_at = now()
      WHERE status = 'publishing'
        AND scheduled_at IS NOT NULL
        AND updated_at < now() - ($1 || ' minutes')::interval
      RETURNING id`,
    [String(minutes)]
  );
  return result.rows.length;
}

/**
 * 모든 계정에서 확정 항목이 있는 계정 ID 목록
 */
async function findAccountsWithConfirmed() {
  const result = await query(
    `SELECT DISTINCT pq.account_id, sa.account_id as zernio_account_id
     FROM post_queue pq
     JOIN social_accounts sa ON sa.id = pq.account_id AND sa.status = 'active'
     WHERE pq.status = 'confirmed'`
  );
  return result.rows;
}

async function update(id, fields) {
  const sets = [];
  const params = [id];
  let i = 2;

  if (fields.imageCaption !== undefined) { sets.push(`image_caption = $${i++}`); params.push(fields.imageCaption); }
  if (fields.reelCaption !== undefined) { sets.push(`reel_caption = $${i++}`); params.push(fields.reelCaption); }
  if (fields.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); params.push(fields.hashtags); }
  if (fields.status !== undefined) { sets.push(`status = $${i++}`); params.push(fields.status); }
  if (fields.postedAt !== undefined) { sets.push(`posted_at = $${i++}`); params.push(fields.postedAt); }
  if (fields.imagePostUrl !== undefined) { sets.push(`image_post_url = $${i++}`); params.push(fields.imagePostUrl); }
  if (fields.reelPostUrl !== undefined) { sets.push(`reel_post_url = $${i++}`); params.push(fields.reelPostUrl); }
  if (fields.bgmMediaId !== undefined) { sets.push(`bgm_media_id = $${i++}`); params.push(fields.bgmMediaId); }
  if (fields.error !== undefined) { sets.push(`error = $${i++}`); params.push(fields.error); }

  if (sets.length === 0) return findById(id);
  sets.push('updated_at = now()');

  const result = await query(
    `UPDATE post_queue SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM post_queue WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  insert, findByAccountId, findById, findNextConfirmed, findAccountsWithConfirmed,
  claimDueScheduled, reclaimStalePublishing, update, remove,
};
