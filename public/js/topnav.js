// 상단 nav + 메가메뉴 — 전 앱 페이지 공유 (스타일은 topnav.css, body.has-topnav 토글). (2026-10-13) 베이스 1차.
//   좌측 레일(rail.js, 2026-07~10)을 대체한다 — 레일의 Home·Shots·UGC·Ad Studio 항목은 1차 범위 밖이라 메뉴에서 뺐다
//   (페이지·URL은 그대로 살아 있다. UGC 대기 배지(/api/generate/ugc/jobs 폴링)도 레일과 함께 내렸다). 롤백: git에서 rail.js 복원 + 각 페이지 include 되돌리기.
//   크레딧 칩·아바타: 페이지가 이미 #creditBalance/#saasUserBox 를 갖고 있으면(studio·home·gallery…) 그 노드를 헤더로 **옮긴다**
//   (rail.js 와 같은 방식 — ID·이벤트·데이터 흐름 보존, 페이지가 자기 칩을 계속 갱신한다). 없으면(explore·image·video) 여기서 만들고 /api/credits 로 채운다.
//   모델 열은 GET /api/generate/tools(레지스트리 정본, 키 있는 것만)에서 채운다 — 새 엔진은 registry 한 줄이면 메뉴에 뜬다.
(function () {
  if (document.querySelector('.tn')) return;
  var path = location.pathname.replace(/\.html$/, '');
  var NAV = [
    { h: '/explore', l: 'Explore', m: ['/explore'] },
    { h: '/image', l: 'Image', m: ['/image'], mega: 'image' },
    { h: '/video', l: 'Video', m: ['/video'], mega: 'video' },
    { h: '/studio', l: 'Doppia Lens', m: ['/studio'], bd: 'soon' },
    { h: '/pack', l: 'Content Pack', m: ['/pack'], bd: 'soon' },
    { h: '/gallery', l: 'Library', m: ['/gallery', '/library', '/creation'] },
    { h: null, l: 'KakaoTalk', m: [], bd: 'soon' }
  ];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var html = '<header class="tn"><div class="brand" onclick="location.href=\'/explore\'">Doppia</div><nav class="tn-nav" id="tnNav">';
  NAV.forEach(function (it) {
    var active = it.m.some(function (m) { return path === m || path.indexOf(m) === 0; });
    html += '<a' + (it.h ? ' href="' + it.h + '"' : ' href="#" onclick="return false"') + ' class="' + (active ? 'active' : '') + '"' + (it.mega ? ' data-mega="' + it.mega + '"' : '') + '>' + esc(it.l) + (it.bd ? ' <span class="bd ' + it.bd + '">' + it.bd + '</span>' : '') + '</a>';
  });
  // 페이지가 가진 칩·아바타를 먼저 찾는다 — 있으면 옮기고, 없으면 만든다 (ID 중복 방지: 같은 ID가 둘이면 saas-auth.js가 엉뚱한 쪽을 채운다)
  var balEl = document.getElementById('creditBalance');
  var ownPill = balEl ? balEl.closest('.credits') : null;
  var ownUserBox = document.getElementById('saasUserBox');
  html += '</nav><div class="tn-r">'
    + (ownPill ? '' : '<div class="credits" onclick="location.href=\'/billing\'"><span class="coin">◈</span> <span id="creditBalance">—</span></div>')
    + '<a class="tn-up" href="/billing">Upgrade</a>'
    + (ownUserBox ? '' : '<div id="saasUserBox"></div>')
    + '</div></header><div class="mega" id="tnMega"><div class="box" id="tnMegaBox"></div></div>';
  document.body.insertAdjacentHTML('afterbegin', html);
  document.body.classList.add('has-topnav');
  var right = document.querySelector('.tn-r');
  if (ownPill) right.insertBefore(ownPill, right.firstChild);
  if (ownUserBox) right.appendChild(ownUserBox);

  // ── 크레딧 칩 (스튜디오·홈과 같은 /api/credits) — 페이지 칩을 옮겨 온 경우엔 페이지가 갱신하므로 여기선 안 건드린다 ──
  function refreshCredits() {
    return fetch('/api/credits').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var c = d && d.data; var b = document.getElementById('creditBalance');
      if (b && c) b.textContent = c.unlimited ? '∞' : (c.balance != null ? Number(c.balance).toLocaleString('en-US') : '—');
      return c;
    }).catch(function () { return null; });
  }
  if (!ownPill) refreshCredits();

  // ── 툴 카탈로그 (정본) — 페이지들도 같은 프로미스를 쓴다 ──
  var toolsP = null;
  function tools() {
    if (!toolsP) toolsP = fetch('/api/generate/tools').then(function (r) { return r.json(); }).then(function (d) { return (d && d.data) || { image: [], video: [] }; }).catch(function () { return { image: [], video: [] }; });
    return toolsP;
  }

  // ── 메가메뉴 — 기능(live/soon 고정 목록) + 모델(카탈로그 = live, 나머지 soon) ──
  var ICON = { gemini: '🍌', openai: 'G', seedream: 'S', fal: 'F', replicate: 'R', xai: 'X', higgsfield: 'H', kling: 'K', veo: 'V', runway: 'R', minimax: 'M', sora: 'O', seedance: 'S' };
  var FEAT = {
    image: [
      ['✎', 'Reference + prompt', 'Up to 14 references, any engine', 'live', '/image'],
      ['✎', 'Edit with words', 'Change one thing, keep the rest', 'live', '/image'],
      ['📷', 'Cinematic Cameras', 'Lens · angle presets', 'live', '/image'],
      ['◌', 'Inpaint', 'Select an area, describe the change', 'soon'],
      ['☀', 'Relight', 'Light position · color · brightness', 'soon'],
      ['⤢', 'Upscale', 'Topaz · ×2 · ×4 — hover a result', 'auto:upscale', '/image'], // 'auto:<key>' = tools API 의 그 목록이 비어있지 않으면 live(키 없는 서버면 soon)
      ['▦', 'Look set', 'One photo → a set in one aesthetic', 'soon'],
      ['👤', 'Virtual models', '80 licensed models', 'soon'],
      ['⇄', 'Face Swap', 'Our models + your face only', 'soon'],
      ['✦', 'Doppia Lens', 'Model shots · product shots', 'soon']
    ],
    video: [
      ['▶', 'Image to video', 'Start from any image result', 'live', '/video'],
      ['♪', 'Sound', 'Native ambient sound (Veo · Kling)', 'live', '/video'],
      ['✦', 'Product reveal', 'Motion presets', 'soon'],
      ['⤢', 'Reframe', '9:16 · 1:1 · 16:9', 'soon'],
      ['✎', 'Edit video', 'Scenes · shots · elements', 'soon'],
      ['▲', 'Video upscale', 'Enhance quality', 'soon'],
      ['🎙', 'Lipsync', 'Own voice only', 'soon']
    ]
  };
  var SOON_MODELS = {
    // 카탈로그(힉스필드 Image 메뉴 기준). 라벨이 /api/generate/tools 의 라벨과 같으면 live 로 올라가고 여기선 빠진다 → 키가 없는 서버에선 자동으로 soon.
    image: [['X', 'Grok Imagine 2.0'], ['H', 'Higgsfield Soul 2'], ['▲', 'Topaz']],
    video: [['K', 'Kling Motion Control'], ['K', 'Kling Omni Edit'], ['W', 'Wan'], ['X', 'Grok Imagine'], ['F', 'FLUX.3 Video'], ['G', 'Gemini Omni'], ['▲', 'Topaz Video']]
  };
  function item(ic, name, desc, st, href) {
    var live = st === 'live';
    return '<a class="it ' + (live ? '' : 'dis') + '" href="' + (live && href ? href : '#') + '"' + (live ? '' : ' onclick="return false"') + '><span class="ic">' + ic + '</span><span><b>' + esc(name) + '</b>' + (desc ? '<small>' + esc(desc) + '</small>' : '') + '</span><span class="scs"><span class="bd ' + (live ? 'live' : 'soon') + '">' + (live ? 'live' : 'soon') + '</span></span></a>';
  }
  function price(t) {
    var p = t.pricing || {};
    if (p.perImage) return '◈' + p.perImage + '/image';
    if (p.perDuration) { var k = Object.keys(p.perDuration)[0]; return k ? '◈' + p.perDuration[k] + '/' + k + 's' : ''; }
    return '';
  }
  function render(kind) {
    return tools().then(function (T) {
      var list = kind === 'image' ? T.image : T.video;
      var live = list.filter(function (t) { return t.id !== 'flux-pro'; }).map(function (t) { return item(ICON[t.provider] || '•', t.label, price(t) + (t.provider ? ' · ' + t.provider : ''), 'live', '/' + kind + '?tool=' + encodeURIComponent(t.id)); }).join('');
      var liveIds = list.map(function (t) { return t.label.toLowerCase(); });
      var soon = SOON_MODELS[kind].filter(function (m) { return liveIds.indexOf(m[1].toLowerCase()) < 0; }).map(function (m) { return item(m[0], m[1], 'coming soon', 'soon'); }).join('');
      var feats = FEAT[kind].map(function (f) { var st = f[3]; if (st.indexOf('auto:') === 0) st = (T[st.slice(5)] || []).length ? 'live' : 'soon'; return item(f[0], f[1], f[2], st, f[4]); }).join('');
      document.getElementById('tnMegaBox').innerHTML = '<div class="cols"><div><h4>Features</h4>' + feats + '</div><div><h4 class="k">Models</h4>' + live + soon + '</div></div>';
    });
  }
  var mega = document.getElementById('tnMega'), mt;
  Array.prototype.forEach.call(document.querySelectorAll('#tnNav a[data-mega]'), function (a) {
    a.addEventListener('mouseenter', function () { clearTimeout(mt); render(a.dataset.mega).then(function () { mega.classList.add('on'); }); });
    a.addEventListener('mouseleave', function () { mt = setTimeout(function () { mega.classList.remove('on'); }, 180); });
  });
  mega.addEventListener('mouseenter', function () { clearTimeout(mt); });
  mega.addEventListener('mouseleave', function () { mega.classList.remove('on'); });

  // ── 토스트 ──
  var toastEl = document.createElement('div'); toastEl.className = 'toast2'; document.body.appendChild(toastEl);
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2600); }

  window.DoppiaNav = { refreshCredits: refreshCredits, tools: tools, toast: toast, esc: esc };
})();
