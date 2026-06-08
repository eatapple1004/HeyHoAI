/* Doppia — 공유 클라이언트 상태 + 토스트 (mock)
 * 모든 페이지가 <script src="/js/hh.js"></script>로 포함.
 * - 크레딧 단일 소스(localStorage 'hh_credits', 신규=10) → 페이지 간 잔액 불일치 제거
 * - HH.toast(): alert 대체 인라인 토스트 (한국어 alert 혼재 정리)
 */
(function () {
  var KEY = 'hh_credits';
  var HH = {
    get credits() {
      var v = parseInt(localStorage.getItem(KEY), 10);
      return Number.isFinite(v) ? v : 10; // 신규 사용자 기본 10크레딧
    },
    set credits(v) {
      localStorage.setItem(KEY, Math.max(0, v | 0));
      HH.setNav();
    },
    spend: function (n) { HH.credits = HH.credits - n; return HH.credits; },
    add: function (n) { HH.credits = HH.credits + n; return HH.credits; },
    get plan() { return localStorage.getItem('hh_plan') || 'free'; },
    set plan(p) { localStorage.setItem('hh_plan', p); },
    // 모든 nav 크레딧 칩(.cr-bal)을 단일 값으로 동기화
    setNav: function () {
      var v = HH.credits;
      document.querySelectorAll('.cr-bal').forEach(function (e) { e.textContent = v; });
    },
    toast: function (msg, opts) {
      opts = opts || {};
      var t = document.createElement('div');
      t.className = 'hh-toast' + (opts.type === 'warn' ? ' warn' : '');
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('show'); });
      setTimeout(function () {
        t.classList.remove('show');
        setTimeout(function () { t.remove(); }, 320);
      }, opts.ms || 2600);
    }
  };
  var css =
    '.hh-toast{position:fixed;left:50%;bottom:32px;transform:translate(-50%,18px);z-index:200;' +
    'background:rgba(19,19,29,.96);color:#edecf5;border:1px solid rgba(255,255,255,.14);border-radius:12px;' +
    'padding:12px 18px;font:600 14px/1.45 Inter,-apple-system,sans-serif;box-shadow:0 18px 44px -14px rgba(0,0,0,.65);' +
    'opacity:0;transition:all .3s cubic-bezier(.2,.7,.3,1);max-width:90vw;text-align:center;pointer-events:none}' +
    '.hh-toast.show{opacity:1;transform:translate(-50%,0)}' +
    '.hh-toast.warn{border-color:rgba(255,206,122,.4)}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  window.HH = HH;
  if (document.readyState !== 'loading') HH.setNav();
  else document.addEventListener('DOMContentLoaded', HH.setNav);
})();
