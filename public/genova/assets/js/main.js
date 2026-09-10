/* ==========================================================================
   GENOVA HONORS — interactions
   layout.js 가 헤더/푸터를 주입한 뒤에 실행되어야 합니다 (script 순서 주의)
   ========================================================================== */
(function () {
  'use strict';

  /* ---- sticky header ---- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- mobile nav ---- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- scroll reveal ---- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 80 + 'ms';
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- filter chips (projects / news / gallery) ----
     <div class="filters" data-target="#grid"><button data-filter="all">…
     대상 자식에 data-cat="res com …" 지정                                  */
  document.querySelectorAll('.filters').forEach(function (bar) {
    var target = document.querySelector(bar.dataset.target);
    if (!target) return;
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      bar.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === btn); });
      var f = btn.dataset.filter;
      Array.prototype.forEach.call(target.children, function (child) {
        var cats = (child.dataset.cat || '').split(/\s+/);
        child.hidden = !(f === 'all' || cats.indexOf(f) !== -1);
      });
    });
  });

  /* ---- gallery lightbox ---- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbClose = document.getElementById('lbClose');

  var closeLb = function () {
    lb.hidden = true; lbImg.src = ''; document.body.style.overflow = '';
  };

  document.querySelectorAll('.gallery').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var fig = e.target.closest('figure[data-full]');
      if (!fig || !lb) return;
      lbImg.src = fig.dataset.full;
      var img = fig.querySelector('img');
      lbImg.alt = img ? img.alt : '';
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  });

  if (lb) {
    lbClose.addEventListener('click', closeLb);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.hidden) closeLb();
    });
  }

  /* ---- inquiry form ---- */
  var form = document.getElementById('inquiryForm');
  if (form) {
    var msg = document.getElementById('formMsg');
    var msgKey = null;

    var say = function (key, kind) {
      msgKey = key;
      msg.textContent = window.t(key);
      msg.className = 'form-msg ' + kind;
    };

    document.addEventListener('langchange', function () {
      if (msgKey) msg.textContent = window.t(msgKey);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());

      if (!data.name || !data.email) return say('msg.name', 'err');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return say('msg.email', 'err');
      if (!data.agree) return say('msg.agree', 'err');

      // TODO: 백엔드 연결
      // fetch('/api/inquiry', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})
      console.log('Inquiry:', data);

      say('msg.ok', 'ok');
      form.reset();
    });
  }
})();
