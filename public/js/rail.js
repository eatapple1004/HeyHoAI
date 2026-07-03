// 좌측 아이콘 레일 — 전 앱 페이지 공유 (스타일은 theme.css). 현재 경로로 active 표시.
(function () {
  if (document.querySelector('.rail')) return; // 중복 주입 방지
  var path = location.pathname;
  function active(ms) { return ms.some(function (m) { return path === m || path.indexOf(m) === 0; }); }
  var IC = {
    studio: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.5L20 10l-5.8 1.5L12 17l-2.2-5.5L4 10l5.8-1.5z"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/></svg>',
    library: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    store: '<svg viewBox="0 0 24 24"><path d="M4 4h16l1 5a2.5 2.5 0 01-4.9.6 2.5 2.5 0 01-4.9 0 2.5 2.5 0 01-4.9 0A2.5 2.5 0 013 9z"/><path d="M5 11v8a1 1 0 001 1h12a1 1 0 001-1v-8"/></svg>',
    billing: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>',
    creator: '<svg viewBox="0 0 24 24"><path d="M4 4h16l-1 4.4a2.6 2.6 0 01-5 .3 2.6 2.6 0 01-5 0 2.6 2.6 0 01-5-.3z"/><path d="M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9"/><path d="M10 20v-5h4v5"/></svg>'
  };
  // (2026-07-03) 순서: Studio · Library · Store · Explore · Creator(flag) · Billing. Store = 옛 Explore>Templates 카탈로그(/store).
  var items = [
    { h: '/studio', l: 'Studio', i: IC.studio, m: ['/studio'] },
    { h: '/gallery', l: 'Library', i: IC.library, m: ['/gallery', '/library'] },
    { h: '/store', l: 'Store', i: IC.store, m: ['/store'] },
    { h: '/explore', l: 'Community Creations', i: IC.explore, m: ['/explore'] },
    { h: '/earnings', l: 'Creator', i: IC.creator, m: ['/earnings'], f: 'earnings' },
    { h: '/billing', l: 'Billing', i: IC.billing, m: ['/billing'] }
  ];
  var html = '<div class="rail-brand" onclick="location.href=\'/landing\'" title="Doppia"><img src="/favicon-512.png" alt="Doppia"></div><div class="rail-nav">';
  items.forEach(function (it) {
    html += '<a class="rail-item' + (active(it.m) ? ' active' : '') + '"' + (it.f ? ' data-flag="' + it.f + '"' : '') + ' onclick="location.href=\'' + it.h + '\'" title="' + it.l + '">' + it.i + '<span>' + it.l + '</span></a>';
  });
  html += '</div>';
  var rail = document.createElement('aside');
  rail.className = 'rail';
  rail.innerHTML = html;
  document.body.insertBefore(rail, document.body.firstChild);
  document.body.classList.add('has-rail');
})();
