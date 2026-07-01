/*!
 * flags.js — 런칭 노출 단일소스 (kill/keep 원장, 2026-06)
 * ─────────────────────────────────────────────────────────────
 * 규칙: launch:true  = main(prod) 노출
 *       launch:false = main 숨김 / 로컬(localhost)은 항상 노출 + "🔒 main 보류|숨김" 배지
 * 사용: ① 숨길 요소에 data-flag="키"  (동적 생성 요소도 자동 — MutationObserver)
 *       ② 조건부 로직엔 window.featureOn('키')
 * ⚠️ 프론트 숨김은 UX용. 돈·데이터 라우트는 백엔드(NODE_ENV)에서도 게이팅할 것.
 */
(function () {
  var LAUNCH = {
    // 🔴 런칭에서 숨기는 기능 (로컬엔 표시)
    reels:        { launch: false, label: 'hidden' }, // Kling 영상 — v1.1로 연기
    brandkit:     { launch: false, label: 'on hold' }, // 로고/폰트 미적용 (반쪽)
    marketplace:  { launch: true,  label: 'hidden' }, // 점화(2026-06-22, dev 확인용 전체점화) — 유저 유료 실과금은 서버 MARKETPLACE_PAID env가 별도 게이트
    earnings:     { launch: false, label: 'hidden' }, // 숨김(2026-07-01) — Creator Studio(판매자 대시보드) 접기. 마켓 판매 실수요 생기면 재점화(레일 Creator·/earnings 게이트)
    teams:        { launch: false, label: 'hidden' }, // 개인 유저 먼저
    business:     { launch: false, label: 'hidden' }, // B2B 연기
    affiliate:    { launch: false, label: 'hidden' }, // 성장기능, 임계 아님
    ugc:          { launch: false, label: 'hidden' }, // UGC Ads 모드 — 준비 중
    influencer:   { launch: false, label: 'hidden' }, // 숨김(2026-07-01) — 첫 고객 기업 대상: 인물/얼굴(Influencer) 모드 접기(Shopping·Custom 중심). 재점화=launch:true
    enhance:      { launch: false, label: 'hidden' }, // 프롬프트 LLM 보강 — 첫 출시 제외(Custom 파워유저용), 점화 후 재노출
    caption:      { launch: false, label: 'hidden' }, // 캡션+해시태그 애드온 — 첫 출시 보류, 점화 후 재노출
    // 모델 선택 단순화 — pro만 노출
    'model-flash':{ launch: false, label: 'hidden' },
    'model-gpt':  { launch: false, label: 'hidden' },
    held:         { launch: false, label: 'on hold', noBadge: true } // 보류 템플릿 — prod 숨김 / 로컬은 카드 자체 보류배지
  };

  // 숨긴 기능의 '페이지'(직접 URL 접근). prod=홈으로 리다이렉트 / 로컬=상단 배너.
  var PAGE_FLAG = { '/marketplace': 'marketplace', '/business': 'business', '/affiliate': 'affiliate', '/earnings': 'earnings', '/join-team': 'teams' };

  // ?prod=1 → prod(숨김) 미리보기 강제 (어디서든 main에 뜰 모습 확인용). 안전: 숨기기만 함.
  var _forceProd = (function () { try { return new URLSearchParams(location.search).get('prod') === '1'; } catch (e) { return false; } })();
  // 로컬 프리뷰 편의: :3001 포트 = 'prod(숨김)' 전용 인스턴스 / 그 외 로컬 포트(:3002 등) = '로컬(노출+배지)'.
  var _prodPort = (location.port === '3001');
  var IS_LOCAL = !_forceProd && !_prodPort && ['localhost', '127.0.0.1', '[::1]', '::1', ''].indexOf(location.hostname) !== -1;

  function cfg(n) { return LAUNCH[n] || { launch: true, label: '' }; }
  function featureOn(n) { return IS_LOCAL || cfg(n).launch !== false; }

  window.featureOn = featureOn;
  window.__LAUNCH_FLAGS = LAUNCH;
  window.__IS_LOCAL = IS_LOCAL;

  function apply(el) {
    if (!el || el.nodeType !== 1 || el.__flagged) return;
    var n = el.getAttribute && el.getAttribute('data-flag');
    if (!n) return;
    el.__flagged = true;
    var c = cfg(n);
    if (!featureOn(n)) { el.style.display = 'none'; return; }      // main: 숨김
    if (IS_LOCAL && c.launch === false && !c.noBadge) {            // 로컬: 배지 (noBadge=카드 자체 배지 사용)
      el.setAttribute('data-prod-hidden', c.label || '숨김');
    }
  }
  function sweep(root) {
    var r = root || document;
    if (r.querySelectorAll) r.querySelectorAll('[data-flag]').forEach(apply);
  }
  // 숨긴 '페이지'로 가는 링크/버튼(href·onclick) 자동 태깅 — 페이지마다 수동 data-flag 불필요.
  function autoLinks(root) {
    var r = root || document;
    if (!r.querySelectorAll) return;
    r.querySelectorAll('a[href],a[onclick],button[onclick]').forEach(function (el) {
      if (el.__flagged || el.hasAttribute('data-flag')) return;
      var s = (el.getAttribute('href') || '') + ' ' + (el.getAttribute('onclick') || '');
      for (var path in PAGE_FLAG) {
        if (s.indexOf(path) !== -1) { el.setAttribute('data-flag', PAGE_FLAG[path]); apply(el); break; }
      }
    });
  }
  function injectCSS() {
    if (!IS_LOCAL) return;
    var s = document.createElement('style');
    s.textContent =
      '[data-prod-hidden]{position:relative;outline:1px dashed rgba(201,162,39,.7);outline-offset:2px}' +
      '[data-prod-hidden]::after{content:"main "attr(data-prod-hidden);position:absolute;top:2px;right:2px;z-index:9;' +
      'font-size:9px;font-weight:800;letter-spacing:.3px;padding:2px 6px;border-radius:6px;' +
      'background:rgba(0,0,0,.72);color:#ffce7a;border:1px solid rgba(255,206,122,.55);pointer-events:none}';
    document.head.appendChild(s);
  }
  function guardPage() {
    var p = (location.pathname || '/').replace(/\.html$/, '').replace(/(.)\/$/, '$1');
    var pf = PAGE_FLAG[p];
    if (!pf) return false;
    if (!featureOn(pf)) { location.replace('/'); return true; }   // prod: 숨긴 페이지 → 홈
    if (IS_LOCAL && cfg(pf).launch === false) {                    // 로컬: 상단 배너
      var b = document.createElement('div');
      b.textContent = 'Hidden on main (' + pf + ')';
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a1a27;color:#ffce7a;font:800 12px -apple-system,sans-serif;padding:7px 12px;text-align:center;border-bottom:1px solid rgba(255,206,122,.55)';
      (document.body || document.documentElement).appendChild(b);
    }
    return false;
  }
  function init() {
    if (guardPage()) return;
    injectCSS();
    sweep(document);
    autoLinks(document);
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function (nd) {
            if (nd.nodeType !== 1) return;
            if (nd.hasAttribute && nd.hasAttribute('data-flag')) apply(nd);
            sweep(nd);
            autoLinks(nd);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
