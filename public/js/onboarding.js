/* Doppia 온보딩 코치마크 — 자체완결(외부 라이브러리 0, 백엔드 0).
 *  구조: 여러 "플로우"를 담는 레지스트리(FLOWS). 각 플로우 = 짧은 미니 투어.
 *   - 첫 방문: PRIMARY 플로우 자동 시작(+Skip). localStorage로 1회만.
 *   - 헤더 "?": 플로우가 1개면 바로 시작, 2개 이상이면 선택 메뉴.
 *  카피는 영어(제품 원칙). i18n은 추후 /js/i18n.js 사전 키로 확장.
 *
 *  ▶ 새 플로우 추가법: 아래 FLOWS 객체에 { label, steps:[{sel,title,body}] } 항목만 추가.
 */
(function () {
  'use strict';

  var SEEN_KEY = 'doppia_ob_seen_v2';   // 자동시작 1회 플래그(구조/카피 개편 시 버전업)

  var FLOWS = {
    // ── Flow 1: 템플릿으로 만들기 (기본 경로) ──
    template: {
      label: 'Create with a template',
      steps: [
        { sel: ['#subjectRow .img-add-wrap', '#subjectRow', '#subjectStep'], demo: 'upload',
          title: 'Add your product',
          body: 'Click here and upload one clear photo of your product. We keep it consistent across every scene.' },
        { sel: ['#recipeGrid .recipe-card', '#templateStep .recipe-card', '#step2Title'], demo: 'pick',
          title: 'Pick a template',
          body: 'Tap a template to open it, then choose it. The look is applied to your product — no prompt needed.' },
        { sel: '#genBtn',
          title: 'Generate',
          body: 'Press Generate. The number on it is the credit cost, and your product shots appear below.' }
      ]
    }
    // ── (예정) Flow 2: Custom 프롬프트, Flow 3: 릴 만들기 등은 여기 추가 ──
  };
  var PRIMARY = 'template';

  var root = null, spot = null, tip = null, steps = [], idx = 0, onResize = null;

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // sel = 문자열 또는 후보 배열. 배열이면 "보이는 첫 요소"(없으면 존재하는 첫 요소) 반환.
  function resolveEl(sel) {
    var list = Array.isArray(sel) ? sel : [sel];
    var firstExisting = null;
    for (var i = 0; i < list.length; i++) {
      var el = document.querySelector(list[i]);
      if (el && !firstExisting) firstExisting = el;
      if (isVisible(el)) return el;
    }
    return firstExisting;
  }

  var DEMOS = {
    upload: '<div class="ob-demo-stage ob-demo-upload"><div class="ob-add">+</div><div class="ob-photo ob-prod"></div><div class="ob-check">✓</div></div>',
    pick: '<div class="ob-demo-stage ob-demo-pick"><div class="ob-row"><div class="ob-thumb ob-prod"></div><div class="ob-thumb ob-prod sel"></div><div class="ob-thumb ob-prod"></div></div><div class="ob-badge">✓</div><div class="ob-cursor">➤</div></div>'
  };

  function makeRoot() {
    root = document.createElement('div');
    root.className = 'ob-root';
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey);
    onResize = function () { if (steps.length) render(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
  }

  function onKey(e) { if (e.key === 'Escape') close(false); }

  // ── 플로우 투어 ──
  function buildTour() {
    spot = document.createElement('div');
    spot.className = 'ob-spot';
    tip = document.createElement('div');
    tip.className = 'ob-tip';
    tip.innerHTML =
      '<div class="ob-tip-count"></div>' +
      '<div class="ob-tip-title"></div>' +
      '<div class="ob-demo"></div>' +
      '<div class="ob-tip-body"></div>' +
      '<div class="ob-tip-actions">' +
        '<button type="button" class="ob-skip">Skip</button>' +
        '<span class="ob-spacer"></span>' +
        '<button type="button" class="ob-back">Back</button>' +
        '<button type="button" class="ob-next">Next</button>' +
      '</div>';
    root.appendChild(spot);
    root.appendChild(tip);
    tip.querySelector('.ob-skip').addEventListener('click', function () { close(true); });
    tip.querySelector('.ob-back').addEventListener('click', function () { go(idx - 1); });
    tip.querySelector('.ob-next').addEventListener('click', function () {
      if (idx >= steps.length - 1) close(true); else go(idx + 1);
    });
  }

  function go(n) {
    idx = Math.max(0, Math.min(steps.length - 1, n));
    var el = resolveEl(steps[idx].sel);
    if (isVisible(el)) {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { el.scrollIntoView(); }
      setTimeout(render, 260);
    } else {
      render();
    }
  }

  function render() {
    if (!root || !tip) return;
    var step = steps[idx];
    var el = resolveEl(step.sel);
    var vis = isVisible(el);

    tip.querySelector('.ob-tip-count').textContent = (idx + 1) + ' / ' + steps.length;
    tip.querySelector('.ob-tip-title').textContent = step.title;
    var demoEl = tip.querySelector('.ob-demo');
    var want = (step.demo && DEMOS[step.demo]) ? step.demo : '';
    if (demoEl.getAttribute('data-demo') !== want) {   // 스텝 바뀔 때만 갱신(리포지션 시 애니 재시작 방지)
      demoEl.setAttribute('data-demo', want);
      demoEl.innerHTML = want ? DEMOS[want] : '';
      demoEl.classList.toggle('on', !!want);
    }
    tip.querySelector('.ob-tip-body').textContent = step.body;
    tip.querySelector('.ob-back').style.display = idx === 0 ? 'none' : '';
    tip.querySelector('.ob-next').textContent = idx >= steps.length - 1 ? 'Got it' : 'Next';

    if (!vis) { root.classList.add('ob-centered'); return; }
    root.classList.remove('ob-centered');

    var r = el.getBoundingClientRect();
    var pad = 6;
    spot.style.top = (r.top - pad) + 'px';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';

    var tr = tip.getBoundingClientRect();
    var tw = tr.width || 340, th = tr.height || 160;
    var margin = 14, vw = window.innerWidth, vh = window.innerHeight;
    var top = r.bottom + margin;
    if (top + th > vh - 10) top = Math.max(10, r.top - th - margin);
    var left = r.left + r.width / 2 - tw / 2;
    left = Math.max(12, Math.min(left, vw - tw - 12));
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }

  // ── 플로우 선택 메뉴 (플로우 2개 이상일 때) ──
  function buildMenu() {
    root.classList.add('ob-centered');
    var box = document.createElement('div');
    box.className = 'ob-tip ob-menu';
    var html = '<div class="ob-tip-count">Guides</div>' +
      '<div class="ob-tip-title">What do you want to do?</div>' +
      '<div class="ob-menu-list">';
    Object.keys(FLOWS).forEach(function (id) {
      html += '<button type="button" class="ob-menu-item" data-flow="' + id + '">' + FLOWS[id].label + ' <span class="ob-arrow">›</span></button>';
    });
    html += '</div><div class="ob-tip-actions"><span class="ob-spacer"></span><button type="button" class="ob-skip">Close</button></div>';
    box.innerHTML = html;
    root.appendChild(box);
    box.querySelector('.ob-skip').addEventListener('click', function () { close(false); });
    box.querySelectorAll('.ob-menu-item').forEach(function (b) {
      b.addEventListener('click', function () { start(b.getAttribute('data-flow')); });
    });
  }

  // ── 공통 정리 ──
  function clearRoot() {
    if (root) { while (root.firstChild) root.removeChild(root.firstChild); root.classList.remove('ob-centered'); }
    spot = tip = null; steps = []; idx = 0;
  }

  function close(markSeen) {
    if (markSeen) { try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {} }
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onResize, true);
    if (root) { root.remove(); root = null; }
    spot = tip = null; steps = []; idx = 0;
  }

  // ── 공개 API ──
  function start(flowId) {
    var flow = FLOWS[flowId] || FLOWS[PRIMARY];
    if (!flow) return;
    if (!root) makeRoot(); else clearRoot();
    steps = flow.steps;
    buildTour();
    go(0);
  }

  function openHelp() {
    var ids = Object.keys(FLOWS);
    if (ids.length <= 1) { start(ids[0]); return; }
    if (!root) makeRoot(); else clearRoot();
    buildMenu();
  }

  function maybeAutoStart() {
    var seen; try { seen = localStorage.getItem(SEEN_KEY); } catch (_) { seen = '1'; }
    if (seen) return;
    if (!document.querySelector('#subjectStep')) return;   // 스튜디오 페이지에서만
    start(PRIMARY);
  }

  function injectHelpButton() {
    var bar = document.querySelector('.topbar');
    if (!bar || document.querySelector('.ob-help-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ob-help-btn';
    btn.title = 'How Studio works';
    btn.setAttribute('aria-label', 'How Studio works');
    btn.textContent = '?';
    btn.addEventListener('click', openHelp);
    bar.appendChild(btn);
  }

  window.Onboarding = {
    start: start,
    help: openHelp,
    reset: function () { try { localStorage.removeItem(SEEN_KEY); } catch (_) {} }
  };

  function init() {
    injectHelpButton();
    setTimeout(maybeAutoStart, 900);   // 동적 콘텐츠 자리잡을 시간
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
