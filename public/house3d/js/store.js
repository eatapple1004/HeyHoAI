// 시연용 저장소 — 서버 연동 전까지 이 브라우저(localStorage)에 보관한다.
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
