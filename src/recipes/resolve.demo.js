/**
 * resolver 데모 — DB/네트워크 없이 실행.
 *   node src/recipes/resolve.demo.js
 * 추천 스키마(레시피)가 실제로 말이 되는 프롬프트를 만드는지 눈으로 검증한다.
 */
const { resolveRecipe } = require('./recipeResolver');
const influencer = require('./seeds/recipes.influencer');
const shopping = require('./seeds/recipes.shopping');

// migrate.js의 style_presets 시드 일부 (데모용 발췌)
const presetMap = {
  Film:     { prefix: '35mm film photography, Kodak Portra 400 film stock, analog camera shot,', suffix: 'warm film tones, natural grain, organic color palette, nostalgic warmth', negative: 'digital, clean, sharp, HDR, oversaturated' },
  Portrait: { prefix: 'professional portrait photography, studio lighting setup, 85mm lens, subject-focused,', suffix: 'soft bokeh background, catchlight in eyes, sharp focus on face', negative: 'wide angle, distorted, busy background' },
  Glamour:  { prefix: 'glamour photography, beauty lighting, magazine cover quality,', suffix: 'soft diffused lighting, glowing skin, glossy finish, elegant pose', negative: 'casual, everyday, harsh shadows' },
  Fashion:  { prefix: 'editorial fashion photography, Vogue magazine aesthetic, clothing as main subject,', suffix: 'professional fashion lighting, sharp fabric details, full outfit visible', negative: 'casual, low quality, blurry fabric, amateur' },
  Natural:  { prefix: 'raw candid photo, iPhone camera, unedited, everyday life moment,', suffix: 'natural skin texture, slight grain, realistic, Instagram style', negative: 'studio lighting, over-retouched, artificial, posed' },
};

// visual_attributes 시드 일부 (데모용 발췌)
const attributeMap = {
  'lighting:golden_hour':  'golden hour lighting, warm orange sunlight, long shadows',
  'lighting:natural_soft': 'soft natural lighting, diffused daylight',
  'lighting:studio_soft':  'soft studio lighting, diffused softbox, even illumination',
  'lighting:ring_light':   'ring light, even facial illumination, circular catchlight in eyes',
  'color:film_kodak':      'Kodak Portra 400 film emulation, warm skin tones, soft grain',
  'color:film_fuji':       'Fujifilm Superia look, slightly cool greens, warm highlights',
  'color:warm_tone':       'warm color grading, amber and golden tones',
  'color:neutral_tone':    'neutral balanced color palette, true to life colors',
  'texture:grain_film':    'subtle film grain, analog texture',
  'texture:skin_dewy':     'dewy glowing skin, natural moisture',
  'texture:skin_smooth':   'smooth flawless skin, beauty retouch look',
  'texture:fabric_detail': 'detailed fabric texture, visible weave pattern, realistic material',
  'context:cafe_indoor':   'cozy indoor cafe setting, coffee shop atmosphere',
  'context:studio_white':  'clean white studio background, professional photo studio setup',
  'context:street_urban':  'modern urban street, city buildings',
  'composition:full_body': 'full body shot, head to toe visible',
};

function show(seed) {
  const subject = seed.config.subject.type === 'product'
    ? { type: 'product', name: 'Sample Product' }
    : { type: 'face', name: 'My Face' };
  const r = resolveRecipe(seed.config, { subject, presetMap, attributeMap });
  console.log('\n' + '='.repeat(80));
  console.log(`▶ [${seed.mode}/${seed.category}] ${seed.name}`);
  console.log(`  output=${r.output_type}  aspect=${r.aspect_ratio}  jobs=${r.jobs.length}  cost=◈${r.credit_cost}` + (r.reel ? `  reel=${JSON.stringify(r.reel)}` : ''));
  r.jobs.forEach((j, i) => {
    console.log(`\n  ── ${j.variationLabel}` + (j.motion ? `  [motion: ${j.motion}, ${j.duration}s]` : ''));
    console.log('    +  ' + j.prompt);
    if (i === 0) console.log('    -  ' + j.negativePrompt);  // negative는 첫 컷만 출력(동일)
  });
}

console.log('################  INFLUENCER  ################');
influencer.forEach(show);
console.log('\n\n################  SHOPPING  ################');
shopping.forEach(show);
console.log('\n');
