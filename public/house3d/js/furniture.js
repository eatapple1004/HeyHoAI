// 가구 — 공간감을 위한 단순 형태. 실제 가구 모델(GLB)이 생기면 종류별 함수만 바꾼다.
// 각 가구는 자기 좌표계에서 만든다: 원점 = 바닥 중심, 앞면이 +z, 등은 -z.
// 평면 데이터의 [종류, x, z, 방향(도), 옵션] 대로 돌려서 놓고, 충돌 영역을 함께 만든다.
import * as THREE from 'three';

const M = (color, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const mat = {
  fabric: M(0xd9d3c8, 0.95), fabricDark: M(0x5a5651, 0.95), leather: M(0x6b4a33, 0.6),
  wood: M(0x8a6446, 0.55), woodLight: M(0xc9a983, 0.55), black: M(0x1f1f21, 0.4, 0.3), brass: M(0xb08d57, 0.3, 0.9),
  stone: M(0xeeebe5, 0.2), white: M(0xf3f2ee, 0.35), linen: M(0xefebe3, 0.95), rug: M(0xb7aa95, 1),
  green: M(0x4f6b45, 0.9), pot: M(0x9c8a76, 0.8), screen: M(0x0d0e10, 0.2, 0.5), mirror: M(0xc9d3d6, 0.05, 1),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
  piano: M(0x0c0c0d, 0.15, 0.2), bottle: M(0x3a1d22, 0.2, 0.1),
};

// 자기 좌표계에서 쓰는 도형 도구
function kit(g) {
  const box = (x0, z0, x1, z1, y0, y1, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(mesh); return mesh;
  };
  const cyl = (x, z, r, y0, y1, m, seg = 24) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg), m);
    mesh.position.set(x, (y0 + y1) / 2, z); g.add(mesh); return mesh;
  };
  return { box, cyl };
}

