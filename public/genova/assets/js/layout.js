/* ==========================================================================
   GENOVA HONORS — 공통 헤더 / 푸터 / 아이콘 스프라이트
   페이지마다 복사하지 않고 여기 한 곳만 고치면 전체에 반영됩니다.
   각 페이지 <body>에 data-page="about" 처럼 현재 메뉴를 표시하세요.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- 메인 내비게이션 (기획안 30. 최종 사이트맵) ------------- */
  var NAV = [
    { id: 'about',        href: 'about.html',        key: 'nav.about' },
    { id: 'business',     href: 'business.html',     key: 'nav.business' },
    { id: 'construction', href: 'construction.html', key: 'nav.construction' },
    { id: 'projects',     href: 'projects.html',     key: 'nav.projects' },
    { id: 'news',         href: 'news.html',         key: 'nav.news' },
    { id: 'contact',      href: 'contact.html',      key: 'nav.contact' }
  ];

  /* 지원 언어 — 중국어/일본어는 i18n.js 에 사전 추가 후 아래 배열에 넣으면 켜집니다 */
  var LANGS = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'EN' }
    // { code: 'zh', label: '中文' },
    // { code: 'ja', label: '日本語' }
  ];

  var ICONS = [
    ['i-develop',   '<rect x="3" y="3.5" width="18" height="17" rx="1.5"/><path d="M3 9h18M9 9v11.5"/><path d="M12.5 12.5h5.5M12.5 16h3.5"/>'],
    ['i-arch',      '<path d="M3 21h18"/><path d="M6 21V10l6-6 6 6v11"/><path d="M10 21v-5a2 2 0 014 0v5"/>'],
    ['i-crane',     '<path d="M4 21h16"/><path d="M6 21V4h13"/><path d="M6 8h8"/><path d="M14 4v5"/><path d="M17 9v4"/><path d="M15 13h4l-2 3z"/>'],
    ['i-clipboard', '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M9 10h6M9 14h6M9 18h3"/>'],
    ['i-home',      '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/><path d="M10 21v-6h4v6"/>'],
    ['i-shield',    '<path d="M12 3l8 3v6c0 4.6-3.3 8.3-8 9.5C7.3 20.3 4 16.6 4 12V6l8-3z"/><path d="M9 12l2.2 2.2L15.5 10"/>'],
    ['i-gear',      '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5M18.7 18.7l-1.5-1.5M6.8 6.8L5.3 5.3"/>'],
    ['i-ruler',     '<path d="M3.5 14.5L14.5 3.5l6 6-11 11z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>'],
    ['i-award',     '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.8L7 22l5-2.6L17 22l-1.5-8.2"/>'],
    ['i-people',    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16.5 6.4a3.2 3.2 0 010 5.6"/><path d="M17.5 14.9c2.1.7 3.5 2.4 3.5 5.1"/>'],
    ['i-globe',     '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9z"/>'],
    ['i-plane',     '<path d="M2 13l20-7-7 20-3-8-8-3z"/><path d="M12 18l-1.5-3.5L7 13"/>'],
    ['i-cap',       '<path d="M2 8.5L12 4l10 4.5L12 13 2 8.5z"/><path d="M6 10.7V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.3"/><path d="M22 8.5V15"/>'],
    ['i-city',      '<path d="M3 21V9l6-3v15"/><path d="M9 21V4l6 2v15"/><path d="M15 21v-8l6 2v6"/><path d="M6 12h0M6 15h0M12 9h0M12 12h0M18 17h0"/>'],
    ['i-tower',     '<path d="M7 21V6l5-3 5 3v15"/><path d="M4 21h16"/><path d="M10 9h4M10 13h4M10 17h4"/>'],
    ['i-leaf',      '<path d="M4 20C3 12 8 5 20 4c1 10-4 16-12 16z"/><path d="M4 20c3-6 7-9 12-11"/>'],
    ['i-flag',      '<path d="M7 21V3"/><path d="M7 4h11l-3 3.5L18 11H7"/><path d="M4 21h8"/>'],
    ['i-diamond',   '<path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20"/><path d="M9.5 3L8 9l4 12 4-12-1.5-6"/>'],
    ['i-pin',       '<path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'],
    ['i-mail',      '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 6.5l9 6.5 9-6.5"/>'],
    ['i-handshake', '<path d="M3 12l4-4 3.5 3.5a2 2 0 002.8 0L17 8l4 4"/><path d="M3 12v3l5 4 3-2.5"/><path d="M21 12v3l-5 4-3-2.5"/>'],
    ['i-camera',    '<rect x="2.5" y="7" width="19" height="13" rx="2"/><circle cx="12" cy="13.5" r="4"/><path d="M8.5 7l1.5-3h4l1.5 3"/>'],
    ['i-chat',      '<path d="M21 12a8 8 0 01-11.6 7.1L3.5 21l1.9-5.9A8 8 0 1121 12z"/><path d="M8.5 11h7M8.5 14.5h4"/>'],
    ['i-check',     '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.7 2.7L16 9.6"/>'],
    ['i-layers',    '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>']
  ];

  /* ---------------- 렌더 ---------------- */

  function sprite() {
    return '<svg class="icon-sprite" aria-hidden="true" focusable="false"><defs>' +
      ICONS.map(function (i) {
        return '<symbol id="' + i[0] + '" viewBox="0 0 24 24">' + i[1] + '</symbol>';
      }).join('') +
      '</defs></svg>';
  }

  function header(current) {
    var links = NAV.map(function (n) {
      return '<a href="' + n.href + '" data-i18n="' + n.key + '"' +
             (n.id === current ? ' aria-current="page"' : '') + '></a>';
    }).join('');

    var langs = LANGS.map(function (l, i) {
      return (i ? '<span aria-hidden="true">/</span>' : '') +
             '<button type="button" data-lang="' + l.code + '" aria-pressed="false">' + l.label + '</button>';
    }).join('');

    return '' +
    '<header class="site-header" id="siteHeader">' +
      '<div class="wrap header-inner">' +
        '<a class="brand" href="index.html">' +
          '<span class="brand-mark">GH</span>' +
          '<span class="brand-text">' +
            '<strong>Genova Honors</strong>' +
            '<em data-i18n="brand.sub"></em>' +
          '</span>' +
        '</a>' +
        '<nav class="nav" id="nav">' + links + '</nav>' +
        '<div class="header-side">' +
          '<div class="lang" role="group" aria-label="Language">' + langs + '</div>' +
          '<button class="nav-toggle" id="navToggle" aria-label="Menu" aria-expanded="false">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</header>';
  }

  function footer() {
    var col = function (titleKey, items) {
      return '<div class="foot-col"><h4 data-i18n="' + titleKey + '"></h4><ul>' +
        items.map(function (it) {
          return it.href
            ? '<li><a href="' + it.href + '" data-i18n="' + it.key + '"></a></li>'
            : '<li><span data-i18n="' + it.key + '"></span></li>';
        }).join('') + '</ul></div>';
    };

    return '' +
    '<footer class="site-footer">' +
      '<div class="wrap">' +
        '<div class="foot-top">' +
          '<div class="foot-brand">' +
            '<span class="brand-mark">GH</span>' +
            '<strong>Genova Honors</strong>' +
            '<em data-i18n="brand.sub"></em>' +
          '</div>' +
          col('foot.menu', [
            { href: 'about.html',        key: 'nav.about' },
            { href: 'business.html',     key: 'nav.business' },
            { href: 'construction.html', key: 'nav.construction' },
            { href: 'projects.html',     key: 'nav.projects' }
          ]) +
          col('foot.info', [
            { key: 'foot.addr' },
            { key: 'foot.tel' },
            { key: 'foot.email' }
          ]) +
          col('foot.inquiry', [
            { href: 'contact.html', key: 'ct.i1.h' },
            { href: 'contact.html', key: 'ct.i2.h' },
            { href: 'contact.html', key: 'ct.i3.h' },
            { href: 'news.html',    key: 'nav.news' }
          ]) +
        '</div>' +
        '<div class="foot-bottom">' +
          '<span data-i18n="foot.copy"></span>' +
          '<span><a href="#" data-i18n="foot.privacy"></a></span>' +
        '</div>' +
      '</div>' +
    '</footer>';
  }

  /* ---------------- 주입 ---------------- */
  var page = document.body.dataset.page || '';

  document.body.insertAdjacentHTML('afterbegin', sprite() + header(page));
  document.body.insertAdjacentHTML('beforeend', footer() +
    '<div class="lightbox" id="lightbox" hidden>' +
      '<button class="lb-close" id="lbClose" aria-label="Close">×</button>' +
      '<img id="lbImg" src="" alt="">' +
    '</div>');
})();
