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
})();
