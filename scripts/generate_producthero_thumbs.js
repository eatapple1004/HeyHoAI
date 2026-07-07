/**
 * generate_producthero_thumbs.js — Product Hero 스타일 썸네일 생성
 * ------------------------------------------------------------------
 * 소스: recipes.producthero.v2.js 자식(스타일)의 look → public/img/producthero/<style-id>.jpg
 * 각 스타일의 extra_positive(무드/조명/셋업)로 대표 제품컷 1장. provider: nano-banana.
 * 사용: node scripts/generate_producthero_thumbs.js [--force]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const recipes = require(path.join(ROOT, 'src/recipes/seeds/recipes.producthero.v2.js'));
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));
const OUT = path.join(ROOT, 'public/img/producthero');
fs.mkdirSync(OUT, { recursive: true });

function slug(s){ return String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
// fit별 대표 제품(썸네일 오브젝트)
const PROD = { skincare:'a minimalist unbranded skincare serum bottle with a dropper', luxury:'a luxurious unbranded frosted-glass cosmetic bottle',
  fragrance:'an elegant unbranded glass perfume bottle', color:'a sleek unbranded lipstick and compact', set:'a coordinated set of unbranded cosmetic bottles and jars' };
function productFor(fit){ for(const f of (fit||[])) if(PROD[f]) return PROD[f]; return 'a minimalist unbranded cosmetic bottle'; }

async function main(){
  if(!process.env.GEMINI_API_KEY){ console.error('✗ GEMINI_API_KEY 미설정'); process.exit(1); }
  const force = process.argv.includes('--force');
  const styles = recipes.filter(r=>r.config.parent_id); // 자식=스타일
  console.log(`스타일 ${styles.length}개 · 예상비용 ≈$${(styles.length*0.04).toFixed(2)}\n`);
  let done=0, skip=0, fail=0;
  for(const s of styles){
    const id = slug(s.name); const outPath = path.join(OUT, id+'.jpg');
    if(fs.existsSync(outPath) && !force){ skip++; console.log(`- ${id} 스킵(존재)`); continue; }
    const pos = (s.config.look && s.config.look.extra_positive) || '';
    const neg = (s.config.look && s.config.look.extra_negative) || '';
    const prompt = `premium e-commerce hero product photograph of ${productFor(s.meta && s.meta.fit)}, ${pos}`;
    process.stdout.write(`… ${id} (${s.name}) 생성 중… `);
    try{
      const res = await provider.generate({ prompt, negativePrompt: neg, width: 768, height: 960 }); // 4:5
      const src = (res.metadata && res.metadata.localPath) || (res.url||'').replace('file://','');
      if(!src || !fs.existsSync(src)) throw new Error('생성물 없음');
      await sharp(src).jpeg({ quality: 85, mozjpeg: true }).toFile(outPath);
      fs.unlinkSync(src);
      done++; console.log(`✓ (${Math.round(fs.statSync(outPath).size/1024)}KB)`);
    }catch(e){ fail++; console.log(`✗ ${e.message}`); }
  }
  console.log(`\n완료: 생성 ${done} · 스킵 ${skip} · 실패 ${fail}`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
