// 평면 데이터 → 3D 집. 벽은 실제 두께를 가진 상자로 만들고, 각 벽 면이 어느 방을 보는지 자동으로 판별한다.
// 마감을 바꿀 수 있는 면(surface)은 '벽id:방id' · 'floor:방id' · 'ceil:방id' 단위로 묶는다.
import * as THREE from 'three';
import { getMaterial } from './materials.js';

class Acc { // 면을 모았다가 BufferGeometry 하나로
  constructor() { this.p = []; this.n = []; this.uv = []; this.i = []; }
  quad(c, nrm, uvf) {
    const [a, b, , d] = c;
    const cr = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
    if (cr.dot(nrm) < 0) c = [c[0], c[3], c[2], c[1]];
    const base = this.p.length / 3;
    for (const v of c) { this.p.push(v.x, v.y, v.z); this.n.push(nrm.x, nrm.y, nrm.z); const [u, w] = uvf(v); this.uv.push(u, w); }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  area() { // 실제 면적(m²)
    let a = 0; const P = this.p, v = (k) => new THREE.Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]);
    for (let i = 0; i < this.i.length; i += 3) { const A = v(this.i[i]); a += v(this.i[i + 1]).sub(A).cross(v(this.i[i + 2]).sub(A)).length() / 2; }
    return a;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i); g.computeBoundingSphere();
    return g;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildHouse(plan) {
  const H = plan.height;
  const group = new THREE.Group();
  const roomAt = (x, z) => plan.rooms.find((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  const surfaceAcc = new Map();   // id → { acc, meta }
  const trim = new Acc(), poche = new Acc(), frames = [];
  const colliders = [];           // 평면 사각형 [x0,z0,x1,z1]
  const glassGeo = [];

  const surf = (id, meta) => { if (!surfaceAcc.has(id)) surfaceAcc.set(id, { acc: new Acc(), meta: { id, ...meta } }); return surfaceAcc.get(id).acc; };

  for (const w of plan.walls) {
    const horiz = w.a[1] === w.b[1];
    const t = w.ext ? plan.extT : plan.intT, ht = t / 2;
    const s0 = horiz ? w.a[0] : w.a[1], s1 = horiz ? w.b[0] : w.b[1], c = horiz ? w.a[1] : w.a[0];
    const ex = ht - 0.002; // 모서리를 메우되, 맞닿는 벽 바깥면과 겹치지 않을 만큼
    // (s, y, k): s = 벽 방향, k = 두께 방향(-ht..ht)
    const P = (s, y, k) => (horiz ? V(s, y, c + k) : V(c + k, y, s));
    const nB = horiz ? V(0, 0, 1) : V(1, 0, 0), nA = nB.clone().negate();
    const dS = horiz ? V(1, 0, 0) : V(0, 0, 1);
    const ops = (w.openings || []).map((o) => ({ ...o, s0: s0 + o.at, s1: s0 + o.at + o.w }));

    const cuts = new Set([s0 - ex, s1 + ex, s0, s1]);
    ops.forEach((o) => { cuts.add(o.s0); cuts.add(o.s1); });
    plan.rooms.forEach((r) => [horiz ? r.x0 : r.z0, horiz ? r.x1 : r.z1].forEach((v) => { if (v > s0 && v < s1) cuts.add(v); }));
    const xs = [...cuts].sort((a, b) => a - b);

    for (let i = 0; i < xs.length - 1; i++) {
      const p = xs[i], q = xs[i + 1]; if (q - p < 1e-4) continue;
      const m = (p + q) / 2, op = ops.find((o) => m > o.s0 && m < o.s1);
      const side = (k) => { const v = P(m, 0, k); return roomAt(v.x, v.z)?.id || 'exterior'; };
      const rA = side(-ht - 0.05), rB = side(ht + 0.05);
      const accA = surf(`${w.id}:${rA}`, { kind: 'wall', room: rA, wall: w.id });
      const accB = surf(`${w.id}:${rB}`, { kind: 'wall', room: rB, wall: w.id });
      const spans = op ? [[0, op.sill || 0], [op.head, H]].filter(([a, b]) => b - a > 1e-3) : [[0, H]];
      for (const [y0, y1] of spans) {
        const uvS = (v) => [horiz ? v.x : v.z, v.y];
        accA.quad([P(p, y0, -ht), P(q, y0, -ht), P(q, y1, -ht), P(p, y1, -ht)], nA, uvS);
        accB.quad([P(p, y0, ht), P(q, y0, ht), P(q, y1, ht), P(p, y1, ht)], nB, uvS);
        const top = y1 >= H - 1e-3 ? poche : trim;
        top.quad([P(p, y1, -ht), P(q, y1, -ht), P(q, y1, ht), P(p, y1, ht)], V(0, 1, 0), (v) => [horiz ? v.x : v.z, horiz ? v.z : v.x]);
        if (y0 > 0) trim.quad([P(p, y0, -ht), P(q, y0, -ht), P(q, y0, ht), P(p, y0, ht)], V(0, -1, 0), (v) => [horiz ? v.x : v.z, horiz ? v.z : v.x]);
        const uvC = (v) => [horiz ? v.z : v.x, v.y];
        trim.quad([P(p, y0, -ht), P(p, y0, ht), P(p, y1, ht), P(p, y1, -ht)], dS.clone().negate(), uvC);
        trim.quad([P(q, y0, -ht), P(q, y0, ht), P(q, y1, ht), P(q, y1, -ht)], dS, uvC);
      }
      // 통행 판정: 문·뚫린 곳만 지나갈 수 있다
      if (!op || op.type === 'window' || op.type === 'glass') {
        const a = P(p, 0, -ht), b = P(q, 0, ht);
        colliders.push([Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)]);
      }
    }

    // 유리와 창틀
    for (const o of ops) {
      if (o.type !== 'window' && o.type !== 'glass') continue;
      const y0 = o.sill || 0, y1 = o.head, len = o.s1 - o.s0, mid = (o.s0 + o.s1) / 2;
      const center = P(mid, (y0 + y1) / 2, 0);
      const g = new THREE.PlaneGeometry(len, y1 - y0);
      glassGeo.push({ g, center, horiz });
      const fw = 0.05, fd = 0.08;
      const bars = [[len, fw, mid, y0 + fw / 2], [len, fw, mid, y1 - fw / 2], [fw, y1 - y0, o.s0 + fw / 2, (y0 + y1) / 2], [fw, y1 - y0, o.s1 - fw / 2, (y0 + y1) / 2]];
      const mull = Math.max(0, Math.round(len / 1.6) - 1);  // 중간 문설주
      for (let k = 1; k <= mull; k++) bars.push([fw * 0.8, y1 - y0, o.s0 + len * k / (mull + 1), (y0 + y1) / 2]);
      for (const [bl, bh, bs, by] of bars) frames.push({ size: horiz ? [bl, bh, fd] : [fd, bh, bl], pos: P(bs, by, 0) });
    }
  }

  // 바닥·천장 (방 사각형, 벽 중심선까지)
  for (const r of plan.rooms) {
    const f = surf(`floor:${r.id}`, { kind: 'floor', room: r.id });
    f.quad([V(r.x0, 0, r.z0), V(r.x1, 0, r.z0), V(r.x1, 0, r.z1), V(r.x0, 0, r.z1)], V(0, 1, 0), (v) => [v.x, v.z]);
    const cl = surf(`ceil:${r.id}`, { kind: 'ceiling', room: r.id });
    cl.quad([V(r.x0, H, r.z0), V(r.x1, H, r.z0), V(r.x1, H, r.z1), V(r.x0, H, r.z1)], V(0, -1, 0), (v) => [v.x, v.z]);
  }

  // 메시 만들기
  const surfaces = [];
  for (const { acc, meta } of surfaceAcc.values()) {
    const mesh = new THREE.Mesh(acc.geometry(), getMaterial('paint-white'));
    mesh.receiveShadow = true; mesh.castShadow = meta.kind === 'wall';
    mesh.userData.surface = meta;
    meta.mesh = mesh; meta.area = acc.area();
    const r = plan.rooms.find((x) => x.id === meta.room);
    meta.roomName = r ? r.name : '외관';
    surfaces.push(meta); group.add(mesh);
  }
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.6 });
  const trimMesh = new THREE.Mesh(trim.geometry(), trimMat); trimMesh.castShadow = trimMesh.receiveShadow = true;
  const pocheMesh = new THREE.Mesh(poche.geometry(), new THREE.MeshStandardMaterial({ color: 0x2e2f33, roughness: 0.9 }));
  pocheMesh.castShadow = true;
  group.add(trimMesh, pocheMesh);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b2c2f, roughness: 0.45, metalness: 0.4 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const frameMesh = new THREE.InstancedMesh(box, frameMat, frames.length);
  const mtx = new THREE.Matrix4();
  frames.forEach((f, i) => frameMesh.setMatrixAt(i, mtx.compose(f.pos, new THREE.Quaternion(), V(...f.size))));
  frameMesh.castShadow = true; frameMesh.userData.noPick = true;
  group.add(frameMesh);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5 });
  for (const { g, center, horiz } of glassGeo) {
    const m = new THREE.Mesh(g, glassMat); m.position.copy(center); if (!horiz) m.rotation.y = Math.PI / 2;
    m.userData.noPick = true; m.renderOrder = 2; group.add(m);
  }

  // 지붕 슬래브 (걷기 모드에서만 보임) — 방마다 한 장. 바깥에 면한 변만 처마를 낸다(중정은 뚫린 채로)
  const xs = plan.rooms.flatMap((r) => [r.x0, r.x1]), zs = plan.rooms.flatMap((r) => [r.z0, r.z1]);
  const bounds = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const roof = new THREE.Group(), roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.85 });
  const ov = plan.roofOverhang ?? 0.9, outside = (x, z) => !roomAt(x, z);
  for (const r of plan.rooms) {
    const mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
    const e = { x0: outside(r.x0 - 0.3, mz) ? ov : 0, x1: outside(r.x1 + 0.3, mz) ? ov : 0, z0: outside(mx, r.z0 - 0.3) ? ov : 0, z1: outside(mx, r.z1 + 0.3) ? ov : 0 };
    const x0 = r.x0 - e.x0, x1 = r.x1 + e.x1, z0 = r.z0 - e.z0, z1 = r.z1 + e.z1;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.32, z1 - z0), roofMat);
    m.position.set((x0 + x1) / 2, H + 0.19, (z0 + z1) / 2); // 천장면과 겹치지 않게 살짝 띄움
    m.castShadow = true; m.userData.noPick = true; roof.add(m);
  }
  group.add(roof);

  return { group, surfaces, colliders, roof, bounds, roomAt,
    ceilings: surfaces.filter((s) => s.kind === 'ceiling').map((s) => s.mesh) };
}

