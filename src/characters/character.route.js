const { Router } = require('express');
const controller = require('./character.controller');

const router = Router();

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id/reference-image', controller.setReferenceImage);
router.delete('/:id/reference-image', controller.clearReferenceImage);

module.exports = router;
