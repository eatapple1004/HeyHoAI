// 평면 편집기 — 도면 이미지 위에 방(사각형)을 그리면 벽이 자동으로 생기고, 벽을 눌러 문·창을 단다.
// 저장하면 hw-plans 에 평면 데이터(genPlan 결과)와 편집 원본이 함께 들어가고, tour.html?h=<id> 로 바로 걸어 볼 수 있다.
import { genPlan, makeWalls, overlaps, ROOM_TYPES, OP_TYPES, OP_WIDTH } from './planmake.js';
import { getPlans, savePlans } from './store.js';

const $ = (s) => document.querySelector(s);
const cv = $('#cv'), g = cv.getContext('2d'), stage = $('#stage');
const DRAFT = 'hw-editor-draft', SNAP = 0.05;
const TYPE_KO = Object.fromEntries(ROOM_TYPES), OP_KO = Object.fromEntries(OP_TYPES);
const TINT = { living: '#efe3cf', kitchen: '#e9e6d6', dining: '#ece4d4', master: '#e6dccb', bed: '#e8e1d6', study: '#e2e2d8', foyer: '#ded9d0', hall: '#ebe8e2', bath: '#d9e3e6', dress: '#e5ded6', utility: '#e0e0dc' };

const newId = () => 'custom-' + Date.now().toString(36);
const blank = () => ({ id: newId(), name: '새 평면', height: 2.7, kind: '시공', region: '', rooms: [], ops: [], bg: null });
let doc = blank();
let view = { ox: 80, oy: 80, k: 40 };       // 화면 px = ox + x·k
let tool = 'room', sel = null, hover = null, drag = null, temp = null, scaleA = null, bgMoving = false, spaceDown = false;
let bgImg = null, W = 1, H = 1, walls = [];
const undo = [];

// ── 좌표 ──
const toS = (x, z) => [view.ox + x * view.k, view.oy + z * view.k];
const toW = (sx, sy) => [(sx - view.ox) / view.k, (sy - view.oy) / view.k];
const snap = (v) => Math.round(v / SNAP) * SNAP;
const r2 = (v) => Math.round(v * 100) / 100;
const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
// 다른 방 모서리에 붙이기 (화면 10px 이내)
function snapTo(v, axis, skip) {
  const lim = 10 / view.k; let best = snap(v), d = lim;
  for (const r of doc.rooms) { if (r === skip) continue; for (const c of axis === 'x' ? [r.x0, r.x1] : [r.z0, r.z1]) if (Math.abs(c - v) < d) { d = Math.abs(c - v); best = c; } }
  return best;
}
const roomArea = (r) => (r.x1 - r.x0) * (r.z1 - r.z0);

// ── 상태 바꾸기 ──
function commit(fn) {
  undo.push(JSON.stringify({ rooms: doc.rooms, ops: doc.ops })); if (undo.length > 80) undo.shift();
  fn(); changed();
}
let saveT;
function changed() {
  walls = makeWalls(doc.rooms);
  $('#undoBtn').disabled = !undo.length;
  clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(DRAFT, JSON.stringify(doc)); } catch {} }, 300);
  renderSide(); draw();
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => (el.style.opacity = 0), 2000); }

