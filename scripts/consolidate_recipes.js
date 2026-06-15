#!/usr/bin/env node
/**
 * Doppia 레시피 종합·관리 (총지휘 세션 전용)
 * 11개 섹션 워커 세션이 각각 떨군 src/recipes/seeds/recipes.<key>.v2.js 를 수거→검증→종합.
 * 실행: node scripts/consolidate_recipes.js
 * 산출: 콘솔 대시보드 + docs/섹션명령서/_STATUS.md (현황표) + _CATALOG.json (통합 데이터)
 *
 * 검증: 로딩 가능 / 스키마 필수필드 / 비용공식(image=count×0.5, reel=shots×2, 온모델 +1) /
 *      섹션 내 중복 · 전체 중복 이름 / 가격사다리(◈2 진입 · 싼 릴스 ≤◈4) / 개수(6~8).
 * 상태는 파일에서 자동 도출 — 워커는 시드만 떨구면 됨(수동 매니페스트 X).
 */
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SEEDS = path.join(ROOT, 'src/recipes/seeds');
const SECTIONS = [
  ['influencer','인플루언서','face'], ['fashion','패션','product'], ['beauty','뷰티','product'],
  ['jewelry','주얼리','product'], ['food','푸드&카페','product'], ['coffee','카페&커피','product'], ['home','홈&리빙','product'],
  ['tech','테크','product'], ['pet','펫','product'], ['ugc','UGC광고','avatar'],
  ['general','General/기타제품','product'], ['headshot','헤드샷/퍼스널','face'],
];

function tryLoad(key){
  for (const f of [`recipes.${key}.v2.js`, `recipes.${key}.js`]) {
    const p = path.join(SEEDS, f);
    if (fs.existsSync(p)) { try { delete require.cache[require.resolve(p)]; return { file:f, data:require(p) }; }
      catch(e){ return { file:f, error:String(e.message||e) }; } }
  }
  return null;
}
function expectedCost(r){
  const c=r.config||{}, out=c.output||{}, type=r.output_type||out.type;
  if(type==='reel'){ const shots=(c.shots&&c.shots.length)||out.count||0; return shots*2; }
  const count=out.count||(c.shots&&c.shots.length)||0; let base=Math.round(count*0.5);
  const attrs=(c.look&&c.look.attributes||[]).join(' ')+' '+(r.name||'');
  const onModel=/on[-_ ]?model|on[-_ ]?pet|tryon|착용|worn|on[- ]body/i.test(attrs) || (c.subject&&c.subject.reference_strategy==='on_model_tryon');
  return base + (onModel?1:0);
}
const REQ_TOP=['name','output_type','credit_cost','config'];
const REQ_CFG=['output','subject','look','shots'];

const allNames={}; const report=[]; let total=0, ready=0;
for (const [key,name,mode] of SECTIONS){
  const loaded=tryLoad(key);
  const row={key,name,mode,status:'pending',file:'—',count:0,issues:[],flags:[],overlay:[]};
  if(!loaded){ row.status='pending(없음)'; report.push(row); continue; }
  row.file=loaded.file;
  if(loaded.error){ row.status='ERROR(로딩실패)'; row.issues.push(loaded.error); report.push(row); continue; }
  const arr=Array.isArray(loaded.data)?loaded.data:[];
  row.count=arr.length; total+=arr.length;
  // per-recipe validation
  let hasEntry2=false, hasCheapReel=false;
  arr.forEach((r,i)=>{
    const id=`#${i+1} ${r&&r.name||'(noname)'}`;
    REQ_TOP.forEach(k=>{ if(r&&r[k]==null) row.issues.push(`${id}: top.${k} 누락`); });
    const c=r&&r.config||{};
    REQ_CFG.forEach(k=>{ if(c[k]==null) row.issues.push(`${id}: config.${k} 누락`); });
    if(r){
      const out=c.output||{};
      if(r.output_type==='reel'){            // 릴스: shots×2 엄격
        const shots=(c.shots&&c.shots.length)||out.count||0, exp=shots*2;
        if(typeof r.credit_cost==='number' && r.credit_cost!==exp) row.issues.push(`${id}: 릴스 ◈${r.credit_cost} (샷${shots}→공식 ◈${exp}) — 확인`);
      } else {                                // 사진: 과소책정만 플래그(온모델 프리미엄 허용)
        const count=out.count||(c.shots&&c.shots.length)||0, base=Math.round(count*0.5);
        if(typeof r.credit_cost==='number' && r.credit_cost<base) row.issues.push(`${id}: 사진 ◈${r.credit_cost} < 기본 ◈${base} (과소책정) — 확인`);
      }
      if(r.output_type!=='reel' && r.credit_cost<=2) hasEntry2=true;
      if(r.output_type==='reel' && r.credit_cost<=4) hasCheapReel=true;
      const nm=(r.name||'').trim().toLowerCase();
      if(nm){ (allNames[nm]=allNames[nm]||[]).push(key); }
      if(r.meta&&Array.isArray(r.meta.flags)&&r.meta.flags.length) row.flags.push(`${r.name||'(noname)'} [${r.meta.flags.join(',')}]`);
      if(r.text_overlay===true) row.overlay.push(r.name||'(noname)');
    }
  });
  if(!hasEntry2) row.issues.push('가격사다리: ◈2 사진 진입 없음');
  if(!hasCheapReel) row.issues.push('가격사다리: 싼 릴스(≤◈4) 없음');
  if(arr.length<6||arr.length>8) row.issues.push(`개수 ${arr.length} (권장 6~8)`);
  row.status = row.issues.length? 'draft(이슈)' : 'OK';
  if(row.status==='OK') ready++;
  report.push(row);
}
// 전체 중복 이름
const dups=Object.entries(allNames).filter(([,ks])=>ks.length>1);

