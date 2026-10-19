/**
 * AI가 쓴 HTML·CSS 소독 — 공개 사이트에 그대로 나가므로 서버에서 한 번 더 거른다.
 *   AI 입력에는 고객 홈페이지 글(외부 내용)이 섞여 있어 지시 주입이 가능하다고 보고 막는다.
 *   - 스크립트·프레임·폼·임베드·메타·링크 태그 제거(지도·문의 폼은 서버가 자리표시자에 직접 넣는다)
 *   - on* 이벤트 속성, javascript:/data: 주소 제거
 *   - 이미지는 우리가 넘긴 사진 주소만, CSS url()도 마찬가지, @import 는 지정 폰트만
 */

const DROP_BLOCK = /<(script|iframe|object|embed|form|template|noscript|svg:script|frameset|frame|applet)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_SINGLE = /<\/?(script|iframe|object|embed|form|input|button|select|textarea|link|meta|base|frame|frameset|applet)\b[^>]*>/gi;

export const FONT_CSS = /^https:\/\/(fonts\.googleapis\.com\/css2?\?|cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard@)[^"'\s<>]+$/;

export function cleanCss(css: string, allowed: Set<string>): string {
  return String(css || '')
    .replace(/<\/?style[^>]*>/gi, '')
    .replace(/@import[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi, (m, _q, u) => (allowed.has(u.trim()) ? `url("${u.trim()}")` : 'none'));
}

export function cleanHtml(html: string, allowed: Set<string>): string {
  let s = String(html || '');
  s = s.replace(/<!--[\s\S]*?-->/g, (c) => (/^<!--\s*\{\{[A-Z_]+\}\}\s*-->$/.test(c) ? c : ''));
  s = s.replace(DROP_BLOCK, '').replace(DROP_SINGLE, '');
  // 이벤트 속성
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 위험한 주소
  s = s.replace(/\s(href|src|action|formaction|xlink:href|poster|srcset)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '');
  // 이미지 — 넘긴 사진만
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = /\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag);
    const u = src ? (src[2] ?? src[3] ?? '').trim() : '';
    if (!allowed.has(u)) return '';
    return tag.replace(/\ssrcset\s*=\s*("[^"]*"|'[^']*')/gi, '');
  });
  // 인라인 style 의 url()
  s = s.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (_m, _w, a, b) => ` style="${cleanCss((a ?? b ?? '').replace(/"/g, "'"), allowed).replace(/"/g, '&quot;')}"`);
  // 페이지 안 <style> 블록
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => `<style>${cleanCss(css, allowed)}</style>`);
  return s;
}

/** 사이트 안 링크(/about …)를 실제 경로 앞부분(base) 아래로 — 바깥 주소·tel·mailto·#은 그대로 */
export function rebase(html: string, base: string): string {
  return html.replace(/\shref\s*=\s*("|')(\/[^"']*)\1/gi, (_m, q, p) => (p.startsWith('//') ? '' : ` href=${q}${base}${p === '/' ? '/' : p}${q}`));
}
