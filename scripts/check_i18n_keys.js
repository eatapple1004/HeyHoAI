#!/usr/bin/env node
/**
 * check_i18n_keys.js — public/js/i18n.js 의 DICT.ko / DICT.ja 키 집합이 같은지 검증 (2026-10-16 일본어 추가와 함께 신설)
 * 사전이 둘이 되면서 "ko엔 있는데 ja엔 없는" 문구가 조용히 영어로 새는 길이 생겼다 — 커밋 전 이걸 돌려 0 차이를 확인한다.
 *   · DICT.en(한국어 DB 원문→영어)의 키는 ja에만 있어도 된다(ja는 그 한국어 원문을 일본어로 바꾼다).
 * 사용: node scripts/check_i18n_keys.js   (차이가 있으면 exit 1)
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
const grab = (re, name) => { const m = src.match(re); if (!m) { console.error('✗ ' + name + ' 블록을 못 찾음'); process.exit(1); } return new Function('return {' + m[1] + '\n}')(); };
const ko = grab(/var DICT = \{ ko: \{([\s\S]*?)\n  \} \};/, 'DICT.ko');
const en = grab(/DICT\.en = \{([\s\S]*?)\n  \};/, 'DICT.en');
const ja = grab(/DICT\.ja = \{([\s\S]*?)\n  \};/, 'DICT.ja');
new Function(src); // 파일 전체 파싱
const missing = Object.keys(ko).filter((k) => !(k in ja));
const extra = Object.keys(ja).filter((k) => !(k in ko) && !(k in en));
console.log(`ko ${Object.keys(ko).length} · ja ${Object.keys(ja).length} · ja에 없음 ${missing.length} · ko에 없음 ${extra.length}`);
missing.forEach((k) => console.log('  ja 누락: ' + JSON.stringify(k)));
extra.forEach((k) => console.log('  ko 누락: ' + JSON.stringify(k)));
process.exit(missing.length || extra.length ? 1 : 0);
