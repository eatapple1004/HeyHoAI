const { Router } = require('express');
const controller = require('./video.controller');

const router = Router();

// 캐릭터 기준 영상 라우트
router.post('/characters/:characterId/videos/generate', controller.generate);
router.get('/characters/:characterId/videos', controller.listByCharacter);
router.get('/characters/:characterId/videos/jobs', controller.listJobs);

// 영상/Job 단건 조회
router.get('/videos/:id', controller.getById);
router.get('/videos/jobs/:jobId', controller.getJob);

module.exports = router;
