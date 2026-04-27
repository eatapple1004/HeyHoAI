const { query } = require('../db/client');

/**
 * 캐릭터를 DB에 저장한다.
 * @param {{ name: string; concept: string; persona: object }} data
 * @returns {Promise<object>} 저장된 row
 */
async function insert({ name, concept, persona }) {
  const result = await query(
    `INSERT INTO characters (name, concept, persona, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *`,
    [name, concept, JSON.stringify(persona)]
  );
  return result.rows[0];
}

/**
 * ID로 캐릭터를 조회한다.
 * @param {string} id UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const result = await query('SELECT * FROM characters WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * 캐릭터 목록을 조회한다.
 * @param {{ status?: string; limit?: number; offset?: number }} opts
 * @returns {Promise<{ rows: object[]; total: number }>}
 */
async function findAll({ status, limit = 20, offset = 0 } = {}) {
  const conditions = ["status != 'archived'"];
  const params = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*) FROM characters ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT * FROM characters ${where} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return { rows: dataResult.rows, total };
}

/**
 * 캐릭터 상태를 업데이트한다.
 * @param {string} id
 * @param {string} status
 * @returns {Promise<object|null>}
 */
async function updateStatus(id, status) {
  const result = await query(
    `UPDATE characters SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
}

/**
 * 캐릭터의 대표 이미지(reference image)를 지정한다.
 * 이후 이미지 생성 시 이 이미지를 reference로 사용하여 동일 인물을 유지한다.
 *
 * @param {string} characterId
 * @param {string} imageId - image_assets.id
 * @param {string} imageUrl - 이미지 URL 또는 로컬 경로
 */
async function setReferenceImage(characterId, imageId, imageUrl) {
  const result = await query(
    `UPDATE characters
     SET reference_image_id = $1, reference_image_url = $2, updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [imageId, imageUrl, characterId]
  );
  return result.rows[0] || null;
}

/**
 * 캐릭터의 대표 이미지를 해제한다.
 */
async function clearReferenceImage(characterId) {
  const result = await query(
    `UPDATE characters
     SET reference_image_id = NULL, reference_image_url = NULL, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [characterId]
  );
  return result.rows[0] || null;
}

module.exports = { insert, findById, findAll, updateStatus, setReferenceImage, clearReferenceImage };
