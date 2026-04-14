const { Router } = require('express');
const controller = require('./image.controller');

const router = Router();

// 캐릭터 기준 이미지 라우트
router.post('/characters/:characterId/images/generate', controller.generate);
router.get('/characters/:characterId/images', controller.listByCharacter);
router.get('/characters/:characterId/images/jobs', controller.listJobs);
router.put('/characters/:characterId/images/:imageId/master', controller.setMaster);

// 이미지 단건 조회
router.get('/images/:id', controller.getById);

module.exports = router;
