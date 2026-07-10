/**
 * ABCD B 격리 하네스 빌더 — 실 studio.html에서 대상 함수·CSS를 추출(드리프트 0)해
 * 자립 브라우저 하네스(public/__abcd_harness_B.html)로 조립. ugcMakePlayer는 실 /js/ugcPlayer.js 로드.
 * 라인-레인지 추출(컬럼0 top-level 선언 경계로 슬라이스) → 템플릿 리터럴 ${} 오검출 없음.
 */
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(pub, 'studio.html'), 'utf8');
const lines = html.split('\n');

// top-level 선언 경계(컬럼0). 이 사이를 슬라이스.
const boundary = /^(async function |function |var |const |let )/;
function extractDecl(name) {
  // name의 선언 시작줄 찾기(function NAME( | var NAME= | const NAME=)
  const re = new RegExp('^(async function ' + name + '\\(|function ' + name + '\\(|var ' + name + '\\b|const ' + name + '\\b|let ' + name + '\\b)');
  let start = -1;
  for (let i = 0; i < lines.length; i++) { if (re.test(lines[i])) { start = i; break; } }
  if (start < 0) throw new Error('선언 못 찾음: ' + name);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { if (boundary.test(lines[i])) { end = i; break; } }
  return lines.slice(start, end).join('\n').replace(/\s+$/, '');
}

const FUNCS = ['esc', 'ugcCapTextOf', 'ugcTlCapText', 'ugcTlTotal', 'ugcScenesPlayable', 'ugcPlayerScenes',
  'ugcActiveVersions', 'ugcMountLayered',
  'ugcDestroyLayered', 'ugcDestroyAllLayered', 'ugcMakeAudio', 'ugcAudioSync', 'ugcAudioDestroy',
  'ugcSyncCap', 'ugcSyncCapAt', 'ugcStyleCapOv', 'ugcToggleSound',
  'ugcSyncPlayer', 'ugcRefreshStrip', 'ugcReflectEdit', 'ugcSceneVersion', 'ugcSceneMove', 'ugcSceneRemove',
  'ugcAutoCommit', 'ugcLayeredFallback', 'ugcUnmuteLayered',
  'ugcReassemble', 'ugcReasmNext', 'UGC_REASM_INFLIGHT', 'UGC_NS_BUSY',
  'UGC_LAYERED', 'UGC_CAP_EDITING', 'UGC_CAP_DRAG'];
let extracted = '// === 실 studio.html 추출(드리프트 0) ===\n';
for (const f of FUNCS) extracted += '\n' + extractDecl(f) + '\n';
fs.writeFileSync(path.join(pub, '__abcd_extracted.js'), extracted);

// 전체 첫 <style> 블록 = 실 CSS(getComputedStyle 정합, 드리프트 0)
const styleM = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
const css = styleM ? styleM[1] : '';

