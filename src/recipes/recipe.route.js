const { Router } = require('express');
const recipeService = require('./recipe.service');

const router = Router();

/** GET /api/recipes?mode=&vertical= — 생성 가능한 레시피 카드 메타 목록 */
router.get('/', (req, res, next) => {
  try {
    res.json({ success: true, data: recipeService.list({ mode: req.query.mode, vertical: req.query.vertical }) });
  } catch (err) { next(err); }
});

/**
 * POST /api/recipes/:id/resolve  { subjectId?, userSlots? }
 * 카드 id(slug) → 시드 config → resolveRecipe → 실제 생성 프롬프트(jobs)로 해석.
 */
router.post('/:id/resolve', async (req, res, next) => {
  try {
    res.json({ success: true, data: await recipeService.resolve(req.params.id, req.user.id, req.body || {}) });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
