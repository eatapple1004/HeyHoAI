/**
 * 관리자 페이지 공통 네비게이션 — 단일 소스.
 *
 * 왜 스크립트로 만드나 — 각 페이지가 자기 nav를 하드코딩하고 있었는데, 페이지마다 목록이
 *   달랐다(사업체 5개 · 크리에이션 4개 · 통계 4개 · 나머지 4개는 아예 없음). 관리자 화면이
 *   늘어날수록 어긋나고, 실제로 템플릿·체험계정·정밀화·제안서로는 **넘어갈 방법이 없었다.**
 *   목록을 한 곳에 두면 페이지가 늘어도 전부 자동으로 따라온다.
 *
 * 쓰는 법 — 원하는 자리에 `<div id="adminNav"></div>` 를 두고 이 파일을 로드한다.
 *   마운트가 없으면 body 맨 위에 스스로 붙는다(새 페이지가 nav를 빠뜨려도 최소한 이동은 된다).
 */
(function () {
  var PAGES = [
    { href: '/admin-business',      label: '🏪 사업체' },
    // Meta 직결은 기능 스위치(META_DIRECT_ENABLED)로 닫아 뒀다 — 켤 때 이 줄을 되살린다.
    // { href: '/admin-business-meta', label: '🔗 Meta 직결' },
    { href: '/admin-users',         label: '👥 사용자' },
    { href: '/admin-creations',     label: '🖼 크리에이션' },
    { href: '/admin-stats',         label: '📊 통계' },
    { href: '/admin-trials',        label: '🎟 체험 계정' },
    { href: '/admin-templates',     label: '🧩 템플릿' },
    { href: '/admin-refine',        label: '🎯 프롬프트 정밀화' },
    { href: '/admin-proposal',      label: '📄 제안서' },
  ];

  /**
   * 현재 페이지 판정.
   * ⚠️ 하위 경로는 `href + '/'` 로만 본다. 그냥 startsWith 로 하면
   *   `/admin-business-meta` 가 `/admin-business` 에도 걸려 둘 다 활성으로 보인다.
   */
  function isCurrent(href, path) {
    return path === href || path.indexOf(href + '/') === 0;
  }

  function styles() {
    if (document.getElementById('admNavCss')) return;
    var css = document.createElement('style');
    css.id = 'admNavCss';
    // 페이지마다 .nav CSS가 있기도 없기도 해서 자체 클래스로 완결시킨다(변수는 있으면 쓰고 없으면 폴백).
    css.textContent = [
      '.adm-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}',
      '.adm-nav a{font-size:.82rem;font-weight:600;text-decoration:none;padding:7px 13px;border-radius:9px;',
      '  color:var(--dim,#9a9ab2);border:1px solid var(--border,#2a2a3a);background:transparent;white-space:nowrap}',
      '.adm-nav a:hover{color:var(--text,#edecf5);border-color:var(--accent2,#a394ee)}',
      '.adm-nav a.on{color:#fff;background:linear-gradient(180deg,#7c52e8,#5c33c2);border-color:transparent}',
    ].join('');
    document.head.appendChild(css);
  }

  function render() {
    styles();
    var path = location.pathname.replace(/\/$/, '') || '/';
    var nav = document.createElement('nav');
    nav.className = 'adm-nav';
    nav.setAttribute('aria-label', '관리자 메뉴');
    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.href = p.href;
      a.textContent = p.label;
      if (isCurrent(p.href, path)) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
      nav.appendChild(a);
    });

    var mount = document.getElementById('adminNav');
    if (mount) mount.replaceWith(nav);
    else document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
