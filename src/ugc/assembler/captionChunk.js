'use strict';
/**
 * 음성 자막(voice subtitle) 청킹 — spoken 한 문장을 2~4단어 짧은 청크로 쪼개
 * 씬 구간에 글자수 비례로 분배(A+, 틱톡식 팟팟 자막). 실제 발화 타임스탬프는 아님(추후 B).
 *
 * ⚠️ 클라이언트(public/studio.html 의 ugcChunkCaption)와 **반드시 동일 로직**이어야 한다.
 *    편집 프리뷰 오버레이(클라)와 최종 번인(서버)이 같은 청크를 내야 "미리보기 == 최종본"이 성립.
 *    수정 시 양쪽을 함께 고치고 scripts/harness 로 동일성 재검증할 것.
 *
 * 결정론: 공백 단어분할 + 그리디 그룹 + 정수 라운딩(마지막 청크가 끝까지 채워 드리프트 방지).
 *   입력 같으면 출력 같음(랜덤·시간 의존 없음).
 */
var MAX_CHARS = 14; // 한 청크 최대 글자수(공백 포함 근사, 한글 기준)
var MAX_WORDS = 4;  // 한 청크 최대 단어수

function chunkCaption(text, startMs, durMs) {
  var t = String(text == null ? '' : text).trim();
  if (!t) return [];
  var words = t.split(/\s+/).filter(Boolean);
  var chunks = [];
  var cur = '';
  var curWords = 0;
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    var cand = cur ? cur + ' ' + w : w;
    // 현재 청크가 있고, (단어수 상한 도달 OR 붙이면 글자수 초과) → 청크 마감하고 새로 시작.
    if (cur && (curWords >= MAX_WORDS || cand.length > MAX_CHARS)) {
      chunks.push(cur); cur = w; curWords = 1;
    } else {
      cur = cand; curWords++;
    }
  }
  if (cur) chunks.push(cur);
  var n = chunks.length;
  if (n === 0) return [];
  var totalChars = 0;
  for (var j = 0; j < n; j++) totalChars += chunks[j].length;
  if (totalChars <= 0) totalChars = n;
  var start = Math.round(startMs);
  var end = start + Math.round(durMs);
  var out = [];
  var cursor = start;
  for (var k = 0; k < n; k++) {
    var d;
    if (k === n - 1) {
      d = end - cursor;          // 마지막 청크는 구간 끝까지 채움(라운딩 드리프트 흡수)
      if (d < 1) d = 1;          // 극단적 짧은 구간 방어(살짝 오버플로 허용)
    } else {
      d = Math.round(durMs * chunks[k].length / totalChars);
      if (d < 1) d = 1;
    }
    out.push({ text: chunks[k], startMs: cursor, durMs: d });
    cursor += d;
  }
  return out;
}

module.exports = { chunkCaption: chunkCaption, MAX_CHARS: MAX_CHARS, MAX_WORDS: MAX_WORDS };
