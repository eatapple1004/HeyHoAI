const { Router } = require('express');
const multer = require('multer');
const brandkitService = require('./brandkit.service');

const router = Router();

const upload = multer(brandkitService.multerOptions(multer));

/** GET /api/brand-kit */
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await brandkitService.getBrandKit(req.user.id) });
  } catch (err) { next(err); }
});

/** PATCH /api/brand-kit { primaryColor?, fontName?, enabled? } */
router.patch('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await brandkitService.updateBrandKit(req.user.id, req.body || {}) });
  } catch (err) { next(err); }
});

/** POST /api/brand-kit/logo (multipart: logo) */
router.post('/logo', upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'logo file required' });
    res.json({ success: true, data: await brandkitService.setLogo(req.user.id, req.file.filename) });
  } catch (err) { next(err); }
});

module.exports = { router, getBrandKit: brandkitService.getBrandKit };
