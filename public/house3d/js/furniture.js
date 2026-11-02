// 가구 — 코드로 만드는 실물형 가구(모서리 굴림·쿠션 나눔·다리·문짝 틈·손잡이, 패브릭 결·도기 광택·금속).
//   평면 데이터의 크기에 맞춰 늘고 줄어야 해서 완성 모델(GLB) 대신 부품을 조립한다. 실제 제품 모델이 생기면 종류별 함수만 바꾼다.
// 각 가구는 자기 좌표계에서 만든다: 원점 = 바닥 중심, 앞면이 +z, 등은 -z.
// 평면 데이터의 [종류, x, z, 방향(도), 옵션] 대로 돌려서 놓고, 충돌 영역을 함께 만든다.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/addons/geometries/RoundedBoxGeometry.js';

// ── 결 지도(그려서 만든다) ──
function canvas(n, fn) { const c = document.createElement('canvas'); c.width = c.height = n; fn(c.getContext('2d'), n); return c; }
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const texOf = (c, rep = 1, srgb = true) => {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
};
// 나뭇결: 바탕색 위에 길게 흐르는 결 줄
function grain(base, dark, seed) {
  const r = rnd(seed);
  return texOf(canvas(512, (g, n) => {
    g.fillStyle = base; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 160; i++) {
      const y0 = r() * n, a = 0.04 + r() * 0.12, amp = 2 + r() * 8, f = 0.004 + r() * 0.01;
      g.strokeStyle = dark; g.globalAlpha = a; g.lineWidth = 0.6 + r() * 2.2; g.beginPath();
      for (let x = 0; x <= n; x += 8) { const y = y0 + Math.sin(x * f + i) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }));
}
// 천·가죽 요철: 잔 무늬 노이즈(법선 대신 bump 로 쓴다)
function weave(seed, cell = 4) {
  const r = rnd(seed);
  return texOf(canvas(256, (g, n) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += cell) for (let x = 0; x < n; x += cell) {
      const v = 110 + ((x / cell + y / cell) % 2) * 30 + r() * 30; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, cell, cell);
    }
  }), 6, false);
}
function pebble(seed) {
  const r = rnd(seed);
  return texOf(canvas(256, (g, n) => {
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const v = 90 + r() * 90; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * n, r() * n, 1 + r() * 2.5, 0, 7); g.fill(); }
  }), 4, false);
}
// 러그: 테두리 두 줄 + 잔 무늬 바탕
function rugTex() {
  const r = rnd(7);
  return texOf(canvas(512, (g, n) => {
    g.fillStyle = '#b9ac97'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(90,75,60,0.08)' : 'rgba(255,250,240,0.10)'; g.fillRect(r() * n, r() * n, 2, 2); }
    g.strokeStyle = 'rgba(70,58,46,0.55)'; g.lineWidth = 10; g.strokeRect(26, 26, n - 52, n - 52);
    g.strokeStyle = 'rgba(70,58,46,0.3)'; g.lineWidth = 3; g.strokeRect(50, 50, n - 100, n - 100);
  }), 1);
}
const leafGeo = (() => { // 잎 한 장(타원, 가운데 접힘)
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.09, 0.12, 0, 0.3); s.quadraticCurveTo(-0.09, 0.12, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * 0.6); // 잎맥을 따라 살짝 접는다
  g.computeVertexNormals(); return g;
})();