// ── 콘솔 대시보드 ──
const pad=(s,n)=>String(s).padEnd(n);
console.log(`\nDoppia 레시피 종합 — ${ready}/${SECTIONS.length} 섹션 OK · 총 ${total}개\n`);
console.log(pad('섹션',16)+pad('상태',14)+pad('개수',5)+'파일');
report.forEach(r=>console.log(pad(r.key,16)+pad(r.status,14)+pad(r.count,5)+r.file));
console.log('\n— 이슈 —');
report.filter(r=>r.issues.length).forEach(r=>{ console.log(`[${r.key}]`); r.issues.forEach(x=>console.log('   · '+x)); });
if(dups.length){ console.log('\n— 전체 중복 이름 —'); dups.forEach(([n,ks])=>console.log(`   "${n}": ${ks.join(', ')}`)); }
else console.log('\n중복 이름 없음 ✓');

// ── _STATUS.md ──
let md=`# 레시피 종합 현황 (자동생성 · \`node scripts/consolidate_recipes.js\`)\n\n`;
md+=`**${ready}/${SECTIONS.length} 섹션 OK · 총 ${total}개 템플릿**\n\n`;
md+=`| 섹션 | 상태 | 개수 | 파일 |\n|---|---|---|---|\n`;
report.forEach(r=>md+=`| ${r.key} (${r.name}) | ${r.status} | ${r.count} | \`${r.file}\` |\n`);
md+=`\n## 이슈\n`;
const withIssues=report.filter(r=>r.issues.length);
md+= withIssues.length? withIssues.map(r=>`**${r.key}**\n`+r.issues.map(x=>`- ${x}`).join('\n')).join('\n\n') : '_없음_';
md+=`\n\n## 전체 중복 이름\n`+ (dups.length? dups.map(([n,ks])=>`- "${n}": ${ks.join(', ')}`).join('\n') : '_없음_') + '\n';
// 플래그·오버레이 (사람검수·텍스트 — 자동집계)
const withFlags=report.filter(r=>r.flags.length), withOverlay=report.filter(r=>r.overlay.length);
md+=`\n## ⚠️ 사람검수·실험 플래그 (meta.flags)\n`+ (withFlags.length? withFlags.map(r=>`**${r.key}**\n`+r.flags.map(x=>`- ${x}`).join('\n')).join('\n\n') : '_없음_') + '\n';
md+=`\n## 🅣 텍스트 오버레이 (text_overlay)\n`+ (withOverlay.length? withOverlay.map(r=>`**${r.key}**: ${r.overlay.join(' · ')}`).join('\n') : '_없음_') + '\n';
const outDir=path.join(ROOT,'docs/섹션명령서'); fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'_STATUS.md'),md);
fs.writeFileSync(path.join(outDir,'_CATALOG.json'),JSON.stringify(report,null,2));
console.log('\n→ docs/섹션명령서/_STATUS.md, _CATALOG.json 갱신됨');
process.exit(withIssues.length||dups.length?1:0);
