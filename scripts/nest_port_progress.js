#!/usr/bin/env node
/**
 * NestJS 레거시 이식 진행률 — `nest/`가 아직 `src/`를 얼마나 참조하는지 센다.
 *
 * 목표는 "0"이 아니다. 일부는 **의도적으로 단일소스를 유지**한다(가격표·데이터·엔진).
 * 그래서 참조를 세 갈래로 나눠 보여준다:
 *   ① 이식 대상   — 옮겨야 할 도메인 로직/SQL
 *   ② 단일소스    — 옮기면 안 되는 것(복제 시 사고: 가격표·시드 데이터)
 *   ③ 엔진/외부   — 옮길 실익이 적은 것(외부 API 래퍼·이미지 파이프라인)
 *
 * 사용: node scripts/nest_port_progress.js [--list]
 */
const fs = require('fs');
const path = require('path');

const NEST = path.join(process.cwd(), 'nest');

/** 참조 대상 경로 → 분류. 앞에서부터 먼저 맞는 규칙을 쓴다. */
const RULES = [
  // ② 단일소스 — 복제 금지
  [/credits\/credit\.service/, 'single', '크레딧 가격표(복제 시 청구액 불일치)'],
  [/pricing\/pricing\.config/, 'single', '가격 단일소스'],
  [/lib\/entitlements/,        'single', '플랜별 권한 단일소스'],
  [/config/,                   'single', '환경설정 단일소스'],
  [/recipes\/(recipeStore|recipeResolver|recipe\.service)/, 'single', '레시피 시드·해석기(데이터 17,998줄)'],
  [/db\/client/,               'single', '커넥션 풀(이중 생성 시 커넥션 2배)'],
  // ③ 엔진/외부 — 재작성 실익 적음
  [/(ugc|videos|images)\/.*(service|provider|builder)/, 'engine', '생성 엔진'],
  [/pack\//,                   'engine', '팩 파이프라인'],
  [/generate\/generate\.route/,'engine', '생성 라우트 핸들러(위임)'],
  [/storage\/mediaStore/,      'engine', 'R2 스토리지 래퍼'],
  [/characters\/(character\.service|refThumb|character\.validator)/, 'engine', 'Claude 캐릭터 생성·썸네일'],
  [/publishing\/(zernio|scheduler)/, 'engine', 'Zernio 발행'],
  [/billing\/(eximbay|portone|billing\.route)/, 'engine', 'PG 연동'],
  [/auth\/(google|password)/,  'engine', 'OAuth·해시'],
  [/admin\/adminRefine/,       'engine', 'refine 스트리밍'],
  // zod 검증 스키마 — 규칙을 복제하면 두 곳이 갈린다. class-validator 도입 시 함께 이식.
  [/\.validator$/,             'single', 'zod 검증 스키마(단일소스)'],
  [/(image|video|visual|account|content|postQueue|publishJob|prompt|result|review|stylePreset|user|reelTemplate|outfitPrompt|faceswapJob|generationJob|videoGenerationJob|accountMedia|imageAsset|videoAsset|visualAttribute)\.repository/, 'port', 'SQL 리포지토리'],
];

function classify(target) {
  for (const [re, kind, why] of RULES) if (re.test(target)) return { kind, why };
  return { kind: 'port', why: '도메인 로직' };
}

const found = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.ts')) continue;
    const src = fs.readFileSync(p, 'utf8');
    const re = /require\(path\.join\([^)]*'src',\s*([^)]*)\)\)/g;
    let m;
    while ((m = re.exec(src))) {
      const target = m[1].replace(/['\s]/g, '').replace(/,/g, '/').replace(/\.js$/, '');
      found.push({ file: path.relative(process.cwd(), p), target, ...classify(target) });
    }
  }
})(NEST);

const by = (k) => found.filter((f) => f.kind === k);
const domains = [...new Set(found.map((f) => f.file.split('/')[1]))];
const allDomains = fs.readdirSync(NEST, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.readdirSync(path.join(NEST, e.name)).some((n) => n.endsWith('.controller.ts')))
  .map((e) => e.name);
const clean = allDomains.filter((d) => !domains.includes(d));

console.log('\n══ NestJS 레거시 이식 진행률 ══\n');
console.log(`  도메인 ${allDomains.length}개 중 **${clean.length}개**가 src 의존 0`);
console.log(`     ${clean.join(' · ') || '(없음)'}\n`);
console.log(`  src 참조 총 ${found.length}건`);
console.log(`    ① 이식 대상  ${by('port').length.toString().padStart(3)}건  ← 이 숫자가 0이면 목표 달성`);
console.log(`    ② 단일소스   ${by('single').length.toString().padStart(3)}건  (복제 금지 — 가격표·설정·시드)`);
console.log(`    ③ 엔진/외부  ${by('engine').length.toString().padStart(3)}건  (재작성 실익 적음)\n`);

if (process.argv.includes('--list')) {
  for (const kind of ['port', 'single', 'engine']) {
    const rows = by(kind);
    if (!rows.length) continue;
    console.log(`── ${kind} ──`);
    for (const r of rows) console.log(`   ${r.file.padEnd(46)} ${r.target.padEnd(42)} ${r.why}`);
    console.log();
  }
}
const remaining = by('port').length;
console.log(remaining === 0
  ? '  ✅ 이식 대상 0 — ⑤단계(src/ 라우터 제거 + stg/prd 전환) 가능\n'
  : `  ⬜ 남은 이식 대상 ${remaining}건\n`);