// ── 재질 ──
const weaveB = weave(11), leatherB = pebble(12); leatherB.repeat.set(10, 10);
const fabricM = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.92, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff).lerp(new THREE.Color(color), 0.5), bumpMap: weaveB, bumpScale: 0.6 });
const woodM = (base, dark, seed, rough = 0.5) => new THREE.MeshPhysicalMaterial({ map: grain(base, dark, seed), roughness: rough, clearcoat: 0.25, clearcoatRoughness: 0.35 });
const M = (color, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const mat = {
  fabric: fabricM(0xd9d3c8), fabricDark: fabricM(0x5a5651), accent: fabricM(0x8a7560), sage: fabricM(0x8d9883),
  leather: new THREE.MeshPhysicalMaterial({ color: 0x6b4a33, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45, bumpMap: leatherB, bumpScale: 0.12 }),
  wood: woodM('#8a6446', '#3d2717', 1), woodLight: woodM('#c9a983', '#7a5a3a', 2), walnut: woodM('#5e3f2a', '#24150c', 3, 0.45),
  black: M(0x1f1f21, 0.45, 0.6), brass: M(0xb08d57, 0.28, 1), chrome: M(0xe2e4e6, 0.12, 1),
  stone: new THREE.MeshPhysicalMaterial({ color: 0xeeebe5, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
  leatherSmooth: new THREE.MeshPhysicalMaterial({ color: 0x6b4a33, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45 }),
  travertine: M(0xd9cbb3, 0.6), white: M(0xf3f2ee, 0.4), lacquer: new THREE.MeshPhysicalMaterial({ color: 0xefede8, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
  ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf8f8f5, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }),
  linen: new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: 0.95, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), bumpMap: weaveB, bumpScale: 0.3 }),
  rug: new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1, bumpMap: weaveB, bumpScale: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4a6b3c, roughness: 0.55, side: THREE.DoubleSide }),
  stem: M(0x5b4a35, 0.9), soil: M(0x2e2620, 1), pot: M(0xc9c1b4, 0.8), potDark: M(0x3b3a38, 0.7),
  screen: new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 }),
  mirror: M(0xdfe6e8, 0.03, 1), glow: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: 0.6 }),
  shade: new THREE.MeshStandardMaterial({ color: 0xf1ebdf, roughness: 0.9, emissive: 0xffdcae, emissiveIntensity: 0.15, side: THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
  piano: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide }),
  bottle: new THREE.MeshPhysicalMaterial({ color: 0x2a1418, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
  teak: woodM('#9a7350', '#5a3d24', 4, 0.7), keysW: M(0xf6f4ee, 0.3), soilDark: M(0x141414, 0.5),
};
const BOOKS = [0x8c3b2e, 0x2f4858, 0xd8cfbf, 0x5a6b4f, 0x1f1f1f, 0xb48a5a, 0x7d7f84, 0xe9e2d0];

// 자기 좌표계에서 쓰는 도형 도구
function kit(g) {
  const add = (mesh) => (g.add(mesh), mesh);
  // r = 모서리 굴림 반경(m)
  const box = (x0, z0, x1, z1, y0, y1, m, r = 0.004) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0, rr = Math.min(r, Math.min(w, h, d) / 2 - 1e-4);
    const geo = rr > 0.0015 ? new RoundedBoxGeometry(w, h, d, rr > 0.03 ? 4 : 2, rr) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(mesh);
  };
  const cyl = (x, z, r, y0, y1, m, seg = 24, rTop = r) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, y1 - y0, seg), m);
    mesh.position.set(x, (y0 + y1) / 2, z); return add(mesh);
  };
  // 돌림체: pts = [[반경, 높이], …]
  const lathe = (x, z, y, pts, m, seg = 40) => {
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg), m);
    mesh.position.set(x, y, z); return add(mesh);
  };
  // 가는 다리 네 개(안쪽으로 in 만큼 들여서)
  const legs = (w, d, h, m, inset = 0.06, r = 0.018, taper = 0.7) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(sx * (w / 2 - inset), sz * (d / 2 - inset), r * taper, 0, h, m, 12, r);
  };
  // 문짝 줄: 몸통 앞면(z) 에 폭 n 등분한 판을 살짝 띄워 붙이고 손잡이
  const doors = (x0, x1, z, y0, y1, n, m, handle = mat.black, vertical = true) => {
    const gap = 0.004, pw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + pw * i + gap, b = x0 + pw * (i + 1) - gap;
      box(a, z, b, z + 0.018, y0 + gap, y1 - gap, m, 0.003);
      if (!handle) continue;
      const hx = i % 2 ? a + 0.05 : b - 0.05;
      if (vertical) box(hx - 0.006, z + 0.018, hx + 0.006, z + 0.035, Math.max(y0, (y0 + y1) / 2 - 0.18), Math.min(y1, (y0 + y1) / 2 + 0.18), handle, 0.004);
      else box((a + b) / 2 - 0.12, z + 0.018, (a + b) / 2 + 0.12, z + 0.032, y1 - 0.06, y1 - 0.045, handle, 0.004);
    }
  };
  return { add, box, cyl, lathe, legs, doors };
}

// 쿠션 하나(굴린 상자, 살짝 기울일 수 있음)
const cushion = (k, x0, z0, x1, z1, y0, y1, m, r = 0.06, tilt = 0) => { const c = k.box(x0, z0, x1, z1, y0, y1, m, r); c.rotation.x = tilt; return c; };
// 장식 쿠션(정사각, 비스듬히)
const pillow = (k, x, z, y, s, m, ry = 0, rx = -0.25) => { const p = k.box(x - s / 2, z - 0.07, x + s / 2, z + 0.07, y, y + s, m, 0.06); p.rotation.set(rx, ry, 0); return p; };
// 인스턴스 묶음(책·병·잎처럼 같은 모양 여러 개)
function instanced(k, geo, m, list) {
  const im = new THREE.InstancedMesh(geo, m, list.length), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((it, i) => {
    o.position.set(...it.p); o.rotation.set(...(it.r || [0, 0, 0])); o.scale.set(...(it.s || [1, 1, 1])); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.c != null) im.setColorAt(i, c.set(it.c));
  });
  return k.add(im);
}
// 탁상·스탠드 갓
const lampShade = (k, x, z, y, rb, rt, h) => { const s = k.cyl(x, z, rb, y, y + h, mat.shade, 32, rt); s.geometry = new THREE.CylinderGeometry(rt, rb, h, 32, 1, true); return s; };