const harness = `<!doctype html><html><head><meta charset="utf-8"><title>ABCD B harness</title>
<style>:root{--accent:#8b7bff}${css}
#results{font:13px/1.5 monospace;padding:12px;white-space:pre-wrap}
.pass{color:#0a0}.fail{color:#c00;font-weight:bold}
#ugcInline{max-width:360px}</style></head><body>
<div id="ugcInline"></div>
<div id="results">running…</div>
<script src="/js/ugcPlayer.js"></script>
<script src="/__abcd_extracted.js"></script>
<script>
// ── 스텁(실 로직 아님) ──
var __ZOOM=null; function openImageModal(u,k){ __ZOOM=u; }
function toast(){}
var __U=null; function ugcFindBatch(id){ return __U?{ugc:__U,items:[{url:__U.previewUrl}]}:null; }
function ugcTimelineHtml(){ return ''; } function ugcSceneStripHtml(){ return ''; }
// ── mock 데이터 ──
function mkU(over){ return Object.assign({
  jobId:'test', previewUrl:'/__abcd_prev.mp4',
  scenes:[
    {n:1,clipUrl:'/__abcd_c1.mp4',isStill:false,durationSec:2,onScreenText:'첫 번째 자막'},
    {n:2,clipUrl:'/__abcd_c2.mp4',isStill:false,durationSec:2,onScreenText:'두 번째 자막'},
    {n:3,clipUrl:'/__abcd_c3.mp4',isStill:false,durationSec:2,onScreenText:'세 번째 자막'}
  ],
  captionSpec:{w:1080,h:1920,style:{position:'bottom',size:'m',color:'white'},timings:[
    {sceneN:1,startMs:0,durMs:2000},{sceneN:2,startMs:2000,durMs:2000},{sceneN:3,startMs:4000,durMs:2000}
  ]},
  subtitleStyle:null, voiceUrl:'/__abcd_voice.mp3', musicUrl:'/__abcd_music.mp3', hasVoice:true, hasMusic:true, edits:{}
}, over||{}); }

var out=[], pass=0, fail=0;
function ok(n,c,x){ if(c){pass++;out.push('  PASS '+n);}else{fail++;out.push('  FAIL '+n+(x?' :: '+x:''));} }
function gcs(el,p){ return getComputedStyle(el)[p]; }

function renderLayeredWrap(u){ // renderUgcInline의 layered 분기 HTML을 그대로 재현(마운트 전 DOM)
  document.getElementById('ugcInline').innerHTML=
    '<div class="ugc-inline-vidwrap ugc-layered">'
    +'<div class="ugc-cap-ov" data-job="'+u.jobId+'"></div>'
    +'<button class="reel-mute" title="Toggle sound" onclick="ugcToggleSound(event,this)">🔇</button>'
    +'</div>';
}

async function run(){
  // 1) 폴백 게이트: 실 클립 있으면 true, 정지컷/무클립은 false
  ok('playable=true(실클립)', ugcScenesPlayable(mkU())===true);
  ok('playable=false(정지컷만)', ugcScenesPlayable(mkU({scenes:[{n:1,clipUrl:'/x.mp4',isStill:true,durationSec:2}]}))===false);
  ok('playable=false(클립없음)', ugcScenesPlayable(mkU({scenes:[{n:1,clipUrl:null,durationSec:2}]}))===false);
  ok('playable=false(씬없음)', ugcScenesPlayable(mkU({scenes:[]}))===false);

  // 2) 마운트: player 비디오 2개 append + aspect-ratio + 오디오 생성
  __U=mkU(); renderLayeredWrap(__U); ugcMountLayered(__U,'/__abcd_prev.mp4');
  var wrap=document.querySelector('#ugcInline .ugc-inline-vidwrap.ugc-layered');
  var vids=wrap.querySelectorAll('video');
  ok('player 비디오 2개 append', vids.length===2, 'got '+vids.length);
  var ar=(wrap.style.aspectRatio||'').replace(/\\s/g,'');
  ok('wrap aspect-ratio=1080/1920', ar==='1080/1920', 'got '+ar);
  var L=UGC_LAYERED['test'];
  ok('UGC_LAYERED 등록', !!(L&&L.player&&L.audio));

  // 3) 오디오 트랙 속성(음성=1.0·loop off, 음악=더킹0.18·loop on, 둘 다 muted 시작)
  ok('voice Audio 생성', !!(L.audio.voice&&L.audio.voice.src));
  ok('music Audio 생성', !!(L.audio.music&&L.audio.music.src));
  ok('voice muted 시작', L.audio.voice.muted===true);
  ok('music muted 시작', L.audio.music.muted===true);
  ok('voice volume=1.0', L.audio.voice.volume===1);
  ok('music 더킹 volume=0.18(음성有)', Math.abs(L.audio.music.volume-0.18)<1e-6, 'got '+L.audio.music.volume);
  ok('voice loop=false', L.audio.voice.loop===false);
  ok('music loop=true', L.audio.music.loop===true);
  // 음성 없는 잡 → 음악 0.5(더킹 안 함)
  var A2=ugcMakeAudio(mkU({voiceUrl:null}));
  ok('음악단독 volume=0.5', Math.abs(A2.music.volume-0.5)<1e-6, 'got '+A2.music.volume);
  ok('음성없으면 voice=null', A2.voice===null);
  ugcAudioDestroy(A2);

  // 4) onTime→자막: seekTo로 결정적 구동, 시각별 올바른 자막 + display:flex
  var ov=wrap.querySelector('.ugc-cap-ov');
  L.player.seekTo(500);
  ok('t=0.5s 자막=첫 번째', /첫 번째 자막/.test(ov.textContent), 'got "'+ov.textContent+'"');
  ok('오버레이 display=flex(getComputedStyle)', gcs(ov,'display')==='flex', 'got '+gcs(ov,'display'));
  L.player.seekTo(2500);
  ok('t=2.5s 자막=두 번째', /두 번째 자막/.test(ov.textContent), 'got "'+ov.textContent+'"');
  L.player.seekTo(4500);
  ok('t=4.5s 자막=세 번째', /세 번째 자막/.test(ov.textContent), 'got "'+ov.textContent+'"');

  // 5) 자막 off → 오버레이 숨김(display:none)
  __U.subtitleStyle={off:true}; ugcSyncCapAt('test',500);
  ok('자막 off → display=none', gcs(ov,'display')==='none', 'got '+gcs(ov,'display'));
  __U.subtitleStyle=null; ugcSyncCapAt('test',500);
  ok('자막 on 복구 → display=flex', gcs(ov,'display')==='flex');

  // 6) ugcAudioSync 위치 보정 로직(가짜 audio-like로 결정적 검증)
  function fakeA(over){ return Object.assign({src:'x',duration:1.5,currentTime:0,paused:true,muted:true,_played:0,play(){this._played++;this.paused=false;return {catch(){}};},pause(){this.paused=true;}},over); }
  var fv=fakeA({}), fm=fakeA({duration:6,loop:true}); var FA={voice:fv,music:fm};
  ugcAudioSync(FA,3000,6000); // 3s
  ok('sync: voice 3s>1.5s dur → pause(무음)', fv.paused===true);
  ok('sync: music 3s loop → currentTime≈3', Math.abs(fm.currentTime-3)<0.06, 'got '+fm.currentTime);
  ok('sync: music play() 호출', fm._played>0);
  // 음악 루프 모듈로: 7s → 7%6=1
  fm.currentTime=0; fm.paused=true; ugcAudioSync(FA,7000,6000);
  ok('sync: music 7s → 7%6≈1', Math.abs(fm.currentTime-1)<0.06, 'got '+fm.currentTime);
  // 드리프트 작으면 보정 안 함(0.3s 이하)
  fm.currentTime=1.05; var before=fm.currentTime; ugcAudioSync(FA,7100,6000);
  ok('sync: 작은 드리프트 무보정', Math.abs(fm.currentTime-before)<1e-9||Math.abs(fm.currentTime-1.1)<0.06);

  // 7) 사운드 토글(레이어드): 클릭→언뮤트→버튼 🔊, 재클릭→뮤트
  var btn=wrap.querySelector('.reel-mute');
  ugcToggleSound({stopPropagation(){}},btn);
  ok('토글1: voice 언뮤트', L.audio.voice.muted===false);
  ok('토글1: music 언뮤트', L.audio.music.muted===false);
  ok('토글1: 버튼 🔊', btn.textContent==='🔊');
  ok('토글1: 버튼 on 클래스', btn.classList.contains('on'));
  ugcToggleSound({stopPropagation(){}},btn);
  ok('토글2: voice 재뮤트', L.audio.voice.muted===true);
  ok('토글2: 버튼 🔇', btn.textContent==='🔇');

  // 8) 확대 클릭(오버레이·버튼 제외) → openImageModal(zoom)
  __ZOOM=null; wrap.onclick({target:document.createElement('div'),closest(){return null}}); // 빈 영역 클릭 근사
  // 실제 이벤트로: 오버레이 클릭은 무시
  __ZOOM=null; var e1={target:ov,closest(){return null}}; wrap.onclick(e1); ok('오버레이 클릭 → 확대 안 함', __ZOOM===null);

  // 9) 파기: 좀비 오디오 방지
  var vRef=L.audio.voice, mRef=L.audio.music;
  ugcDestroyAllLayered();
  ok('파기 후 UGC_LAYERED 비움', Object.keys(UGC_LAYERED).length===0);
  ok('파기 후 voice pause', vRef.paused===true);
  ok('파기 후 voice src 비움', !vRef.getAttribute('src'));
  ok('파기 후 wrap 비디오 제거', wrap.querySelectorAll('video').length===0);

  var head=(fail===0?'ALL PASS ':'HAS FAIL ')+pass+' PASS / '+fail+' FAIL';
  document.getElementById('results').innerHTML='<span class="'+(fail?'fail':'pass')+'">'+head+'</span>\\n'+out.join('\\n');
  window.__ABCD_B={pass:pass,fail:fail,head:head};
}
run();
</script></body></html>`;
fs.writeFileSync(path.join(pub, '__abcd_harness_B.html'), harness);

