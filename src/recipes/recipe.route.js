const { Router } = require('express');
const { resolveRecipe } = require('./recipeResolver');
const recipeStore = require('./recipeStore');
const styleRepo = require('../generate/stylePreset.repository');
const visualRepo = require('../visuals/visualAttribute.repository');
const characterRepo = require('../characters/character.repository');
const { assertCharacterOwned } = require('../middleware/ownership');

const router = Router();
const PRODUCT_TAG = '[product]';

// presetMap/attributeMap 는 거의 안 바뀌므로 1회 로드 후 캐시 (resolver 입력)
let _maps = null;
async function getMaps() {
  if (_maps) return _maps;
  const [styles, attrs] = await Promise.all([styleRepo.findAll(), visualRepo.findAll()]);
  const presetMap = {};
  for (const s of styles) presetMap[s.name] = { prefix: s.prefix, suffix: s.suffix, negative: s.negative_prompt || '' };
  const attributeMap = {};
  for (const a of attrs) attributeMap[`${a.category_id}:${a.key}`] = a.prompt_fragment;
  _maps = { presetMap, attributeMap };
  return _maps;
}

/** GET /api/recipes?mode=&vertical= — 생성 가능한 레시피 카드 메타 목록 */
router.get('/', (req, res, next) => {
  try {
    res.json({ success: true, data: recipeStore.list({ mode: req.query.mode, vertical: req.query.vertical }) });
  } catch (err) { next(err); }
});

/**
 * POST /api/recipes/:id/resolve  { subjectId?, userSlots? }
 * 카드 id(slug) → 시드 config → resolveRecipe → 실제 생성 프롬프트(jobs)로 해석.
 * subjectId 주면 해당 캐릭터를 주어로(소유 검증), 없으면 미리보기용 일반 주어.
 */
router.post('/:id/resolve', async (req, res, next) => {
  try {
    const recipe = recipeStore.getById(req.params.id);
    if (!recipe) return res.status(404).json({ success: false, error: '레시피를 찾을 수 없습니다.' });

    const cfgSubjectType = (recipe.config.subject && recipe.config.subject.type) || 'face';
    let subject = { type: cfgSubjectType, name: 'subject' };

    const { subjectId, userSlots } = req.body || {};
    if (subjectId) {
      await assertCharacterOwned(subjectId, req.user.id);
      const ch = await characterRepo.findById(subjectId);
      if (!ch) return res.status(404).json({ success: false, error: '대상을 찾을 수 없습니다.' });
      subject = {
        type: cfgSubjectType,
        name: (ch.name || '').replace(PRODUCT_TAG, '').trim() || ch.name,
        reference_image_url: ch.reference_image_url || null,
      };
    }

    const { presetMap, attributeMap } = await getMaps();
    const resolved = resolveRecipe(recipe.config, { subject, presetMap, attributeMap, userSlots: userSlots || {} });

    const first = (resolved.jobs && resolved.jobs[0]) || {};
    res.json({
      success: true,
      data: {
        id: recipe.id,
        name: recipe.name,
        mode: recipe.mode,
        type: resolved.output_type === 'reel' ? 'reel' : 'image',
        ...resolved,
        // 스튜디오가 /api/generate 로 바로 보낼 수 있는 편의 필드
        // (resolver가 스타일 프리셋을 프롬프트에 이미 반영하므로 style='none')
        generate: {
          prompt: first.prompt || '',
          negativePrompt: first.negativePrompt || '',
          style: 'none',
          count: resolved.jobs ? resolved.jobs.length : 1,
        },
      },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
