const { Router } = require('express');
const svc = require('./templateData.service');

const router = Router();

// 얇은 라우트 — 로직은 templateData.service.js 단일소스(레거시·Nest 공용).
function handle(err, res, next) {
  if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
  next(err);
}

// 저장
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await svc.create(req.user.id, req.body) });
  } catch (err) { handle(err, res, next); }
});

// 목록 (로그인 사용자 소유분만)
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.list(req.user.id, req.query) });
  } catch (err) { handle(err, res, next); }
});

// 상세
router.get('/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getById(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

// 수정
router.patch('/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.update(req.user.id, req.params.id, req.body) });
  } catch (err) { handle(err, res, next); }
});

// 삭제
router.delete('/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.remove(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

module.exports = router;
