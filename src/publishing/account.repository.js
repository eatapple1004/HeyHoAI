const { query } = require('../db/client');

async function insert({ platform, accountId, username, displayName, profileImage, followers, metadata }) {
  const result = await query(
    `INSERT INTO social_accounts (platform, account_id, username, display_name, profile_image, followers, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (platform, account_id) DO UPDATE SET
       username = EXCLUDED.username,
       display_name = EXCLUDED.display_name,
       profile_image = EXCLUDED.profile_image,
       followers = EXCLUDED.followers,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING *`,
    [platform, accountId, username, displayName, profileImage, followers || 0, JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}

async function findAll({ platform, status } = {}) {
  const conditions = [];
  const params = [];
  let i = 1;

  if (platform) { conditions.push(`platform = $${i++}`); params.push(platform); }
  if (status) { conditions.push(`status = $${i++}`); params.push(status); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const result = await query(
    `SELECT * FROM social_accounts ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM social_accounts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateStatus(id, status) {
  const result = await query(
    'UPDATE social_accounts SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM social_accounts WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = { insert, findAll, findById, updateStatus, remove };
