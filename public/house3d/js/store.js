// 저장소 — dev 서버(dev.doppia.ai)에서는 서버 API(/api/house3d)에, 서버가 없는 곳(로컬 정적 서버 등)에서는 이 브라우저(localStorage)에 보관한다.
//   서버: POST /api/house3d/requests(공개) · GET /api/house3d/settings(공개) · /api/admin/house3d/*(Doppia 관리자 로그인)
//   브라우저(대체):
//   hw-admin    : 업체 관리자 설정 { prices: {재질id: 원/㎡}, edits: {재질id: {name, spec, src}}, hidden: [재질id] }
//   hw-requests : 상담·시공 요청 목록(홈페이지·체험 화면에서 쌓임), 관리자 화면에서 상태를 바꾼다
//   hw-plans    : 평면 편집기로 만든 주택 [{ plan, meta }]
//   hw-combos:<주택id> : 비교용으로 저장한 마감 조합 [{ name, state, at }]
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const getAdmin = () => ({ prices: {}, edits: {}, hidden: [], ...read('hw-admin', {}) });
export const saveAdmin = (a) => write('hw-admin', a);

export const getRequests = () => read('hw-requests', []);
export const saveRequests = (l) => write('hw-requests', l);
export function addRequest(req) { const l = getRequests(); l.push({ status: '신규', id: 'r' + Date.now().toString(36), ...req }); return saveRequests(l); }

export const getPlans = () => read('hw-plans', []);
export const savePlans = (l) => write('hw-plans', l);

export const getCombos = (home) => read('hw-combos:' + home, []);
export const saveCombos = (home, l) => write('hw-combos:' + home, l);

export const won = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');
// 큰 금액은 만원 단위로 짧게
export const wonShort = (n) => { const m = Math.round(n / 10000); return m >= 10000 ? `${(m / 10000).toFixed(m % 10000 ? 2 : 0)}억 원` : `${m.toLocaleString('ko-KR')}만 원`; };

// ── 서버 API ──
// 같은 출처로 부른다(로그인 쿠키가 따라감). 응답 봉투 {success, data} — 실패하면 status 를 단 Error.
async function api(path, { method = 'GET', body, timeout = 8000 } = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch('/api' + path, { method, credentials: 'same-origin', signal: ctl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j?.success) { const e = new Error(j?.error || `HTTP ${r.status}`); e.status = r.status; throw e; }
    return j.data;
  } catch (e) {
    if (e.status) throw e;
    throw new Error(e.name === 'AbortError' ? '응답이 늦습니다. 잠시 후 다시 시도해 주세요' : '네트워크에 연결할 수 없습니다');
  } finally { clearTimeout(t); }
}
// 접수 API 가 없는 곳(로컬 정적 서버 등: 404·405·501) — 이때만 브라우저 저장으로 대신한다.
//   네트워크 오류·시간 초과는 대신 저장하지 않고 오류로 알린다(서버에 안 간 요청을 접수된 것처럼 보이면 안 된다).
const noServer = (e) => [404, 405, 501].includes(e.status);

// 상담 요청 보내기 → { ok, server, id?, error? }
export async function submitRequest(req) {
  try { const d = await api('/house3d/requests', { method: 'POST', body: req }); return { ok: true, server: true, id: d.id }; }
  catch (e) {
    if (!noServer(e)) return { ok: false, error: e.message };
    addRequest(req); return { ok: true, server: false };
  }
}

// 업체 설정(단가·이름·사진·숨김) — 서버에 있으면 그것, 없으면 이 브라우저 값
export async function loadAdminSettings() {
  try { const d = await api('/house3d/settings', { timeout: 3000 }); return { ...getAdmin(), prices: {}, edits: {}, hidden: [], ...(d.value || {}), server: true }; }
  catch { return { ...getAdmin(), server: false }; }
}

// 관리자 화면용 — 로그인한 Doppia 관리자만 통과(아니면 401/403)
export const adminApi = {
  list: () => api('/admin/house3d/requests?limit=300'),
  setStatus: (id, status) => api(`/admin/house3d/requests/${id}`, { method: 'PATCH', body: { status } }),
  remove: (id) => api(`/admin/house3d/requests/${id}`, { method: 'DELETE' }),
  saveSettings: (a) => api('/admin/house3d/settings', { method: 'PUT', body: { prices: a.prices, edits: a.edits, hidden: a.hidden }, timeout: 20000 }),
  noServer,
};
