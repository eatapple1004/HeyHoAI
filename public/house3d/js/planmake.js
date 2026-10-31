// 평면 편집기의 그림(방 사각형 + 문·창 표시) → 체험 화면이 읽는 평면 데이터(homes.js 와 같은 형식).
// 벽은 방 테두리에서 자동으로 만든다: 양쪽에 방이 있으면 내벽, 한쪽만 있으면 외벽.
// 문·창은 벽 위의 한 점(그 벽선의 좌표 c, 벽을 따라간 위치 s)으로 저장해 두었다가, 만들어진 벽에 붙인다.
//   src = { id, name, height, rooms: [{ id, name, type, x0, z0, x1, z1 }], ops: [{ axis: 'h'|'v', c, s, w, type }] }
//   axis 'h' = 가로 벽선(z = c, s = x), 'v' = 세로 벽선(x = c, s = z)
//   type: door · open(뚫림) · window · glass(통창) · exit(현관문)
const EPS = 0.02, r2 = (v) => Math.round(v * 100) / 100;

export const ROOM_TYPES = [
  ['living', '거실'], ['kitchen', '주방'], ['dining', '다이닝'], ['master', '안방'], ['bed', '침실'], ['study', '서재'],
  ['foyer', '현관'], ['hall', '복도·홀'], ['bath', '욕실'], ['dress', '드레스룸'], ['utility', '다용도실'],
];
export const OP_TYPES = [['door', '문'], ['open', '뚫린 통로'], ['window', '창'], ['glass', '통창'], ['exit', '현관문(바깥)']];
export const OP_WIDTH = { door: 0.9, open: 1.6, window: 1.6, glass: 2.4, exit: 1.2 };

const DEFAULTS = {
  '*': { floor: 'oak-plank', wall: 'paint-warmwhite', ceiling: 'ceil-white' },
  '@living': { floor: 'marble-white', wall: 'paint-white' },
  '@kitchen': { floor: 'marble-white' }, '@dining': { floor: 'marble-white' },
  '@foyer': { floor: 'marble-nero' }, '@hall': { floor: 'marble-white' },
  '@master': { floor: 'chevron-oak', wall: 'linen-paper' },
  '@bath': { floor: 'stone-grey', wall: 'marble-slab' }, '@utility': { floor: 'stone-grey' },
  exterior: { wall: 'ext-stucco' },
};

// 벽선 하나(같은 축·같은 좌표)에 걸친 방 테두리를 잘게 나눠, 조각마다 양쪽 방을 본다
export function makeWalls(rooms) {
  const inside = (x, z) => rooms.find((r) => x > r.x0 + 1e-6 && x < r.x1 - 1e-6 && z > r.z0 + 1e-6 && z < r.z1 - 1e-6);
  const lines = new Map(); // 'h:3.5' → [[s0, s1], …]
  const add = (axis, c, s0, s1) => { const k = `${axis}:${r2(c)}`; (lines.get(k) || lines.set(k, []).get(k)).push([s0, s1]); };
  for (const r of rooms) { add('h', r.z0, r.x0, r.x1); add('h', r.z1, r.x0, r.x1); add('v', r.x0, r.z0, r.z1); add('v', r.x1, r.z0, r.z1); }
  const walls = [];
  for (const [k, spans] of lines) {
    const [axis, cs] = k.split(':'), c = +cs;
    const cuts = [...new Set(spans.flat().map(r2))].sort((a, b) => a - b);
    let cur = null;
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 1e-3) continue;
      const m = (a + b) / 2;
      if (!spans.some(([s0, s1]) => m > s0 && m < s1)) { cur = null; continue; } // 테두리가 없는 틈
      const A = axis === 'h' ? inside(m, c - 0.05) : inside(c - 0.05, m), B = axis === 'h' ? inside(m, c + 0.05) : inside(c + 0.05, m);
      if (!A && !B) { cur = null; continue; }
      if (A && B && A === B) { cur = null; continue; }
      const ext = !(A && B);
      if (cur && cur.ext === ext && Math.abs(cur.s1 - a) < 1e-3) cur.s1 = b;
      else { cur = { axis, c, s0: a, s1: b, ext }; walls.push(cur); }
    }
  }
  return walls;
}

