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

  // 지붕 슬래브 (걷기 모드에서만 보임)
  const xs = plan.rooms.flatMap((r) => [r.x0, r.x1]), zs = plan.rooms.flatMap((r) => [r.z0, r.z1]);
  const bounds = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const ov = 0.9;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(bounds.x1 - bounds.x0 + ov * 2, 0.32, bounds.z1 - bounds.z0 + ov * 2),
    new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.85 }));
  roof.position.set((bounds.x0 + bounds.x1) / 2, H + 0.19, (bounds.z0 + bounds.z1) / 2); // 천장면과 겹치지 않게 살짝 띄움
  roof.castShadow = true; roof.userData.noPick = true;
  group.add(roof);

  return { group, surfaces, colliders, roof, bounds, roomAt,
    ceilings: surfaces.filter((s) => s.kind === 'ceiling').map((s) => s.mesh) };
}

// 바깥 환경: 잔디, 테라스, 수영장, 현관 진입로
export function buildSite(bounds) {
  const g = new THREE.Group(), colliders = [];
  const grassC = document.createElement('canvas'); grassC.width = grassC.height = 256;
  const gg = grassC.getContext('2d'); gg.fillStyle = '#6f8a52'; gg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { gg.fillStyle = Math.random() > 0.5 ? '#5d7a43' : '#83a062'; gg.globalAlpha = 0.5; gg.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 3); }
  const grassT = new THREE.CanvasTexture(grassC); grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(60, 60); grassT.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(11, -0.03, 7); ground.receiveShadow = true; ground.userData.noPick = true; g.add(ground);

  const deck = getMaterial('stone-travertine').clone();
  const slab = (x0, z0, x1, z1, y = -0.006) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), deck);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; m.userData.noPick = true;
    // 월드 좌표에 맞춰 줄눈이 이어지도록 UV를 m 단위로
    const uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, x0 + uv.getX(i) * (x1 - x0), z0 + (1 - uv.getY(i)) * (z1 - z0));
    g.add(m);
  };
  // 남쪽 테라스 (수영장 자리는 비움)
  const P = { x0: 9.5, z0: 16, x1: 18, z1: 19.6 };
  const T = { x0: bounds.x0 - 1, z0: bounds.z1 - 0.1, x1: bounds.x1 - 3, z1: 21 };
  slab(T.x0, T.z0, T.x1, P.z0); slab(T.x0, P.z1, T.x1, T.z1); slab(T.x0, P.z0, P.x0, P.z1); slab(P.x1, P.z0, T.x1, P.z1);
  slab(9.6, -3, 12.4, bounds.z0 + 0.1); // 현관 진입로

  // 수영장 (수면만 — 잔디보다 위, 데크보다 아래)
  const pw = P.x1 - P.x0, pd = P.z1 - P.z0;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshStandardMaterial({ color: 0x2a7fa3, roughness: 0.18, envMapIntensity: 0.35 }));
  water.rotation.x = -Math.PI / 2; water.position.set(P.x0 + pw / 2, -0.015, P.z0 + pd / 2); water.receiveShadow = true; water.userData.noPick = true; g.add(water);
  const coping = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.7 });
  for (const [w, d, x, z] of [[pw + 0.5, 0.25, P.x0 + pw / 2, P.z0], [pw + 0.5, 0.25, P.x0 + pw / 2, P.z1], [0.25, pd, P.x0, P.z0 + pd / 2], [0.25, pd, P.x1, P.z0 + pd / 2]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), coping); c.position.set(x, 0.0, z); c.receiveShadow = true; c.userData.noPick = true; g.add(c);
  }
  colliders.push([P.x0, P.z0, P.x1, P.z1]);
  return { group: g, colliders };
}