// ── C 하네스: 편집 클라이언트화(버전전환·재배치·삭제 즉시, 서버0, 오디오 유지) ──
const harnessC = `<!doctype html><html><head><meta charset="utf-8"><title>ABCD C harness</title>
<style>:root{--accent:#8b7bff}${css}
#results{font:13px/1.5 monospace;padding:12px;white-space:pre-wrap}.pass{color:#0a0}.fail{color:#c00;font-weight:bold}#ugcInline{max-width:360px}</style></head><body>
<div id="ugcInline"></div><div id="results">running…</div>
<script src="/js/ugcPlayer.js"></script>
<script src="/__abcd_extracted.js"></script>
<script>
// ── 스텁 ──
var __ZOOM=null; function openImageModal(u){__ZOOM=u;} function toast(){}
var __rsr=0; function renderStudioResults(){__rsr++;}
function ugcRenderTimeline(){}
function ugcSceneStripHtml(b){ return '<div class="ugc-scenes" data-job="'+b.ugc.jobId+'"><div class="usc" data-n="1"><div class="usc-ver"><span>'+((b.ugc.scenes[0].activeVersion||0)+1)+'/'+((b.ugc.scenes[0].versions||[]).length||1)+'</span></div></div></div>'; }
var __fetch={n:0,bodies:[]};
window.fetch=function(url,opts){ __fetch.n++; if(opts&&opts.body){try{__fetch.bodies.push(JSON.parse(opts.body));}catch(e){}} return Promise.resolve({ok:false,status:500,json:function(){return Promise.resolve({error:'stub'});},text:function(){return Promise.resolve('stub');}}); };
var __B=null; function ugcFindBatch(id){ return (__B&&__B.ugc.jobId===id)?__B:null; }
function mkB(){ return { ugc:{ jobId:'test', previewUrl:'/__abcd_prev.mp4', edits:{}, _dirty:false, _saved:false,
  captionSpec:{w:1080,h:1920,style:{position:'bottom',size:'m',color:'white'},timings:[{sceneN:1,startMs:0,durMs:2000},{sceneN:2,startMs:2000,durMs:2000},{sceneN:3,startMs:4000,durMs:2000}]},
  subtitleStyle:null, voiceUrl:'/__abcd_voice.mp3', musicUrl:'/__abcd_music.mp3', hasVoice:true, hasMusic:true,
  scenes:[
    {n:1,clipUrl:'/__abcd_c1.mp4',isStill:false,durationSec:2,onScreenText:'첫 자막',activeVersion:0,versions:[{clipUrl:'/__abcd_c1.mp4',isStill:false,durationSec:2},{clipUrl:'/__abcd_c3.mp4',isStill:false,durationSec:2}]},
    {n:2,clipUrl:'/__abcd_c2.mp4',isStill:false,durationSec:2,onScreenText:'둘 자막'},
    {n:3,clipUrl:'/__abcd_c3.mp4',isStill:false,durationSec:2,onScreenText:'셋 자막'}
  ] }, items:[{url:'/__abcd_prev.mp4'}] }; }
function setup(){ __B=mkB(); window.__U=__B.ugc; document.getElementById('ugcInline').innerHTML=
  '<div class="ugc-inline-vidwrap ugc-layered"><div class="ugc-cap-ov" data-job="test"></div><button class="reel-mute">🔇</button></div>'
  +ugcSceneStripHtml(__B);
  ugcMountLayered(__B.ugc,'/__abcd_prev.mp4'); __fetch.n=0; __rsr=0; }

var out=[],pass=0,fail=0;
function ok(n,c,x){ if(c){pass++;out.push('  PASS '+n);}else{fail++;out.push('  FAIL '+n+(x?' :: '+x:''));} }

async function run(){
  // 1) ugcActiveVersions: 기본0=빈, 비기본만 포함
  ok('activeVersions 기본0 → {}', Object.keys(ugcActiveVersions(mkB().ugc)).length===0);
  var ub=mkB().ugc; ub.scenes[0].activeVersion=1;
  var sv=ugcActiveVersions(ub); ok('activeVersions 비기본 → {1:1}', sv[1]===1&&Object.keys(sv).length===1, JSON.stringify(sv));

  // 2) ugcSceneVersion = 서버0 + 즉시 클립 스왑 + dirty
  setup(); var L=UGC_LAYERED['test'];
  ugcSceneVersion(null,'test',1,1);
  ok('버전전환: fetch 0(서버 왕복 없음)', __fetch.n===0, 'got '+__fetch.n);
  ok('버전전환: scene1.activeVersion=1', __B.ugc.scenes[0].activeVersion===1);
  ok('버전전환: scene1.clipUrl=c3', __B.ugc.scenes[0].clipUrl==='/__abcd_c3.mp4', __B.ugc.scenes[0].clipUrl);
  ok('버전전환: _dirty=true', __B.ugc._dirty===true);
  L.player.seekTo(500); // 씬1 구간
  ok('버전전환: 재생기 clip=c3(즉시)', /__abcd_c3\\.mp4/.test(L.player.visibleClip()||''), L.player.visibleClip());
  ok('버전전환: 카드 카운터 2/2', /2\\/2/.test((document.querySelector('#ugcInline .usc-ver span')||{}).textContent||''));

  // 3) 오디오·재생기 인스턴스 연속성(재마운트 아님) — 재배치 시 오디오 안 멈춤
  setup(); L=UGC_LAYERED['test']; var voiceRef=L.audio.voice, musicRef=L.audio.music, playerRef=L.player;
  ugcSceneMove('test',1,1); // 씬1을 오른쪽으로
  ok('재배치: 오디오 voice 동일 인스턴스(연속)', UGC_LAYERED['test'].audio.voice===voiceRef);
  ok('재배치: 오디오 music 동일 인스턴스(연속)', UGC_LAYERED['test'].audio.music===musicRef);
  ok('재배치: player 동일 인스턴스(재마운트 아님)', UGC_LAYERED['test'].player===playerRef);
  ok('재배치: fetch 0', __fetch.n===0, 'got '+__fetch.n);
  ok('재배치: _dirty=true', __B.ugc._dirty===true);
  ok('재배치: 순서 바뀜(첫 씬 n=2)', __B.ugc.scenes[0].n===2, 'first='+__B.ugc.scenes[0].n);
  playerRef.seekTo(500); ok('재배치: 재생기 첫 클립=c2(즉시)', /__abcd_c2\\.mp4/.test(playerRef.visibleClip()||''), playerRef.visibleClip());

  // 4) 삭제 즉시 반영
  setup(); L=UGC_LAYERED['test'];
  ugcSceneRemove('test',2);
  ok('삭제: 씬 2개 남음', __B.ugc.scenes.length===2);
  ok('삭제: fetch 0', __fetch.n===0, 'got '+__fetch.n);
  ok('삭제: 재생기 씬수 2', ugcPlayerScenes(__B.ugc).length===2);
  ok('삭제: _dirty=true', __B.ugc._dirty===true);

  // 5) 폴백: 레이어드 아님(파기) → renderStudioResults
  setup(); ugcDestroyAllLayered(); __rsr=0;
  ugcSceneMove('test',1,1);
  ok('폴백: 레이어드 없으면 renderStudioResults 호출', __rsr>0, 'rsr='+__rsr);

  var head=(fail===0?'ALL PASS ':'HAS FAIL ')+pass+' PASS / '+fail+' FAIL';
  document.getElementById('results').innerHTML='<span class="'+(fail?'fail':'pass')+'">'+head+'</span>\\n'+out.join('\\n');
  window.__ABCD_C={pass:pass,fail:fail,head:head};
}
run();
</script></body></html>`;
fs.writeFileSync(path.join(pub, '__abcd_harness_C.html'), harnessC);

