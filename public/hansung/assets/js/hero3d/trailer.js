// 40ft 3축 알루미늄 평판 트레일러 — 부품 단위 절차적 3D 모델
// 단위 m. x: 후단 0 → 전단 L, y: 지면 0 ↑, z: 폭 방향 ±W/2
// 치수는 일반 사양(참고 모델)을 따른다. 한성모빌리티 실제 도면을 받으면 REF 값만 바꾸면 된다.
import * as THREE from './vendor/three.module.js';

export const REF = {
  L: 12.39, W: 2.5, H: 1.5,          // 전장·전폭·데크 높이
  kingpin: 11.49,                     // 후단에서 킹핀까지
  wb: 7.67, pitch: 1.31,              // 킹핀~1축, 축간거리
  tireR: 0.527, tireW: 0.28,          // 11R22.5
};
export const AXLES = [0, 1, 2].map((i) => +(REF.kingpin - REF.wb - i * REF.pitch).toFixed(3));

export const MAT = {
  alu: new THREE.MeshStandardMaterial({ color: 0xc9ced1, metalness: 0.85, roughness: 0.3 }),
  aluD: new THREE.MeshStandardMaterial({ color: 0x9aa1a6, metalness: 0.8, roughness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x30363a, metalness: 0.55, roughness: 0.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x17191b, metalness: 0, roughness: 0.82 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe8ebed, metalness: 1, roughness: 0.14 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc4161c, metalness: 0.2, roughness: 0.4, emissive: 0x3a0306 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f3f1, metalness: 0.1, roughness: 0.5 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xf28c1a, metalness: 0.1, roughness: 0.3, emissive: 0x5a2a00 }),
};
export const LINE_MAT = new THREE.LineBasicMaterial({ color: 0x5a636a, transparent: true, opacity: 0 });

// part: 분해될 때 움직이는 단위. explode = 완전 분해 시 이동량, order = 선 그리기 순서
function part(root, name, explode, order) {
  const g = new THREE.Group();
  g.name = name;
  g.userData = { explode: new THREE.Vector3(...explode), order, lines: [], base: new THREE.Vector3() };
  root.add(g);
  return g;
}

function add(g, geom, mat, pos = [0, 0, 0], rot = [0, 0, 0], { edges = true, threshold = 24 } = {}) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  g.add(m);
  if (edges) {
    const eg = new THREE.EdgesGeometry(geom, threshold);
    const ls = new THREE.LineSegments(eg, LINE_MAT);
    ls.position.copy(m.position);
    ls.rotation.copy(m.rotation);
    ls.userData.count = eg.attributes.position.count;
    eg.setDrawRange(0, 0);
    g.add(ls);
    g.userData.lines.push(ls);
  }
  return m;
}
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
// 두 점 사이 상자 (x-y 평면에서 기울어진 부재)
function beamBetween(g, a, b, h, d, mat, z) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  add(g, box(len, h, d), mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], [0, 0, Math.atan2(dy, dx)]);
}

// 타이어: 단면을 회전시킨 Lathe. 트레드 홈이 선 도면에서 동심원으로 보인다
function tireGeom(detail = true) {
  const R = REF.tireR, w = REF.tireW / 2, rIn = 0.29;
  const p = [[rIn, -w + 0.02], [rIn + 0.02, -w], [R - 0.05, -w], [R - 0.012, -w + 0.03]];
  const grooves = detail ? [-0.06, 0.06] : [];
  p.push([R, -w + 0.045]);
  grooves.forEach((y) => { p.push([R, y - 0.012], [R - 0.014, y - 0.008], [R - 0.014, y + 0.008], [R, y + 0.012]); });
  p.push([R, w - 0.045], [R - 0.012, w - 0.03], [R - 0.05, w], [rIn + 0.02, w], [rIn, w - 0.02]);
  return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 64);
}
function rimGeom(outer) {
  const s = outer ? 1 : -1;
  const p = [[0.29, -0.12], [0.285, -0.1], [0.2, -0.06 * s], [0.17, 0.02 * s], [0.12, 0.05 * s], [0.06, 0.06 * s], [0.0, 0.06 * s]];
  if (!outer) p.reverse();
  return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 48);
}

function wheel(g, x, z, outer, outward) {
  // outward: +1 오른쪽(z+), -1 왼쪽(z-). 바퀴 축은 z 방향
  const w = new THREE.Group();
  w.position.set(x, REF.tireR, z);
  w.userData.wheel = true;
  g.add(w);
  const rx = [Math.PI / 2 * outward, 0, 0];
  const sub = { userData: g.userData, add: (o) => w.add(o) };
  add(sub, tireGeom(outer), MAT.rubber, [0, 0, 0], rx, { threshold: 30, edges: outer });
  add(sub, rimGeom(true), MAT.chrome, [0, 0, 0.01 * outward], rx, { threshold: 30, edges: outer });
  if (outer) {
    add(sub, new THREE.CylinderGeometry(0.09, 0.1, 0.08, 24), MAT.chrome, [0, 0, 0.1 * outward], rx);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      add(sub, new THREE.CylinderGeometry(0.014, 0.014, 0.04, 8), MAT.chrome, [Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.08 * outward], rx, { edges: false });
    }
  }
  return w;
}

