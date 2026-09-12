/* ==========================================================================
   GENOVA HONORS — HOME v2 동작
   슬라이더 / 오버레이 메뉴 / 헤더 / 사업영역 배경전환 / 팝업 / 리빌 / TOP
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------------------------------------------------------------- 헤더 */
    var hdr = $('.v2-hdr');
    var hero = $('.v2-hero');
    function onScroll() {
      var limit = hero ? hero.offsetHeight - 120 : 80;
      hdr.classList.toggle('solid', window.scrollY > limit);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ------------------------------------------------------- 오버레이 메뉴 */
    var burger = $('.v2-burger');
    var nav    = $('.v2-nav');
    function setNav(open) {
      document.body.classList.toggle('v2-nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function () {
      setNav(!document.body.classList.contains('v2-nav-open'));
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('v2-nav-open')) setNav(false);
    });

    /* ------------------------------------------------------------ 슬라이더 */
    var slides = $$('.v2-slide');
    var dots   = $$('.v2-dots button');
    var playBt = $('.v2-play');
    var DUR = 6000, i = 0, timer = null, paused = false;

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      dots.forEach(function (d, k) {
        var on = k === i;
        // 진행바 애니메이션 재시작
        if (on) { d.classList.remove('on'); void d.offsetWidth; }
        d.classList.toggle('on', on);
        d.setAttribute('aria-selected', String(on));
      });
      restart();
    }
    function restart() {
      clearInterval(timer);
      if (!paused) timer = setInterval(function () { go(i + 1); }, DUR);
    }
    function setPaused(p) {
      paused = p;
      document.body.classList.toggle('v2-paused', p);
      if (playBt) {
        playBt.setAttribute('aria-pressed', String(p));
        var lbl = $('.lbl', playBt);
        if (lbl) lbl.textContent = window.t(p ? 'v2.play' : 'v2.pause');
        var mk = $('.mk', playBt);
        if (mk) mk.textContent = p ? '▶' : '❚❚';
      }
      restart();
    }

    if (slides.length) {
      $('.v2-arrow.prev').addEventListener('click', function () { go(i - 1); });
      $('.v2-arrow.next').addEventListener('click', function () { go(i + 1); });
      dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
      if (playBt) playBt.addEventListener('click', function () { setPaused(!paused); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearInterval(timer); else restart();
      });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) paused = true;
      go(0);
      setPaused(paused);
    }

    /* ------------------------------------- 사업영역 호버 → 배경 이미지 전환 */
    var bgs = $$('.v2-biz-bg span');
    $$('.v2-biz-card').forEach(function (card, k) {
      var show = function () { bgs.forEach(function (b, n) { b.classList.toggle('on', n === k); }); };
      var hide = function () { bgs.forEach(function (b) { b.classList.remove('on'); }); };
      card.addEventListener('mouseenter', show);
      card.addEventListener('focusin', show);
      card.addEventListener('mouseleave', hide);
      card.addEventListener('focusout', hide);
    });

    /* -------------------------------------------------- 팝업 (1일 숨김 쿠키) */
    var pop = $('.v2-pop');
    if (pop) {
      var KEY = 'gh_v2_popup_hide';
      var hideUntil = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() > hideUntil) pop.classList.add('on');

      $('.v2-pop-close', pop).addEventListener('click', function () {
        if ($('#v2PopToday').checked) {
          localStorage.setItem(KEY, String(Date.now() + 24 * 60 * 60 * 1000));
        }
        pop.classList.remove('on');
      });
    }

    /* -------------------------------------------------------------- 리빌 */
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.v2-rv').forEach(function (el) { io.observe(el); });

    /* --------------------------------------------------------------- TOP */
    var top = $('.v2-aside .top');
    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* 언어 변경 시 재생/정지 라벨 갱신 */
    document.addEventListener('langchange', function () { setPaused(paused); });
  });
})();
