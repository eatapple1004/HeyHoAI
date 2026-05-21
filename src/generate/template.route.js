const { Router } = require('express');
const { query } = require('../db/client');

const router = Router();

// 저장
router.post('/', async (req, res, next) => {
  try {
    const { templateType, characterId, name, data } = req.body;
    if (!templateType || !name) return res.status(400).json({ success: false, error: 'templateType and name required' });

    const result = await query(
      `INSERT INTO template_data (template_type, character_id, name, data)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [templateType, characterId || null, name, JSON.stringify(data || {})]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// 목록
router.get('/', async (req, res, next) => {
  try {
    const { templateType, characterId } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;
    if (templateType) { conditions.push(`template_type = $${i++}`); params.push(templateType); }
    if (characterId) { conditions.push(`character_id = $${i++}`); params.push(characterId); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await query(`SELECT * FROM template_data ${where} ORDER BY updated_at DESC`, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// 상세
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM template_data WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// 수정
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, data } = req.body;
    const sets = ['updated_at = now()'];
    const params = [req.params.id];
    let i = 2;
    if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
    if (data !== undefined) { sets.push(`data = $${i++}`); params.push(JSON.stringify(data)); }
    const result = await query(`UPDATE template_data SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// 삭제
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM template_data WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
