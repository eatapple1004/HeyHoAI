const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const accountRepo = require('./account.repository');
const mediaRepo = require('./accountMedia.repository');
const zernio = require('./zernio.client');
const logger = require('../lib/logger');
const log = logger('Account');

const router = Router();

const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * GET /api/accounts/sync
 * Zernio에서 연결된 계정 목록을 가져와 DB에 동기화
 */
router.post('/sync', async (_req, res, next) => {
  try {
    const accounts = await zernio.listAccounts();
    const synced = [];

    for (const acc of accounts) {
      const saved = await accountRepo.insert({
        platform: acc.platform,
        accountId: acc._id,
        username: acc.username,
        displayName: acc.displayName || acc.username,
        profileImage: acc.profileImage || null,
        followers: acc.followers || 0,
        metadata: acc,
      });
      synced.push(saved);
    }

    log.info(`Synced ${synced.length} accounts from Zernio`);
    res.json({ success: true, data: synced, synced: synced.length });
  } catch (err) {
    log.error('Sync failed:', err.message);
    next(err);
  }
});

/**
 * GET /api/accounts
 * 저장된 계정 목록 조회
 */
router.get('/', async (req, res, next) => {
  try {
    const { platform, status } = req.query;
    const accounts = await accountRepo.findAll({
      platform: platform || undefined,
      status: status || undefined,
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/accounts/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/accounts/:id/status
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const account = await accountRepo.updateStatus(req.params.id, status);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/accounts/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const account = await accountRepo.remove(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════
// Account Media
// ══════════════════════════════════════

/**
 * GET /api/accounts/:id/media
 */
router.get('/:id/media', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const media = await mediaRepo.findByAccountId(req.params.id, {
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    const count = await mediaRepo.countByAccountId(req.params.id);
    res.json({ success: true, data: media, total: count });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/:id/media/upload
 * 이미지 직접 업로드
 */
router.post('/:id/media/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File is required' });
    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const filename = req.file.filename;
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const { caption, hashtags } = req.body;

    const media = await mediaRepo.insert({
      accountId: req.params.id,
      filePath: `tmp/images/${filename}`,
      mediaType,
      caption: caption || null,
      hashtags: hashtags ? JSON.parse(hashtags) : [],
    });

    log.info(`Media uploaded: ${filename} → account ${account.username}`);
    res.status(201).json({ success: true, data: media });
  } catch (err) { next(err); }
});

/**
 * POST /api/accounts/:id/media/register
 * Generate 페이지에서 기존 이미지를 계정에 등록
 */
router.post('/:id/media/register', async (req, res, next) => {
  try {
    const { filePath, mediaType, caption, hashtags } = req.body;
    if (!filePath) return res.status(400).json({ success: false, error: 'filePath is required' });

    const account = await accountRepo.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const media = await mediaRepo.insert({
      accountId: req.params.id,
      filePath,
      mediaType: mediaType || 'image',
      caption: caption || null,
      hashtags: hashtags || [],
    });

    log.info(`Media registered: ${filePath} → account ${account.username}`);
    res.status(201).json({ success: true, data: media });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/accounts/media/:mediaId
 */
router.patch('/media/:mediaId', async (req, res, next) => {
  try {
    const { caption, hashtags, status } = req.body;
    const media = await mediaRepo.update(req.params.mediaId, { caption, hashtags, status });
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/accounts/media/:mediaId
 */
router.delete('/media/:mediaId', async (req, res, next) => {
  try {
    const media = await mediaRepo.remove(req.params.mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (err) { next(err); }
});

module.exports = router;
