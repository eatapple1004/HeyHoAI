const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query } = require('../db/client');

const router = Router();

const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `logo_${crypto.randomUUID()}${path.extname(file.originalname) || '.png'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** 사용자 브랜드킷 조회 (없으면 기본값) */
async function getBrandKit(userId) {
  const r = await query('SELECT logo_url, primary_color, font_name, enabled FROM brand_kits WHERE user_id = $1', [userId]);
  return r.rows[0] || { logo_url: null, primary_color: null, font_name: null, enabled: false };
}

/** GET /api/brand-kit */
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await getBrandKit(req.user.id) });
  } catch (err) { next(err); }
});

/** PATCH /api/brand-kit { primaryColor?, fontName?, enabled? } */
router.patch('/', async (req, res, next) => {
  try {
    const { primaryColor, fontName, enabled } = req.body || {};
    const r = await query(
      `INSERT INTO brand_kits (user_id, primary_color, font_name, enabled, updated_at)
       VALUES ($1, $2, $3, COALESCE($4, false), now())
       ON CONFLICT (user_id) DO UPDATE SET
         primary_color = COALESCE($2, brand_kits.primary_color),
         font_name     = COALESCE($3, brand_kits.font_name),
         enabled       = COALESCE($4, brand_kits.enabled),
         updated_at    = now()
       RETURNING logo_url, primary_color, font_name, enabled`,
      [req.user.id, primaryColor || null, fontName || null, typeof enabled === 'boolean' ? enabled : null]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/** POST /api/brand-kit/logo (multipart: logo) */
router.post('/logo', upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'logo file required' });
    const logoUrl = `/images/${req.file.filename}`;
    const r = await query(
      `INSERT INTO brand_kits (user_id, logo_url, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET logo_url = $2, updated_at = now()
       RETURNING logo_url, primary_color, font_name, enabled`,
      [req.user.id, logoUrl]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

module.exports = { router, getBrandKit };
