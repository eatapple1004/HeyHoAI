const { query } = require('../db/client');

/** statusCode를 가진 에러 (errorHandler가 그대로 응답) */
function forbidden(message = 'Forbidden') {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

/**
 * 캐릭터가 해당 사용자 소유인지 검증한다. 아니면 403 throw.
 * @param {string} characterId
 * @param {string} userId
 */
async function assertCharacterOwned(characterId, userId) {
  if (!characterId) throw forbidden('characterId is required');
  // 개인 소유(team_id NULL & 본인) 또는 그 캐릭터가 속한 팀의 멤버면 접근 허용
  const result = await query(
    `SELECT 1 FROM characters c
     WHERE c.id = $1 AND (
       c.user_id = $2
       OR (c.team_id IS NOT NULL AND c.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
     )`,
    [characterId, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 캐릭터에 접근 권한이 없습니다.');
  }
}

/**
 * 소셜 계정이 해당 사용자 소유인지 검증한다. 아니면 403 throw.
 * @param {string} accountId
 * @param {string} userId
 */
async function assertAccountOwned(accountId, userId) {
  if (!accountId) throw forbidden('accountId is required');
  const result = await query(
    'SELECT 1 FROM social_accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 계정에 접근 권한이 없습니다.');
  }
}

/**
 * 콘텐츠가 (해당 캐릭터를 통해) 사용자 소유인지 검증한다.
 * @param {string} contentId
 * @param {string} userId
 */
async function assertContentOwned(contentId, userId) {
  if (!contentId) throw forbidden('contentId is required');
  const result = await query(
    `SELECT 1 FROM contents c JOIN characters ch ON ch.id = c.character_id
     WHERE c.id = $1 AND ch.user_id = $2`,
    [contentId, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 콘텐츠에 접근 권한이 없습니다.');
  }
}

/**
 * 발행 작업이 (해당 캐릭터를 통해) 사용자 소유인지 검증한다.
 * @param {string} publishJobId
 * @param {string} userId
 */
async function assertPublishJobOwned(publishJobId, userId) {
  if (!publishJobId) throw forbidden('publishJobId is required');
  const result = await query(
    `SELECT 1 FROM publish_jobs pj JOIN characters ch ON ch.id = pj.character_id
     WHERE pj.id = $1 AND ch.user_id = $2`,
    [publishJobId, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 발행 작업에 접근 권한이 없습니다.');
  }
}

/**
 * 프롬프트가 사용자 소유인지 검증한다.
 * @param {number|string} idx prompts.idx
 * @param {string} userId
 */
async function assertPromptOwned(idx, userId) {
  const result = await query(
    `SELECT 1 FROM prompts p WHERE p.idx = $1 AND (
       p.user_id = $2
       OR (p.team_id IS NOT NULL AND p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
     )`,
    [idx, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 프롬프트에 접근 권한이 없습니다.');
  }
}

/**
 * 리뷰가 (해당 프롬프트를 통해) 사용자 소유인지 검증한다.
 * @param {number|string} idx reviews.idx
 * @param {string} userId
 */
async function assertReviewOwned(idx, userId) {
  const result = await query(
    `SELECT 1 FROM reviews r JOIN prompts p ON p.idx = r.prompt_idx
     WHERE r.idx = $1 AND (
       p.user_id = $2
       OR (p.team_id IS NOT NULL AND p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
     )`,
    [idx, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 리뷰에 접근 권한이 없습니다.');
  }
}

// account_id를 가진 자식 테이블 화이트리스트 (SQL 인젝션 방지)
const ACCOUNT_CHILD_TABLES = new Set([
  'account_media',
  'post_queue',
  'reel_templates',
  'outfit_prompts',
]);

/**
 * 소셜 계정 하위 리소스(미디어/큐/템플릿/의상프롬프트)가 사용자 소유인지 검증한다.
 * 리소스 → social_accounts.user_id 체인으로 확인.
 * @param {string} table 화이트리스트에 있는 테이블명
 * @param {string} id 리소스 id
 * @param {string} userId
 */
async function assertAccountResourceOwned(table, id, userId) {
  if (!ACCOUNT_CHILD_TABLES.has(table)) throw forbidden('Invalid resource table');
  if (!id) throw forbidden('resource id is required');
  const result = await query(
    `SELECT 1 FROM ${table} t JOIN social_accounts sa ON sa.id = t.account_id
     WHERE t.id = $1 AND sa.user_id = $2`,
    [id, userId]
  );
  if (result.rowCount === 0) {
    throw forbidden('해당 리소스에 접근 권한이 없습니다.');
  }
}

module.exports = {
  assertCharacterOwned,
  assertAccountOwned,
  assertContentOwned,
  assertPublishJobOwned,
  assertAccountResourceOwned,
  assertPromptOwned,
  assertReviewOwned,
};