export function genPlan(src) {
  const H = src.height || 2.7;
  const rooms = src.rooms.map((r) => ({ id: r.id, name: r.name, type: r.type, x0: r2(Math.min(r.x0, r.x1)), z0: r2(Math.min(r.z0, r.z1)), x1: r2(Math.max(r.x0, r.x1)), z1: r2(Math.max(r.z0, r.z1)), ...(r.type === 'bath' ? { wet: true } : {}) }));
  // 원점 맞추기: 가장 왼쪽 위 방 모서리를 (0, 0) 으로
  const ox = Math.min(...rooms.map((r) => r.x0)), oz = Math.min(...rooms.map((r) => r.z0));
  for (const r of rooms) { r.x0 = r2(r.x0 - ox); r.x1 = r2(r.x1 - ox); r.z0 = r2(r.z0 - oz); r.z1 = r2(r.z1 - oz); }
  const ops = (src.ops || []).map((o) => ({ ...o, c: r2(o.c - (o.axis === 'h' ? oz : ox)), s: o.s - (o.axis === 'h' ? ox : oz) }));

  const walls = makeWalls(rooms).map((w, i) => {
    const wall = { id: `w${i}`, a: w.axis === 'h' ? [w.s0, w.c] : [w.c, w.s0], b: w.axis === 'h' ? [w.s1, w.c] : [w.c, w.s1], ...(w.ext ? { ext: true } : {}) };
    const len = w.s1 - w.s0, openings = [];
    for (const o of ops) {
      if (o.axis !== w.axis || Math.abs(o.c - w.c) > EPS || o.s <= w.s0 || o.s >= w.s1) continue;
      const wd = Math.min(o.w, len - 0.2), at = Math.max(0.1, Math.min(len - wd - 0.1, o.s - wd / 2 - w.s0));
      const t = o.type;
      openings.push(t === 'door' ? { at, w: wd, type: 'door', head: Math.min(2.4, H - 0.2) }
        : t === 'exit' ? { at, w: wd, type: 'door', head: Math.min(2.6, H - 0.15), exterior: true }
        : t === 'open' ? { at, w: wd, type: 'open', head: H - 0.25 }
        : t === 'window' ? { at, w: wd, type: 'window', sill: 0.9, head: Math.min(2.3, H - 0.25) }
        : { at, w: wd, type: 'glass', sill: 0, head: H - 0.2 });
    }
    openings.sort((a, b) => a.at - b.at);
    // 겹치는 개구부는 뒤의 것을 버린다
    const ok = openings.filter((o, i, l) => i === 0 || o.at >= l[i - 1].at + l[i - 1].w + 0.05);
    if (ok.length) wall.openings = ok;
    return wall;
  });

  const startRoom = rooms.find((r) => r.type === 'foyer') || rooms.find((r) => r.type === 'living') || rooms[0];
  return {
    id: src.id, name: src.name || '새 평면', height: H, extT: 0.25, intT: 0.15, rooms, walls, furniture: [],
    defaults: DEFAULTS, features: {}, accents: {}, site: { kind: 'garden' },
    start: (() => { // 시작 방 가운데에서 집 가운데를 바라보게
      const x = (startRoom.x0 + startRoom.x1) / 2, z = (startRoom.z0 + startRoom.z1) / 2;
      const cx = (Math.min(...rooms.map((r) => r.x0)) + Math.max(...rooms.map((r) => r.x1))) / 2, cz = (Math.min(...rooms.map((r) => r.z0)) + Math.max(...rooms.map((r) => r.z1))) / 2;
      return { x, z, yaw: Math.hypot(cx - x, cz - z) > 0.5 ? Math.atan2(cx - x, cz - z) : 0 };
    })(),
  };
}

// 방이 겹치는지 — 편집기 경고용
export function overlaps(rooms) {
  const out = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    const a = rooms[i], b = rooms[j];
    if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > EPS && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > EPS) out.push([a, b]);
  }
  return out;
}