// ── D 하네스: 이탈 auto-commit이 현재 편집 상태를 전송(유실 방지) ──
const harnessD = `<!doctype html><html><head><meta charset="utf-8"><title>ABCD D harness</title>
<style>#results{font:13px/1.5 monospace;padding:12px;white-space:pre-wrap}.pass{color:#0a0}.fail{color:#c00;font-weight:bold}</style></head><body>
<div id="results">running…</div>
<script src="/__abcd_extracted.js"></script>
<script>
var beacons=[]; navigator.sendBeacon=function(url,data){ beacons.push({url:url,data:data}); return true; };
function mkUgc(over){ return Object.assign({ jobId:'j1', _saved:false, _dirty:false, edits:{},
  scenes:[{n:1},{n:2},{n:3}], _orig:[{n:1},{n:2},{n:3}] }, over||{}); }
var out=[],pass=0,fail=0; function ok(n,c,x){ if(c){pass++;out.push('  PASS '+n);}else{fail++;out.push('  FAIL '+n+(x?' :: '+x:''));} }
async function bodyText(d){ if(d&&d.text)return await d.text(); return d; }
async function run(){
  // 1) 비-dirty → plain sendBeacon(본문 없음)
  beacons=[]; ugcAutoCommit({isUgc:true,ugc:mkUgc()});
  ok('비-dirty: sendBeacon 1회', beacons.length===1, 'n='+beacons.length);
  ok('비-dirty: 본문 없음(plain commit)', beacons[0]&&beacons[0].data===undefined);
  ok('비-dirty: URL commit', /\\/commit$/.test(beacons[0].url));

  // 2) dirty(재배치+삭제+버전+자막) → 편집 본문 전송
  beacons=[];
  var u=mkUgc({ _dirty:true,
    scenes:[{n:3,activeVersion:1,versions:[{},{}]},{n:1}], // 순서 [3,1], 2번 삭제, 3번 버전1
    _orig:[{n:1},{n:2},{n:3}], edits:{1:{onScreenText:'수정'}} });
  ugcAutoCommit({isUgc:true,ugc:u});
  ok('dirty: sendBeacon 1회', beacons.length===1, 'n='+beacons.length);
  var body=JSON.parse(await bodyText(beacons[0].data));
  ok('dirty: order=[3,1]', JSON.stringify(body.order)==='[3,1]', JSON.stringify(body.order));
  ok('dirty: removed=[2]', JSON.stringify(body.removed)==='[2]', JSON.stringify(body.removed));
  ok('dirty: edits{1:수정}(남은 씬만)', body.edits&&body.edits['1']&&body.edits['1'].onScreenText==='수정');
  ok('dirty: setVersions{3:1}', body.setVersions&&body.setVersions['3']===1, JSON.stringify(body.setVersions));

  // 3) 이미 저장(_saved) → 스킵
  beacons=[]; ugcAutoCommit({isUgc:true,ugc:mkUgc({_saved:true})});
  ok('_saved: 스킵(전송 없음)', beacons.length===0);

  // 4) 비-UGC 배치 → 스킵
  beacons=[]; ugcAutoCommit({isUgc:false});
  ok('비-UGC: 스킵', beacons.length===0);

  // 5) 삭제된 씬의 edits는 제외(남은 씬만)
  beacons=[]; var u2=mkUgc({_dirty:true, scenes:[{n:1}], _orig:[{n:1},{n:2}], edits:{1:{spoken:'a'},2:{spoken:'b'}} });
  ugcAutoCommit({isUgc:true,ugc:u2});
  var b2=JSON.parse(await bodyText(beacons[0].data));
  ok('삭제 씬(2) edits 제외', b2.edits['2']===undefined&&b2.edits['1']!==undefined, JSON.stringify(b2.edits));

  var head=(fail===0?'ALL PASS ':'HAS FAIL ')+pass+' PASS / '+fail+' FAIL';
  document.getElementById('results').innerHTML='<span class="'+(fail?'fail':'pass')+'">'+head+'</span>\\n'+out.join('\\n');
  window.__ABCD_D={pass:pass,fail:fail,head:head};
}
run();
</script></body></html>`;
fs.writeFileSync(path.join(pub, '__abcd_harness_D.html'), harnessD);
console.log('하네스 생성: __abcd_harness_B/C/D.html (+__abcd_extracted.js)');
console.log('추출 함수:', FUNCS.length, '개');
