/* Doppia 온보딩 — 모달 + 스튜디오 미니 목업 + 정확 위치 하이라이트 링. 자체완결(외부 0, 백엔드 0).
 *  실제 페이지는 건드리지 않는다. 모달 안에 스튜디오 화면 목업을 그리고, 스텝마다 링이 해당 요소로 이동.
 *   - 첫 방문: PRIMARY 플로우 자동 오픈(+Skip). localStorage로 1회만.
 *   - 헤더 "?": 1개면 바로 오픈, 2개 이상이면 선택 메뉴.
 *  ▶ 새 플로우: FLOWS에 { label, steps:[{target,title,body}] } 추가. target=목업 요소 id.
 */
(function () {
  'use strict';

  var SEEN_KEY = 'doppia_ob_seen_v4';   // 목업 개편 → 버전업

  // 스튜디오 컴포즈 화면 미니 목업 (모든 스텝 공통, 링만 이동)
  var RAIL =
    '<div class="mk-rail">' +
      '<div class="mk-logo"></div>' +
      '<div class="mk-nav on" id="mk-nav-studio"><span class="ic">✦</span><span class="lb">Studio</span></div>' +
      '<div class="mk-nav" id="mk-nav-library"><span class="ic">▦</span><span class="lb">Library</span></div>' +
      '<div class="mk-nav" id="mk-nav-store"><span class="ic">▤</span><span class="lb">Store</span></div>' +
      '<div class="mk-nav" id="mk-nav-community"><span class="ic">◎</span><span class="lb">Community</span></div>' +
      '<div class="mk-nav" id="mk-nav-billing"><span class="ic">▭</span><span class="lb">Billing</span></div>' +
    '</div>';
  function wrap(inner) { return '<div class="ob-mock">' + RAIL + '<div class="mk-main">' + inner + '</div></div>'; }

  // 공통 설정 행 (MODEL·RATIO·SIZE·COUNT·Enhance·Private)
  var SETTINGS =
    '<div class="mk-set" id="mk-settings">' +
      '<div class="mk-fg"><em>MODEL</em><span class="mk-pill acc">Nano Banana Pro ▾</span></div>' +
      '<div class="mk-fg"><em>RATIO</em><span class="mk-rt sel"></span><span class="mk-rt sq"></span><span class="mk-rt tall"></span></div>' +
      '<div class="mk-fg"><em>SIZE</em><span class="mk-tile sel">1K</span><span class="mk-tile">2K</span></div>' +
      '<div class="mk-fg"><em>COUNT</em><span class="mk-pill">4 ▾</span></div>' +
      '<div class="mk-priv"><span class="mk-tg"><i class="on"></i></span>Enhance<span class="mk-tg"><i></i></span>Private</div>' +
    '</div>';

  // 템플릿 화면 목업 (Select a product / Pick a template 버튼 + 아래 갤러리)
  var MOCK_TEMPLATE = wrap(
    '<div class="mk-card">' +
      '<div class="mk-btn mk-product" id="mk-product"><span class="mk-bic">▤</span>Select a product</div>' +
      '<div class="mk-btn mk-tplbtn" id="mk-template"><span class="mk-bic">▦</span><span class="mk-btxt"><b>Pick a template</b><i>Choose a look below — no prompt needed</i></span></div>' +
      SETTINGS +
      '<div class="mk-div"></div>' +
      '<div class="mk-foot"><span class="mk-prompt" id="mk-writeprompt">write your own prompt</span><span class="mk-sp"></span><span class="mk-gen" id="mk-generate">Generate</span></div>' +
    '</div>' +
    '<div class="mk-gallery" id="mk-gallery">' +
      '<div class="mk-gh">Pick a template</div>' +
      '<div class="mk-gcat"><span class="mk-gpill on">Apparel</span><span class="mk-gpill">Beauty</span><span class="mk-gpill">General</span><span class="mk-gpill">Nail</span></div>' +
      '<div class="mk-gcards">' +
        '<div class="mk-tplcard sel" id="mk-tplcard"><span class="mk-badge">PHOTO</span><span class="mk-badge best">★ BEST</span><div class="mk-thumb"><b>DOPPIA</b></div><div class="mk-cinfo"><div class="mk-cname">Product Cut</div><div class="mk-csub">Product Cut</div></div><span class="mk-check">✓</span></div>' +
        '<div class="mk-tplcard"><div class="mk-thumb"></div><div class="mk-cinfo"><div class="mk-cname">On-model</div></div></div>' +
        '<div class="mk-tplcard"><div class="mk-thumb"></div><div class="mk-cinfo"><div class="mk-cname">Lookbook</div></div></div>' +
      '</div>' +
    '</div>');

  // Custom 화면 목업 (업로드 박스 + ✎Custom + 프롬프트 중심)
  var MOCK_CUSTOM = wrap(
    '<div class="mk-card">' +
      '<div class="mk-upbox" id="mk-product"><span class="mk-upic">▤</span><span class="mk-upplus">+</span></div>' +
      '<div class="mk-customline"><b>✎ Custom</b> — write your own prompt, no template needed.</div>' +
      SETTINGS +
      '<div class="mk-pbox" id="mk-prompt">Type a prompt…</div>' +
      '<div class="mk-negline">+ Negative prompt</div>' +
      '<div class="mk-foot"><span class="mk-sp"></span><span class="mk-ghost">Create template</span><span class="mk-gen" id="mk-generate">Generate</span></div>' +
    '</div>');

  // My templates 저장 화면 목업 (Your creations 결과 + Create template 모달)
  var MOCK_SAVE = wrap(
    '<div class="mk-cre">' +
      '<div class="mk-crehead">Your creations</div>' +
      '<div class="mk-crerow">' +
        '<div class="mk-crethumb"></div>' +
        '<div class="mk-cremeta">' +
          '<span class="mk-crebadge">✎ Custom</span>' +
          '<div class="mk-creprompt">a serum bottle on wet stone</div>' +
          '<div class="mk-creacts"><span class="mk-creact">⧉ Copy prompt</span><span class="mk-creact ct" id="mk-ctbtn">＋ Create template</span></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="mk-ctmodal">' +
      '<div class="mk-cth">Create template</div>' +
      '<div class="mk-ctsub">Save this look as a private template in your Studio. Only you can see and use it.</div>' +
      '<div class="mk-ctgrid">' +
        '<div class="mk-ctc">' +
          '<div class="mk-ctlbl">Cover</div><div class="mk-ctcover"></div>' +
          '<div class="mk-ctlbl">Prompt <span class="mk-ctlblsub">(what generates the image)</span></div>' +
          '<div class="mk-cttext">a serum bottle on wet stone</div>' +
        '</div>' +
        '<div class="mk-ctc">' +
          '<div class="mk-ctlbl">Template name</div><div class="mk-ctinp" id="mk-ctname">My template</div>' +
          '<div class="mk-ctlbl">Description <span class="mk-ctlblsub">(optional)</span></div><div class="mk-cttext ph">e.g. Editorial marble backdrop…</div>' +
          '<div class="mk-ctlbl">Category</div><div class="mk-ctinp ph">Select a category… ▾</div>' +
          '<div class="mk-ctlbl">Themes <span class="mk-ctlblsub">(pick at least one)</span></div>' +
          '<div class="mk-ctthemes" id="mk-ctthemes"><span class="mk-cchip">Beauty</span><span class="mk-cchip">Fashion</span><span class="mk-cchip">General</span><span class="mk-cchip">Nail</span><span class="mk-cchip new">+ New theme</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="mk-ctfoot"><span class="mk-ctcancel">Cancel</span><span class="mk-ctsave" id="mk-ctsave">Save template</span></div>' +
    '</div>');

  var FLOWS = {
    // ── Flow 1: 템플릿으로 만들기 ──
    template: {
      label: 'Create with a template',
      mock: MOCK_TEMPLATE,
      steps: [
        { target: 'mk-product', title: 'Select your product',
          body: 'Click Select a product and upload one clear photo. We keep it consistent across every scene.' },
        { target: 'mk-tplcard', title: 'Pick a template',
          body: 'Tap a template below — the look is applied to your product instantly. Filter by category (Apparel, Beauty…). No prompt needed.' },
        { target: 'mk-settings', title: 'Adjust settings',
          body: 'Set the model, ratio, size, and count. The defaults work fine to start.' },
        { target: 'mk-generate', title: 'Generate',
          body: 'Hit Generate. The badge shows the credit cost, and your product shots appear below.' }
      ]
    },
    // ── Flow 2: 프롬프트 직접 쓰기 (Custom) ──
    custom: {
      label: 'Write your own prompt',
      mock: MOCK_CUSTOM,
      steps: [
        { mock: MOCK_TEMPLATE, target: 'mk-writeprompt', title: 'Switch to Custom',
          body: 'On the main screen, click "write your own prompt" to switch to Custom mode.' },
        { target: 'mk-product', title: 'Add a reference (optional)',
          body: 'Select a product photo so results stay true to it — or skip it and go text-only.' },
        { target: 'mk-prompt', title: 'Write your prompt',
          body: 'Use "write your own prompt" to describe the shot — the scene, angle, and mood. No template needed.' },
        { target: 'mk-settings', title: 'Choose your settings',
          body: 'Pick the model, ratio, size, and count. The defaults work fine to start.' },
        { target: 'mk-generate', title: 'Generate',
          body: 'Hit Generate. Your custom product shots appear below.' }
      ]
    },
    // ── Flow 3: 생성 결과를 My templates로 저장 ──
    save: {
      label: 'Save a creation as a template',
      mock: MOCK_SAVE,
      steps: [
        { target: 'mk-ctbtn', title: 'Turn a creation into a template',
          body: 'In Your creations, click + Create template on any image or reel you love.' },
        { target: 'mk-ctname', title: 'Name & category',
          body: 'Give it a name and pick a category so it is easy to reuse.' },
        { target: 'mk-ctthemes', title: 'Pick themes',
          body: 'Choose at least one theme — it groups the template in your Studio.' },
        { target: 'mk-ctsave', title: 'Save',
          body: 'Save — it is now in My templates, ready to reuse anytime. No prompt needed next time.' }
      ]
    }
  };
  var PRIMARY = 'template';

  var root = null, steps = [], idx = 0, currentMock = MOCK_TEMPLATE, flowMock = MOCK_TEMPLATE;

  function makeRoot() {
    root = document.createElement('div');
    root.className = 'ob-root';
    root.addEventListener('click', function (e) { if (e.target === root) close(false); }); // 바깥 클릭=닫기
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResizeGeom);
  }
  function onResizeGeom() { measureGeom(); reposition(); }
  function onKey(e) {
    if (e.key === 'Escape') close(false);
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') go(idx - 1);
  }

  // ── 플로우 슬라이드(목업 1회 빌드 + 링 이동) ──
  function buildFlowShell() {
    var dots = steps.map(function (_, i) { return '<span class="ob-dot"></span>'; }).join('');
    root.innerHTML =
      '<div class="ob-modal" role="dialog" aria-modal="true">' +
        '<div class="ob-hero"><div class="ob-stage">' + currentMock + '</div></div>' +
        '<div class="ob-modal-body">' +
          '<div class="ob-count"></div>' +
          '<div class="ob-title"></div>' +
          '<div class="ob-body"></div>' +
          '<div class="ob-actions">' +
            '<button type="button" class="ob-skip">Skip</button>' +
            '<div class="ob-dots">' + dots + '</div>' +
            '<span class="ob-spacer"></span>' +
            '<button type="button" class="ob-back">Back</button>' +
            '<button type="button" class="ob-next"></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    root.querySelector('.ob-skip').onclick = function () { close(true); };
    root.querySelector('.ob-back').onclick = function () { go(idx - 1); };
    root.querySelector('.ob-next').onclick = next;
  }

  function renderStep() {
    var s = steps[idx];
    root.querySelector('.ob-count').textContent = (idx + 1) + ' / ' + steps.length;
    root.querySelector('.ob-title').textContent = s.title;
    root.querySelector('.ob-body').textContent = s.body;
    var dots = root.querySelectorAll('.ob-dot');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === idx);
    root.querySelector('.ob-back').style.display = idx === 0 ? 'none' : '';
    root.querySelector('.ob-next').textContent = idx >= steps.length - 1 ? 'Got it' : 'Next';
    // 스텝별 목업 전환(예: Custom 플로우 1단계=템플릿 화면 → 2단계부터 Custom 화면).
    var want = s.mock || flowMock;
    if (want !== currentMock) {
      currentMock = want;
      var stage = root.querySelector('.ob-stage');
      stage.style.transition = 'none'; stage.style.transform = 'none'; // 새 화면은 전체 보기에서 시작
      stage.innerHTML = want;
      geom = {}; measureGeom();
    }
    reposition();
  }

  // 목업 요소들의 "자연 좌표"(변형 전) 측정 → 줌 계산에 사용(스텝 전환 시 깜빡임 방지).
  var geom = {}, stageGeom = { w: 0, h: 0 };
  function measureGeom() {
    var stage = root && root.querySelector('.ob-stage');
    if (!stage) return;
    var savedT = stage.style.transform, savedTr = stage.style.transition;
    stage.style.transition = 'none'; stage.style.transform = 'none';
    var sr = stage.getBoundingClientRect();
    if (sr.width < 40) { stage.style.transform = savedT; stage.style.transition = savedTr; return; } // 레이아웃 전 → 측정 보류
    stageGeom = { w: sr.width, h: sr.height };   // 목업 자연 크기(갤러리 포함 높이) → 팬 클램프에 사용
    steps.forEach(function (s) {   // 현재 플로우의 스텝 target만 측정
      var el = root.querySelector('#' + s.target);
      if (!el) return;
      var er = el.getBoundingClientRect();
      geom[s.target] = { cx: er.left - sr.left + er.width / 2, cy: er.top - sr.top + er.height / 2, w: er.width, h: er.height };
    });
    stage.style.transform = savedT; stage.style.transition = savedTr;
  }

  // 현재 스텝 target으로 카메라(줌+팬) 이동 + 강조.
  function reposition() {
    if (!root || !steps.length) return;
    var hero = root.querySelector('.ob-hero'), stage = root.querySelector('.ob-stage');
    if (!hero || !stage) return;
    var vw = hero.clientWidth, vh = hero.clientHeight;
    if (vw < 40) { setTimeout(reposition, 90); return; }   // 뷰포트 아직 0(레이아웃/헤드리스) → 재시도
    var tid = steps[idx].target, g = geom[tid];
    if (!g) { measureGeom(); g = geom[tid]; if (!g) { setTimeout(reposition, 90); return; } }
    var prev = stage.querySelector('.mk-active'); if (prev) prev.classList.remove('mk-active');
    var el = root.querySelector('#' + tid); if (el) el.classList.add('mk-active');
    var Z = Math.min(vw * 0.26 / g.w, vh * 0.26 / g.h, 1.35);   // 아주 완만한 줌 = 전체 화면 유지
    Z = Math.max(Z, 1.05);
    var tx = vw / 2 - g.cx * Z, ty = vh / 2 - g.cy * Z;
    var Sw = stageGeom.w || vw, Sh = stageGeom.h || vh;   // 콘텐츠 실제 크기 기준 클램프(아래 갤러리까지 팬)
    tx = Math.min(0, Math.max(tx, vw - Sw * Z));
    ty = Math.min(0, Math.max(ty, vh - Sh * Z));
    stage.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + Z + ')';
  }

  function go(n) { idx = Math.max(0, Math.min(steps.length - 1, n)); renderStep(); }
  function next() { if (idx >= steps.length - 1) close(true); else go(idx + 1); }

  // ── 플로우 선택 메뉴(모달) ──
  function renderMenu() {
    var items = Object.keys(FLOWS).map(function (id) {
      return '<button type="button" class="ob-menu-item" data-flow="' + id + '">' + FLOWS[id].label + ' <span class="ob-arrow">›</span></button>';
    }).join('');
    root.innerHTML =
      '<div class="ob-modal" role="dialog" aria-modal="true"><div class="ob-menu-wrap">' +
        '<div class="ob-menu-h">Guides</div>' +
        '<div class="ob-menu-title">What do you want to do?</div>' +
        '<div class="ob-menu-list">' + items + '</div>' +
        '<div class="ob-menu-close"><button type="button" class="ob-skip">Close</button></div>' +
      '</div></div>';
    root.querySelector('.ob-skip').onclick = function () { close(false); };
    [].forEach.call(root.querySelectorAll('.ob-menu-item'), function (b) {
      b.onclick = function () { start(b.getAttribute('data-flow')); };
    });
  }

  function close(seen) {
    if (seen) { try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {} }
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResizeGeom);
    if (root) { root.remove(); root = null; }
    steps = []; idx = 0;
  }

  // ── 공개 API ──
  function start(flowId) {
    var flow = FLOWS[flowId] || FLOWS[PRIMARY];
    if (!flow) return;
    if (!root) makeRoot();
    steps = flow.steps; idx = 0; geom = {};
    flowMock = flow.mock || MOCK_TEMPLATE;
    currentMock = steps[0].mock || flowMock;   // 첫 스텝 목업(스텝별 오버라이드 지원)
    buildFlowShell();
    // 레이아웃 정착 후 좌표 측정 → 첫 스텝으로 줌인
    setTimeout(function () { measureGeom(); renderStep(); }, 60);
  }
  function openHelp() {
    var ids = Object.keys(FLOWS);
    if (ids.length <= 1) { start(ids[0]); return; }
    if (!root) makeRoot();
    steps = []; renderMenu();
  }
  function maybeAutoStart() {
    var seen; try { seen = localStorage.getItem(SEEN_KEY); } catch (_) { seen = '1'; }
    if (seen) return;
    if (!document.querySelector('#subjectStep')) return;   // 스튜디오 페이지에서만
    start(PRIMARY);
  }
  function injectHelpButton() {
    if (document.querySelector('.ob-help-btn')) return;
    var host = document.querySelector('.gen-bar') || document.querySelector('.topbar'); // 컴포즈 카드 우상단(빨간원), 없으면 헤더
    if (!host) return;
    var inCompose = host.classList.contains('gen-bar');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ob-help-btn' + (inCompose ? ' ob-in-compose' : '');
    btn.title = 'Doppia guide — how Studio works'; btn.setAttribute('aria-label', 'Doppia guide');
    btn.innerHTML = '<span class="ob-help-q">?</span><span class="ob-help-tx">doppia guide</span>';
    btn.addEventListener('click', openHelp);
    host.appendChild(btn);
  }

  window.Onboarding = {
    start: start, help: openHelp,
    reset: function () { try { localStorage.removeItem(SEEN_KEY); } catch (_) {} }
  };

  function init() {
    injectHelpButton();
    setTimeout(maybeAutoStart, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
