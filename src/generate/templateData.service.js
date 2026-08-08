const { query } = require('../db/client');

// 사용자 템플릿 데이터(template_data) 단일소스 — 레거시 라우트(template.route.js)와 Nest(nest/template-data) 공용.

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/** 저장 (201) */
async function create(userId, body = {}) {
  const { templateType, characterId, name, data } = body;
  if (!templateType || !name) throw httpError(400, 'templateType and name required');
  const result = await query(
    `INSERT INTO template_data (user_id, template_type, character_id, name, data)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, templateType, characterId || null, name, JSON.stringify(data || {})]
  );
  return result.rows[0];
}

/** 목록 (로그인 사용자 소유분만) */
async function list(userId, { templateType, characterId } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let i = 2;
  if (templateType) { conditions.push(`template_type = $${i++}`); params.push(templateType); }
  if (characterId) { conditions.push(`character_id = $${i++}`); params.push(characterId); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const result = await query(`SELECT * FROM template_data ${where} ORDER BY updated_at DESC`, params);
  return result.rows;
}

/** 상세 */
async function getById(userId, id) {
  const result = await query('SELECT * FROM template_data WHERE id = $1 AND user_id = $2', [id, userId]);
  if (result.rows.length === 0) throw httpError(404, 'Not found');
  return result.rows[0];
}

/** 수정(부분) */
async function update(userId, id, body = {}) {
  const { name, data } = body;
  const sets = ['updated_at = now()'];
  const params = [id, userId];
  let i = 3;
  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (data !== undefined) { sets.push(`data = $${i++}`); params.push(JSON.stringify(data)); }
  const result = await query(`UPDATE template_data SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`, params);
  if (result.rows.length === 0) throw httpError(404, 'Not found');
  return result.rows[0];
}

/** 삭제 */
async function remove(userId, id) {
  const result = await query('DELETE FROM template_data WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
  if (result.rows.length === 0) throw httpError(404, 'Not found');
  return result.rows[0];
}

module.exports = { create, list, getById, update, remove };
