const { Router } = require('express');
const accountRepo = require('./account.repository');
const zernio = require('./zernio.client');
const logger = require('../lib/logger');
const log = logger('Account');

const router = Router();

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

module.exports = router;