export function buildTrailer() {
  const root = new THREE.Group();
  const { L, W, H } = REF;
  const zb = 0.48;                 // 메인 빔 위치
  const deckB = H - 0.12;          // 데크 하면
  const neckX0 = 9.6, neckX1 = 10.3, beamLow = 0.82, beamHigh = 1.13;

  // 01 메인 프레임 (I빔 2개, 구스넥 단차)
  const chassis = part(root, 'chassis', [0, 0, 0], 0);
  [-zb, zb].forEach((z) => {
    const s = new THREE.Shape();
    s.moveTo(0.25, deckB); s.lineTo(12.2, deckB); s.lineTo(12.2, beamHigh); s.lineTo(neckX1, beamHigh);
    s.bezierCurveTo(neckX1 - 0.35, beamHigh, neckX0 + 0.3, beamLow, neckX0, beamLow);
    s.lineTo(0.25, beamLow); s.lineTo(0.25, deckB);
    const web = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: false, curveSegments: 16 });
    add(chassis, web, MAT.steel, [0, 0, z - 0.007]);
    add(chassis, box(11.95, 0.022, 0.15), MAT.steel, [6.225, deckB - 0.011, z]);
    add(chassis, box(neckX0 - 0.25, 0.022, 0.15), MAT.steel, [(neckX0 + 0.25) / 2, beamLow + 0.011, z]);
    beamBetween(chassis, [neckX0, beamLow + 0.011], [neckX1, beamHigh + 0.011], 0.022, 0.15, MAT.steel, z);
    add(chassis, box(12.2 - neckX1, 0.022, 0.15), MAT.steel, [(12.2 + neckX1) / 2, beamHigh + 0.011, z]);
  });

  // 02 크로스멤버
  const cross = part(root, 'cross', [0, 0.75, 0], 1);
  for (let x = 0.45; x < 12.2; x += 0.62) add(cross, box(0.07, 0.11, W - 0.16), MAT.steel, [x, deckB - 0.06, 0]);

  // 03 알루미늄 데크 (세로 판재)
  const deck = part(root, 'deck', [0, 1.7, 0], 2);
  const n = 10, pw = (W - 0.16) / n;
  for (let i = 0; i < n; i++) add(deck, box(L - 0.02, 0.05, pw - 0.012), MAT.alu, [L / 2, H - 0.025, -W / 2 + 0.08 + pw * (i + 0.5)]);

  // 04 사이드 레일 + 반사띠 (좌우 따로 분해)
  [-1, 1].forEach((side) => {
    const rail = part(root, side < 0 ? 'railL' : 'railR', [0, 0.7, 1.1 * side], 3);
    const z = side * (W / 2 - 0.035);
    add(rail, box(L, 0.32, 0.07), MAT.alu, [L / 2, H - 0.16, z]);
    add(rail, box(L - 0.1, 0.02, 0.075), MAT.aluD, [L / 2, H - 0.33, z]);
    for (let x = 0.6; x < L - 0.3; x += 1.2) add(rail, box(0.09, 0.08, 0.02), MAT.aluD, [x, H - 0.06, z + side * 0.045]);
    let k = 0;
    for (let x = 0.2; x < L - 0.25; x += 0.25, k++) add(rail, box(0.24, 0.04, 0.004), k % 2 ? MAT.white : MAT.red, [x + 0.12, H - 0.26, z + side * 0.037], [0, 0, 0], { edges: false });
    [2.2, 4.6, 6.4, 8.6, 10.2].forEach((x) => add(rail, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), MAT.amber, [x, H - 0.38, z + side * 0.03], [Math.PI / 2, 0, 0]));
    add(rail, box(0.03, 0.09, 0.2), MAT.red, [0.01, H - 0.2, side * 0.95]);
  });

  // 05 헤드보드
  const head = part(root, 'head', [1.6, 1.3, 0], 4);
  const hx = L - 0.08, hh = 1.3;
  add(head, box(0.05, hh, W - 0.1), MAT.alu, [hx, H + hh / 2, 0]);
  [-1, -0.5, 0, 0.5, 1].forEach((t) => add(head, box(0.09, hh, 0.06), MAT.aluD, [hx + 0.06, H + hh / 2, t * (W / 2 - 0.1)]));
  add(head, box(0.1, 0.08, W), MAT.aluD, [hx + 0.02, H + hh, 0]);
  [0.4, 0.8].forEach((y) => add(head, new THREE.CylinderGeometry(0.018, 0.018, W - 0.2, 12), MAT.chrome, [hx + 0.14, H + y, 0], [Math.PI / 2, 0, 0]));

  // 06 주행장치: 축마다 액슬·판스프링·바퀴 4개
  AXLES.forEach((ax, i) => {
    const axle = part(root, 'axle' + i, [-0.5 * (i - 1), -0.85, 0], 5 + i * 0.3);
    add(axle, new THREE.CylinderGeometry(0.065, 0.065, W - 0.3, 20), MAT.steel, [ax, REF.tireR, 0], [Math.PI / 2, 0, 0]);
    [-zb, zb].forEach((z) => {
      [1.0, 0.86, 0.72, 0.58].forEach((l, j) => add(axle, box(l, 0.022, 0.09), MAT.steel, [ax, REF.tireR + 0.11 + j * 0.024, z]));
      add(axle, box(0.08, 0.2, 0.1), MAT.steel, [ax - 0.62, beamLow - 0.1, z]);
      add(axle, box(0.08, 0.2, 0.1), MAT.steel, [ax + 0.62, beamLow - 0.1, z]);
    });
    [-1, 1].forEach((side) => {
      const wg = part(root, `wheel${i}${side < 0 ? 'L' : 'R'}`, [-0.5 * (i - 1), -0.55, 1.25 * side], 5.2 + i * 0.3);
      const zo = side * (W / 2 - REF.tireW / 2), zi = zo - side * (REF.tireW + 0.03);
      wheel(wg, ax, zo, true, side);
      wheel(wg, ax, zi, false, side);
    });
  });

  // 07 펜더
  const fender = part(root, 'fender', [0, -0.2, 0], 6);
  [-1, 1].forEach((side) => {
    const z = side * (W / 2 - 0.3);
    const x0 = AXLES[2] - 0.62, x1 = AXLES[0] + 0.62;
    add(fender, box(x1 - x0, 0.012, 0.62), MAT.aluD, [(x0 + x1) / 2, REF.tireR * 2 + 0.07, z]);
    add(fender, box(0.012, 0.42, 0.62), MAT.aluD, [x0, REF.tireR * 2 - 0.14, z]);
    add(fender, box(0.012, 0.42, 0.62), MAT.aluD, [x1, REF.tireR * 2 - 0.14, z]);
  });

  // 08 랜딩기어
  const leg = part(root, 'leg', [0, -1.1, 0], 7);
  const lx = 9.25;
  [-zb, zb].forEach((z) => {
    add(leg, box(0.13, 0.4, 0.13), MAT.steel, [lx, beamLow - 0.2, z]);
    add(leg, box(0.1, 0.4, 0.1), MAT.steel, [lx, beamLow - 0.6, z]);
    add(leg, box(0.26, 0.035, 0.26), MAT.steel, [lx, 0.0175, z]);
    beamBetween(leg, [lx, beamLow - 0.35], [lx + 0.55, beamLow], 0.05, 0.05, MAT.steel, z);
  });
  add(leg, new THREE.CylinderGeometry(0.025, 0.025, zb * 2, 12), MAT.steel, [lx, beamLow - 0.3, 0], [Math.PI / 2, 0, 0]);
  add(leg, box(0.16, 0.16, 0.12), MAT.steel, [lx, beamLow - 0.25, zb + 0.12]);
  add(leg, new THREE.CylinderGeometry(0.014, 0.014, 0.35, 8), MAT.chrome, [lx, beamLow - 0.25, zb + 0.35], [Math.PI / 2, 0, 0]);

  // 09 킹핀
  const king = part(root, 'king', [0, -0.9, 0], 8);
  add(king, box(1.3, 0.02, 1.3), MAT.steel, [REF.kingpin, beamHigh - 0.01, 0]);
  add(king, new THREE.CylinderGeometry(0.036, 0.036, 0.05, 20), MAT.chrome, [REF.kingpin, beamHigh - 0.045, 0]);
  add(king, new THREE.CylinderGeometry(0.025, 0.025, 0.06, 20), MAT.chrome, [REF.kingpin, beamHigh - 0.1, 0]);

  // 10 공구함·측면 보호대
  const tool = part(root, 'tool', [0, -0.3, 1.3], 9);
  add(tool, box(1.5, 0.5, 0.48), MAT.alu, [6.4, 0.78, 0.86]);
  add(tool, box(1.5, 0.02, 0.5), MAT.aluD, [6.4, 1.04, 0.86]);
  [-1, 1].forEach((side) => {
    const guard = part(root, side < 0 ? 'guardL' : 'guardR', [0, -0.2, 0.9 * side], 9.5);
    const z = side * (W / 2 - 0.05);
    [0.52, 0.76].forEach((y) => add(guard, box(4.2, 0.06, 0.04), MAT.alu, [6.85, y, z]));
    [4.8, 6.85, 8.9].forEach((x) => add(guard, box(0.05, 0.42, 0.04), MAT.aluD, [x, 0.66, z]));
  });

  // 11 후부 안전판
  const bump = part(root, 'bump', [-1.3, 0, 0], 10);
  add(bump, box(0.12, 0.14, W - 0.3), MAT.steel, [0.2, 0.52, 0]);
  [-zb, zb].forEach((z) => add(bump, box(0.08, 0.26, 0.08), MAT.steel, [0.25, 0.71, z]));

  root.traverse((o) => { if (o.userData && o.userData.explode) o.userData.base.copy(o.position); });
  return root;
}
