/**
 * generate_official_gap_thumbs.js — 오피셜 대표이미지 "갭"만 생성
 * ------------------------------------------------------------------
 * 기존 정적 /img/ 썸네일이 없는 오피셜 템플릿만 nano-banana로 채운다.
 *   ① model-cut  → public/img/studiomodel/model-cut.png (온모델 카탈로그 컷, 4:5)
 *   ② 신부 컨셉 네일 → public/img/nail/bridal-concept-nail.png (브라이덜 네일 아트, 4:5)
 * 나머지 오피셜(product-cut·product-hero·jewelry-*)은 기존 정적 에셋 재사용.
 * 사용: node scripts/generate_official_gap_thumbs.js [--force] [--only=model-cut,nail]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));

const GAPS = [
  {
    key: 'model-cut',
    out: 'public/img/studiomodel/model-cut.png',
    prompt: 'professional commercial e-commerce on-model fashion photograph, a natural-looking female fashion model wearing a plain unbranded neutral-beige oversized cotton shirt and tailored trousers, relaxed natural full-body pose facing the camera, clean light-grey studio cyclorama background, flattering soft studio softbox lighting, catalog styling, shot on 85mm f/4 full-frame, true-to-life fabric texture and visible stitching, a single well-formed pair of hands with exactly five natural fingers each, editorial lookbook quality',
    neg: 'warped or melted garment, deformed or extra fingers, malformed hands, distorted face, mannequin, floating garment, blown highlights, cluttered distracting background, logos, text, watermark, brand marks',
  },
  {
    key: 'nail',
    out: 'public/img/nail/bridal-concept-nail.png',
    prompt: 'professional beauty close-up photograph of an elegant bridal concept manicure on a natural female hand, soft ivory and blush pink gel polish with delicate pearl and fine gold-line accents and subtle lace-inspired detailing, tasteful and refined, clean soft-lit neutral background, shot on 100mm macro, true-to-life skin and nail texture, a single well-formed hand with exactly five natural fingers, editorial bridal beauty quality',
    neg: 'deformed or extra fingers, malformed hands, more than five fingers, distorted proportions, garish colors, cluttered background, logos, text, watermark',
  },
];

async function main() {
  if (!process.env.GEMINI_API_KEY) { console.error('✗ GEMINI_API_KEY 미설정'); process.exit(1); }
  const force = process.argv.includes('--force');
  const onlyArg = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
  const only = onlyArg ? new Set(onlyArg.split(',')) : null;
  const list = only ? GAPS.filter(g => only.has(g.key)) : GAPS;
  console.log(`대상 ${list.length}개 · 예상비용 ≈$${(list.length * 0.04).toFixed(2)}\n`);
  let done = 0, skip = 0, fail = 0;
  for (const g of list) {
    const outPath = path.join(ROOT, g.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (fs.existsSync(outPath) && !force) { skip++; console.log(`- ${g.key} 스킵(존재)`); continue; }
    process.stdout.write(`… ${g.key} → ${g.out} 생성 중… `);
    try {
      const res = await provider.generate({ prompt: g.prompt, negativePrompt: g.neg, width: 768, height: 960 }); // 4:5
      const src = (res.metadata && res.metadata.localPath) || (res.url || '').replace('file://', '');
      if (!src || !fs.existsSync(src)) throw new Error('생성물 없음');
      await sharp(src).png({ quality: 90 }).toFile(outPath);
      fs.unlinkSync(src);
      done++; console.log(`✓ (${Math.round(fs.statSync(outPath).size / 1024)}KB)`);
    } catch (e) { fail++; console.log(`✗ ${e.message}`); }
  }
  console.log(`\n완료: 생성 ${done} · 스킵 ${skip} · 실패 ${fail}`);
}
main();
