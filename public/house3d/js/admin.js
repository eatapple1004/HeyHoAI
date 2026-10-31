// 업체 관리자 — 자재·단가·사진, 상담 접수함, 편집기로 만든 평면.
//   dev 서버에서 Doppia 관리자로 로그인하면 서버 데이터(접수·설정)를 다루고(mode 'server'),
//   로그인 전이면 안내를 띄우고('login'), 서버가 없는 곳에서는 이 브라우저 저장을 쓴다('local').
import { CATALOG, thumb, loadScans } from './materials.js';
import { getAdmin, saveAdmin, getRequests, saveRequests, addRequest, getPlans, savePlans, won, wonShort, adminApi, loadAdminSettings, plansApi } from './store.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => (el.style.opacity = 0), 2000); }
const STATUS = ['신규', '상담중', '계약', '보류'];

// ── 탭 ──
function setTab(t) {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  for (const k of ['mat', 'req', 'plan']) $('#t-' + k).hidden = k !== t;
  history.replaceState(null, '', '#' + t);
}
document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.t)));

// ── 연결 상태 ──
let mode = 'local', rows = [];
try { rows = await adminApi.list(); mode = 'server'; }
catch (e) { mode = e.status === 401 || e.status === 403 ? 'login' : 'local'; }
{
  const bar = $('#modeBar'), next = encodeURIComponent(location.pathname + location.hash);
  bar.className = 'mode ' + mode;
  bar.innerHTML = mode === 'server' ? '<b>서버에 연결됨</b> · 실제 접수된 요청과 업체 설정을 다룹니다. 저장한 단가·사진은 모든 방문자의 화면에 반영됩니다.'
    : mode === 'login' ? `<b>로그인이 필요합니다</b> · 서버에 접수된 요청과 업체 설정은 Doppia 관리자 계정으로 로그인해야 볼 수 있습니다. <a class="btn sm" href="/login?next=${next}">로그인</a> <span class="muted">아래는 이 브라우저에만 있는 시연 데이터입니다.</span>`
    : '<b>접수 서버가 없는 환경</b> · 이 브라우저에 저장된 시연 데이터를 보여 줍니다.';
  $('.hd .demo').textContent = mode === 'server' ? 'dev 서버' : '시연 · 이 브라우저에만 저장';
  $('#rDemo').hidden = mode === 'server';
}

