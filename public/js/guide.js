/* Doppia Guide v5 — 표면별(홈·컷·광고영상·콘텐츠팩) 온보딩 + 인터랙티브 튜토리얼.
 * ─ 구 onboarding.js(목업 캐러셀) 전면 대체(2026-07-29, 사용자 지시).
 * ─ 자동 표시: 페이지 진입 시 해당 표면 가이드. "Don't show again"을 누른 표면만 자동 표시 중단
 *   (그냥 닫으면 다음 진입 때 다시 뜸 — 사용자 스펙).
 * ─ 인터랙티브(Try it with me): 실제 UI 위 스포트라이트 코치마크. 마지막 스텝에서 실제 생성 버튼을
 *   사용자가 직접 누른다(실제 크레딧 사용 — 시작 시 고지).
 * ─ 문자열은 영어 원본 — /js/i18n.js 사전이 KO 치환(동적 삽입은 MutationObserver가 처리).
 * 사용: <script src="/js/guide.js?v=1" defer></script> + DoppiaGuide.init('home'|'shots'|'ugc'|'pack')
 *   (studio는 init('auto') → mode=ugc 감지)
 */
(function () {
  var KEY = function (s) { return 'doppia_guide_v5_' + s; };

  // ── 표면별 콘텐츠 (스텝 가이드) ──────────────────────────────────────
  var GUIDES = {
    home: {
      title: 'Welcome to Doppia',
      steps: [
        ['📷', 'One product photo is all you need', 'Detail cuts, editorials, on-model shots and ad videos — everything starts from a single photo.'],
        ['🗂', 'Three ways to create', 'Shots — catalog photos from templates. Ad Video — a 9:16 talking ad. Content Pack — a full planned set at once.'],
        ['◈', 'Pay only for what comes out', 'You start with 1,500 free credits. Failed generations refund automatically.'],
      ],
    },
    shots: {
      title: 'How Shots works',
      steps: [
        ['📷', 'Add your product photo', 'One photo is enough — no extra angles, no references.'],
        ['🎨', 'Pick a template', 'Choose the look you want. No prompts needed — the template does the planning.'],
        ['⚙️', 'Set ratio, size and count', 'Match your product page: 4:5, 1:1, 9:16 or custom, up to 8 shots per run.'],
        ['✨', 'Generate and refine', 'Results land in Your creations. Edit with words — "make the background gold".'],
      ],
      tour: [
        { sel: ['#subjectRow', '.compose-card'], t: 'Step 1 — your product', b: 'Click here and upload one product photo.' },
        { sel: ['.tpl-pick-cta', '#tplSelWrap', '#step2Title'], t: 'Step 2 — template', b: 'Pick a template below. Prices are shown per cut.' },
        { sel: ['#ratioField', '#ratioWrap'], t: 'Step 3 — options', b: 'Ratio, size and count. Defaults are fine to start.' },
        { sel: ['#genBtn'], t: 'Step 4 — generate', b: 'Press Generate when ready. This uses real credits — failed runs auto-refund.', last: true },
      ],
    },
    ugc: {
      title: 'How Ad Video works',
      steps: [
        ['📷', 'Photo + one line', 'Add a product photo and one line about it — or leave the line empty and Doppia reads the photo.'],
        ['📝', 'Free script preview', 'Doppia writes the concept, scenes and captions. Review the script for free before anything is charged.'],
        ['🎬', 'Edit scenes freely', 'Reorder, rewrite or regenerate any single scene. Add music, narration and language (English · 한국어).'],
        ['✨', 'Build the video', 'Credits are charged only when you build the final video.'],
      ],
      tour: [
        { sel: ['#ugcInputBox', '#ugcConcept'], t: 'Step 1 — photo', b: 'Add your product photo here.' },
        { sel: ['#ugcConcept'], t: 'Step 2 — one line', b: 'Describe your product or the ad you want — or leave it empty and Doppia reads the photo.' },
        { sel: ['#ugcGenBtn'], t: 'Step 3 — free script, then build', b: 'Press this — the script is written for free. Review it on the right, then press “Create video” there to build. Credits are charged only at that final step.', last: true },
      ],
    },
    pack: {
      title: 'How Content Pack works',
      steps: [
        ['📷', 'One photo, zero planning', 'Upload a product photo. Writing a mood line is optional.'],
        ['🧠', 'Doppia plans the set', 'It looks at your product and decides which cuts to make — PDP, lifestyle, concept, seasonal.'],
        ['✅', 'Confirm, then generate', 'You approve the base reference first. Assets arrive one by one — pay only for what renders.'],
      ],
      tour: [
        { sel: ['#drop'], t: 'Step 1 — photo', b: 'Drop your product photo here (or click to choose).' },
        { sel: ['#product'], t: 'Step 2 — mood (optional)', b: 'One line of mood or concept. Empty is fine — Doppia plans from the photo.' },
        { sel: ['#go'], t: 'Step 3 — create', b: 'Start the pack. This uses real credits — you are charged only for delivered assets.', last: true },
      ],
    },
  };

  // ── 스타일 ───────────────────────────────────────────────────────────
  var CSS =
    '.dg-ov{position:fixed;inset:0;z-index:99990;background:rgba(4,4,10,.66);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.dg-card{width:min(480px,94vw);background:#14141f;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:26px 26px 20px;box-shadow:0 40px 90px -30px rgba(0,0,0,.8);font-family:inherit;color:#edecf5}' +
    '.dg-kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:#a394ee;text-transform:uppercase;margin-bottom:8px}' +
    '.dg-title{font-size:21px;font-weight:800;letter-spacing:-.01em;margin-bottom:18px}' +
    '.dg-step{display:flex;gap:13px;padding:11px 0;border-top:1px solid rgba(255,255,255,.07)}' +
    '.dg-step .ic{flex:0 0 34px;height:34px;border-radius:10px;background:rgba(124,92,255,.14);display:flex;align-items:center;justify-content:center;font-size:16px}' +
    '.dg-step b{display:block;font-size:14px;margin-bottom:3px}' +
    '.dg-step p{font-size:12.5px;color:#9a9ab2;line-height:1.55;margin:0}' +
    '.dg-foot{display:flex;gap:10px;align-items:center;margin-top:18px;flex-wrap:wrap}' +
    '.dg-btn{border:0;border-radius:11px;font-weight:700;font-size:13px;padding:11px 16px;cursor:pointer}' +
    '.dg-try{background:linear-gradient(100deg,#6a40e0,#d9608f);color:#fff}' +
    '.dg-ok{background:rgba(255,255,255,.08);color:#edecf5;border:1px solid rgba(255,255,255,.14)}' +
    '.dg-never{margin-left:auto;background:none;border:0;color:#6a6a85;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
    '.dg-note{font-size:11.5px;color:#6a6a85;margin-top:10px}' +
    '.dg-spot{position:fixed;z-index:99991;border:2px solid #a394ee;border-radius:14px;box-shadow:0 0 0 6000px rgba(4,4,10,.6),0 0 24px rgba(163,148,238,.55);pointer-events:none;transition:all .28s ease}' +
    '.dg-tip{position:fixed;z-index:99992;width:min(320px,86vw);background:#14141f;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:15px 16px;box-shadow:0 24px 60px -20px rgba(0,0,0,.85);color:#edecf5}' +
    '.dg-tip b{display:block;font-size:13.5px;margin-bottom:5px}' +
    '.dg-tip p{font-size:12.5px;color:#9a9ab2;line-height:1.55;margin:0 0 12px}' +
    '.dg-tip .row{display:flex;gap:8px;align-items:center}' +
    '.dg-tip .nx{background:#6a40e0;color:#fff;border:0;border-radius:9px;font-weight:700;font-size:12.5px;padding:8px 14px;cursor:pointer}' +
    '.dg-tip .qx{background:none;border:0;color:#6a6a85;font-size:12px;cursor:pointer;margin-left:auto}' +
    '.dg-fab{position:fixed;right:18px;bottom:18px;z-index:9800;display:inline-flex;gap:7px;align-items:center;background:#1a1a27;border:1px solid rgba(255,255,255,.14);color:#c9c6dd;border-radius:999px;padding:9px 14px;font-size:12.5px;font-weight:700;cursor:pointer;box-shadow:0 10px 30px -12px rgba(0,0,0,.7)}' +
    '.dg-fab:hover{color:#fff;border-color:rgba(163,148,238,.5)}' +
    '.dg-fab .q{display:inline-flex;width:16px;height:16px;border-radius:50%;background:#6a40e0;color:#fff;align-items:center;justify-content:center;font-size:11px}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  function q(sels) { for (var i = 0; i < sels.length; i++) { var n = document.querySelector(sels[i]); if (n && n.offsetParent !== null) return n; } return null; }

  var surface = null, ov = null, spot = null, tip = null, tourIdx = 0;

  // ── 스텝 가이드 모달 ────────────────────────────────────────────────
  function showGuide() {
    if (ov) return;
    var g = GUIDES[surface]; if (!g) return;
    var steps = g.steps.map(function (s) {
      return '<div class="dg-step"><span class="ic">' + s[0] + '</span><div><b>' + s[1] + '</b><p>' + s[2] + '</p></div></div>';
    }).join('');
    var hasTour = !!g.tour;
    ov = el('<div class="dg-ov"><div class="dg-card"><div class="dg-kicker">Doppia guide</div><div class="dg-title">' + g.title + '</div>' + steps +
      '<div class="dg-foot">' +
      (hasTour ? '<button class="dg-btn dg-try" data-dg="try">Try it with me →</button>' : '') +
      '<button class="dg-btn dg-ok" data-dg="ok">Got it</button>' +
      '<button class="dg-never" data-dg="never">Don’t show this again</button></div>' +
      (hasTour ? '<div class="dg-note">“Try it with me” walks you through the real screen — generating at the end uses real credits (failed runs auto-refund).</div>' : '') +
      '</div></div>');
    ov.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-dg');
      if (e.target === ov) { closeGuide(); return; }
      if (a === 'ok') closeGuide();
      else if (a === 'never') { try { localStorage.setItem(KEY(surface), 'off'); } catch (_) {} closeGuide(); }
      else if (a === 'try') { closeGuide(); startTour(); }
    });
    document.body.appendChild(ov);
    if (window.i18n && window.i18n.translate) { try { window.i18n.translate(ov); } catch (_) {} }
  }
  function closeGuide() { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); ov = null; }

  // ── 인터랙티브 투어(코치마크) ────────────────────────────────────────
  function startTour() { tourIdx = 0; stepTour(); window.addEventListener('resize', placeTour); }
  function endTour() {
    if (spot && spot.parentNode) spot.parentNode.removeChild(spot);
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    spot = tip = null; window.removeEventListener('resize', placeTour);
  }
  function stepTour() {
    var tour = (GUIDES[surface] || {}).tour; if (!tour) return;
    if (tourIdx >= tour.length) { endTour(); return; }
    var st = tour[tourIdx], target = q(st.sel);
    if (!target) { tourIdx++; stepTour(); return; }   // 앵커 없으면 스킵(레이아웃 변화 내성)
    if (!spot) { spot = el('<div class="dg-spot"></div>'); document.body.appendChild(spot); }
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    tip = el('<div class="dg-tip"><b>' + st.t + '</b><p>' + st.b + '</p><div class="row">' +
      '<button class="nx">' + (st.last ? 'Finish — over to you' : 'Next') + '</button>' +
      '<button class="qx">Exit tour</button></div></div>');
    tip.querySelector('.nx').onclick = function () { if (st.last) { endTour(); } else { tourIdx++; stepTour(); } };
    tip.querySelector('.qx').onclick = endTour;
    document.body.appendChild(tip);
    if (window.i18n && window.i18n.translate) { try { window.i18n.translate(tip); } catch (_) {} }
    try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { }
    setTimeout(placeTour, 320);
  }
  function placeTour() {
    var tour = (GUIDES[surface] || {}).tour; if (!tour || !spot || !tip) return;
    var st = tour[tourIdx], target = st && q(st.sel); if (!target) return;
    var r = target.getBoundingClientRect(), pad = 8;
    spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
    var tw = tip.offsetWidth || 320, th = tip.offsetHeight || 120;
    var x = Math.max(12, Math.min(window.innerWidth - tw - 12, r.left));
    var y = (r.bottom + 14 + th < window.innerHeight) ? r.bottom + 14 : Math.max(12, r.top - th - 14);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  // ── 플로팅 가이드 버튼 ───────────────────────────────────────────────
  function mountFab() {
    if (document.querySelector('.dg-fab')) return;
    var b = el('<button class="dg-fab" type="button" aria-label="Doppia guide"><span class="q">?</span><span>doppia guide</span></button>');
    b.onclick = showGuide;
    document.body.appendChild(b);
    if (window.i18n && window.i18n.translate) { try { window.i18n.translate(b); } catch (_) {} }
  }

  // ── init ────────────────────────────────────────────────────────────
  window.DoppiaGuide = {
    init: function (s) {
      if (s === 'auto') {
        s = /[?&]mode=ugc\b/.test(location.search) ? 'ugc' : 'shots';
      }
      if (!GUIDES[s]) return;
      surface = s;
      var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
      var boot = function () {
        mountFab();
        var off; try { off = localStorage.getItem(KEY(surface)) === 'off'; } catch (_) { off = true; }
        if (!off) setTimeout(showGuide, 650);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    },
    open: function () { showGuide(); },
    reset: function () { try { localStorage.removeItem(KEY(surface)); } catch (_) {} },
  };
})();
