// 좌측 아이콘 레일 — 전 앱 페이지 공유 (스타일은 theme.css). 현재 경로로 active 표시.
(function () {
  if (document.querySelector('.rail')) return; // 중복 주입 방지
  var path = location.pathname;
  function active(ms) { return ms.some(function (m) { return path === m || path.indexOf(m) === 0; }); }
  var IC = {
    studio: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.5L20 10l-5.8 1.5L12 17l-2.2-5.5L4 10l5.8-1.5z"/></svg>',
    library: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    billing: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>'
  };
  var items = [
    { h: '/studio', l: 'Studio', i: IC.studio, m: ['/studio'] },
    { h: '/gallery', l: 'Library', i: IC.library, m: ['/gallery', '/library'] },
    { h: '/billing', l: 'Billing', i: IC.billing, m: ['/billing'] }
  ];
  var html = '<div class="rail-brand" onclick="location.href=\'/landing\'" title="Doppia"><img src="/favicon-512.png" alt="Doppia"></div><div class="rail-nav">';
  items.forEach(function (it) {
    html += '<a class="rail-item' + (active(it.m) ? ' active' : '') + '" onclick="location.href=\'' + it.h + '\'" title="' + it.l + '">' + it.i + '<span>' + it.l + '</span></a>';
  });
  html += '</div>';
  var rail = document.createElement('aside');
  rail.className = 'rail';
  rail.innerHTML = html;
  document.body.insertBefore(rail, document.body.firstChild);
  document.body.classList.add('has-rail');
})();
