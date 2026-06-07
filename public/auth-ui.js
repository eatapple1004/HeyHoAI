// 공유 인증 UI — 각 페이지 헤더에 "현재 사용자 + 로그아웃"을 주입하고,
// API가 401을 반환하면 /login 으로 리다이렉트한다.
// 사용법: <script src="/auth-ui.js" defer></script>
(function () {
  // ── 1) fetch 래퍼: 401 응답 시 로그인 페이지로 ──
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const res = await origFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = '/login?next=' + next;
      }
    } catch {}
    return res;
  };

  // ── 2) 헤더에 사용자 정보 주입 ──
  async function injectUserBox() {
    let me = null;
    try {
      const res = await origFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        me = data.data;
      }
    } catch {}
    if (!me) return; // 미인증 페이지(로그인 등)에서는 표시 안 함

    const header = document.querySelector('header');
    if (!header) return;

    const box = document.createElement('div');
    box.id = 'authUserBox';
    box.style.cssText = 'display:flex;align-items:center;gap:10px;margin-left:16px;font-size:13px;';

    const label = me.display_name || me.email;
    const who = document.createElement('span');
    who.textContent = label;
    who.title = me.email;
    who.style.cssText = 'color:var(--dim,#8888a0);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    const btn = document.createElement('button');
    btn.textContent = '로그아웃';
    btn.style.cssText = 'padding:5px 10px;background:transparent;border:1px solid var(--border,#2a2a3e);'
      + 'color:var(--dim,#8888a0);border-radius:6px;font-size:12px;cursor:pointer;';
    btn.addEventListener('mouseover', () => { btn.style.color = 'var(--red,#ff7675)'; btn.style.borderColor = 'var(--red,#ff7675)'; });
    btn.addEventListener('mouseout', () => { btn.style.color = 'var(--dim,#8888a0)'; btn.style.borderColor = 'var(--border,#2a2a3e)'; });
    btn.addEventListener('click', async () => {
      try { await origFetch('/api/auth/logout', { method: 'POST' }); } catch {}
      location.href = '/login';
    });

    box.appendChild(who);
    box.appendChild(btn);
    header.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUserBox);
  } else {
    injectUserBox();
  }
})();
