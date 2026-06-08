// SaaS 페이지 공유 인증 — 미로그인 시 /saas-login.html 로 보내고, 네비에 사용자 + 로그아웃을 표시한다.
// 사용법: <script src="/saas-auth.js" defer></script> + 네비에 <div id="saasUserBox"></div>
(function () {
  // ── 1) fetch 래퍼: 401 응답 시 SaaS 로그인 페이지로 ──
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const res = await origFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
        location.href = '/saas-login.html?next=' + encodeURIComponent(location.pathname + location.search);
      }
    } catch {}
    return res;
  };

  // ── 2) 로그인 확인 + 네비 사용자 박스 ──
  async function init() {
    let me = null;
    try {
      const res = await origFetch('/api/auth/me');
      if (res.ok) me = (await res.json()).data;
    } catch {}
    if (!me) {
      location.href = '/saas-login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }
    const box = document.getElementById('saasUserBox');
    if (!box) return;
    box.innerHTML = '';
    box.style.cssText = 'display:flex;align-items:center;gap:10px;';

    const who = document.createElement('span');
    who.textContent = me.display_name || me.email;
    who.title = me.email;
    who.style.cssText = 'color:var(--dim);font-size:13px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    const btn = document.createElement('button');
    btn.textContent = 'Logout';
    btn.style.cssText = 'padding:6px 12px;background:transparent;border:1px solid var(--border);color:var(--dim);border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;';
    btn.onclick = async () => {
      try { await origFetch('/api/auth/logout', { method: 'POST' }); } catch {}
      location.href = '/saas-login.html';
    };
    box.append(who, btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ── 전역 토스트 (alert 대체) ──
  function ensureToastHost() {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
      document.body.appendChild(host);
    }
    return host;
  }
  // window.toast(message, type) — type: 'info'(기본) | 'success' | 'error'
  window.toast = function (msg, type) {
    const host = ensureToastHost();
    const t = document.createElement('div');
    const color = type === 'error' ? '#ff7eb6' : type === 'success' ? '#5ee0d6' : '#fff';
    t.textContent = msg;
    t.style.cssText = 'pointer-events:auto;max-width:90vw;font-size:13.5px;font-weight:600;color:' + color
      + ';background:rgba(19,19,29,.94);border:1px solid var(--border2,#2a2a3e);border-radius:12px;padding:12px 18px;'
      + 'box-shadow:0 16px 40px -12px rgba(0,0,0,.7);opacity:0;transform:translateY(8px);transition:.22s';
    host.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 250); }, 2600);
  };
})();
