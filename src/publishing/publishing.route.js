const { Router } = require('express');
const c = require('./publishing.controller');

const router = Router();

// ─── Contents ───
router.post('/contents', c.createContent);
router.get('/contents/:id', c.getContent);
router.patch('/contents/:id', c.updateContent);
router.post('/contents/:id/regenerate-caption', c.regenerateCaption);
router.post('/contents/:id/approve', c.approveContent);
router.post('/contents/:id/reject', c.rejectContent);
router.get('/characters/:characterId/contents', c.listContents);

// ─── Publishing ───
router.post('/contents/:id/schedule', c.schedulePublish);
router.post('/contents/:id/publish-now', c.publishNow);
router.post('/publish-jobs/:id/retry', c.retryPublish);
router.post('/publish-jobs/:id/cancel', c.cancelPublish);
router.get('/characters/:characterId/publish-jobs', c.listPublishJobs);

module.exports = router;
