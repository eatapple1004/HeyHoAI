// SaaS 페이지 공유 인증 — 미로그인 시 /saas-login 로 보내고, 네비에 사용자 + 로그아웃을 표시한다.
// 사용법: <script src="/saas-auth.js" defer></script> + 네비에 <div id="saasUserBox"></div>
(function () {
  // ── 1) fetch 래퍼: 401 응답 시 SaaS 로그인 페이지로 ──
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const res = await origFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
        location.href = '/saas-login?next=' + encodeURIComponent(location.pathname + location.search);
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
      location.href = '/saas-login?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }
    const box = document.getElementById('saasUserBox');
    if (!box) return;
    box.innerHTML = '';
    const initial = (me.display_name || me.email || '?').trim().charAt(0).toUpperCase();

    // 아바타 트리거 버튼
    const trigger = document.createElement('button');
    trigger.className = 'acct-btn';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Account menu');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.innerHTML = '<span class="acct-ava"></span><span class="acct-caret">▾</span>';
    trigger.querySelector('.acct-ava').textContent = initial;

    // 프로필/세팅 드롭다운 메뉴 (Leonardo 스타일: 워크스페이스 헤더 + 아이콘 항목 + 이메일 푸터)
    const ICON = {
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      billing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
      logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
    };
    const menu = document.createElement('div');
    menu.className = 'acct-menu';
    menu.innerHTML =
      '<div class="acct-id"><span class="acct-ava lg"></span>' +
        '<div class="acct-meta"><div class="acct-name"></div><div class="acct-plan"></div></div>' +
        '<span class="acct-check" aria-hidden="true">✓</span></div>' +
      '<div class="acct-sep"></div>' +
      '<a class="acct-item" href="/account-manage">' + ICON.settings + 'Settings</a>' +
      '<a class="acct-item" href="/billing">' + ICON.billing + 'Billing &amp; credits</a>' +
      '<button class="acct-item acct-logout" type="button">' + ICON.logout + 'Log out</button>' +
      '<div class="acct-foot"></div>';
    menu.querySelector('.acct-id .acct-ava').textContent = initial;
    menu.querySelector('.acct-name').textContent = me.display_name || 'Your account';
    menu.querySelector('.acct-plan').textContent = me.workspace_name || 'Personal';
    menu.querySelector('.acct-foot').textContent = me.email;
    menu.querySelector('.acct-foot').title = me.email;

    trigger.onclick = (e) => { e.stopPropagation(); box.classList.toggle('open'); };
    menu.onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => box.classList.remove('open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.classList.remove('open'); });
    menu.querySelector('.acct-logout').onclick = async () => {
      try { await origFetch('/api/auth/logout', { method: 'POST' }); } catch {}
      location.href = '/saas-login';
    };
    box.append(trigger, menu);
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
