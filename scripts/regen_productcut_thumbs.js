/**
 * regen_productcut_thumbs.js — Product Cut 대표이미지를 "실제 템플릿"으로 재생성
 * ------------------------------------------------------------------------------
 * 사용자 지시(2026-07-11): product-cut 부모 + flat-lay + ghost-mannequin 썸네일을
 *   플레이스홀더(DOPPIA 워드마크 벡터)에서 → 실제 우리 템플릿 출력으로 교체.
 *   기본 입력 = 흰색 무지티를 Gemini로 뽑아, 그걸 제품 레퍼런스로 실 recipe 파이프에 통과.
 *
 * 흐름:
 *   ① 흰 무지티(plain blank white tee) 텍스트-투-이미지 생성 → 입력 제품샷.
 *   ② resolveRecipe(seed config)로 각 컷의 "실제 생성 프롬프트"(jobs[0]) 조립
 *      (presetMap/attributeMap = prod DB, 앱과 동일). 자식은 parentConfig=product-cut deepMerge.
 *   ③ nanoBanana.generate({references:[{path:무지티, kind:'product'}]})로 출력 → /img/productcut/<id>.png.
 *
 * 사용: node scripts/regen_productcut_thumbs.js [--keep-input]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));
const { resolveRecipe } = require(path.join(ROOT, 'src/recipes/recipeResolver.js'));
const styleRepo = require(path.join(ROOT, 'src/generate/stylePreset.repository.js'));
const visualRepo = require(path.join(ROOT, 'src/visuals/visualAttribute.repository.js'));

const SEED = require(path.join(ROOT, 'src/recipes/seeds/recipes.productcut.v2.js'));
const slug = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const BY_ID = {};
for (const r of SEED) BY_ID[slug(r.name)] = r;
const PARENT = BY_ID['product-cut'];

const OUT = path.join(ROOT, 'public/img/productcut');
const TMP = path.join(ROOT, 'tmp', 'productcut_input');

// 렌더 대상: id → { config, parentConfig }. 부모는 자체, 자식은 parentConfig=product-cut.
const TARGETS = [
  { id: 'product-cut', config: PARENT.config, parentConfig: undefined, label: 'Parent (flat lay default)' },
  { id: 'flat-lay-cut', config: BY_ID['flat-lay-cut'].config, parentConfig: PARENT.config, label: 'Flat Lay' },
  { id: 'ghost-mannequin-cut', config: BY_ID['ghost-mannequin-cut'].config, parentConfig: PARENT.config, label: 'Ghost Mannequin' },
];

// ① 입력 무지티 — 판매자가 업로드할 법한 "평평한 흰 무지티" 제품샷(무로고·무프린트).
const WHITE_TEE_PROMPT = 'professional e-commerce product photograph of a single plain blank white cotton crew-neck t-shirt, absolutely no logo no print no text no graphics, laid flat and squared to camera on a plain light grey seamless background, soft even studio light, true-to-life cotton fabric texture and visible stitching, catalog quality, shot on 85mm f/8';
const WHITE_TEE_NEG = 'logo, text, print, graphic, pattern, model, person, mannequin, hanger, wrinkled bunching, harsh shadow, colored fabric';

async function genToFile(req, outPath) {
  const res = await provider.generate(req);
  const src = (res.metadata && res.metadata.localPath) || (res.url || '').replace('file://', '');
  if (!src || !fs.existsSync(src)) throw new Error('생성물 없음');
  await sharp(src).png({ quality: 90 }).toFile(outPath);
  fs.unlinkSync(src);
  return Math.round(fs.statSync(outPath).size / 1024);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) { console.error('✗ GEMINI_API_KEY 미설정'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  // presetMap/attributeMap = prod DB(앱과 동일, 읽기전용)
  const [styles, attrs] = await Promise.all([styleRepo.findAll(), visualRepo.findAll()]);
  const presetMap = {}; for (const s of styles) presetMap[s.name] = { prefix: s.prefix, suffix: s.suffix, negative: s.negative_prompt || '' };
  const attributeMap = {}; for (const a of attrs) attributeMap[`${a.category_id}:${a.key}`] = a.prompt_fragment;
  const subject = { type: 'product', name: 'subject' };

  // ① 흰 무지티 입력 생성
  const inputPath = path.join(TMP, 'white-tee.png');
  process.stdout.write('① 흰 무지티(입력 제품샷) 생성 중… ');
  const kb0 = await genToFile({ prompt: WHITE_TEE_PROMPT, negativePrompt: WHITE_TEE_NEG, width: 768, height: 960 }, inputPath);
  console.log(`✓ (${kb0}KB) → ${path.relative(ROOT, inputPath)}`);

  // ②③ 각 컷 = 실 recipe 프롬프트 + 무지티 제품 레퍼런스
  for (const t of TARGETS) {
    const resolved = resolveRecipe(t.config, { subject, presetMap, attributeMap, parentConfig: t.parentConfig, seed: 7 });
    const job = resolved.jobs[0]; // shot 0 = 대표 컷
    process.stdout.write(`② ${t.id} (${t.label}) 실템플릿 생성 중… `);
    const outPath = path.join(OUT, t.id + '.png');
    const kb = await genToFile({ prompt: job.prompt, negativePrompt: job.negativePrompt, width: 768, height: 960, references: [{ path: inputPath, kind: 'product' }] }, outPath);
    console.log(`✓ (${kb}KB)`);
  }

  if (!process.argv.includes('--keep-input')) fs.rmSync(TMP, { recursive: true, force: true });
  console.log('\n완료. /img/productcut/{product-cut,flat-lay-cut,ghost-mannequin-cut}.png 교체됨.');
  process.exit(0);
}
main().catch((e) => { console.error('\n✗ ERROR:', e.message); process.exit(1); });
