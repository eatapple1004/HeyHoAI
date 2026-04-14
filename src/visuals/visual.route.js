const { Router } = require('express');
const c = require('./visual.controller');

const router = Router();

// 카테고리 & 속성
router.get('/visuals/categories', c.listCategories);
router.get('/visuals/attributes', c.listAttributes);
router.post('/visuals/attributes', c.createAttribute);
router.post('/visuals/compile', c.compilePrompt);

// 캐릭터별 프리셋
router.post('/characters/:characterId/visual-presets', c.createPreset);
router.get('/characters/:characterId/visual-presets', c.listPresets);

module.exports = router;