// ── 자재·단가 ──
const [, settings] = await Promise.all([loadScans(), mode === 'server' ? loadAdminSettings() : Promise.resolve(getAdmin())]);
const draft = { prices: { ...settings.prices }, edits: JSON.parse(JSON.stringify(settings.edits || {})), hidden: [...(settings.hidden || [])] }; let dirty = false;
const groups = [...new Set(CATALOG.map((m) => m.group))];
// 견본은 업체 사진이 아닌 기본 그림으로(사진은 draft 에서 따로 보여 준다)
const thumbBase = (m) => { const s = m.src; delete m.src; const u = thumb(m.id); if (s) m.src = s; return u; };
$('#mG').innerHTML += groups.map((g) => `<option>${g}</option>`).join('');
function renderMat() {
  const q = $('#mQ').value.trim(), gsel = $('#mG').value;
  const list = CATALOG.filter((m) => (!gsel || m.group === gsel) && (!q || m.name.includes(q)));
  $('#mTable').innerHTML = `<tr><th style="width:60px">견본</th><th>이름</th><th class="hide-m">구분</th><th class="hide-m">규격</th><th style="width:150px;text-align:right">단가 (원/㎡)</th><th style="width:150px">실제 사진</th><th style="width:60px">노출</th></tr>`
    + list.map((m) => {
      const e = draft.edits[m.id] || {}, price = draft.prices[m.id], src = e.src, base = thumbBase(m);
      return `<tr data-id="${m.id}" class="${draft.hidden.includes(m.id) ? 'off' : ''}">
        <td><div class="sw" style="background-image:url(${src || base})"></div></td>
        <td><input type="text" data-f="name" value="${esc(e.name || m.base.name)}"></td>
        <td class="grp hide-m">${m.group}</td>
        <td class="hide-m"><input type="text" data-f="spec" value="${esc(e.spec || m.base.spec)}"></td>
        <td><input type="number" data-f="price" min="0" step="1000" value="${price ?? ''}" placeholder="${m.basePrice}"><div class="base">기본 ${won(m.basePrice)}</div></td>
        <td><label class="btn sm">${src ? '바꾸기' : '사진 올리기'}<input type="file" accept="image/*" data-f="photo" hidden></label>${src ? ' <button class="btn sm" data-f="nophoto">지우기</button>' : ''}</td>
        <td><input type="checkbox" data-f="show" ${draft.hidden.includes(m.id) ? '' : 'checked'}></td></tr>`;
    }).join('');
  $('#mTable').querySelectorAll('tr[data-id]').forEach((tr) => {
    const id = tr.dataset.id, m = CATALOG.find((x) => x.id === id), ed = () => (draft.edits[id] ||= {});
    const mark = (el) => { el?.classList.add('changed'); dirty = true; };
    tr.querySelector('[data-f=name]').onchange = (e) => { const v = e.target.value.trim(); if (v && v !== m.base.name) ed().name = v; else delete ed().name; mark(e.target); };
    tr.querySelector('[data-f=spec]').onchange = (e) => { const v = e.target.value.trim(); if (v && v !== m.base.spec) ed().spec = v; else delete ed().spec; mark(e.target); };
    tr.querySelector('[data-f=price]').onchange = (e) => { const v = parseInt(e.target.value, 10); if (v >= 0) draft.prices[id] = v; else delete draft.prices[id]; mark(e.target); };
    tr.querySelector('[data-f=show]').onchange = (e) => { draft.hidden = draft.hidden.filter((x) => x !== id); if (!e.target.checked) draft.hidden.push(id); tr.classList.toggle('off', !e.target.checked); dirty = true; };
    tr.querySelector('[data-f=photo]').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const im = new Image(); im.onload = () => {
        // 저장 공간을 아끼려고 긴 변 768px 로 줄인다
        const s = Math.min(1, 768 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        ed().src = c.toDataURL('image/jpeg', 0.82); dirty = true; URL.revokeObjectURL(im.src); renderMat(); toast('사진을 넣었습니다 · 저장을 눌러 반영하세요');
      };
      im.src = URL.createObjectURL(f);
    };
    const np = tr.querySelector('[data-f=nophoto]'); if (np) np.onclick = () => { delete ed().src; dirty = true; renderMat(); };
  });
}
$('#mQ').oninput = renderMat; $('#mG').onchange = renderMat;
async function persist(a) {
  if (mode === 'server') { await adminApi.saveSettings(a); return; }
  if (mode === 'login') throw new Error('로그인 후 저장할 수 있습니다');
  if (!saveAdmin(a)) throw new Error('브라우저 저장 공간이 부족합니다. 사진 수를 줄여 주세요');
}
$('#mSave').onclick = async () => {
  for (const [k, v] of Object.entries(draft.edits)) if (!Object.keys(v).length) delete draft.edits[k];
  try { await persist(draft); } catch (e) { return toast('저장하지 못했습니다: ' + e.message); }
  dirty = false; toast(mode === 'server' ? '서버에 저장했습니다 · 체험 화면에 바로 반영됩니다' : '저장했습니다'); setTimeout(() => location.reload(), 900);
};
$('#mReset').onclick = async () => {
  if (!confirm('이름·규격·단가·사진·노출 설정을 모두 기본값으로 되돌릴까요?')) return;
  try { await persist({ prices: {}, edits: {}, hidden: [] }); } catch (e) { return toast('되돌리지 못했습니다: ' + e.message); }
  dirty = false; location.reload();
};
addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