// ── 그리기 ──
function resize() {
  const d = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight;
  cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); draw();
}
function draw() {
  g.clearRect(0, 0, W, H);
  // 도면 이미지
  if (doc.bg && bgImg) {
    const [sx, sy] = toS(doc.bg.x, doc.bg.z), s = view.k / doc.bg.ppm;
    g.globalAlpha = doc.bg.op ?? 0.6; g.drawImage(bgImg, sx, sy, bgImg.width * s, bgImg.height * s); g.globalAlpha = 1;
  }
  // 격자 1m (5m 마다 진하게)
  const [x0, z0] = toW(0, 0), [x1, z1] = toW(W, H);
  if (view.k > 6) for (let x = Math.floor(x0); x <= x1; x++) { const [sx] = toS(x, 0); g.fillStyle = x % 5 ? 'rgba(0,0,0,.05)' : 'rgba(0,0,0,.11)'; g.fillRect(Math.round(sx), 0, 1, H); }
  if (view.k > 6) for (let z = Math.floor(z0); z <= z1; z++) { const [, sy] = toS(0, z); g.fillStyle = z % 5 ? 'rgba(0,0,0,.05)' : 'rgba(0,0,0,.11)'; g.fillRect(0, Math.round(sy), W, 1); }
  // 방 바닥
  for (const r of doc.rooms) {
    const [a, b] = toS(r.x0, r.z0), [c, d] = toS(r.x1, r.z1);
    g.fillStyle = TINT[r.type] || '#eee'; g.globalAlpha = doc.bg ? 0.55 : 0.9; g.fillRect(a, b, c - a, d - b); g.globalAlpha = 1;
  }
  // 벽 (자동)
  for (const w of walls) {
    const t = Math.max(2, (w.ext ? 0.25 : 0.15) * view.k);
    const [a, b] = w.axis === 'h' ? toS(w.s0, w.c) : toS(w.c, w.s0), [c, d] = w.axis === 'h' ? toS(w.s1, w.c) : toS(w.c, w.s1);
    g.strokeStyle = hover?.wall === w ? '#c99a5b' : '#2b2a27'; g.lineWidth = t; g.lineCap = 'square';
    g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
  }
  // 문·창
  doc.ops.forEach((o, i) => {
    const h = o.axis === 'h', [a, b] = h ? toS(o.s - o.w / 2, o.c) : toS(o.c, o.s - o.w / 2), [c, d] = h ? toS(o.s + o.w / 2, o.c) : toS(o.c, o.s + o.w / 2);
    const t = Math.max(3, 0.26 * view.k);
    g.lineCap = 'butt'; g.strokeStyle = '#f7f4ee'; g.lineWidth = t + 2; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
    const col = { door: '#8a6a45', exit: '#8a6a45', open: '#b8ad9c', window: '#4b86a8', glass: '#4b86a8' }[o.type];
    g.strokeStyle = col; g.lineWidth = o.type === 'window' || o.type === 'glass' ? Math.max(2, t * 0.35) : Math.max(2, t * 0.5);
    if (o.type === 'open') g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.setLineDash([]);
    if (o.type === 'door' || o.type === 'exit') { // 문 여닫이 호
      const rr = Math.max(1, o.w * view.k); g.lineWidth = 1; g.strokeStyle = 'rgba(138,106,69,.6)'; g.beginPath();
      if (h) g.arc(a, b, rr, 0, Math.PI / 2); else g.arc(a, b, rr, -Math.PI / 2, 0); g.stroke();
    }
    if (sel?.op === i) { g.strokeStyle = '#c99a5b'; g.lineWidth = 2; g.strokeRect(Math.min(a, c) - 6, Math.min(b, d) - 6, Math.abs(c - a) + 12, Math.abs(d - b) + 12); }
  });
  // 방 이름·면적, 선택 테두리
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const r of doc.rooms) {
    const [a, b] = toS(r.x0, r.z0), [c, d] = toS(r.x1, r.z1), on = sel?.room === r;
    if (on) { g.strokeStyle = '#c99a5b'; g.lineWidth = 2.5; g.strokeRect(a, b, c - a, d - b);
      g.fillStyle = '#c99a5b'; for (const [hx, hy] of [[(a + c) / 2, b], [(a + c) / 2, d], [a, (b + d) / 2], [c, (b + d) / 2]]) g.fillRect(hx - 4, hy - 4, 8, 8); }
    if (c - a > 44 && d - b > 26) {
      g.fillStyle = '#1d1c1a'; g.font = `600 ${Math.min(14, Math.max(10, view.k * 0.3))}px Pretendard, -apple-system, sans-serif`; g.fillText(r.name, (a + c) / 2, (b + d) / 2 - 7);
      g.fillStyle = '#5e5a54'; g.font = `500 ${Math.min(12, Math.max(9, view.k * 0.24))}px Pretendard, -apple-system, sans-serif`;
      const dim = `${(r.x1 - r.x0).toFixed(2)}×${(r.z1 - r.z0).toFixed(2)}m · ${roomArea(r).toFixed(1)}㎡`, short = `${roomArea(r).toFixed(1)}㎡`;
      const t = g.measureText(dim).width < c - a - 8 ? dim : g.measureText(short).width < c - a - 8 ? short : '';
      if (t) g.fillText(t, (a + c) / 2, (b + d) / 2 + 9);
    }
  }
  // 그리는 중인 방
  if (temp) {
    const [a, b] = toS(Math.min(temp.x0, temp.x1), Math.min(temp.z0, temp.z1)), [c, d] = toS(Math.max(temp.x0, temp.x1), Math.max(temp.z0, temp.z1));
    g.fillStyle = 'rgba(201,154,91,.18)'; g.fillRect(a, b, c - a, d - b); g.strokeStyle = '#c99a5b'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(a, b, c - a, d - b); g.setLineDash([]);
    g.fillStyle = '#1d1c1a'; g.font = '600 13px Pretendard, -apple-system, sans-serif';
    g.fillText(`${Math.abs(temp.x1 - temp.x0).toFixed(2)} × ${Math.abs(temp.z1 - temp.z0).toFixed(2)} m`, (a + c) / 2, (b + d) / 2);
  }
  // 축척 첫 점
  if (scaleA) { const [a, b] = toS(...scaleA); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(a, b, 5, 0, 7); g.fill();
    if (hover?.pt) { const [c, d] = toS(...hover.pt); g.strokeStyle = '#c0392b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); } }
  // 문·창 도구: 놓일 자리 미리 보기
  if (tool === 'door' && hover?.wall && hover.s != null) { const [a, b] = hover.wall.axis === 'h' ? toS(hover.s, hover.wall.c) : toS(hover.wall.c, hover.s); g.fillStyle = '#c99a5b'; g.beginPath(); g.arc(a, b, 6, 0, 7); g.fill(); }
}

// ── 맞춰 보기 ──
function fit() {
  const pts = doc.rooms.flatMap((r) => [[r.x0, r.z0], [r.x1, r.z1]]);
  if (doc.bg && bgImg) pts.push([doc.bg.x, doc.bg.z], [doc.bg.x + bgImg.width / doc.bg.ppm, doc.bg.z + bgImg.height / doc.bg.ppm]);
  if (!pts.length) pts.push([0, 0], [16, 12]);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), bz0 = Math.min(...zs), bz1 = Math.max(...zs);
  if (W < 120 || H < 120) return; // 아직 화면 크기가 안 잡힘
  view.k = Math.max(3, Math.min((W - 80) / Math.max(1, bx1 - bx0), (H - 80) / Math.max(1, bz1 - bz0)));
  view.ox = (W - (bx1 - bx0) * view.k) / 2 - bx0 * view.k; view.oy = (H - (bz1 - bz0) * view.k) / 2 - bz0 * view.k;
  draw();
}

