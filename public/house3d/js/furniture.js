// 가구 — 공간감을 위한 단순 형태. 실제 가구 모델(GLB)이 생기면 이 파일을 교체한다.
import * as THREE from 'three';

const M = (color, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const mat = {
  fabric: M(0xd9d3c8, 0.95), fabricDark: M(0x5a5651, 0.95), leather: M(0x6b4a33, 0.6),
  wood: M(0x8a6446, 0.55), woodLight: M(0xc9a983, 0.55), black: M(0x1f1f21, 0.4, 0.3), brass: M(0xb08d57, 0.3, 0.9),
  stone: M(0xeeebe5, 0.2), white: M(0xf3f2ee, 0.35), linen: M(0xefebe3, 0.95), rug: M(0xb7aa95, 1), rug2: M(0x8f949a, 1),
  green: M(0x4f6b45, 0.9), pot: M(0x9c8a76, 0.8), screen: M(0x0d0e10, 0.2, 0.5), glass: M(0x9fb7bd, 0.1),
};

export function buildFurniture() {
  const g = new THREE.Group(), colliders = [];
  const box = (x0, z0, x1, z1, y0, y1, m, block = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = mesh.receiveShadow = true; mesh.userData.noPick = true; g.add(mesh);
    if (block && y1 > 0.3) colliders.push([x0, z0, x1, z1]);
    return mesh;
  };
  const cyl = (x, z, r, y0, y1, m, block = true) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 24), m);
    mesh.position.set(x, (y0 + y1) / 2, z); mesh.castShadow = mesh.receiveShadow = true; mesh.userData.noPick = true; g.add(mesh);
    if (block && y1 > 0.3) colliders.push([x - r, z - r, x + r, z + r]);
    return mesh;
  };
  const plant = (x, z, h = 1.4) => {
    cyl(x, z, 0.22, 0, 0.45, mat.pot);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat.green);
    leaf.position.set(x, 0.45 + h * 0.55, z); leaf.scale.set(1, h / 0.9, 1); leaf.castShadow = true; leaf.userData.noPick = true; g.add(leaf);
  };

  // 거실 — 소파는 TV 벽(북쪽)을 본다
  box(1.4, 8.6, 6.6, 12.9, 0, 0.012, mat.rug, false);
  box(1.8, 11.4, 5.8, 12.4, 0, 0.42, mat.fabric); box(1.8, 12.1, 5.8, 12.4, 0.42, 0.85, mat.fabric, false);  // 소파 + 등받이
  box(1.8, 11.4, 2.05, 12.4, 0.42, 0.62, mat.fabric, false); box(5.55, 11.4, 5.8, 12.4, 0.42, 0.62, mat.fabric, false);
  box(1.8, 9.6, 2.7, 11.4, 0, 0.42, mat.fabric); box(1.8, 9.6, 2.05, 11.4, 0.42, 0.85, mat.fabric, false);    // 카우치
  cyl(4.0, 10.1, 0.55, 0, 0.36, mat.stone);                                                                    // 원형 테이블
  box(1.3, 7.15, 5.3, 7.55, 0, 0.45, mat.wood);                                                                  // TV 콘솔
  box(2.2, 7.1, 4.4, 7.16, 1.0, 2.25, mat.screen, false);                                                        // TV
  box(6.6, 10.0, 7.5, 10.9, 0, 0.42, mat.leather); box(7.3, 10.0, 7.5, 10.9, 0.42, 0.8, mat.leather, false);    // 라운지 체어
  plant(0.55, 13.4); plant(7.9, 7.6, 1.1);
  cyl(7.7, 12.6, 0.02, 0, 1.6, mat.brass); cyl(7.7, 12.6, 0.2, 1.5, 1.75, mat.linen, false);                    // 플로어 램프

  // 주방·다이닝
  box(15.3, 7.3, 15.925, 13.0, 0, 0.9, mat.white); box(15.25, 7.3, 15.925, 13.0, 0.9, 0.94, mat.stone, false);   // 하부장 + 상판
  box(15.55, 7.3, 15.925, 13.0, 1.5, 2.3, mat.white, false);                                                     // 상부장
  box(11.0, 9.0, 14.0, 10.0, 0, 0.9, mat.wood); box(10.9, 8.95, 14.1, 10.05, 0.9, 0.95, mat.stone, false);      // 아일랜드
  for (const x of [11.5, 12.5, 13.5]) { cyl(x, 10.35, 0.18, 0, 0.72, mat.leather); }
  box(9.6, 11.6, 12.4, 12.6, 0.72, 0.77, mat.woodLight, false); box(9.8, 11.8, 12.2, 12.4, 0, 0.72, mat.black);  // 식탁
  for (const x of [10.1, 11.0, 11.9]) for (const z of [11.25, 12.95]) { box(x - 0.22, z - 0.22, x + 0.22, z + 0.22, 0, 0.46, mat.fabricDark); }
  for (const x of [10.4, 11.0, 11.6]) { cyl(x, 12.1, 0.12, 1.7, 1.86, mat.brass, false); cyl(x, 12.1, 0.006, 1.86, 3.0, mat.black, false); } // 펜던트

  // 안방
  box(16.08, 8.9, 18.3, 11.0, 0, 0.5, mat.linen); box(16.08, 8.75, 16.25, 11.15, 0, 1.2, mat.wood);            // 침대 + 헤드보드
  box(16.6, 8.95, 18.25, 10.95, 0.5, 0.56, mat.fabricDark, false);
  box(16.08, 8.2, 16.6, 8.65, 0, 0.55, mat.wood); box(16.08, 11.25, 16.6, 11.7, 0, 0.55, mat.wood);
  box(17.0, 8.6, 19.6, 11.3, 0, 0.012, mat.rug2, false);
  box(20.9, 6.0, 21.875, 7.8, 0, 0.42, mat.fabric);                                                           // 창가 벤치
  plant(21.4, 13.4, 1.2);

  // 침실 2
  box(6.9, 1.8, 8.925, 3.6, 0, 0.5, mat.linen); box(8.78, 1.65, 8.925, 3.75, 0, 1.1, mat.woodLight);
  box(4.7, 0.2, 5.6, 0.7, 0, 0.75, mat.woodLight);
  // 서재
  box(1.3, 0.25, 3.3, 1.0, 0.72, 0.76, mat.wood, false); box(1.4, 0.3, 1.5, 0.95, 0, 0.72, mat.black); box(3.1, 0.3, 3.2, 0.95, 0, 0.72, mat.black);
  colliders.push([1.3, 0.25, 3.3, 1.0]);
  box(1.9, 1.15, 2.5, 1.75, 0, 0.5, mat.leather);
  box(4.0, 1.0, 4.425, 4.8, 0, 2.4, mat.wood);                                                                  // 책장
  // 현관
  box(12.3, 1.0, 12.925, 2.6, 0, 0.85, mat.wood); plant(9.5, 4.9, 1.0);
  // 욕실
  box(15.4, 0.6, 15.925, 2.4, 0, 0.85, mat.white); box(15.35, 0.6, 15.925, 2.4, 0.85, 0.9, mat.stone, false);
  box(13.2, 3.8, 13.9, 4.4, 0, 0.42, mat.white);
  box(19.0, 0.25, 21.6, 1.15, 0, 0.6, mat.white);                                                               // 욕조
  box(21.3, 2.2, 21.875, 4.6, 0, 0.85, mat.wood); box(21.25, 2.2, 21.875, 4.6, 0.85, 0.9, mat.stone, false);
  // 드레스룸
  box(16.075, 0.2, 16.6, 5.0, 0, 2.4, mat.woodLight); box(17.9, 0.2, 18.425, 1.8, 0, 2.4, mat.woodLight); box(17.9, 3.1, 18.425, 5.0, 0, 2.4, mat.woodLight);
  box(16.7, 0.9, 17.3, 1.9, 0, 0.9, mat.wood);
  // 테라스 선베드
  for (const x of [3.0, 5.0]) { box(x - 0.35, 16.5, x + 0.35, 18.4, 0, 0.35, mat.white); }

  return { group: g, colliders };
}