// 사각형 a 에서 b 를 뺀 나머지(최대 4조각)
function subtract(a, b) {
  const [x0, z0, x1, z1] = a, [p0, q0, p1, q1] = b;
  if (p0 >= x1 || p1 <= x0 || q0 >= z1 || q1 <= z0) return [a];
  const out = [], cz0 = Math.max(z0, q0), cz1 = Math.min(z1, q1);
  if (q0 > z0) out.push([x0, z0, x1, q0]);
  if (q1 < z1) out.push([x0, q1, x1, z1]);
  if (p0 > x0) out.push([x0, cz0, p0, cz1]);
  if (p1 < x1) out.push([p1, cz0, x1, cz1]);
  return out;
}
const rnd = (seed) => { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// 바깥 환경. site.kind = 'garden'(지면 위 주택) | 'tower'(초고층 세대 — 테라스 아래로 도시·바다가 내려다보임)
export function buildSite(bounds, site = {}, roomAt = () => null) {
  const g = new THREE.Group(), colliders = [];
  const add = (m, shadow = true) => { m.receiveShadow = shadow; m.userData.noPick = true; g.add(m); return m; };
  const cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
  const plane = (w, d, material, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return add(m); };
  const boxM = (x0, z0, x1, z1, y0, y1, material, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = cast; return add(m);
  };
  const deck = getMaterial('stone-travertine').clone();
  const slab = ([x0, z0, x1, z1], y = -0.006) => {
    const m = plane(x1 - x0, z1 - z0, deck, (x0 + x1) / 2, y, (z0 + z1) / 2);
    // 월드 좌표에 맞춰 줄눈이 이어지도록 UV를 m 단위로
    const uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, x0 + uv.getX(i) * (x1 - x0), z0 + (1 - uv.getY(i)) * (z1 - z0));
  };
  const water = new THREE.MeshStandardMaterial({ color: 0x2a7fa3, roughness: 0.18, envMapIntensity: 0.35 });
  const sea = new THREE.MeshStandardMaterial({ color: 0x2f6c8f, roughness: 0.25, envMapIntensity: 0.5 });
  const R = rnd(7);

  // 테라스·진입로 (수영장 자리는 비운다)
  for (const t of [...(site.terrace || []), ...(site.path || [])]) (site.pool ? subtract(t, site.pool) : [t]).forEach((p) => slab(p));

  if (site.pool) {
    const [x0, z0, x1, z1] = site.pool, pw = x1 - x0, pd = z1 - z0;
    plane(pw, pd, water, x0 + pw / 2, -0.015, z0 + pd / 2);
    const coping = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.7 });
    for (const [a, b, c, d] of [[x0 - 0.25, z0 - 0.25, x1 + 0.25, z0], [x0 - 0.25, z1, x1 + 0.25, z1 + 0.25], [x0 - 0.25, z0, x0, z1], [x1, z0, x1 + 0.25, z1]]) boxM(a, b, c, d, -0.02, 0.02, coping, false);
    colliders.push([x0, z0, x1, z1]);
  }

  if (site.kind === 'tower') {
    // 세대 아래 건물 몸체와 테라스 유리 난간
    const ext = (site.terrace || []).reduce((b, [x0, z0, x1, z1]) => ({ x0: Math.min(b.x0, x0), z0: Math.min(b.z0, z0), x1: Math.max(b.x1, x1), z1: Math.max(b.z1, z1) }), { ...bounds });
    const body = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.6, metalness: 0.2 });
    boxM(ext.x0, ext.z0, ext.x1, ext.z1, -160, -0.02, body, false);
    const railGlass = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const cap = new THREE.MeshStandardMaterial({ color: 0x2b2c2f, roughness: 0.45, metalness: 0.4 });
    // 테라스 바깥 변을 0.25m 단위로 훑어, 집과 맞닿지 않은 구간에만 난간을 세운다
    const rail = (x0, z0, x1, z1) => {
      const t = 0.03, gl = boxM(x0 - t, z0 - t, x1 + t, z1 + t, 0, 1.1, railGlass, false); gl.renderOrder = 2;
      boxM(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, 1.1, 1.15, cap);
      colliders.push([x0 - 0.08, z0 - 0.08, x1 + 0.08, z1 + 0.08]);
    };
    const inTerrace = (x, z) => (site.terrace || []).some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
    const solid = (x, z) => roomAt(x, z) || inTerrace(x, z);
    for (const [x0, z0, x1, z1] of site.terrace || []) {
      for (const [horiz, c, s0, s1, out] of [[true, z0, x0, x1, -1], [true, z1, x0, x1, 1], [false, x0, z0, z1, -1], [false, x1, z0, z1, 1]]) {
        const step = 0.25, n = Math.max(1, Math.round((s1 - s0) / step)); let run = null;
        for (let i = 0; i <= n; i++) {
          const s = s0 + ((s1 - s0) * (i + 0.5)) / n, open = i < n && !(horiz ? solid(s, c + out * 0.3) : solid(c + out * 0.3, s));
          if (open && run === null) run = s0 + ((s1 - s0) * i) / n;
          if (!open && run !== null) { const e = s0 + ((s1 - s0) * i) / n; horiz ? rail(run, c, e, c) : rail(c, run, c, e); run = null; }
        }
      }
    }
    // 테라스가 없는 쪽 외벽 밖으로는 나갈 수 없게
    const pad = 0.4;
    for (const [a, b, c, d] of [[bounds.x0 - 3, bounds.z0 - 3, bounds.x1 + 3, bounds.z0 - pad], [bounds.x0 - 3, bounds.z1 + pad, bounds.x1 + 3, bounds.z1 + 3],
      [bounds.x0 - 3, bounds.z0 - 3, bounds.x0 - pad, bounds.z1 + 3], [bounds.x1 + pad, bounds.z0 - 3, bounds.x1 + 3, bounds.z1 + 3]]) {
      for (const p of (site.terrace || []).reduce((acc, t) => acc.flatMap((r) => subtract(r, t)), [[a, b, c, d]])) colliders.push(p);
    }
    // 아래로 보이는 풍경
    const Y = -150, ground = new THREE.MeshStandardMaterial({ color: 0x7c8466, roughness: 1 });
    plane(4000, 4000, ground, cx, Y, cz).receiveShadow = false;
    const city = new THREE.MeshStandardMaterial({ color: 0xb9bdc2, roughness: 0.8 }), cityDark = new THREE.MeshStandardMaterial({ color: 0x7d838b, roughness: 0.7, metalness: 0.2 });
    const geo = new THREE.BoxGeometry(1, 1, 1), N = 900, inst = [new THREE.InstancedMesh(geo, city, N), new THREE.InstancedMesh(geo, cityDark, N)];
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), counts = [0, 0];
    const isWater = site.view === 'ocean' ? (x, z) => z > cz + 60 : (x, z) => z > cz + 120 && z < cz + 330;
    for (let i = 0; i < N * 2; i++) {
      const a = R() * Math.PI * 2, d = 90 + Math.pow(R(), 0.7) * 1100, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (isWater(x, z)) continue;
      const w = 18 + R() * 30, h = 15 + R() * (d < 300 ? 120 : 70), k = R() > 0.6 ? 1 : 0;
      if (counts[k] >= N) continue;
      inst[k].setMatrixAt(counts[k]++, mtx.compose(new THREE.Vector3(x, Y + h / 2, z), q, new THREE.Vector3(w, h, w * (0.6 + R() * 0.8))));
    }
    inst.forEach((m, k) => { m.count = counts[k]; m.userData.noPick = true; g.add(m); });
    if (site.view === 'ocean') {
      plane(6000, 3000, sea, cx, Y + 0.5, cz + 60 + 1500).receiveShadow = false;
      plane(4000, 30, new THREE.MeshStandardMaterial({ color: 0xd8c9a6, roughness: 1 }), cx, Y + 0.3, cz + 50);
    } else {
      plane(6000, 210, sea, cx, Y + 0.5, cz + 225).receiveShadow = false; // 강
    }
    return { group: g, colliders, far: 2600, fog: [300, 2400] };
  }

  // ── 지면 위 주택 ──
  const grassC = document.createElement('canvas'); grassC.width = grassC.height = 256;
  const gg = grassC.getContext('2d'); gg.fillStyle = '#6f8a52'; gg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { gg.fillStyle = R() > 0.5 ? '#5d7a43' : '#83a062'; gg.globalAlpha = 0.5; gg.fillRect(R() * 256, R() * 256, 1.5, 3); }
  const grassT = new THREE.CanvasTexture(grassC); grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.colorSpace = THREE.SRGBColorSpace;
  const G = site.view === 'ocean' ? 120 : 220; grassT.repeat.set(G / 2.6, G / 2.6);
  const ground = plane(G, G, new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }), cx, -0.03, site.view === 'ocean' ? cz - 25 : cz);

  // 경계: 생울타리 또는 현무암 돌담 (진입로 자리는 열어 둔다)
  if (site.hedge) {
    const [x0, z0, x1, z1] = site.hedge, t = 0.6;
    const m = site.wallStone ? getMaterial('ext-basalt').clone() : new THREE.MeshStandardMaterial({ color: 0x4d6b3c, roughness: 1 });
    const h = site.wallStone ? 1.1 : 1.7;
    const gaps = (site.path || []).map(([a, , c]) => [a - 0.2, c + 0.2]);
    const runs = (a, b) => { let s = a; const out = []; for (const [g0, g1] of gaps.sort((p, q) => p[0] - q[0])) if (g0 < b && g1 > s) { out.push([s, g0]); s = g1; } out.push([s, b]); return out.filter(([p, q]) => q - p > 0.1); };
    const sides = [[x0, z0 - t, x1, z0, 'n'], [x0, z1, x1, z1 + t, 's'], [x0 - t, z0 - t, x0, z1 + t], [x1, z0 - t, x1 + t, z1 + t]];
    for (const [a, b, c, d, side] of sides) {
      const parts = side === 'n' ? runs(a, c).map(([p, q]) => [p, b, q, d]) : [[a, b, c, d]];
      // 바다 쪽 경계는 시야를 가리지 않게 보이지 않는 벽으로만 둔다
      for (const p of parts) { if (!(side === 's' && site.view === 'ocean')) boxM(...p, 0, h, m); colliders.push(p); }
    }
    // 바깥 나무
    const trunk = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x47613a, roughness: 1 });
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2, d = 6 + R() * 22;
      let x = Math.cos(a), z = Math.sin(a);
      x = x > 0 ? x1 + t + d * x : x0 - t + d * x; z = z > 0 ? z1 + t + d * z : z0 - t + d * z;
      if (site.view === 'ocean' && z > z1) continue;
      const hh = 3 + R() * 5;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, hh * 0.5, 8), trunk); tr.position.set(x, hh * 0.25, z); tr.castShadow = true; add(tr);
      const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), leaf); cr.position.set(x, hh * 0.65, z); cr.scale.set(hh * 0.28, hh * 0.38, hh * 0.28); cr.castShadow = true; add(cr);
    }
  }
  if (site.view === 'hills' || site.view === 'trees') {
    const hill = new THREE.MeshStandardMaterial({ color: 0x5f7350, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 0.8, d = 130 + R() * 40, r = 40 + R() * 40;
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hill);
      m.scale.y = 0.35 + R() * 0.35; m.position.set(cx + Math.cos(a) * d, -0.5, cz + Math.sin(a) * d); add(m, false);
    }
  }
  if (site.view === 'ocean') {
    // 잔디가 끝나는 곳부터 바다 — 땅을 낮춰 수평선이 보이게
    plane(3000, 1500, sea, cx, -2.5, cz + 35 + 750).receiveShadow = false;
    boxM(cx - 60, cz + 33, cx + 60, cz + 36, -2.6, -0.03, getMaterial('ext-basalt').clone(), false);
  }
  return { group: g, colliders, far: 1600, fog: site.view === 'ocean' ? [150, 1500] : [60, 600] };
}