// ── 맞히기(hit test) ──
function hitRoom(x, z) { return doc.rooms.filter((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1).sort((a, b) => roomArea(a) - roomArea(b))[0]; }
function hitEdge(sx, sy) { // 선택된 방을 먼저, 그다음 모든 방의 모서리
  const list = sel?.room ? [sel.room, ...doc.rooms.filter((r) => r !== sel.room)] : doc.rooms;
  for (const r of list) {
    const [a, b] = toS(r.x0, r.z0), [c, d] = toS(r.x1, r.z1);
    const inY = sy > b - 6 && sy < d + 6, inX = sx > a - 6 && sx < c + 6;
    if (inY && Math.abs(sx - a) < 7) return { r, e: 'x0' }; if (inY && Math.abs(sx - c) < 7) return { r, e: 'x1' };
    if (inX && Math.abs(sy - b) < 7) return { r, e: 'z0' }; if (inX && Math.abs(sy - d) < 7) return { r, e: 'z1' };
  }
  return null;
}
function hitOp(x, z) {
  const lim = 10 / view.k;
  return doc.ops.findIndex((o) => (o.axis === 'h' ? Math.abs(z - o.c) < lim && Math.abs(x - o.s) < o.w / 2 + lim : Math.abs(x - o.c) < lim && Math.abs(z - o.s) < o.w / 2 + lim));
}
function hitWall(x, z) {
  const lim = 12 / view.k; let best = null, bd = lim;
  for (const w of walls) {
    const along = w.axis === 'h' ? x : z, across = w.axis === 'h' ? z : x;
    if (along < w.s0 || along > w.s1) continue;
    const d = Math.abs(across - w.c); if (d < bd) { bd = d; best = { wall: w, s: snap(along) }; }
  }
  return best;
}

// ── 포인터 ──
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  const [sx, sy] = pos(e), [x, z] = toW(sx, sy);
  if (tool === 'pan' || spaceDown || e.button === 1 || e.button === 2) { drag = { type: 'pan', sx, sy, ox: view.ox, oy: view.oy }; return; }
  if (tool === 'room') { temp = { x0: snapTo(x, 'x'), z0: snapTo(z, 'z'), x1: snapTo(x, 'x'), z1: snapTo(z, 'z') }; drag = { type: 'draw' }; return; }
  if (tool === 'scale') {
    if (!doc.bg) { toast('먼저 도면 이미지를 불러오세요'); return; }
    if (!scaleA) { scaleA = [x, z]; hint(); draw(); return; }
    const d = Math.hypot(x - scaleA[0], z - scaleA[1]);
    const real = parseFloat(prompt('두 점 사이의 실제 길이(m)를 입력하세요', d.toFixed(2)));
    if (real > 0 && d > 0.01) {
      const pa = (scaleA[0] - doc.bg.x) * doc.bg.ppm, pb = (scaleA[1] - doc.bg.z) * doc.bg.ppm;
      doc.bg.ppm = doc.bg.ppm * d / real; doc.bg.x = scaleA[0] - pa / doc.bg.ppm; doc.bg.z = scaleA[1] - pb / doc.bg.ppm;
      toast(`축척을 맞췄습니다 (${real}m)`); changed(); fit(); setTool('room');
    }
    scaleA = null; draw(); return;
  }
  if (tool === 'door') {
    const oi = hitOp(x, z);
    if (oi >= 0) { sel = { op: oi }; drag = { type: 'op', i: oi, start: JSON.stringify({ rooms: doc.rooms, ops: doc.ops }) }; renderSide(); draw(); return; }
    const h = hitWall(x, z); if (!h) return;
    commit(() => { const type = h.wall.ext ? 'window' : 'door'; doc.ops.push({ axis: h.wall.axis, c: h.wall.c, s: h.s, w: OP_WIDTH[type], type }); sel = { op: doc.ops.length - 1 }; });
    return;
  }
  // 선택 도구
  if (bgMoving && doc.bg) { drag = { type: 'bg', x, z, bx: doc.bg.x, bz: doc.bg.z }; return; }
  const oi = hitOp(x, z);
  if (oi >= 0) { sel = { op: oi }; renderSide(); draw(); return; }
  const edge = hitEdge(sx, sy);
  if (edge) { sel = { room: edge.r }; drag = { type: 'edge', ...edge, start: JSON.stringify({ rooms: doc.rooms, ops: doc.ops }) }; renderSide(); draw(); return; }
  const r = hitRoom(x, z);
  sel = r ? { room: r } : null;
  if (r) drag = { type: 'move', r, x, z, o: { ...r }, start: JSON.stringify({ rooms: doc.rooms, ops: doc.ops }) };
  renderSide(); draw();
});
cv.addEventListener('pointermove', (e) => {
  const [sx, sy] = pos(e), [x, z] = toW(sx, sy);
  if (!drag) {
    if (tool === 'door') { hover = hitWall(x, z); draw(); }
    else if (tool === 'scale' && scaleA) { hover = { pt: [x, z] }; draw(); }
    else if (tool === 'select') { const ed = hitEdge(sx, sy); cv.style.cursor = bgMoving ? 'move' : ed ? (ed.e[0] === 'x' ? 'ew-resize' : 'ns-resize') : hitRoom(x, z) ? 'move' : 'default'; }
    return;
  }
  if (drag.type === 'pan') { view.ox = drag.ox + sx - drag.sx; view.oy = drag.oy + sy - drag.sy; draw(); return; }
  if (drag.type === 'draw') { temp.x1 = snapTo(x, 'x'); temp.z1 = snapTo(z, 'z'); draw(); return; }
  if (drag.type === 'bg') { doc.bg.x = drag.bx + x - drag.x; doc.bg.z = drag.bz + z - drag.z; draw(); return; }
  if (drag.type === 'edge') {
    const r = drag.r, e2 = drag.e, v = snapTo(e2[0] === 'x' ? x : z, e2[0], r);
    if (e2 === 'x0' && v < r.x1 - 0.5) r.x0 = v; if (e2 === 'x1' && v > r.x0 + 0.5) r.x1 = v;
    if (e2 === 'z0' && v < r.z1 - 0.5) r.z0 = v; if (e2 === 'z1' && v > r.z0 + 0.5) r.z1 = v;
    drag.moved = true; walls = makeWalls(doc.rooms); draw(); return;
  }
  if (drag.type === 'move') {
    const r = drag.r, o = drag.o, w = o.x1 - o.x0, d = o.z1 - o.z0;
    let nx = snap(o.x0 + x - drag.x), nz = snap(o.z0 + z - drag.z);
    const sx0 = snapTo(nx, 'x', r), sx1 = snapTo(nx + w, 'x', r); nx = Math.abs(sx0 - nx) <= Math.abs(sx1 - nx - w) ? sx0 : sx1 - w;
    const sz0 = snapTo(nz, 'z', r), sz1 = snapTo(nz + d, 'z', r); nz = Math.abs(sz0 - nz) <= Math.abs(sz1 - nz - d) ? sz0 : sz1 - d;
    Object.assign(r, { x0: r2(nx), x1: r2(nx + w), z0: r2(nz), z1: r2(nz + d) });
    drag.moved = true; walls = makeWalls(doc.rooms); draw(); return;
  }
  if (drag.type === 'op') { // 문·창을 벽을 따라 밀기
    const o = doc.ops[drag.i], s = snap(o.axis === 'h' ? x : z); if (s !== o.s) { o.s = s; drag.moved = true; draw(); }
  }
});
cv.addEventListener('pointerup', () => {
  if (drag?.type === 'draw' && temp) {
    const r = { x0: Math.min(temp.x0, temp.x1), z0: Math.min(temp.z0, temp.z1), x1: Math.max(temp.x0, temp.x1), z1: Math.max(temp.z0, temp.z1) };
    if (r.x1 - r.x0 >= 0.5 && r.z1 - r.z0 >= 0.5) {
      commit(() => { const n = doc.rooms.length + 1; const room = { id: 'r' + Date.now().toString(36) + n, name: `방 ${n}`, type: n === 1 ? 'living' : 'bed', ...r }; doc.rooms.push(room); sel = { room }; });
      setTimeout(() => $('#fName')?.select(), 0);
    }
    temp = null;
  } else if (drag?.moved && drag.start) { undo.push(drag.start); changed(); }
  else if (drag?.type === 'bg') changed();
  drag = null; draw();
});
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [sx, sy] = pos(e), [x, z] = toW(sx, sy), f = Math.exp(-e.deltaY * 0.0015);
  view.k = Math.min(400, Math.max(3, view.k * f)); view.ox = sx - x * view.k; view.oy = sy - z * view.k; draw();
}, { passive: false });