// 종류별: 기본 크기 [w, d]와 그리기. 반환값 false = 통행을 막지 않음
const TYPES = {
  sofa: [[2.8, 0.95], (k, w, d) => {
    const arm = 0.2, n = w > 2.2 ? 3 : 2, iw = w - arm * 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(sx * (w / 2 - 0.07), sz * (d / 2 - 0.07), 0.018, 0, 0.09, mat.black, 12, 0.014);
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.09, 0.4, mat.fabric, 0.04);                       // 받침
    for (const sx of [-1, 1]) k.box(sx > 0 ? w / 2 - arm : -w / 2, -d / 2, sx > 0 ? w / 2 : -w / 2 + arm, d / 2, 0.09, 0.64, mat.fabric, 0.08); // 팔걸이
    k.box(-w / 2 + arm, -d / 2, w / 2 - arm, -d / 2 + 0.2, 0.4, 0.78, mat.fabric, 0.07);    // 등받이 틀
    for (let i = 0; i < n; i++) { // 앉는 쿠션·등 쿠션 n 개(틈 1cm)
      const a = -iw / 2 + (iw / n) * i + 0.005, b = -iw / 2 + (iw / n) * (i + 1) - 0.005;
      cushion(k, a, -d / 2 + 0.2, b, d / 2 - 0.01, 0.4, 0.55, mat.fabric, 0.06);
      cushion(k, a, -d / 2 + 0.17, b, -d / 2 + 0.39, 0.52, 0.9, mat.fabric, 0.09, -0.14);
    }
    pillow(k, -iw / 2 + 0.3, -d / 2 + 0.42, 0.55, 0.44, mat.accent, 0.25);
    pillow(k, iw / 2 - 0.3, -d / 2 + 0.42, 0.55, 0.44, mat.sage, -0.2);
  }],
  chair: [[0.85, 0.85], (k, w, d) => { // 라운지 체어(가죽)
    k.legs(w, d, 0.14, mat.walnut, 0.08, 0.022);
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.14, 0.34, mat.leather, 0.05);
    cushion(k, -w / 2 + 0.13, -d / 2 + 0.16, w / 2 - 0.13, d / 2 - 0.01, 0.34, 0.45, mat.leather, 0.05);
    for (const sx of [-1, 1]) k.box(sx > 0 ? w / 2 - 0.13 : -w / 2, -d / 2, sx > 0 ? w / 2 : -w / 2 + 0.13, d / 2 - 0.04, 0.34, 0.6, mat.leather, 0.06);
    cushion(k, -w / 2 + 0.1, -d / 2, w / 2 - 0.1, -d / 2 + 0.2, 0.34, 0.85, mat.leather, 0.08, -0.12);
  }],
  coffee: [[1.1, 1.1], (k, w, d, o) => { // 원형 석재 상판 + 받침
    const r = o.r || w / 2;
    k.lathe(0, 0, 0, [[0.001, 0], [r * 0.5, 0], [r * 0.42, 0.06], [r * 0.38, 0.3], [r * 0.4, 0.33], [0.001, 0.33]], mat.travertine);
    k.cyl(0, 0, r, 0.33, 0.37, mat.stone, 48);
    k.cyl(r * 0.3, -r * 0.2, 0.09, 0.37, 0.4, mat.walnut, 24);  // 쟁반·책 소품
    k.box(-r * 0.5, r * 0.05, -r * 0.1, r * 0.35, 0.37, 0.41, mat.fabricDark, 0.004);
  }],
  rug: [[3, 2.4], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.012, mat.rug, 0.004); return false; }],
  tv: [[3.6, 0.45], (k, w, d) => { // 낮은 장 + 벽걸이 TV + 사운드바
    k.box(-w / 2 + 0.05, -d / 2 + 0.02, w / 2 - 0.05, d / 2 - 0.05, 0, 0.08, mat.black, 0.004);   // 들여 놓은 걸레받이
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.02, 0.08, 0.48, mat.walnut, 0.008);
    k.doors(-w / 2, w / 2, d / 2 - 0.02, 0.08, 0.48, Math.max(2, Math.round(w / 0.6)), mat.walnut, null);
    const sw = Math.min(2.4, w * 0.62), sh = sw * 0.5625;
    k.box(-sw / 2, -d / 2 - 0.02, sw / 2, -d / 2 + 0.015, 1.0, 1.0 + sh, mat.black, 0.006);
    k.box(-sw / 2 + 0.012, -d / 2 + 0.015, sw / 2 - 0.012, -d / 2 + 0.02, 1.012, 1.0 + sh - 0.012, mat.screen, 0);
    k.box(-sw * 0.3, -d / 2 + 0.05, sw * 0.3, -d / 2 + 0.14, 0.48, 0.55, mat.fabricDark, 0.02);
    k.cyl(w / 2 - 0.35, 0, 0.08, 0.48, 0.72, mat.ceramic, 24, 0.05);  // 꽃병
  }],
  bed: [[2.0, 2.2], (k, w, d) => {
    k.box(-w / 2 - 0.04, -d / 2 + 0.08, w / 2 + 0.04, d / 2, 0.06, 0.32, mat.fabricDark, 0.04);       // 바닥 프레임(패브릭)
    const n = Math.max(6, Math.round((w + 0.1) / 0.17)), cw = (w + 0.1) / n;                          // 줄 누빔 헤드보드
    for (let i = 0; i < n; i++) k.box(-w / 2 - 0.05 + cw * i + 0.003, -d / 2, -w / 2 - 0.05 + cw * (i + 1) - 0.003, -d / 2 + 0.1, 0.06, 1.15, mat.fabricDark, 0.045);
    k.box(-w / 2 + 0.02, -d / 2 + 0.1, w / 2 - 0.02, d / 2 - 0.03, 0.32, 0.55, mat.white, 0.06);      // 매트리스
    k.box(-w / 2 - 0.03, -d / 2 + 0.62, w / 2 + 0.03, d / 2 + 0.01, 0.48, 0.6, mat.linen, 0.05);      // 이불(옆으로 살짝 늘어짐)
    k.box(-w / 2 - 0.05, d / 2 - 0.55, w / 2 + 0.05, d / 2 + 0.03, 0.56, 0.63, mat.accent, 0.03);     // 발치 담요
    const pw = Math.min(0.7, (w - 0.15) / 2);
    for (const sx of [-1, 1]) {
      const p = k.box(sx * (pw / 2 + 0.03) - pw / 2, -d / 2 + 0.13, sx * (pw / 2 + 0.03) + pw / 2, -d / 2 + 0.29, 0.55, 0.95, mat.linen, 0.07); p.rotation.x = -0.22;
      pillow(k, sx * (pw / 2 + 0.03), -d / 2 + 0.42, 0.56, 0.4, sx > 0 ? mat.sage : mat.fabric, sx * 0.08, -0.35);
    }
  }],
  night: [[0.5, 0.45], (k, w, d) => { // 협탁(서랍 둘) + 탁상 조명
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.02, 0.12, 0.55, mat.walnut, 0.008); k.legs(w, d, 0.12, mat.walnut, 0.04, 0.015);
    for (const [a, b] of [[0.13, 0.33], [0.34, 0.54]]) { k.box(-w / 2 + 0.01, d / 2 - 0.02, w / 2 - 0.01, d / 2, a, b, mat.walnut, 0.004); k.cyl(0, d / 2 + 0.01, 0.012, (a + b) / 2 - 0.006, (a + b) / 2 + 0.006, mat.brass, 12).rotation.x = Math.PI / 2; }
    k.lathe(0, -0.03, 0.55, [[0.001, 0], [0.06, 0], [0.085, 0.08], [0.06, 0.2], [0.012, 0.24], [0.001, 0.24]], mat.ceramic);
    k.cyl(0, -0.03, 0.004, 0.79, 0.86, mat.brass, 8); lampShade(k, 0, -0.03, 0.8, 0.15, 0.12, 0.2);
  }],
  dining: [[2.4, 1.0], (k, w, d, o) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.72, 0.76, mat.woodLight, 0.012);
    for (const sx of [-1, 1]) { // 판다리 두 개
      k.box(sx * (w / 2 - 0.3) - 0.04, -d / 2 + 0.12, sx * (w / 2 - 0.3) + 0.04, d / 2 - 0.12, 0.02, 0.72, mat.black, 0.006);
      k.box(sx * (w / 2 - 0.3) - 0.06, -d / 2 + 0.1, sx * (w / 2 - 0.3) + 0.06, d / 2 - 0.1, 0, 0.025, mat.black, 0.006);
    }
    const n = Math.max(2, Math.round(w / 0.8));
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const x = -w / 2 + (w / n) * (i + 0.5), z = s * (d / 2 + 0.25), c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = s > 0 ? 0 : Math.PI; k.add(c);
      const ck = kit(c); // 의자 자기 좌표: 앞(-z)이 식탁 쪽, 등받이가 +z
      ck.legs(0.44, 0.44, 0.44, mat.black, 0.03, 0.012, 1);
      ck.box(-0.23, -0.22, 0.23, 0.22, 0.43, 0.49, mat.fabricDark, 0.025);
      const b = ck.box(-0.22, 0.17, 0.22, 0.21, 0.55, 0.88, mat.fabricDark, 0.018); b.rotation.x = 0.1;
      for (const sx of [-1, 1]) ck.cyl(sx * 0.19, 0.19, 0.01, 0.44, 0.78, mat.black, 8);
    }
    if (o.pend) for (let i = 0; i < 3; i++) { // 펜던트: 황동 돔 + 전구
      const x = (i - 1) * w * 0.28;
      k.lathe(x, 0, 1.62, [[0.001, 0.2], [0.04, 0.2], [0.12, 0.08], [0.14, 0], [0.135, 0]], mat.brass);
      k.cyl(x, 0, 0.035, 1.6, 1.66, mat.glow, 16); k.cyl(x, 0, 0.004, 1.82, o.H, mat.black, 6);
    }
  }, (w, d) => [w, d + 0.95]],
  island: [[3.0, 1.0], (k, w, d, o) => {
    k.box(-w / 2 + 0.06, -d / 2 + 0.06, w / 2 - 0.06, d / 2 - 0.06, 0, 0.1, mat.black, 0.004);
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.02, 0.1, 0.9, mat.walnut, 0.006);
    k.doors(-w / 2, w / 2, -d / 2 - 0.018, 0.1, 0.9, Math.max(2, Math.round(w / 0.6)), mat.walnut, mat.brass, false);
    k.box(-w / 2 - 0.05, -d / 2 - 0.05, w / 2 + 0.05, d / 2 + 0.25, 0.9, 0.95, mat.stone, 0.01);   // 상판(앞쪽 25cm 내밀어 앉는 자리)
    k.box(w / 2 - 0.7, -d / 2 + 0.05, w / 2 - 0.25, -d / 2 + 0.45, 0.951, 0.955, mat.chrome, 0.002); // 개수대
    const f = k.add(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 10, 24, Math.PI), mat.chrome)); f.position.set(w / 2 - 0.47, 1.17, -d / 2 + 0.06); f.rotation.y = Math.PI / 2;
    k.cyl(w / 2 - 0.47, -d / 2 + 0.06 - 0.11, 0.014, 0.95, 1.17, mat.chrome, 12);
    if (o.stools) for (let x = -w / 2 + 0.5; x < w / 2 - 0.2; x += 0.8) { // 바 스툴
      const z = d / 2 + 0.35;
      k.cyl(x, z, 0.18, 0, 0.012, mat.black, 24); k.cyl(x, z, 0.022, 0, 0.66, mat.chrome, 12);
      const ring = k.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 8, 32), mat.chrome)); ring.position.set(x, 0.3, z); ring.rotation.x = Math.PI / 2;
      k.lathe(x, z, 0.64, [[0.001, 0], [0.17, 0], [0.19, 0.04], [0.18, 0.08], [0.001, 0.08]], mat.leatherSmooth); // 돌림체는 결 지도가 늘어나 얼룩져 보여 결 없는 가죽
    }
  }, (w, d, o) => [w, o.stools ? d + 0.5 : d], (w, d, o) => (o.stools ? 0.25 : 0)],
  counter: [[4.0, 0.65], (k, w, d, o) => { // 붙박이 주방: 하부장·상판·개수대·쿡탑·상부장
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.07, 0, 0.1, mat.black, 0.002);
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.02, 0.1, 0.9, mat.lacquer, 0.004);
    k.doors(-w / 2, w / 2, d / 2 - 0.02, 0.1, 0.9, Math.max(2, Math.round(w / 0.6)), mat.lacquer, mat.black, false);
    k.box(-w / 2, -d / 2, w / 2, d / 2 + 0.03, 0.9, 0.94, mat.stone, 0.006);
    k.box(-w * 0.25 - 0.3, -0.05, -w * 0.25 + 0.3, 0.2, 0.941, 0.945, mat.chrome, 0.002);
    k.cyl(-w * 0.25, -d / 2 + 0.08, 0.016, 0.94, 1.25, mat.chrome, 12);
    const sp = k.cyl(-w * 0.25, -d / 2 + 0.08 + 0.1, 0.012, 1.24, 1.26, mat.chrome, 12); sp.geometry = new THREE.CylinderGeometry(0.012, 0.012, 0.2, 12); sp.rotation.x = Math.PI / 2;
    k.box(w * 0.2 - 0.38, -0.25, w * 0.2 + 0.38, 0.2, 0.941, 0.947, mat.screen, 0.004);              // 인덕션
    if (o.upper) { k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.35, 1.5, 2.3, mat.lacquer, 0.004); k.doors(-w / 2, w / 2, -d / 2 + 0.35, 1.5, 2.3, Math.max(2, Math.round(w / 0.6)), mat.lacquer, null);
      k.box(-w / 2 + 0.02, -d / 2 + 0.05, w / 2 - 0.02, -d / 2 + 0.3, 1.49, 1.5, mat.glow, 0); } // 상부장 밑 조명
  }],
  desk: [[1.6, 0.7], (k, w, d, o) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.72, 0.75, mat.walnut, 0.006);
    for (const sx of [-1, 1]) { const x = sx * (w / 2 - 0.08); k.box(x - 0.015, -d / 2 + 0.05, x + 0.015, d / 2 - 0.05, 0, 0.72, mat.black, 0.006); }
    k.box(-0.25, -d / 2 + 0.05, 0.25, -d / 2 + 0.07, 0.75, 1.05, mat.black, 0.006);   // 모니터
    k.box(-0.24, -d / 2 + 0.07, 0.24, -d / 2 + 0.072, 0.76, 1.04, mat.screen, 0);
    k.cyl(w / 2 - 0.2, -d / 2 + 0.12, 0.07, 0.75, 0.76, mat.black, 16); k.cyl(w / 2 - 0.2, -d / 2 + 0.12, 0.008, 0.76, 1.15, mat.black, 8); lampShade(k, w / 2 - 0.2, -d / 2 + 0.2, 1.08, 0.08, 0.04, 0.1);
    if (o.chair !== false) { // 사무 의자
      const c = new THREE.Group(); c.position.set(0, 0, d / 2 + 0.42); k.add(c); const ck = kit(c);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, s = ck.box(-0.012, 0, 0.012, 0.3, 0.04, 0.07, mat.black, 0.008); s.position.set(Math.sin(a) * 0.15, 0.055, Math.cos(a) * 0.15); s.rotation.y = a; }
      ck.cyl(0, 0, 0.025, 0.06, 0.45, mat.chrome, 12);
      ck.box(-0.25, -0.24, 0.25, 0.24, 0.45, 0.53, mat.fabricDark, 0.04);
      const b = ck.box(-0.23, 0.22, 0.23, 0.27, 0.6, 1.05, mat.fabricDark, 0.025); b.rotation.x = 0.12;
    }
  }],
  shelf: [[2.4, 0.4], (k, w, d) => { // 책장 + 책·소품
    const sh = [];
    k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.02, 0, 2.4, mat.walnut, 0.003);
    for (const x of [-w / 2, w / 2 - 0.03]) k.box(x, -d / 2, x + 0.03, d / 2, 0, 2.4, mat.walnut, 0.004);
    for (let y = 0; y < 2.4; y += 0.45) { k.box(-w / 2 + 0.03, -d / 2 + 0.02, w / 2 - 0.03, d / 2, y, y + 0.03, mat.walnut, 0.003); sh.push(y + 0.03); }
    const r = rnd(Math.round(w * 100)), books = [];
    for (const y of sh.slice(0, -1)) {
      let x = -w / 2 + 0.06;
      while (x < w / 2 - 0.1) {
        if (r() < 0.12) { x += 0.15 + r() * 0.2; continue; }                       // 빈 칸 → 소품 자리
        const t = 0.025 + r() * 0.035, h = 0.22 + r() * 0.12, dd = 0.17 + r() * 0.06;
        books.push({ p: [x + t / 2, y + h / 2, -d / 2 + 0.03 + dd / 2], s: [t, h, dd], c: BOOKS[Math.floor(r() * BOOKS.length)] });
        x += t + 0.002;
      }
    }
    instanced(k, new THREE.BoxGeometry(1, 1, 1), M(0xffffff, 0.8), books);
  }],
  wardrobe: [[2.0, 0.6], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.02, 0, 2.4, mat.woodLight, 0.004);
    k.doors(-w / 2, w / 2, d / 2 - 0.02, 0.02, 2.4, Math.max(2, Math.round(w / 0.5)), mat.woodLight, mat.brass);
  }],
  wine: [[1.6, 0.5], (k, w, d) => { // 와인 셀러: 검은 틀 + 병 줄 + 유리문
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 2.2, mat.black, 0.006);
    k.box(-w / 2 + 0.05, d / 2 + 0.004, w / 2 - 0.05, d / 2 + 0.006, 0.1, 2.1, M(0x16110f, 0.9), 0);  // 안쪽 그늘
    const bottles = [];
    for (let y = 0.18; y < 2.05; y += 0.13) for (let x = -w / 2 + 0.11; x < w / 2 - 0.08; x += 0.09) bottles.push({ p: [x, y, d / 2 + 0.025], r: [Math.PI / 2, 0, 0] });
    instanced(k, new THREE.CylinderGeometry(0.036, 0.036, 0.04, 14), mat.bottle, bottles);
    k.box(-w / 2 + 0.04, d / 2 + 0.05, w / 2 - 0.04, d / 2 + 0.06, 0.08, 2.12, mat.glass, 0);
    k.box(w / 2 - 0.1, d / 2 + 0.06, w / 2 - 0.085, d / 2 + 0.09, 0.8, 1.5, mat.chrome, 0.004);
  }],
  vanity: [[1.4, 0.55], (k, w, d) => { // 떠 있는 세면대: 서랍장 + 상판 + 볼 세면기 + 수전 + 조명 거울
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.02, 0.3, 0.85, mat.walnut, 0.006);
    for (const [a, b] of [[0.31, 0.57], [0.58, 0.84]]) k.box(-w / 2 + 0.005, d / 2 - 0.02, w / 2 - 0.005, d / 2, a, b, mat.walnut, 0.004);
    k.box(-w / 2, -d / 2, w / 2, d / 2 + 0.02, 0.85, 0.89, mat.stone, 0.006);
    const bx = w > 1.1 ? [-w / 4, w / 4] : [0];
    for (const x of bx) {
      k.lathe(x, 0.04, 0.89, [[0.001, 0], [0.12, 0], [0.2, 0.06], [0.21, 0.14], [0.2, 0.14], [0.19, 0.065], [0.11, 0.015], [0.001, 0.015]], mat.ceramic, 48);
      k.cyl(x, -d / 2 + 0.06, 0.016, 0.89, 1.16, mat.chrome, 12);
      const sp = k.cyl(x, -d / 2 + 0.13, 0.012, 1.14, 1.16, mat.chrome, 12); sp.geometry = new THREE.CylinderGeometry(0.012, 0.012, 0.15, 12); sp.rotation.x = Math.PI / 2;
    }
    k.box(-w / 2 + 0.06, -d / 2, w / 2 - 0.06, -d / 2 + 0.03, 1.12, 2.02, mat.glow, 0.01);        // 거울 뒤 간접광 테
    k.box(-w / 2 + 0.08, -d / 2 + 0.03, w / 2 - 0.08, -d / 2 + 0.035, 1.14, 2.0, mat.mirror, 0);
  }],
  tub: [[1.8, 0.9], (k, w, d) => { // 독립 욕조(안이 파인 껍데기) + 바닥 수전
    const t = 0.07;
    k.box(-w / 2 + 0.04, -d / 2 + 0.04, w / 2 - 0.04, d / 2 - 0.04, 0, 0.16, mat.ceramic, 0.05);
    k.box(-w / 2, -d / 2, w / 2, -d / 2 + t, 0.02, 0.6, mat.ceramic, 0.035); k.box(-w / 2, d / 2 - t, w / 2, d / 2, 0.02, 0.6, mat.ceramic, 0.035);
    k.box(-w / 2, -d / 2, -w / 2 + t, d / 2, 0.02, 0.6, mat.ceramic, 0.035); k.box(w / 2 - t, -d / 2, w / 2, d / 2, 0.02, 0.6, mat.ceramic, 0.035);
    k.cyl(w / 2 + 0.15, 0, 0.02, 0, 0.95, mat.chrome, 12);
    const sp = k.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 24, Math.PI), mat.chrome)); sp.position.set(w / 2 + 0.05, 0.95, 0);
  }, (w, d) => [w + 0.3, d]],
  toilet: [[0.42, 0.7], (k, w, d) => { // 벽 매립 수조판 + 벽걸이 변기
    k.box(-w / 2 - 0.05, -d / 2, w / 2 + 0.05, -d / 2 + 0.16, 0, 1.1, mat.lacquer, 0.01);
    k.box(-0.11, -d / 2 + 0.16, 0.11, -d / 2 + 0.172, 0.92, 1.05, mat.chrome, 0.004);                 // 물 내림 버튼판
    const bowl = k.cyl(0, 0.02, 0.15, 0.2, 0.42, mat.ceramic, 32, 0.19); bowl.scale.z = 1.45;
    k.box(-w / 2 + 0.02, -d / 2 + 0.16, w / 2 - 0.02, -d / 2 + 0.3, 0.22, 0.42, mat.ceramic, 0.05);
    const seat = k.cyl(0, 0.02, 0.2, 0.42, 0.445, mat.ceramic, 32); seat.scale.z = 1.4;
  }],
  shower: [[0.9, 0.9], (k, w, d) => { // 낮은 받침 + 유리 칸막이(검은 테) + 레인 샤워
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.035, mat.stone, 0.006);
    k.box(-w / 2, d / 2 - 0.012, w / 2, d / 2, 0.035, 2.0, mat.glass, 0);
    k.box(-w / 2, d / 2 - 0.016, w / 2, d / 2 + 0.004, 1.99, 2.01, mat.black, 0.003);
    k.box(w / 2 - 0.02, d / 2 - 0.016, w / 2, d / 2 + 0.004, 0.035, 2.0, mat.black, 0.003);
    k.cyl(0, -d / 2 + 0.25, 0.13, 2.08, 2.1, mat.chrome, 32); k.cyl(0, -d / 2 + 0.12, 0.012, 2.1, 2.3, mat.chrome, 8);
    const arm = k.cyl(0, -d / 2 + 0.06, 0.012, 2.1, 2.1 + 0.25, mat.chrome, 8); arm.rotation.x = Math.PI / 2; arm.position.set(0, 2.3, -d / 2 + 0.12);
    k.cyl(0, -d / 2 + 0.02, 0.05, 1.05, 1.07, mat.chrome, 20).rotation.x = Math.PI / 2;
  }],
  plant: [[0.45, 0.45], (k, w, d, o) => { // 화분 + 줄기 + 잎(인스턴스)
    const h = o.h || 1.4, r = rnd(Math.round(h * 1000 + w * 77));
    k.lathe(0, 0, 0, [[0.001, 0], [0.16, 0], [0.2, 0.1], [0.22, 0.42], [0.205, 0.44], [0.001, 0.44]], h > 1.2 ? mat.pot : mat.potDark);
    k.cyl(0, 0, 0.19, 0.4, 0.425, mat.soil, 24);
    const leaves = [], stems = 3 + Math.floor(r() * 3);
    for (let s = 0; s < stems; s++) {
      const a = r() * Math.PI * 2, lean = 0.05 + r() * 0.15, top = 0.45 + h * (0.6 + r() * 0.4);
      const st = k.cyl(0, 0, 0.012, 0.42, top, mat.stem, 6, 0.008); st.rotation.set(Math.cos(a) * lean, 0, Math.sin(a) * lean);
      const n = Math.round(h * 9);
      for (let i = 0; i < n; i++) {
        const t = 0.35 + 0.65 * (i / n), y = 0.42 + (top - 0.42) * t, ra = r() * Math.PI * 2, sc = 0.7 + r() * 0.8 * (1 - t * 0.4);
        const off = (top - 0.42) * t * lean;
        leaves.push({ p: [Math.sin(a) * off * -1 + Math.cos(ra) * 0.02, y, Math.cos(a) * off + Math.sin(ra) * 0.02], r: [-0.6 - r() * 0.7, ra, 0], s: [sc * 1.1, sc, sc] });
      }
    }
    instanced(k, leafGeo, mat.leaf, leaves);
  }],
  lamp: [[0.4, 0.4], (k) => { // 스탠드
    k.cyl(0, 0, 0.15, 0, 0.025, mat.black, 32); k.cyl(0, 0, 0.012, 0.025, 1.5, mat.brass, 12);
    lampShade(k, 0, 0, 1.42, 0.22, 0.17, 0.3); k.cyl(0, 0, 0.03, 1.45, 1.52, mat.glow, 12);
  }],
  sunbed: [[0.7, 1.9], (k, w, d) => { // 티크 선베드 + 쿠션
    for (const sx of [-1, 1]) k.box(sx * (w / 2 - 0.02) - 0.02, -d / 2, sx * (w / 2 - 0.02) + 0.02, d / 2, 0.05, 0.28, mat.teak, 0.006);
    k.legs(w, d, 0.05, mat.teak, 0.04, 0.025, 1);
    for (let z = -d / 2 + 0.6; z < d / 2 - 0.03; z += 0.09) k.box(-w / 2 + 0.03, z, w / 2 - 0.03, z + 0.07, 0.24, 0.27, mat.teak, 0.004);
    k.box(-w / 2 + 0.04, -d / 2 + 0.6, w / 2 - 0.04, d / 2 - 0.02, 0.27, 0.35, mat.linen, 0.035);
    const back = new THREE.Group(); back.position.set(0, 0.3, -d / 2 + 0.62); back.rotation.x = -0.75; k.add(back);
    kit(back).box(-w / 2 + 0.04, -0.6, w / 2 - 0.04, 0, 0, 0.08, mat.linen, 0.035);
  }],
  bench: [[1.4, 0.45], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.38, 0.45, mat.walnut, 0.01);
    for (const sx of [-1, 1]) k.box(sx * (w / 2 - 0.12) - 0.025, -d / 2 + 0.04, sx * (w / 2 - 0.12) + 0.025, d / 2 - 0.04, 0, 0.38, mat.walnut, 0.006);
    cushion(k, -w / 2 + 0.05, -d / 2 + 0.03, w / 2 - 0.05, d / 2 - 0.03, 0.45, 0.5, mat.fabric, 0.02);
  }],
  console: [[1.4, 0.4], (k, w, d) => { // 콘솔: 얇은 상판 + 서랍 + 금속 다리 + 소품
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.8, 0.85, mat.walnut, 0.006);
    k.box(-w / 2 + 0.04, -d / 2 + 0.02, w / 2 - 0.04, d / 2 - 0.02, 0.66, 0.8, mat.walnut, 0.004);
    k.legs(w, d, 0.66, mat.brass, 0.05, 0.012, 1);
    k.lathe(-w / 2 + 0.25, 0, 0.85, [[0.001, 0], [0.06, 0], [0.11, 0.12], [0.05, 0.3], [0.035, 0.38], [0.001, 0.38]], mat.ceramic);
    k.box(w / 2 - 0.45, -0.1, w / 2 - 0.15, 0.1, 0.85, 0.9, mat.fabricDark, 0.004);
  }],
  piano: [[1.5, 1.9], (k, w, d) => { // 그랜드 피아노: 광택 몸통 + 건반 + 열린 뚜껑 + 의자
    const s = new THREE.Shape(); // 몸통 윗모양(곡선 꼬리)
    s.moveTo(-w / 2, d / 2 - 0.5); s.lineTo(w / 2, d / 2 - 0.5); s.lineTo(w / 2, -d / 2 + 0.25);
    s.quadraticCurveTo(w / 2, -d / 2, w / 2 - 0.3, -d / 2); s.quadraticCurveTo(-w / 2 + 0.3, -d / 2 + 0.3, -w / 2 + 0.2, d / 2 - 1.0); s.lineTo(-w / 2, d / 2 - 0.5);
    const body = k.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), mat.piano));
    body.rotation.x = Math.PI / 2; body.position.y = 1.0;
    // 뚜껑: 곧은 쪽(+x)에 경첩, 굽은 쪽을 들어 올린다
    const lidGeo = new THREE.ShapeGeometry(s); lidGeo.translate(-w / 2, 0, 0);
    const lid = k.add(new THREE.Mesh(lidGeo, mat.piano)); lid.rotation.order = 'ZYX'; lid.rotation.set(Math.PI / 2, 0, -0.6); lid.position.set(w / 2, 1.02, 0);
    k.box(-w / 2, d / 2 - 0.5, w / 2, d / 2 - 0.3, 0.72, 0.8, mat.piano, 0.01);
    k.box(-w / 2 + 0.06, d / 2 - 0.5, w / 2 - 0.06, d / 2 - 0.36, 0.8, 0.82, mat.keysW, 0.002);
    const blacks = []; for (let x = -w / 2 + 0.09; x < w / 2 - 0.09; x += 0.0235) if ([1, 2, 4, 5, 6].includes(Math.round((x + w / 2) / 0.0235) % 7)) blacks.push({ p: [x, 0.83, d / 2 - 0.46] });
    instanced(k, new THREE.BoxGeometry(0.011, 0.012, 0.09), mat.piano, blacks);
    for (const [x, z] of [[-w / 2 + 0.1, d / 2 - 0.4], [w / 2 - 0.1, d / 2 - 0.4], [0, -d / 2 + 0.25]]) k.cyl(x, z, 0.055, 0, 0.68, mat.piano, 16, 0.045);
    k.box(-0.35, d / 2 - 0.2, 0.35, d / 2 + 0.15, 0.44, 0.5, mat.leather, 0.02); k.legs(0.7, 0.35, 0.44, mat.piano, 0.04, 0.02, 1);
  }],
};

export function buildFurniture(items = [], H = 3) {
  const root = new THREE.Group(), colliders = [];
  for (const [type, x, z, rot = 0, o = {}] of items) {
    const T = TYPES[type]; if (!T) { console.warn('알 수 없는 가구', type); continue; }
    const [[dw, dd], draw, foot, shift] = T;
    const w = o.w ?? dw, d = o.d ?? dd;
    const g = new THREE.Group(), k = { ...kit(g), g };
    const blocks = draw(k, w, d, { ...o, H }) !== false;
    g.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.userData.noPick = true; } });
    const a = (rot * Math.PI) / 180;
    g.rotation.y = a; g.position.set(x, 0, z); root.add(g);
    if (!blocks) continue;
    // 충돌 영역: 자기 좌표 발자국을 돌려서 축 정렬 사각형으로
    const [fw, fd] = foot ? foot(w, d, o) : [w, d], cz = shift ? shift(w, d, o) : 0;
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const hx = (fw * c + fd * s) / 2, hz = (fw * s + fd * c) / 2;
    const ox = x + Math.sin(a) * cz, oz = z + Math.cos(a) * cz;
    colliders.push([ox - hx, oz - hz, ox + hx, oz + hz]);
  }
  return { group: root, colliders };
}