// ── 상담 접수함 ──
// 홈페이지 양식과 체험 화면 요청은 모양이 조금 달라서 한 모양으로 맞춰 보여 준다
const norm = (q, key, status, at) => ({
  key, raw: q, at: at || q.createdAt, status: status || q.status || '신규',
  name: q.request?.name, phone: q.request?.phone, type: q.type || q.request?.type || '상담',
  home: q.homeName || q.plan || q.home || '—', homeId: q.home,
  where: q.request?.site || q.request?.area || '', memo: q.request?.memo || '',
  extra: Object.entries(q.request || {}).filter(([k]) => !['name', 'phone', 'memo', 'home', 'type', 'site', 'area'].includes(k)),
  total: q.estimate?.total, base: q.estimate?.base, lines: q.estimate?.lines || [], finishes: q.finishes || [], link: q.link, source: q.source,
});
const KO = { how: '상담 방식', when: '연락 시간', land: '대지 면적(㎡)', floor: '희망 연면적(㎡)', budget: '예산', start: '희망 착공', land_state: '대지 상태' };
let open = null;
function renderReq() {
  const all = mode === 'server' ? rows.map((r) => norm(r.payload || {}, r.id, r.status, r.created_at)) : getRequests().map((q, i) => norm(q, String(i)));
  const s = $('#rS').value, q = $('#rQ').value.trim();
  const n = (st) => all.filter((r) => r.status === st).length;
  $('#newN').textContent = n('신규') || ''; $('#newN').style.display = n('신규') ? '' : 'none';
  const withEst = all.filter((r) => r.total);
  $('#kpis').innerHTML = `<div class="kpi"><b>${all.length}</b><span>전체 요청</span></div><div class="kpi"><b>${n('신규')}</b><span>새 요청 (미확인)</span></div>
    <div class="kpi"><b>${n('계약')}</b><span>계약</span></div><div class="kpi"><b>${withEst.length ? wonShort(withEst.reduce((a, r) => a + r.total, 0) / withEst.length) : '—'}</b><span>평균 마감 견적 (견적 첨부 요청)</span></div>`;
  const list = all.filter((r) => (!s || r.status === s) && (!q || [r.name, r.phone, r.home].some((v) => String(v || '').includes(q))));
  if (mode !== 'server') list.reverse(); // 서버는 이미 최신순
  if (!list.length) { $('#rTable').innerHTML = `<tr><td class="empty">${all.length ? '조건에 맞는 요청이 없습니다.' : '아직 들어온 요청이 없습니다. 홈페이지나 3D 체험 화면에서 상담 요청을 보내면 여기에 쌓입니다.'}</td></tr>`; return; }
  $('#rTable').innerHTML = `<tr><th>접수</th><th>고객</th><th>구분</th><th class="hide-m">주택</th><th style="text-align:right">마감 견적</th><th>상태</th><th></th></tr>`
    + list.map((r) => {
      const d = new Date(r.at), when = isNaN(d) ? '—' : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const row = `<tr><td>${when}</td><td><b>${esc(r.name)}</b><br><small>${esc(r.phone)}</small></td><td>${esc(r.type)}</td><td class="hide-m">${esc(r.home)}</td>
        <td class="num">${r.total ? `${wonShort(r.total)}${r.base ? `<br><small>${Math.abs(r.total - r.base) < 5000 ? '기본 마감' : `기본 대비 ${r.total - r.base > 0 ? '+' : '−'}${wonShort(Math.abs(r.total - r.base))}`}</small>` : ''}` : '—'}</td>
        <td><select class="status" data-k="${r.key}" data-s="${r.status}">${STATUS.map((x) => `<option ${x === r.status ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td class="num"><button class="btn sm" data-open="${r.key}">${open === r.key ? '닫기' : '자세히'}</button></td></tr>`;
      if (open !== r.key) return row;
      return row + `<tr class="detail"><td colspan="7"><div class="in">
        <div><h4>요청 내용</h4><ul>${r.where ? `<li>지역: ${esc(r.where)}</li>` : ''}${r.extra.map(([k, v]) => `<li>${KO[k] || k}: ${esc(v)}</li>`).join('')}${r.memo ? `<li>메모: ${esc(r.memo)}</li>` : ''}<li>접수 경로: ${r.source === 'tour' ? '3D 체험 화면(마감 선택 포함)' : '홈페이지 양식'}</li></ul>
          ${r.link ? `<p style="margin:10px 0 0"><a class="btn sm" href="${esc(r.link)}" target="_blank" rel="noopener">고객이 고른 마감으로 3D 열기</a></p>` : ''}</div>
        <div><h4>마감 견적 ${r.total ? won(r.total) : ''}</h4>${r.lines.length ? `<ul>${r.lines.slice(0, 8).map((l) => `<li>${esc(l.material)} · ${l.area}㎡ · ${won(l.amount)}</li>`).join('')}${r.lines.length > 8 ? `<li>외 ${r.lines.length - 8}건</li>` : ''}</ul>` : '<p class="note" style="margin:0">견적이 첨부되지 않은 요청입니다(홈페이지 양식).</p>'}
          <p style="margin:10px 0 0"><button class="btn sm" data-del="${r.key}">요청 삭제</button></p></div></div></td></tr>`;
    }).join('');
  $('#rTable').querySelectorAll('select.status').forEach((el) => (el.onchange = async () => {
    const k = el.dataset.k;
    try {
      if (mode === 'server') { await adminApi.setStatus(k, el.value); rows.find((r) => r.id === k).status = el.value; }
      else { const l = getRequests(); l[+k].status = el.value; saveRequests(l); }
    } catch (e) { toast('바꾸지 못했습니다: ' + e.message); return renderReq(); }
    renderReq(); toast(`상태를 '${el.value}'(으)로 바꿨습니다`);
  }));
  $('#rTable').querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { open = open === b.dataset.open ? null : b.dataset.open; renderReq(); }));
  $('#rTable').querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!confirm('이 요청을 삭제할까요?')) return; const k = b.dataset.del;
    try {
      if (mode === 'server') { await adminApi.remove(k); rows = rows.filter((r) => r.id !== k); }
      else { const l = getRequests(); l.splice(+k, 1); saveRequests(l); }
    } catch (e) { return toast('삭제하지 못했습니다: ' + e.message); }
    open = null; renderReq();
  }));
}
$('#rS').onchange = renderReq; $('#rQ').oninput = renderReq;
$('#rExp').onclick = () => {
  const data = mode === 'server' ? rows : getRequests();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = '상담요청_전체.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
// 시연용 예시(가상의 고객) — 접수함이 비어 있을 때 화면을 보여 주기 위한 것
$('#rDemo').onclick = () => {
  const now = Date.now(), iso = (h) => new Date(now - h * 3600e3).toISOString();
  addRequest({ createdAt: iso(30), type: '신축 시공', home: 'courtyard-house', homeName: '중정 풀하우스', source: 'tour', status: '상담중',
    request: { name: '예시 고객 A', phone: '010-0000-0001', area: '경기 성남시', memo: '중정 쪽 거실을 트래버틴으로 하고 싶습니다(시연용 예시)' },
    estimate: { total: 168400000, base: 152100000, lines: [{ material: '트래버틴', area: 96.2, price: 230000, amount: 22126000 }, { material: '내추럴 오크 쉐브론', area: 88.4, price: 240000, amount: 21216000 }] } });
  addRequest({ createdAt: iso(5), type: '분양 상담', home: 'riverside-ph', homeName: '한강 리버뷰 펜트하우스', source: 'homepage',
    request: { name: '예시 고객 B', phone: '010-0000-0002', how: '방문 상담', when: '주말', memo: '복층 타입도 함께 보고 싶습니다(시연용 예시)' } });
  renderReq(); toast('시연용 예시 요청 2건을 넣었습니다');
};

// ── 내 평면 ──
let srvPlans = mode === 'server' ? await plansApi.list().catch(() => []) : [];
function renderPlans() {
  const items = mode === 'server'
    ? srvPlans.map((p) => ({ id: p.id, name: p.name, region: p.meta?.region, rooms: p.meta?.rooms, area: p.meta?.area, at: p.updated_at }))
    : getPlans().map((p) => ({ id: p.plan.id, name: p.plan.name, region: p.meta?.region, rooms: p.plan.rooms.length,
      area: p.plan.rooms.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0), at: p.meta?.updated }));
  if (!items.length) { $('#pTable').innerHTML = '<tr><td class="empty">평면 편집기로 만든 평면이 없습니다.</td></tr>'; return; }
  $('#pTable').innerHTML = '<tr><th>이름</th><th>방</th><th style="text-align:right">면적</th><th class="hide-m">수정</th><th></th></tr>' + items.map((p) => {
    const d = new Date(p.at);
    return `<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.region || '')}</small></td><td>${p.rooms ?? '—'}개</td><td class="num">${p.area != null ? `${(+p.area).toFixed(1)}㎡ · ${(p.area / 3.3058).toFixed(1)}평` : '—'}</td>
      <td class="hide-m">${isNaN(d) ? '—' : d.toLocaleDateString('ko-KR')}</td>
      <td class="num"><a class="btn sm" href="./editor.html?p=${p.id}">편집</a> <a class="btn sm" href="./tour.html?h=${p.id}">3D</a> <button class="btn sm" data-d="${p.id}">삭제</button></td></tr>`;
  }).join('');
  $('#pTable').querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => {
    const p = items.find((x) => x.id === b.dataset.d); if (!confirm(`'${p.name}' 평면을 삭제할까요?`)) return;
    if (mode === 'server') {
      try { await plansApi.remove(p.id); } catch (e) { return toast('삭제하지 못했습니다: ' + e.message); }
      srvPlans = srvPlans.filter((x) => x.id !== p.id);
    } else savePlans(getPlans().filter((x) => x.plan.id !== p.id));
    renderPlans();
  }));
}

renderMat(); renderReq(); renderPlans();
setTab(['mat', 'req', 'plan'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'req');
