// 공통 인터랙션: 헤더, 언어 메뉴, 모바일 드로어, 제품 갤러리, 서브내비, 문의 폼
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // 현재 언어를 기억해 루트 진입 시 같은 언어로 보낸다
  try { localStorage.setItem('hsm-lang', { 'zh-Hans': 'zh' }[document.documentElement.lang] || document.documentElement.lang); } catch (e) {}

  var hd = $('#hd');
  var onScroll = function () { if (hd) hd.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // 언어 메뉴
  $$('[data-lang]').forEach(function (box) {
    var btn = $('.lang-btn', box);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = box.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function () { box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.classList.remove('is-open'); btn.focus(); } });
  });

  // 모바일 드로어
  var drawer = $('#drawer'), burger = $('.hd-burger');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('.dr-close', drawer).focus(); else burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(true); });
  if (drawer) {
    $('.dr-close', drawer).addEventListener('click', function () { setDrawer(false); });
    drawer.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { document.body.style.overflow = ''; }); });
  }

  // 제품 갤러리
  $$('[data-gallery]').forEach(function (g) {
    var main = $('[data-gal-main]', g);
    $$('.gal-thumbs button', g).forEach(function (b) {
      b.addEventListener('click', function () {
        main.src = b.getAttribute('data-full');
        $$('.gal-thumbs button', g).forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
      });
    });
  });

  // 서브내비 현재 위치 표시
  var sublinks = $$('.subnav a');
  if (sublinks.length && 'IntersectionObserver' in window) {
    var map = {};
    sublinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          sublinks.forEach(function (a) { a.classList.remove('is-on'); });
          map[en.target.id].classList.add('is-on');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  // 폼: 문의·부품 문의·자료 요청 공통 — URL 파라미터로 미리 선택, 클라이언트 검증 (전송 기능은 미연결)
  var q = new URLSearchParams(location.search);
  $$('#contact-form, form[data-form]').forEach(function (form) {
    var prod = q.get('product'), type = q.get('type');
    if (prod && form.product) form.product.value = prod;
    if (type) { var r = $('#type-' + type, form); if (r) r.checked = true; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      $$('[required]', form).forEach(function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.type === 'radio' ? true : el.checkValidity();
        var target = el.type === 'checkbox' ? el.closest('.consent') : el;
        target.classList.toggle('is-bad', !ok);
        if (!ok && !bad) bad = el;
      });
      if (bad) { bad.focus(); return; }
      $('.form-done', form).hidden = false;
      track('form_valid', { form: form.id });
    });
  });

  // 제품 상세 사양 탭 (기본 사양 · 선택 옵션 · 변형 모델)
  $$('[data-tabs]').forEach(function (box) {
    var tabs = $$('[role=tab]', box);
    function select(tab) {
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { var n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); }
      });
    });
  });

  // 제품 영상: 누르면 그 자리에서 재생 (JS가 없으면 YouTube로 이동)
  $$('[data-yt]').forEach(function (box) {
    var a = $('.yt-btn', box);
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = ($('.vid-t', box) || {}).textContent || 'YouTube';
      f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
      f.className = 'yt-frame';
      a.replaceWith(f);
    });
  });

  // 자료실 분류 필터
  $$('[data-dl-filter]').forEach(function (bar) {
    var rows = $$('.docs tbody tr');
    $$('button', bar).forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-cat');
        $$('button', bar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        rows.forEach(function (r) { r.hidden = c !== 'all' && r.getAttribute('data-cat') !== c; });
      });
    });
  });

  // 방문 분석 이벤트: GA4가 설정된 경우에만 기록 (상담·전화·자료·영상 클릭)
  function track(name, params) { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a, button'); if (!a) return;
    var tag = a.getAttribute('data-track');
    var href = a.getAttribute('href') || '';
    if (!tag && href.indexOf('tel:') === 0) tag = 'call';
    if (!tag && /contact\.html/.test(href)) tag = 'quote_click';
    if (tag) track(tag, { href: href, page: location.pathname });
  });

  // 휴대폰 하단 상담 버튼: 첫 화면을 지나면 나타나고, 페이지 맨 아래(상담 띠)에서는 숨긴다
  var mcta = $('.m-cta'), band = $('.cta-band'), h3 = $('#h3');
  if (mcta) {
    var onMcta = function () {
      var past = window.scrollY > window.innerHeight * 0.6;
      var atBand = band && band.getBoundingClientRect().top < window.innerHeight;
      // 메인 3D 구간 안에서는 숨긴다 (마지막 장면에 같은 버튼이 있다)
      var inHero = h3 && h3.offsetParent && h3.getBoundingClientRect().bottom > window.innerHeight;
      mcta.classList.toggle('is-on', past && !atBand && !inHero && !(drawer && !drawer.hidden));
    };
    window.addEventListener('scroll', onMcta, { passive: true }); onMcta();
  }

  // 스크롤 진입 효과: 요소가 화면에 들어오면 아래에서 떠오르고, 사진은 왼쪽부터 펼쳐진다.
  // 같은 부모 안의 요소끼리는 순서대로 시차를 둔다. 동작 줄이기 설정이면 하지 않는다.
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('rv-on');
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        rio.unobserve(en.target);
        $$('[data-count]', en.target).forEach(countUp);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    var stagger = function (sel, step, cls) {
      var seen = [];
      $$(sel).forEach(function (el) {
        var p = el.parentElement, i = 0;
        seen.forEach(function (s) { if (s === p) i++; });
        seen.push(p);
        el.classList.add(cls);
        el.style.setProperty('--d', (i * step) + 'ms');
        rio.observe(el);
      });
    };
    [['main .sec-hd', 0], ['.track', 140], ['.fam', 90], ['.pcard', 90], ['.def-dev', 0], ['.news', 90], ['.vid', 70],
      ['.custom-copy', 0], ['.tl-h li', 70], ['.ms-list li', 80], ['.proof-grid li', 90], ['.ph-lede', 0]].forEach(function (g) { stagger(g[0], g[1], 'rv'); });
    stagger('.custom-media, .track, .fam-media, .pcard-media', 0, 'rv-img');
    stagger('.g-map', 0, 'rv-map');
    [['.g-stats li', 90], ['.faq', 50], ['.var', 60]].forEach(function (g) { stagger(g[0], g[1], 'rv'); });
  }

  // 수치 카운트업 (−2 → 음수도 그대로 센다)
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count'));
    if (isNaN(to)) return;
    var t0 = null, dur = 1300;
    var fmt = function (v) { var n = Math.round(v); return (n < 0 ? '−' : '') + Math.abs(n); };
    (function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }
})();
