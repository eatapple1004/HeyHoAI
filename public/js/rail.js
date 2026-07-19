// 좌측 아이콘 레일 — 전 앱 페이지 공유 (스타일은 theme.css). 현재 경로로 active 표시.
(function () {
  if (document.querySelector('.rail')) return; // 중복 주입 방지
  var path = location.pathname;
  var isUgc = /(?:^|[?&])mode=ugc(?:&|$)/i.test(location.search); // Ad Video = /studio?mode=ugc (Studio와 경로 공유 → 쿼리로 구분)
  function active(it) {
    if (!it.m.some(function (m) { return path === m || path.indexOf(m) === 0; })) return false;
    if (it.q === 'ugc') return isUgc;    // Ad Video: /studio 이면서 mode=ugc 일 때만
    if (it.q === '!ugc') return !isUgc;  // Studio: /studio 이면서 ugc 아닐 때만
    return true;
  }
  var IC = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-6.5 8 6.5"/><path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9"/><path d="M10 20v-5h4v5"/></svg>',
    studio: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.5L20 10l-5.8 1.5L12 17l-2.2-5.5L4 10l5.8-1.5z"/></svg>',
    advideo: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10l6-3v10l-6-3z"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/></svg>',
    library: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    store: '<svg viewBox="0 0 24 24"><path d="M4 4h16l1 5a2.5 2.5 0 01-4.9.6 2.5 2.5 0 01-4.9 0 2.5 2.5 0 01-4.9 0A2.5 2.5 0 013 9z"/><path d="M5 11v8a1 1 0 001 1h12a1 1 0 001-1v-8"/></svg>',
    billing: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>',
    creator: '<svg viewBox="0 0 24 24"><path d="M4 4h16l-1 4.4a2.6 2.6 0 01-5 .3 2.6 2.6 0 01-5 0 2.6 2.6 0 01-5-.3z"/><path d="M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9"/><path d="M10 20v-5h4v5"/></svg>'
  };
  // (2026-07-09) 순서: Shots · Ad Video · Library · Store · Community · Creator(flag) · Billing.
  //   Shots·Ad Video = 대표 상품(둘 다 /studio, Ad Video는 mode=ugc 딥링크 → bootFromUrl이 ugc 모드로 진입).
//   ⚠️ 'Shots'=대본 없는 것(확정결정 §2). 라벨만 Shots이고 URL·컨테이너는 /studio 그대로 — Studio는 사용자에게 안 보인다.
  var items = [
    { h: '/home.html', l: 'Home', i: IC.home, m: ['/home'] }, // 정적 서빙(/home.html) — index.js 클린URL 라우트는 추후(충돌 회피)
    { h: '/studio', l: 'Shots', i: IC.studio, m: ['/studio'], q: '!ugc' },
    { h: '/studio?mode=ugc', l: 'Ad Video', i: IC.advideo, m: ['/studio'], q: 'ugc', b: 'advideo' },
    { h: '/gallery', l: 'Library', i: IC.library, m: ['/gallery', '/library'] },
    // (2026-07-20) Store 레일 항목 제거 — 스토어 미운영(숨김). /store 페이지·카탈로그 코드는 그대로 두고 진입점만 뗀다.
    //   같이 뗀 것: Shots 템플릿 관리의 [Get more templates] CTA(studio.html SHOW_STORE), Library 부제·빈 상태의 스토어 문구.
    //   롤백: 아래 주석 복원 + studio.html SHOW_STORE=true + 두 문구 되돌리기.
    // { h: '/store', l: 'Store', i: IC.store, m: ['/store'] },
    // (2026-07-11) Community(explore) 레일 항목 제거 — 홈 하단 'Community Creations' 섹션이 좋아요·크리에이터 링크까지 기능 동등하게 대체. 롤백: 아래 주석 복원.
    // { h: '/explore', l: 'Community', i: IC.explore, m: ['/explore'] },
    // (2026-07-11) Creator(earnings) 레일 항목 제거 — 유저 템플릿/크리에이터 수익 미운영(오피셜 전용). 롤백: 아래 주석 복원.
    // { h: '/earnings', l: 'Creator', i: IC.creator, m: ['/earnings'], f: 'earnings' },
    { h: '/billing', l: 'Billing', i: IC.billing, m: ['/billing'] }
  ];
  // (2026-07-11) 레일 상단 브랜드/파비콘 클릭 비활성화 — 아무 동작 안 함(옛 onclick=/landing 제거). 롤백: onclick="location.href='/landing'" 복원.
  var html = '<div class="rail-brand" title="Doppia" style="cursor:default"><img src="/favicon-512.png" alt="Doppia"></div><div class="rail-nav">';
  items.forEach(function (it) {
    html += '<a class="rail-item' + (active(it) ? ' active' : '') + '"' + (it.f ? ' data-flag="' + it.f + '"' : '') + (it.b ? ' data-badge="' + it.b + '"' : '') + ' onclick="location.href=\'' + it.h + '\'" title="' + it.l + '">' + it.i + '<span>' + it.l + '</span></a>';
  });
  html += '</div>';
  var rail = document.createElement('aside');
  rail.className = 'rail';
  rail.innerHTML = html;
  document.body.insertBefore(rail, document.body.firstChild);
  document.body.classList.add('has-rail');

  // 크레딧 칩 + 계정 아바타를 레일 하단으로 이동 (Leonardo식). 노드 자체를 옮겨 ID·이벤트·데이터 흐름 보존.
  var foot = document.createElement('div');
  foot.className = 'rail-foot';
  var balEl = document.getElementById('creditBalance');
  var pill = balEl ? balEl.closest('.credits') : null;
  var userBox = document.getElementById('saasUserBox');
  if (pill) foot.appendChild(pill);
  if (userBox) foot.appendChild(userBox);
  if (foot.childNodes.length) rail.appendChild(foot);

  /* ── Ad Video 배지 (2026-07-17) ────────────────────────────────────────────
   * "Ad Video에서 나를 기다리는 것" = 렌더 중 + 완성됐지만 미저장(draft).
   *
   * 왜 '본 시각(seen)'을 안 쓰나: 배지가 *보면* 꺼지는 게 아니라 *처리하면* 꺼진다.
   *   렌더 중 → 아직 있음 → 유지 / 완성·미저장 → 아직 있음 → 유지 / 저장됨 → 사라짐.
   *   덕분에 localStorage도 seen_at 컬럼(=migrate)도 필요 없고, 배지는 항상 행동 가능하다.
   *
   * ⚠️ 이 파일은 11개 페이지가 공유한다. 여기서 예외가 새면 전 페이지 네비게이션이 죽는다.
   *   → 레일은 위에서 이미 그려졌고, 아래는 전부 try/catch + 실패 시 조용히 배지 없이 간다.
   *   → 미로그인(401)은 정상 상황이므로 조용히 멈춘다(saas-auth의 401 리다이렉트를 타지 않도록
   *      /api/auth/ 가 아닌 경로의 401은 그쪽 래퍼가 처리하니, 여기선 응답만 보고 폴링을 끈다).
   */
  try {
    var badgeEl = rail.querySelector('.rail-item[data-badge="advideo"]');
    if (!badgeEl) return;
    // 스타일은 theme.css가 아니라 여기 인라인 — theme.css를 고치면 그 캐시 버전을 20개 페이지에서
    // 올려야 하고(개발자 소유 파일 포함 가능), 하나라도 옛 CSS를 캐시에서 받으면 배지가 스타일 없이
    // 깨져 보인다. 인라인이면 바뀌는 파일이 rail.js 하나뿐이라 버전 관리도 한 군데서 끝난다.
    badgeEl.style.position = 'relative';
    var dot = document.createElement('i');
    dot.style.cssText = 'position:absolute;top:4px;right:7px;min-width:15px;height:15px;padding:0 4px;'
      + 'box-sizing:border-box;border-radius:8px;background:var(--accent2,#8b7cf6);color:#fff;'
      + 'font-size:9.5px;font-weight:800;line-height:15px;text-align:center;font-style:normal;pointer-events:none';
    dot.style.display = 'none';
    badgeEl.appendChild(dot);

    var timer = null;
    var stopped = false;
    function paint(n) {
      try {
        if (n > 0) { dot.textContent = n > 9 ? '9+' : String(n); dot.style.display = ''; badgeEl.title = 'Ad Video — ' + n + ' waiting'; }
        else { dot.style.display = 'none'; badgeEl.title = 'Ad Video'; }
      } catch (e) {}
    }
    function tick() {
      if (stopped || document.hidden) return; // 숨은 탭은 폴링 안 함(유휴 부하·중복 방지)
      fetch('/api/generate/ugc/jobs', { headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (r.status === 401 || r.status === 403) { stopped = true; if (timer) clearInterval(timer); return null; } // 미로그인 → 조용히 종료
          if (!r.ok) return null;
          return r.json();
        })
        .then(function (d) {
          if (!d || !d.success) return;
          var a = Array.isArray(d.data) ? d.data.length : 0;
          var p = Array.isArray(d.pending) ? d.pending.length : 0;
          paint(a + p);
        })
        .catch(function () {}); // 네트워크 실패 = 배지 없이 감 (레일은 멀쩡)
    }
    tick();
    timer = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); }); // 탭 복귀 시 즉시 갱신
  } catch (e) { /* 배지는 부가기능 — 실패해도 레일은 살아있어야 한다 */ }
})();
