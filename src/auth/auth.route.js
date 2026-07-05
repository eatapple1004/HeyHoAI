const { Router } = require('express');
const controller = require('./auth.controller');
const google = require('./google');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);
router.patch('/me', requireAuth, controller.updateProfile);
router.delete('/me', requireAuth, controller.deleteAccount);

// Google OAuth (소셜 로그인) — 공개
router.get('/google', google.googleStart);
router.get('/google/callback', google.googleCallback);

module.exports = router;