// 종류별: 기본 크기 [w, d]와 그리기. 반환값 false = 통행을 막지 않음
const TYPES = {
  sofa: [[2.8, 0.95], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.42, mat.fabric);
    k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.25, 0.42, 0.85, mat.fabric);
    k.box(-w / 2, -d / 2, -w / 2 + 0.22, d / 2, 0.42, 0.62, mat.fabric); k.box(w / 2 - 0.22, -d / 2, w / 2, d / 2, 0.42, 0.62, mat.fabric);
  }],
  chair: [[0.85, 0.85], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.42, mat.leather); k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.2, 0.42, 0.8, mat.leather);
  }],
  coffee: [[1.1, 1.1], (k, w, d, o) => { k.cyl(0, 0, (o.r || w / 2), 0, 0.36, mat.stone, 32); }],
  rug: [[3, 2.4], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.012, mat.rug); return false; }],
  tv: [[3.6, 0.45], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.45, mat.wood);
    const sw = Math.min(2.4, w * 0.62); k.box(-sw / 2, -d / 2 - 0.02, sw / 2, -d / 2 + 0.04, 1.0, 1.0 + sw * 0.56, mat.screen);
  }],
  bed: [[2.0, 2.2], (k, w, d) => {
    k.box(-w / 2, -d / 2 + 0.15, w / 2, d / 2, 0, 0.5, mat.linen); k.box(-w / 2 - 0.05, -d / 2, w / 2 + 0.05, -d / 2 + 0.15, 0, 1.2, mat.wood);
    k.box(-w / 2 + 0.05, -d / 2 + 0.75, w / 2 - 0.05, d / 2 - 0.05, 0.5, 0.56, mat.fabricDark);
    k.box(-w / 2 + 0.15, -d / 2 + 0.22, -0.05, -d / 2 + 0.6, 0.5, 0.68, mat.white); k.box(0.05, -d / 2 + 0.22, w / 2 - 0.15, -d / 2 + 0.6, 0.5, 0.68, mat.white);
  }],
  night: [[0.5, 0.45], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.55, mat.wood); k.cyl(0, 0, 0.1, 0.55, 0.85, mat.linen); }],
  dining: [[2.4, 1.0], (k, w, d, o) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.72, 0.77, mat.woodLight); k.box(-w / 2 + 0.2, -d / 2 + 0.2, w / 2 - 0.2, d / 2 - 0.2, 0, 0.72, mat.black);
    const n = Math.max(2, Math.round(w / 0.8));
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const x = -w / 2 + (w / n) * (i + 0.5), z = s * (d / 2 + 0.25);
      k.box(x - 0.22, z - 0.22, x + 0.22, z + 0.22, 0, 0.46, mat.fabricDark);
    }
    if (o.pend) for (let i = 0; i < 3; i++) { const x = (i - 1) * w * 0.28; k.cyl(x, 0, 0.12, 1.7, 1.86, mat.brass); k.cyl(x, 0, 0.006, 1.86, o.H, mat.black, 6); }
  }, (w, d) => [w, d + 0.95]],
  island: [[3.0, 1.0], (k, w, d, o) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.9, mat.wood); k.box(-w / 2 - 0.05, -d / 2 - 0.05, w / 2 + 0.05, d / 2 + 0.05, 0.9, 0.95, mat.stone);
    if (o.stools) for (let x = -w / 2 + 0.5; x < w / 2 - 0.2; x += 0.8) k.cyl(x, d / 2 + 0.35, 0.18, 0, 0.72, mat.leather);
  }, (w, d, o) => [w, o.stools ? d + 0.5 : d], (w, d, o) => (o.stools ? 0.25 : 0)],
  counter: [[4.0, 0.65], (k, w, d, o) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.9, mat.white); k.box(-w / 2, -d / 2, w / 2, d / 2 + 0.03, 0.9, 0.94, mat.stone);
    if (o.upper) k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.36, 1.5, 2.3, mat.white);
  }],
  desk: [[1.6, 0.7], (k, w, d, o) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0.72, 0.76, mat.wood); k.box(-w / 2 + 0.05, -d / 2, -w / 2 + 0.1, d / 2, 0, 0.72, mat.black); k.box(w / 2 - 0.1, -d / 2, w / 2 - 0.05, d / 2, 0, 0.72, mat.black);
    if (o.chair !== false) k.box(-0.28, d / 2 + 0.15, 0.28, d / 2 + 0.7, 0, 0.5, mat.leather);
  }],
  shelf: [[2.4, 0.4], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.05, mat.wood); k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.03, 0, 2.4, mat.wood);
    for (let y = 0.45; y < 2.4; y += 0.45) k.box(-w / 2, -d / 2, w / 2, d / 2, y, y + 0.03, mat.wood);
    for (const x of [-w / 2, w / 2 - 0.03]) k.box(x, -d / 2, x + 0.03, d / 2, 0, 2.4, mat.wood);
  }],
  wardrobe: [[2.0, 0.6], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 2.4, mat.woodLight); }],
  wine: [[1.6, 0.5], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 2.2, mat.black); k.box(-w / 2 + 0.05, d / 2 - 0.02, w / 2 - 0.05, d / 2, 0.1, 2.1, mat.bottle);
    k.box(-w / 2 + 0.04, d / 2, w / 2 - 0.04, d / 2 + 0.01, 0.08, 2.12, mat.glass);
  }],
  vanity: [[1.4, 0.55], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.85, mat.white); k.box(-w / 2, -d / 2, w / 2, d / 2 + 0.02, 0.85, 0.9, mat.stone);
    k.box(-w / 2 + 0.1, -d / 2, w / 2 - 0.1, -d / 2 + 0.02, 1.1, 2.0, mat.mirror);
  }],
  tub: [[1.8, 0.9], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.6, mat.white); }],
  toilet: [[0.42, 0.7], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.2, 0, 0.8, mat.white); k.box(-w / 2 + 0.02, -d / 2 + 0.2, w / 2 - 0.02, d / 2, 0, 0.42, mat.white); }],
  shower: [[0.9, 0.9], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.04, mat.stone);
    k.box(-w / 2, d / 2 - 0.01, w / 2, d / 2, 0.04, 2.0, mat.glass); k.cyl(0, -d / 2 + 0.1, 0.1, 2.0, 2.02, mat.black);
  }],
  plant: [[0.45, 0.45], (k, w, d, o) => {
    const h = o.h || 1.4; k.cyl(0, 0, 0.22, 0, 0.45, mat.pot);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat.green); leaf.position.y = 0.45 + h * 0.55; leaf.scale.set(1, h / 0.9, 1); k.g.add(leaf);
  }],
  lamp: [[0.4, 0.4], (k) => { k.cyl(0, 0, 0.15, 0, 0.03, mat.black); k.cyl(0, 0, 0.02, 0, 1.6, mat.brass); k.cyl(0, 0, 0.2, 1.5, 1.75, mat.linen); }],
  sunbed: [[0.7, 1.9], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.35, mat.white); k.box(-w / 2, -d / 2, w / 2, -d / 2 + 0.5, 0.35, 0.6, mat.white); }],
  bench: [[1.4, 0.45], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.45, mat.wood); }],
  console: [[1.4, 0.4], (k, w, d) => { k.box(-w / 2, -d / 2, w / 2, d / 2, 0, 0.85, mat.wood); }],
  piano: [[1.5, 1.9], (k, w, d) => {
    k.box(-w / 2, -d / 2, w / 2, d / 2 - 0.5, 0.6, 1.0, mat.piano); k.box(-w / 2 + 0.2, -d / 2 + 0.6, w / 2, d / 2 - 0.5, 0.6, 1.0, mat.piano);
    k.box(-w / 2, d / 2 - 0.5, w / 2, d / 2 - 0.3, 0.7, 0.85, mat.white);
    for (const [x, z] of [[-w / 2 + 0.1, d / 2 - 0.6], [w / 2 - 0.1, d / 2 - 0.6], [0, -d / 2 + 0.2]]) k.cyl(x, z, 0.05, 0, 0.6, mat.piano, 10);
    k.box(-0.35, d / 2 - 0.2, 0.35, d / 2 + 0.15, 0, 0.5, mat.piano);
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