// ── 키보드 ──
addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); doUndo(); return; }
  if (e.key === ' ') { spaceDown = true; cv.style.cursor = 'grab'; e.preventDefault(); return; }
  const k = e.key.toLowerCase();
  if (k === 'v') setTool('select'); else if (k === 'r') setTool('room'); else if (k === 'd') setTool('door'); else if (k === 's') setTool('scale');
  else if (e.key === 'Escape') { sel = null; temp = null; scaleA = null; drag = null; renderSide(); draw(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') delSel();
  else if (sel?.room && e.key.startsWith('Arrow')) {
    e.preventDefault(); const d = e.shiftKey ? 0.5 : SNAP, r = sel.room;
    const [dx, dz] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
    commit(() => { r.x0 = r2(r.x0 + dx); r.x1 = r2(r.x1 + dx); r.z0 = r2(r.z0 + dz); r.z1 = r2(r.z1 + dz); });
  }
});
addEventListener('keyup', (e) => { if (e.key === ' ') { spaceDown = false; cv.style.cursor = ''; } });
function delSel() {
  if (sel?.room) commit(() => { doc.rooms = doc.rooms.filter((r) => r !== sel.room); sel = null; });
  else if (sel?.op != null) commit(() => { doc.ops.splice(sel.op, 1); sel = null; });
}
function doUndo() {
  const s = undo.pop(); if (!s) return;
  const o = JSON.parse(s); doc.rooms = o.rooms; doc.ops = o.ops; sel = null; changed();
}

