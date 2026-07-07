/**
 * generate_concept_thumbs.js — Worn Cut "Concept" 축 시각화 카드 썸네일
 * ------------------------------------------------------------------
 * studio.html AXIS_DEFS.concept 의 6개 무드 → public/img/accessories/concept-<key>.png.
 *   대표 이미지 = 손에 낀 반지(worn-cut 맥락)를 각 컨셉 조명/셋업으로. 얼굴 없음.
 * provider: nano-banana. 사용: node scripts/generate_concept_thumbs.js [--force] [--only=key,key]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));
const OUT = path.join(ROOT, 'public/img/accessories');
fs.mkdirSync(OUT, { recursive: true });

// [key, 무드 구절]
const CONCEPTS = [
  ['studio',   'on a clean light grey seamless studio background with soft even softbox lighting'],
  ['daylight', 'in soft natural window daylight with an airy bright mood'],
  ['warm',     'in warm editorial lighting with a cozy premium amber mood'],
  ['marble',   'resting on a pale white marble surface with a bright gallery-luxe mood'],
  ['noir',     'against a dark moody backdrop with a warm golden rim light, noir luxe mood'],
  ['golden',   'in golden-hour warm sunlight with a glowing dreamy mood'],
  ['pop',      'against a bold vivid saturated hot-pink seamless backdrop, high-energy pop-art color, glossy modern mood'],
  ['cobalt',   'against a bold electric cobalt-blue seamless backdrop, vivid saturated modern pop mood'],
  ['colorblock','against a bold graphic colorblock seamless backdrop split into two vivid contrasting colors, playful pop mood'],
];

async function main(){
  if(!process.env.GEMINI_API_KEY){ console.error('✗ GEMINI_API_KEY 미설정'); process.exit(1); }
  const force = process.argv.includes('--force');
  const onlyArg = (process.argv.find(a=>a.startsWith('--only=')) || '').split('=')[1];
  const only = onlyArg ? new Set(onlyArg.split(',')) : null;
  const list = only ? CONCEPTS.filter(c=>only.has(c[0])) : CONCEPTS;
  console.log(`대상 ${list.length}개 컨셉 · 예상비용 ≈$${(list.length*0.04).toFixed(2)}\n`);
  let done=0, skip=0, fail=0;
  for(const [key, mood] of list){
    const outPath = path.join(OUT, 'concept-'+key+'.png');
    if(fs.existsSync(outPath) && !force){ skip++; console.log(`- concept-${key} 스킵(존재)`); continue; }
    const prompt = `elegant on-hand jewelry photography, an unbranded gold diamond ring worn on a single well-groomed hand with exactly five natural fingers, tight crop on the hand with no face in frame, ${mood}, the ring tack-sharp with shallow depth of field, premium product mood`;
    const neg = `face, portrait, deformed or extra fingers, malformed hand, warped ring, plastic skin, cluttered background, logos, text, watermark`;
    process.stdout.write(`… concept-${key} 생성 중… `);
    try{
      const res = await provider.generate({ prompt, negativePrompt: neg, width: 768, height: 960 });
      const src = (res.metadata && res.metadata.localPath) || (res.url||'').replace('file://','');
      if(!src || !fs.existsSync(src)) throw new Error('생성물 없음');
      await sharp(src).png({ quality: 90 }).toFile(outPath);
      fs.unlinkSync(src);
      done++; console.log(`✓ (${Math.round(fs.statSync(outPath).size/1024)}KB)`);
    }catch(e){ fail++; console.log(`✗ ${e.message}`); }
  }
  console.log(`\n완료: 생성 ${done} · 스킵 ${skip} · 실패 ${fail}`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
