/**
 * 관리자 페이지 공통 네비게이션 — 단일 소스.
 *
 * 왜 스크립트로 만드나 — 각 페이지가 자기 nav를 하드코딩하고 있었는데, 페이지마다 목록이
 *   달랐다(사업체 5개 · 크리에이션 4개 · 통계 4개 · 나머지 4개는 아예 없음). 관리자 화면이
 *   늘어날수록 어긋나고, 실제로 템플릿·체험계정·정밀화·제안서로는 **넘어갈 방법이 없었다.**
 *   목록을 한 곳에 두면 페이지가 늘어도 전부 자동으로 따라온다.
 *
 * 쓰는 법 — 원하는 자리에 `<div id="adminNav"></div>` 를 두고 이 파일을 로드한다.
 *   (2026-11-28) 이제 왼쪽에 고정된 세로 메뉴로 그린다. 마운트 자리는 지우기만 하고, 메뉴는 body 맨 앞에 붙는다.
 *   모양은 css/admin-theme.css(공통 테마)가 정한다 — 페이지가 그 파일을 안 실었으면 여기서 실어 준다.
 *
 * 하위 메뉴 — 지금 페이지 항목 바로 아래에 `#admSideSub` 자리를 만들고, 다 그리면 `admnav:ready` 이벤트를 쏜다.
 *   페이지가 자기 탭을 그 자리로 옮겨 붙이면 된다(예: admin-hq 의 한눈에·결정·원장…). 아래쪽 `#admSideFoot` 도 같은 방식.
 *
 * ⚠️ **메뉴를 고쳤으면 모든 어드민 페이지의 `?v=` 를 같이 올릴 것.**
 *   정적 자산이 max-age 4시간이라, 여기만 고치면 브라우저가 옛 파일을 계속 쓴다 —
 *   실제로 '결제' 탭을 추가했는데 새 페이지(v=2)에서만 보이고 나머지(v=1)엔 안 나왔다.
 *   `sed -i '' 's|admin-nav\.js?v=N|admin-nav.js?v=N+1|g' public/admin-*.html`
 */
