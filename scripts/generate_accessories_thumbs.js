/**
 * generate_accessories_thumbs.js — Accessories(주얼리 v1) 썸네일 생성
 * ------------------------------------------------------------------
 * 소스: recipes.accessories.v2.js 전 레시피(부모 3 + 자식 13 = 16).
 *   각 레시피의 look.extra_positive(무드/조명/부위)로 대표 주얼리 컷 1장.
 *   출력 = public/img/accessories/<id>.png (studio 컨벤션, 부모=카드 썸네일·자식=컷 미리보기).
 * provider: nano-banana. 사용: node scripts/generate_accessories_thumbs.js [--force] [--only=<id,id>]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const recipes = require(path.join(ROOT, 'src/recipes/seeds/recipes.accessories.v2.js'));
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));
const OUT = path.join(ROOT, 'public/img/accessories');
fs.mkdirSync(OUT, { recursive: true });

function slug(s){ return String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

// 레시피 id → 대표 주얼리 오브젝트(전부 무브랜드). 부위 컷은 착용 부위에 맞는 품목.
const PROD = {
  'jewelry-product-cut':  'an elegant unbranded gold ring set with a small diamond',
  'jewelry-flat-lay':     'an elegant unbranded gold ring set with a small diamond',
  'jewelry-floating':     'a delicate unbranded gold pendant necklace',
  'jewelry-pedestal':     'an elegant unbranded gold ring set with a small diamond',
  'jewelry-macro-detail': 'an unbranded diamond solitaire ring, extreme macro of the stone',
  'jewelry-worn-cut':     'an elegant unbranded gold diamond ring',
  'jewelry-on-hand':      'an elegant unbranded gold diamond ring',
  'jewelry-on-neck':      'a delicate unbranded gold pendant necklace',
  'jewelry-on-ears':      'a pair of unbranded gold drop earrings',
  'jewelry-on-wrist':     'an unbranded gold tennis bracelet',
  'jewelry-hero':         'an elegant unbranded gold diamond ring',
  'jewelry-noir-gold':    'an elegant unbranded gold diamond ring',
  'jewelry-marble-plinth':'an elegant unbranded gold diamond ring',
  'jewelry-silk-drape':   'a delicate unbranded gold pendant necklace',
  'jewelry-spotlight':    'an unbranded diamond solitaire ring',
  'jewelry-floating-luxe':'a pair of unbranded diamond drop earrings',
};
function productFor(id){ return PROD[id] || 'an elegant unbranded piece of fine jewelry'; }

async function main(){
  if(!process.env.GEMINI_API_KEY){ console.error('✗ GEMINI_API_KEY 미설정'); process.exit(1); }
  const force = process.argv.includes('--force');
  const onlyArg = (process.argv.find(a=>a.startsWith('--only=')) || '').split('=')[1];
  const only = onlyArg ? new Set(onlyArg.split(',')) : null;
  const all = recipes.filter(r => r.config && r.config.look && r.config.look.extra_positive); // 부모+자식 모두
  const list = only ? all.filter(r => only.has(slug(r.name))) : all;
  console.log(`대상 ${list.length}개(부모+자식) · 예상비용 ≈$${(list.length*0.04).toFixed(2)}\n`);
  let done=0, skip=0, fail=0;
  for(const r of list){
    const id = slug(r.name); const outPath = path.join(OUT, id+'.png');
    if(fs.existsSync(outPath) && !force){ skip++; console.log(`- ${id} 스킵(존재)`); continue; }
    const pos = r.config.look.extra_positive || '';
    const neg = r.config.look.extra_negative || '';
    const prompt = `professional product photograph of ${productFor(id)}. ${pos}`;
    process.stdout.write(`… ${id} (${r.name}) 생성 중… `);
    try{
      const res = await provider.generate({ prompt, negativePrompt: neg, width: 768, height: 960 }); // 4:5
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