// ── 도구 ──
const HINTS = {
  select: '방을 끌어 옮기고, 테두리를 끌어 크기를 바꿉니다 · 방향키로 5cm씩 · Delete 로 삭제',
  room: '드래그해서 방을 그립니다 · 다른 방 모서리에 자동으로 붙습니다 · 맞닿은 벽은 내벽이 됩니다',
  door: '벽을 누르면 내벽엔 문, 외벽엔 창이 생깁니다 · 눌러서 고르고 끌어서 옮깁니다',
  scale: '도면 위에서 길이를 아는 두 점을 차례로 누르세요',
  pan: '드래그해서 화면을 옮깁니다 · 휠로 확대·축소',
};
function hint() { $('#hint').textContent = tool === 'scale' && scaleA ? '두 번째 점을 누르세요' : bgMoving ? '도면 이미지를 끌어서 방 위치에 맞추세요' : HINTS[tool]; }
function setTool(t) {
  tool = t; scaleA = null; hover = null; if (t !== 'select') setBgMove(false);
  document.querySelectorAll('.tools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  cv.style.cursor = t === 'room' || t === 'scale' ? 'crosshair' : t === 'pan' ? 'grab' : t === 'door' ? 'pointer' : 'default';
  hint(); draw();
}
document.querySelectorAll('.tools button').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
function setBgMove(on) { bgMoving = on && !!doc.bg; $('#bgMove').classList.toggle('on', bgMoving); hint(); }
$('#bgMove').onclick = () => { if (!doc.bg) return toast('먼저 도면 이미지를 불러오세요'); setTool('select'); setBgMove(!bgMoving); };

// ── 옆 패널 ──
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderSide() {
  const body = $('#selBody');
  if (sel?.room) {
    const r = sel.room;
    body.innerHTML = `<div class="g2"><label class="field">이름<input id="fName" value="${esc(r.name)}" maxlength="20"></label>
      <label class="field">종류<select id="fType">${ROOM_TYPES.map(([k, v]) => `<option value="${k}" ${k === r.type ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <div class="g4" style="margin-top:8px"><label class="field">x<input type="number" step="0.05" id="fX" value="${r.x0}"></label><label class="field">y<input type="number" step="0.05" id="fZ" value="${r.z0}"></label>
      <label class="field">가로<input type="number" step="0.05" min="0.5" id="fW" value="${r2(r.x1 - r.x0)}"></label><label class="field">세로<input type="number" step="0.05" min="0.5" id="fD" value="${r2(r.z1 - r.z0)}"></label></div>
      <div class="row" style="margin-top:10px"><span class="muted" style="margin:0;flex:1">${roomArea(r).toFixed(2)}㎡ · ${(roomArea(r) / 3.3058).toFixed(1)}평</span><button class="btn sm" id="fDel">방 삭제</button></div>`;
    $('#fName').onchange = (e) => commit(() => (r.name = e.target.value.trim() || r.name));
    $('#fType').onchange = (e) => commit(() => { r.type = e.target.value; if (/^방 \d+$/.test(r.name)) r.name = TYPE_KO[r.type]; });
    const num = (id, fn) => ($(id).onchange = (e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) commit(() => fn(v)); });
    num('#fX', (v) => { const w = r.x1 - r.x0; r.x0 = r2(v); r.x1 = r2(v + w); });
    num('#fZ', (v) => { const d = r.z1 - r.z0; r.z0 = r2(v); r.z1 = r2(v + d); });
    num('#fW', (v) => (r.x1 = r2(r.x0 + Math.max(0.5, v))));
    num('#fD', (v) => (r.z1 = r2(r.z0 + Math.max(0.5, v))));
    $('#fDel').onclick = delSel;
  } else if (sel?.op != null && doc.ops[sel.op]) {
    const o = doc.ops[sel.op];
    body.innerHTML = `<div class="g2"><label class="field">종류<select id="oType">${OP_TYPES.map(([k, v]) => `<option value="${k}" ${k === o.type ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field">폭 (m)<input type="number" step="0.05" min="0.5" id="oW" value="${o.w}"></label></div>
      <div class="row" style="margin-top:10px"><span class="muted" style="margin:0;flex:1">끌어서 벽을 따라 옮길 수 있습니다</span><button class="btn sm" id="oDel">삭제</button></div>`;
    $('#oType').onchange = (e) => commit(() => { o.type = e.target.value; o.w = OP_WIDTH[o.type]; });
    $('#oW').onchange = (e) => { const v = parseFloat(e.target.value); if (v > 0.3) commit(() => (o.w = v)); };
    $('#oDel').onclick = delSel;
  } else body.innerHTML = '<p class="muted">방이나 문·창을 누르면 여기서 이름·종류·치수를 고칠 수 있습니다.</p>';

  const area = doc.rooms.reduce((a, r) => a + roomArea(r), 0);
  $('#sRooms').textContent = doc.rooms.length; $('#sArea').textContent = area.toFixed(1); $('#sPy').textContent = (area / 3.3058).toFixed(1);
  $('#roomList').innerHTML = doc.rooms.map((r, i) => `<button data-i="${i}" class="${sel?.room === r ? 'on' : ''}"><span>${esc(r.name)} <small>${TYPE_KO[r.type]}</small></span><small>${roomArea(r).toFixed(1)}㎡</small></button>`).join('')
    || '<p class="muted">아직 방이 없습니다. 왼쪽 <b>방</b> 도구로 드래그해 그려 보세요.</p>';
  $('#roomList').querySelectorAll('button').forEach((b) => (b.onclick = () => { sel = { room: doc.rooms.at(+b.dataset.i) }; setTool('select'); renderSide(); }));
  const ov = overlaps(doc.rooms), noDoor = doc.rooms.length && !doc.ops.some((o) => o.type === 'exit');
  $('#warn').innerHTML = (ov.length ? `<div class="warn">겹친 방: ${ov.map(([a, b]) => `${esc(a.name)}·${esc(b.name)}`).join(', ')} — 3D에서 바닥이 겹쳐 보입니다</div>` : '')
    + (noDoor ? '<div class="warn" style="background:#f6f1e7;color:#6b5a3f">현관문이 없습니다. 문·창 도구로 외벽을 누른 뒤 종류를 "현관문"으로 바꾸세요.</div>' : '');
  $('#planName').value = doc.name; $('#ceilH').value = doc.height; $('#kind').value = doc.kind || '시공'; $('#region').value = doc.region || '';
  $('#bgOp').value = doc.bg?.op ?? 0.6;
  renderPlans();
}
$('#planName').onchange = (e) => { doc.name = e.target.value.trim() || '새 평면'; changed(); };
$('#ceilH').onchange = (e) => { const v = parseFloat(e.target.value); if (v >= 2.2 && v <= 6) { doc.height = v; changed(); } };
$('#kind').onchange = (e) => { doc.kind = e.target.value; changed(); };
$('#region').onchange = (e) => { doc.region = e.target.value.trim(); changed(); };
$('#undoBtn').onclick = doUndo;
$('#fitBtn').onclick = fit;

// ── 도면 이미지 ──
function loadBg(src, then) { if (!src) { bgImg = null; then?.(); return; } const im = new Image(); im.onload = () => { bgImg = im; then?.(); }; im.src = src; }
$('#bgFile').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return; e.target.value = '';
  const im = new Image(); im.onload = () => {
    // 브라우저 저장 공간을 아끼려고 긴 변 2000px 로 줄인다
    const s = Math.min(1, 2000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const src = c.toDataURL('image/jpeg', 0.82);
    doc.bg = { src, x: 0, z: 0, ppm: c.width / 20, op: 0.6 }; // 처음엔 가로 20m 로 가정 → 축척 도구로 맞춘다
    loadBg(src, () => { changed(); fit(); setTool('scale'); toast('도면을 불러왔습니다. 길이를 아는 두 점을 찍어 축척을 맞추세요'); });
    URL.revokeObjectURL(im.src);
  };
  im.src = URL.createObjectURL(f);
};
$('#bgDel').onclick = () => { if (doc.bg && confirm('도면 이미지를 지울까요? (그린 방은 남습니다)')) { doc.bg = null; bgImg = null; setBgMove(false); changed(); } };
$('#bgOp').oninput = (e) => { if (doc.bg) { doc.bg.op = +e.target.value; draw(); } };
$('#bgOp').onchange = () => changed();

// ── 저장·불러오기 ──
function save(quiet) {
  if (!doc.rooms.length) { toast('방을 하나 이상 그려 주세요'); return false; }
  const plan = genPlan(doc), list = getPlans().filter((p) => p.plan.id !== doc.id);
  list.unshift({ plan, meta: { kind: doc.kind, region: doc.region || '직접 만든 평면', updated: new Date().toISOString() }, src: doc });
  if (!savePlans(list)) {
    // 저장 공간이 모자라면 도면 이미지를 빼고 다시 시도
    list[0].src = { ...doc, bg: null };
    if (!savePlans(list)) { toast('브라우저 저장 공간이 부족합니다. 다른 평면을 지워 주세요'); return false; }
    toast('저장 공간이 부족해 도면 이미지는 빼고 저장했습니다');
  } else if (!quiet) toast('저장했습니다');
  renderPlans(); return true;
}
$('#saveBtn').onclick = () => save();
$('#viewBtn').onclick = () => { if (save(true)) location.href = `./tour.html?h=${doc.id}`; };
function open(src) { doc = { ...blank(), ...JSON.parse(JSON.stringify(src)) }; undo.length = 0; sel = null; loadBg(doc.bg?.src, () => { changed(); fit(); }); changed(); }
function renderPlans() {
  const list = getPlans();
  $('#plans').innerHTML = list.map((p, i) => `<div class="it"><span>${p.plan.id === doc.id ? '<b>' : ''}${esc(p.plan.name)}${p.plan.id === doc.id ? '</b>' : ''} <small class="muted">${p.plan.rooms.length}개 방</small></span>
    <button class="btn sm" data-o="${i}">열기</button><a class="btn sm" href="./tour.html?h=${p.plan.id}">3D</a><button class="btn sm" data-d="${i}">삭제</button></div>`).join('') || '<p class="muted">저장한 평면이 없습니다.</p>';
  $('#plans').querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => { const p = list.at(+b.dataset.o); open(p.src || fromPlan(p.plan)); }));
  $('#plans').querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { const p = list.at(+b.dataset.d); if (!confirm(`'${p.plan.name}' 평면을 삭제할까요?`)) return; savePlans(list.filter((x) => x !== p)); renderPlans(); }));
}
// 편집 원본이 없는 평면(JSON 가져오기 등) → 방만 되살린다
const fromPlan = (plan) => ({ id: plan.id || newId(), name: plan.name, height: plan.height, rooms: plan.rooms.map((r) => ({ ...r })), ops: [], bg: null });
$('#newBtn').onclick = () => { if (doc.rooms.length && !confirm('지금 평면을 저장하지 않았다면 사라집니다. 새로 시작할까요?')) return; open(blank()); setTool('room'); };
$('#expBtn').onclick = () => {
  if (!doc.rooms.length) return toast('방을 하나 이상 그려 주세요');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ plan: genPlan(doc), src: { ...doc, bg: null } }, null, 2)], { type: 'application/json' }));
  a.download = `${doc.name}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#impFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return; e.target.value = '';
  try { const o = JSON.parse(await f.text()); open(o.src ? { ...o.src, id: newId() } : fromPlan({ ...(o.plan || o), id: newId() })); toast('불러왔습니다'); } catch { toast('평면 JSON 파일이 아닙니다'); }
};
// 예시: 방 2개 + 안방 스위트 단층 주택(약 154㎡)
$('#sampleBtn').onclick = () => {
  if (doc.rooms.length && !confirm('지금 평면 대신 예시를 불러올까요?')) return;
  const R = (name, type, x0, z0, x1, z1) => ({ id: 'r' + x0 + '_' + z0, name, type, x0, z0, x1, z1 });
  const O = (axis, c, s, w, type) => ({ axis, c, s, w, type });
  open({ ...blank(), name: '예시 단층 주택', region: '예시 · 단층 주택', rooms: [
    R('현관', 'foyer', 0, 0, 2.6, 2.6), R('욕실', 'bath', 0, 2.6, 2.6, 5.2), R('복도', 'hall', 2.6, 0, 4, 5.2),
    R('침실 2', 'bed', 4, 0, 7.6, 4), R('안방', 'master', 7.6, 0, 12, 4), R('드레스룸', 'dress', 12, 0, 14, 2), R('안방 욕실', 'bath', 12, 2, 14, 4),
    R('홀', 'hall', 4, 4, 14, 5.2), R('거실', 'living', 0, 5.2, 7.6, 11), R('주방·다이닝', 'kitchen', 7.6, 5.2, 14, 11),
  ], ops: [
    O('h', 0, 1.3, 1.2, 'exit'), O('v', 2.6, 1.3, 1.2, 'open'), O('v', 2.6, 3.9, 0.8, 'door'), O('v', 4, 4.6, 1, 'open'), O('h', 5.2, 3.3, 1.2, 'open'),
    O('h', 4, 5.8, 0.9, 'door'), O('h', 4, 8.5, 0.9, 'door'), O('v', 12, 1, 0.8, 'door'), O('v', 12, 3, 0.8, 'door'),
    O('h', 5.2, 5.8, 3, 'open'), O('h', 5.2, 10.5, 2.4, 'open'), O('v', 7.6, 8, 3, 'open'),
    O('h', 0, 5.8, 1.8, 'window'), O('h', 0, 9.8, 2.4, 'window'), O('h', 11, 3.8, 4.8, 'glass'), O('h', 11, 10.8, 3, 'window'),
    O('v', 0, 8, 2, 'window'), O('v', 14, 8, 2, 'window'), O('v', 14, 1, 1, 'window'),
  ] });
  setTool('select');
  toast('예시 평면을 불러왔습니다 · 3D로 걸어 보기를 눌러 보세요');
};

// ── 시작 ──
let fitted = false;
new ResizeObserver(() => { resize(); if (!fitted && W > 120) { fitted = true; fit(); } }).observe(stage);
{
  const pid = new URLSearchParams(location.search).get('p');
  const saved = pid && getPlans().find((p) => p.plan.id === pid);
  let draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT)); } catch {}
  if (saved) open(saved.src || fromPlan(saved.plan));
  else if (draft?.rooms) open(draft);
  else changed();
  setTool(doc.rooms.length ? 'select' : 'room');
  requestAnimationFrame(fit);
}