(function () {
  // 아이콘은 16px 선 그림 — 이모지 대신(화면마다 크기·색이 달라 보여서)
  var I = {
    hq: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>',
    biz: '<path d="M2.5 6.5L4 2.5h8l1.5 4"/><path d="M3 6.5v7h10v-7"/><path d="M6.5 13.5v-3.5h3v3.5"/>',
    users: '<circle cx="6" cy="6" r="2.4"/><path d="M1.8 13c.6-2.3 2.2-3.4 4.2-3.4s3.6 1.1 4.2 3.4"/><circle cx="11.6" cy="5.4" r="1.8"/><path d="M11.2 9.3c1.6.1 2.6 1.1 3 2.7"/>',
    image: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="6" cy="6.5" r="1.2"/><path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3"/>',
    chart: '<path d="M2.5 13.5h11"/><path d="M4.5 11V8M8 11V4.5M11.5 11V6.5"/>',
    gauge: '<path d="M2.5 11a5.5 5.5 0 0 1 11 0"/><path d="M8 11l2.5-3"/>',
    card: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2 6.5h12M4.5 10h2.5"/>',
    undo: '<path d="M5.5 4L2.5 7l3 3"/><path d="M2.5 7h7a4 4 0 0 1 0 8H7"/>',
    ticket: '<path d="M2 5V3.5h12V5a1.5 1.5 0 0 0 0 3v1.5a1.5 1.5 0 0 0 0 3V13H2v-1.5a1.5 1.5 0 0 0 0-3V8a1.5 1.5 0 0 0 0-3z"/>',
    puzzle: '<path d="M6 2.5h4v2a1.2 1.2 0 1 0 2.4 0v-.2h1.1v4h-2a1.2 1.2 0 1 0 0 2.4h2v2.8h-11v-11h3.5z"/>',
    target: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.5"/>',
    doc: '<path d="M3.5 2h6l3 3v9h-9z"/><path d="M9.5 2v3h3M5.5 8.5h5M5.5 11h3.5"/>',
  };
  var PAGES = [
    { href: '/admin-hq',            label: 'HQ',              icon: 'hq' },
    { href: '/admin-business',      label: '사업체',           icon: 'biz' },
    // Meta 직결은 기능 스위치(META_DIRECT_ENABLED)로 닫아 뒀다 — 켤 때 이 줄을 되살린다.
    // { href: '/admin-business-meta', label: 'Meta 직결',     icon: 'biz' },
    { href: '/admin-users',         label: '사용자',           icon: 'users' },
    { href: '/admin-creations',     label: '크리에이션',        icon: 'image' },
    { href: '/admin-stats',         label: '통계',             icon: 'chart' },
    { href: '/admin-usage',         label: '기능·엔진 사용량',   icon: 'gauge' },
    { href: '/admin-payments',      label: '결제',             icon: 'card' },
    { href: '/admin-refunds',       label: '환불',             icon: 'undo' },
    { href: '/admin-trials',        label: '체험 계정',         icon: 'ticket' },
    { href: '/admin-templates',     label: '템플릿',           icon: 'puzzle' },
    { href: '/admin-refine',        label: '프롬프트 정밀화',    icon: 'target' },
    { href: '/admin-proposal',      label: '제안서',           icon: 'doc' },
  ];
  var THEME = '/css/admin-theme.css?v=1';

  /**
   * 현재 페이지 판정.
   * ⚠️ 하위 경로는 `href + '/'` 로만 본다. 그냥 startsWith 로 하면
   *   `/admin-business-meta` 가 `/admin-business` 에도 걸려 둘 다 활성으로 보인다.
   *   상세 화면(/admin-business-detail 등)은 `-` 로 이어지므로 `href + '-'` 도 그 메뉴로 본다.
   */
  function isCurrent(href, path) {
    return path === href || path.indexOf(href + '/') === 0 || path.indexOf(href + '-') === 0;
  }

  // 공통 테마를 안 실은 페이지(새로 만든 화면 등)도 같은 모양이 되게 — 이미 있으면 그대로 둔다
  function ensureTheme() {
    if (document.querySelector('link[href*="admin-theme.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = THEME;
    document.head.appendChild(l);
  }

  function icon(name) {
    return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + (I[name] || '') + '</svg>';
  }

  function render() {
    ensureTheme();
    var path = location.pathname.replace(/\/$/, '') || '/';
    // 가장 길게 맞는 항목 하나만 활성(예: /admin-business-detail → 사업체)
    var current = null;
    PAGES.forEach(function (p) { if (isCurrent(p.href, path) && (!current || p.href.length > current.href.length)) current = p; });

    var side = document.createElement('aside');
    side.className = 'adm-side';
    side.innerHTML = '<a class="adm-brand" href="/admin-hq"><i></i><b>Doppia</b><span>Admin</span></a>';
    var nav = document.createElement('nav');
    nav.setAttribute('aria-label', '관리자 메뉴');
    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.href = p.href;
      a.innerHTML = icon(p.icon) + '<span></span>';
      a.lastChild.textContent = p.label;
      if (p === current) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
      nav.appendChild(a);
      if (p === current) {
        var sub = document.createElement('div');
        sub.className = 'adm-side-sub'; sub.id = 'admSideSub';
        nav.appendChild(sub);
      }
    });
    side.appendChild(nav);
    var foot = document.createElement('div');
    foot.className = 'adm-side-foot'; foot.id = 'admSideFoot';
    side.appendChild(foot);

    var mount = document.getElementById('adminNav');
    if (mount) mount.remove();
    document.body.insertBefore(side, document.body.firstChild);
    document.body.classList.add('adm-has-side');
    document.dispatchEvent(new Event('admnav:ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
