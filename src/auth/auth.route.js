const { Router } = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
