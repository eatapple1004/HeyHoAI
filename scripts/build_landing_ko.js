#!/usr/bin/env node
/**
 * build_landing_ko.js — public/landing.html(영문 정본) + src/i18n/landing.ko.json → public/ko.html 생성
 * ============================================================================
 * 설계: docs/랜딩_카피확정_및_ko_아키텍처_2026-07-14.md §4
 *
 * 왜 프리렌더인가 (런타임 i18n.js를 랜딩에서 뺀 이유):
 *   ① i18n.js는 텍스트 노드 단위 trim 치환이라 **어순을 못 바꾼다**. 한국어는 어순이 달라 원리적으로 불가.
 *   ② <title>·<meta description>·og:*는 <head>에 있어 translate(document.body)가 구조적으로 못 건드린다
 *      → 한국어 검색 스니펫을 만들 방법이 처음부터 없다.
 *   ③ 원문 키 DICT는 영문 카피를 고치는 순간 한국어가 조용히 영어로 되돌아간다.
 *   → data-i18n 키 + 빌드타임 innerHTML 치환이면 셋 다 해소된다.
 *
 * 생성물을 커밋하는 이유: 런타임 비용 0(그냥 sendFile) + git diff로 한국어 페이지가 실제로 뭐라고
 *   말하는지 감사 가능(거짓 주장 금지 제약상 중요).
 *
 * 라우팅: index.js:80의 clean URL 정규식 /^\/([a-z0-9-]+)(\.html)?$/i 이 /ko를 이미 매칭한다.
 *   → public/ko.html만 있으면 /ko가 즉시 동작. **index.js 변경 0 · pm2 restart 불필요.**
 *
 * 사용: node scripts/build_landing_ko.js [--check]
 *   --check = 생성하지 않고 검증만(CI/커밋 전). 슬롯 누락·미사용 키가 있으면 exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public/landing.html');
const DICT = path.join(ROOT, 'src/i18n/landing.ko.json');
const OUT = path.join(ROOT, 'public/ko.html');
const CHECK = process.argv.includes('--check');

const ORIGIN = 'https://doppia.ai';

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

if (!fs.existsSync(SRC)) fail('원본 없음: ' + SRC);
if (!fs.existsSync(DICT)) fail('사전 없음: ' + DICT + '\n  → 트랜스크리에이션 산출물을 먼저 넣어라.');

let html = fs.readFileSync(SRC, 'utf8');
const ko = JSON.parse(fs.readFileSync(DICT, 'utf8'));
const slots = ko.slots || {};
const meta = ko._meta || {};

// ── 1. data-i18n 슬롯 치환 ──────────────────────────────────────────────
// <tag data-i18n="key">…</tag> 의 내용물을 통째로 한국어로. 인라인 마크업(<br>·<em>·<span data-dp>)은
// 한국어 문자열이 직접 들고 있다 — 어순 자유가 이 방식의 존재 이유다.
const seen = new Set();
const missing = [];
html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
  (m, open, tag, key, inner, close) => {
    seen.add(key);
    if (!(key in slots)) { missing.push(key); return m; }
    return open + slots[key] + close;
  });

if (missing.length) {
  fail(`사전에 없는 슬롯 ${missing.length}개 — 그 자리가 한국어 페이지에 **영어로 남는다**:\n` +
       missing.map((k) => '    · ' + k).join('\n'));
}
const unused = Object.keys(slots).filter((k) => !seen.has(k));
if (unused.length) {
  console.warn(`⚠ 사전에 있지만 landing.html에 없는 키 ${unused.length}개(오타이거나 삭제된 슬롯):\n` +
               unused.map((k) => '    · ' + k).join('\n'));
}

// ── 2. head 뒤집기 ──────────────────────────────────────────────────────
// ⚠️ canonical은 반드시 **자기 언어 URL**. /ko의 canonical을 /로 두면 /ko가 색인에서 사라진다(가장 흔한 치명 실수).
// ⚠️ hreflang 3개(en·ko·x-default)는 **자기 자신 포함** 전부 유지 — 한쪽만 선언하면 Google이 세트를 폐기.
const need = ['title', 'description', 'og_title', 'og_description'];
const lack = need.filter((k) => !meta[k]);
if (lack.length) fail('_meta 누락: ' + lack.join(', ') + ' — 한국어 검색 스니펫의 전부다.');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sub = (re, to) => { if (!re.test(html)) fail('head 패턴 불일치(영문 원본이 바뀌었나?): ' + re); html = html.replace(re, to); };

sub(/<html lang="en">/, '<html lang="ko">');
sub(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
sub(/(<meta name="description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
sub(/(<link rel="canonical" href=")[^"]*(")/, `$1${ORIGIN}/ko$2`);
sub(/(<meta property="og:url" content=")[^"]*(")/, `$1${ORIGIN}/ko$2`);
sub(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(meta.og_title)}$2`);
sub(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(meta.og_description)}$2`);
sub(/(<meta property="og:locale" content=")[^"]*(")/, '$1ko_KR$2');
sub(/(<meta property="og:locale:alternate" content=")[^"]*(")/, '$1en_US$2');
if (meta.og_image) sub(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(meta.og_image)}$2`);

// ── 3. 언어 스위처 aria-current 이동 ────────────────────────────────────
html = html.replace(/(<a href="\/" hreflang="en" data-lang="en")\s+aria-current="true"/, '$1');
html = html.replace(/(<a href="\/ko" hreflang="ko" data-lang="ko")/, '$1 aria-current="true"');

// ── 4. LP-LANG 리다이렉트 스니펫 제거 ───────────────────────────────────
// /ko에서는 불필요하고, pathname 가드('/' | '/landing')상 발동도 안 하지만 죽은 코드를 남기지 않는다.
html = html.replace(/<script>\/\*LP-LANG[\s\S]*?<\/script>\n?/, '');

// ── 5. 생성 표식 ────────────────────────────────────────────────────────
html = html.replace(/<head>/,
  '<head>\n<!-- ⚠️ AUTO-GENERATED — 직접 고치지 마라. 고칠 곳은 둘:\n' +
  '       영문 구조 → public/landing.html · 한국어 카피 → src/i18n/landing.ko.json\n' +
  '     재생성: node scripts/build_landing_ko.js -->');

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== html) fail('public/ko.html이 최신이 아니다 — node scripts/build_landing_ko.js 를 다시 돌리고 커밋하라.');
  console.log(`✓ 최신 · 슬롯 ${seen.size}개`);
  process.exit(0);
}

fs.writeFileSync(OUT, html);
console.log(`✓ public/ko.html 생성 — 슬롯 ${seen.size}개 치환${unused.length ? ` · 미사용 키 ${unused.length}개` : ''}`);
console.log('  배포: git pull + Cloudflare Purge(/ko). index.js 변경 0 · pm2 불필요.');
