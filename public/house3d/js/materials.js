// 마감재 카탈로그 — 텍스처는 캔버스로 직접 그린다.
// scan 이 있는 마감은 실사 스캔(textures/, ambientCG CC0 — tools/textures.py 로 받음)을 쓴다:
//   mode 'surface' = 스캔 사진을 표면으로 깔고 규격대로 줄눈을 그린다(석재·콘크리트·미장)
//   mode 'detail'  = 그린 무늬(판 배치·쉐브론·루버) 위에 실제 결을 겹친다
//   두 경우 모두 표면 요철(normal)·광택 차이(roughness) 지도를 함께 쓴다. 스캔을 못 읽으면 그린 무늬로 돌아간다.
// 실제 자재 사진이 들어오면 entry.src 에 이미지 경로를 넣으면 그림 대신 그 이미지를 쓴다.
// size = 텍스처 한 장이 덮는 실제 크기(m). 모든 면의 UV가 m 단위라서 규격이 실제 비율로 깔린다.
import * as THREE from 'three';
import { getAdmin } from './store.js';

const PX = 512; // 줄눈 요철 지도 해상도
const HI = 1024; // 색 텍스처 한 변 해상도

// ── 도구 ──
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hash(a, b) { let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; }
function canvas(w = PX, h = PX) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function shade(hex, k) { // k: -1..1 밝기 변화
  const c = new THREE.Color(hex); const t = k > 0 ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0);
  return '#' + c.lerp(t, Math.abs(k)).getHexString();
}
// 이어 붙여도 경계가 안 보이는 부드러운 노이즈 (작은 격자를 3×3으로 깐 뒤 확대해서 가운데만 쓴다)
function noise(W, H, cx, cy, seed, alpha, light = '#fff', dark = '#000') {
  const r = rng(seed), s = canvas(cx * 3, cy * 3), g = s.getContext('2d');
  const vals = Array.from({ length: cx * cy }, r);
  for (let y = 0; y < cy * 3; y++) for (let x = 0; x < cx * 3; x++) {
    const v = vals[(y % cy) * cx + (x % cx)];
    g.fillStyle = v > 0.5 ? light : dark; g.globalAlpha = Math.abs(v - 0.5) * 2 * alpha; g.fillRect(x, y, 1, 1);
  }
  const out = canvas(W, H), o = out.getContext('2d');
  o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
  o.drawImage(s, -W, -H, W * 3, H * 3);
  return out;
}
// 가장자리를 넘는 도형은 반대편에도 그려서 이음매가 없게
function wrapDraw(W, H, x, y, w, h, fn) {
  for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) {
    if (x + dx + w < 0 || x + dx > W || y + dy + h < 0 || y + dy > H) continue;
    fn(x + dx, y + dy);
  }
}

// ── 그림 모음 ──
function veins(g, x, y, w, h, r, color, n, bold) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < n; i++) {
    let px = x + r() * w, py = y - h * 0.1; const ang = (r() - 0.5) * 1.6;
    g.beginPath(); g.moveTo(px, py);
    const steps = 14;
    for (let k = 0; k < steps; k++) {
      px += Math.sin(ang + (r() - 0.5) * 1.4) * w * 0.12; py += h * 1.2 / steps;
      g.lineTo(px, py);
    }
    g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, a] of [[bold * 6, 0.05], [bold * 2.4, 0.14], [bold * 0.9, 0.5]]) { g.lineWidth = lw; g.globalAlpha = a; g.stroke(); }
  }
  g.restore(); g.globalAlpha = 1;
}
function grid(g, W, H, cols, rows, grout, gw, bond = 0) {
  g.fillStyle = grout;
  const cw = W / cols, rh = H / rows;
  for (let j = 0; j <= rows; j++) g.fillRect(0, j * rh - gw / 2, W, gw);
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * bond * cw;
    for (let i = 0; i <= cols; i++) g.fillRect(((i * cw + off) % W) - gw / 2, j * rh, gw, rh);
  }
}
function groutBump(W, H, cols, rows, gw, bond = 0) {
  const c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); grid(g, W, H, cols, rows, '#000', gw * 1.4, bond);
  return c;
}
function tiled(W, H, cols, rows, bond, paint) { // 각 타일을 paint(g,x,y,w,h,i,j) 로 칠한다
  const c = canvas(W, H), g = c.getContext('2d');
  const cw = W / cols, rh = H / rows;
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
    const x = i * cw + (j % 2) * bond * cw;
    if (x >= W) continue;
    wrapDraw(W, H, x, j * rh, cw, rh, (xx, yy) => paint(g, xx, yy, cw, rh, (i + cols) % cols, j));
  }
  return c;
}

const draw = {
  marble({ base, vein, cols, rows, bond = 0, seed, n = 3, bold = 1, grout = '#cfcac2' }) {
    return (W, H) => {
      const c = tiled(W, H, cols, rows, bond, (g, x, y, w, h, i, j) => {
        const r = rng(seed + i * 31 + j * 97);
        g.fillStyle = shade(base, (r() - 0.5) * 0.06); g.fillRect(x, y, w, h);
        veins(g, x, y, w, h, r, vein, n, bold);
      });
      const g = c.getContext('2d');
      g.drawImage(noise(W, H, 16, 16, seed, 0.08), 0, 0);
      if (grout) grid(g, W, H, cols, rows, grout, 2, bond);
      return c;
    };
  },
  speckle({ base, cols, rows, seed, grout, dots = 900, dot = ['#ffffff', '#000000'] }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      g.drawImage(noise(W, H, 12, 12, seed, 0.12), 0, 0);
      g.drawImage(noise(W, H, 48, 48, seed + 1, 0.08), 0, 0);
      for (let i = 0; i < dots; i++) { g.globalAlpha = 0.15 + r() * 0.25; g.fillStyle = dot[i % dot.length]; g.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5); }
      g.globalAlpha = 1;
      if (grout) grid(g, W, H, cols, rows, grout, 2);
      return c;
    };
  },
  travertine({ base, cols, rows, bond, seed }) {
    return (W, H) => {
      const c = tiled(W, H, cols, rows, bond, (g, x, y, w, h, i, j) => {
        const r = rng(seed + i * 7 + j * 13);
        g.fillStyle = shade(base, (r() - 0.5) * 0.08); g.fillRect(x, y, w, h);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        for (let k = 0; k < 40; k++) { // 가로 결
          g.globalAlpha = 0.04 + r() * 0.08; g.fillStyle = r() > 0.5 ? '#8a7558' : '#fff7e8';
          g.fillRect(x, y + r() * h, w, 1 + r() * 4);
        }
        for (let k = 0; k < 18; k++) { g.globalAlpha = 0.25; g.fillStyle = '#7d6a50'; g.fillRect(x + r() * w, y + r() * h, 3 + r() * 14, 1.2); } // 기공
        g.restore(); g.globalAlpha = 1;
      });
      const g = c.getContext('2d');
      g.drawImage(noise(W, H, 8, 30, seed, 0.1), 0, 0);
      grid(g, W, H, cols, rows, '#b9a888', 2, bond);
      return c;
    };
  },
  planks({ base, rows, seed, dark = 0.18, len = [1, 2.2] }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
      const rh = H / rows;
      for (let j = 0; j < rows; j++) {
        let x = r() * W; const end = x + W;
        while (x < end) {
          const L = Math.min(end - x, W * (len[0] + r() * (len[1] - len[0])) / 2.4);
          const col = shade(base, (r() - 0.5) * dark), seedP = r() * 1000;
          wrapDraw(W, H, x, j * rh, L, rh, (xx, yy) => {
            g.save(); g.beginPath(); g.rect(xx, yy, L, rh); g.clip();
            g.fillStyle = col; g.fillRect(xx, yy, L, rh);
            const pr = rng(seedP);
            for (let k = 0; k < 26; k++) { // 나뭇결
              g.globalAlpha = 0.05 + pr() * 0.12; g.strokeStyle = pr() > 0.4 ? '#3b2412' : '#f3dcc0'; g.lineWidth = 0.6 + pr() * 1.4;
              const y0 = yy + pr() * rh, amp = pr() * 3, f = 0.005 + pr() * 0.02;
              g.beginPath(); for (let t = 0; t <= L; t += 8) g.lineTo(xx + t, y0 + Math.sin(t * f + k) * amp); g.stroke();
            }
            if (pr() > 0.75) { g.globalAlpha = 0.35; g.fillStyle = '#3a2210'; g.beginPath(); g.ellipse(xx + pr() * L, yy + rh / 2, 6, 3, 0, 0, 7); g.fill(); }
            g.restore();
            g.globalAlpha = 0.5; g.fillStyle = '#2a1a0c'; g.fillRect(xx, yy, 1.5, rh); g.globalAlpha = 1;
          });
          x += L;
        }
        g.globalAlpha = 0.55; g.fillStyle = '#2a1a0c'; g.fillRect(0, j * rh, W, 1.5); g.globalAlpha = 1;
      }
      return c;
    };
  },
  chevron({ base, seed, arm = 0.6, pw = 0.12 }) { // 캔버스 폭 = 2×arm, 높이 = n × pw√2
    return (W, H, S) => {
      const c = canvas(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
      const P = arm * S, wv = pw * Math.SQRT2 * S, bc = new THREE.Color(base);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const col = Math.floor(x / P), u = x - col * P, even = col % 2 === 0;
        const v = y + (even ? u : P - u), k = Math.floor(v / wv), f = (v - k * wv) / wv;
        const h = hash(col * 7 + 3, ((k % Math.round(H / wv)) + 100) % 100);
        let lum = 1 + (h - 0.5) * 0.35;
        lum *= 1 + Math.sin(f * 40 + h * 30 + Math.sin(u * 0.05) * 2) * 0.05 + Math.sin(f * 9 + h * 11) * 0.06;
        if (f < 0.03 || u < 1.2 || P - u < 1.2) lum *= 0.55;
        const i = (y * W + x) * 4;
        d[i] = Math.min(255, bc.r * 255 * lum); d[i + 1] = Math.min(255, bc.g * 255 * lum); d[i + 2] = Math.min(255, bc.b * 255 * lum); d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    };
  },
  hex({ base, grout, seed, alt }) { // 평평한 쪽이 위인 육각, 캔버스 = 3r×4 by √3r×7
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r0 = W / 12, rr = rng(seed);
      g.fillStyle = grout; g.fillRect(0, 0, W, H);
      const hy = Math.sqrt(3) * r0, rows = Math.round(H / hy);
      for (let i = 0; i < 8; i++) for (let j = -1; j <= rows; j++) {
        const cx = i * 1.5 * r0, cy = j * hy + (i % 2) * hy / 2;
        const col = alt && rr() > 0.82 ? alt : shade(base, (rr() - 0.5) * 0.06);
        wrapDraw(W, H, cx - r0, cy - r0, r0 * 2, r0 * 2, (x, y) => {
          g.beginPath();
          for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(x + r0 + Math.cos(a) * (r0 - 1.6), y + r0 + Math.sin(a) * (r0 - 1.6)); }
          g.fillStyle = col; g.fill();
        });
      }
      g.drawImage(noise(W, H, 16, 16, seed, 0.06), 0, 0);
      return c;
    };
  },
  checker({ a, b, va, vb, seed }) {
    return (W, H) => {
      const c = tiled(W, H, 2, 2, 0, (g, x, y, w, h, i, j) => {
        const dark = (i + j) % 2 === 1, r = rng(seed + i * 5 + j * 11);
        g.fillStyle = dark ? b : a; g.fillRect(x, y, w, h);
        veins(g, x, y, w, h, r, dark ? vb : va, 3, 0.8);
      });
      grid(c.getContext('2d'), W, H, 2, 2, '#9c968c', 2);
      return c;
    };
  },
  terrazzo({ base, chips, seed }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      g.drawImage(noise(W, H, 20, 20, seed, 0.08), 0, 0);
      for (let i = 0; i < 520; i++) {
        const x = r() * W, y = r() * H, s = 2 + r() ** 3 * 16, col = chips[Math.floor(r() * chips.length)];
        const pts = Array.from({ length: 5 + Math.floor(r() * 3) }, (_, k, arr) => { const a = (k / 7) * Math.PI * 2 + r() * 0.6; return [Math.cos(a) * s * (0.6 + r() * 0.4), Math.sin(a) * s * (0.6 + r() * 0.4)]; });
        wrapDraw(W, H, x - s, y - s, s * 2, s * 2, (xx, yy) => {
          g.beginPath(); pts.forEach(([px, py]) => g.lineTo(xx + s + px, yy + s + py)); g.closePath(); g.fillStyle = col; g.fill();
        });
      }
      return c;
    };
  },
  linen({ base, seed }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      for (let i = 0; i < W; i += 2) { g.globalAlpha = 0.03 + r() * 0.06; g.fillStyle = r() > 0.5 ? '#fff' : '#000'; g.fillRect(i, 0, 1, H); }
      for (let j = 0; j < H; j += 2) { g.globalAlpha = 0.03 + r() * 0.06; g.fillStyle = r() > 0.5 ? '#fff' : '#000'; g.fillRect(0, j, W, 1); }
      g.globalAlpha = 1; g.drawImage(noise(W, H, 10, 10, seed, 0.06), 0, 0);
      return c;
    };
  },
  stripe({ a, b, seed }) {
    return (W, H) => {
      const c = draw.linen({ base: a, seed })(W, H), g = c.getContext('2d');
      g.globalAlpha = 0.85; g.fillStyle = b;
      for (let x = 0; x < W; x += W / 4) { g.fillRect(x + W / 8 - W / 32, 0, W / 16, H); g.fillRect(x, 0, 2, H); }
      g.globalAlpha = 1;
      return c;
    };
  },
  damask({ base, ink, seed }) {
    return (W, H) => {
      const c = draw.linen({ base, seed })(W, H), g = c.getContext('2d');
      const motif = (cx, cy, s) => {
        g.save(); g.translate(cx, cy); g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = s * 0.035;
        for (const m of [1, -1]) { // 좌우 대칭 덩굴
          g.save(); g.scale(m, 1);
          g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.55, -s * 0.7, s * 0.5, -s * 0.15, s * 0.12, 0);
          g.bezierCurveTo(s * 0.55, s * 0.15, s * 0.55, s * 0.7, 0, s); g.stroke();
          g.beginPath(); g.ellipse(s * 0.36, -s * 0.42, s * 0.09, s * 0.2, 0.6, 0, 7); g.fill();
          g.beginPath(); g.ellipse(s * 0.36, s * 0.42, s * 0.09, s * 0.2, -0.6, 0, 7); g.fill();
          g.beginPath(); g.arc(s * 0.62, 0, s * 0.16, Math.PI * 0.6, Math.PI * 2.1); g.stroke();
          g.restore();
        }
        g.beginPath(); g.ellipse(0, 0, s * 0.11, s * 0.28, 0, 0, 7); g.fill();
        g.restore();
      };
      g.globalAlpha = 0.55;
      const s = W * 0.34;
      motif(W / 2, H / 2, s); motif(0, 0, s); motif(W, 0, s); motif(0, H, s); motif(W, H, s);
      g.globalAlpha = 1;
      return c;
    };
  },
  slats({ base, gap = '#1d140c', n = 10, vertical = true, seed }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
      const step = (vertical ? W : H) / n;
      for (let i = 0; i < n; i++) {
        const col = shade(base, (r() - 0.5) * 0.18);
        const [x, y, w, h] = vertical ? [i * step, 0, step * 0.68, H] : [0, i * step, W, step * 0.68];
        g.fillStyle = gap; vertical ? g.fillRect(i * step, 0, step, H) : g.fillRect(0, i * step, W, step);
        g.fillStyle = col; g.fillRect(x, y, w, h);
        for (let k = 0; k < 10; k++) { g.globalAlpha = 0.06 + r() * 0.1; g.fillStyle = r() > 0.5 ? '#2b190b' : '#f6e2c4';
          vertical ? g.fillRect(x + r() * w, 0, 1 + r(), H) : g.fillRect(0, y + r() * h, W, 1 + r()); }
        g.globalAlpha = 0.35; g.fillStyle = '#fff'; vertical ? g.fillRect(x, 0, 1.5, H) : g.fillRect(0, y, W, 1.5); g.globalAlpha = 1;
      }
      return c;
    };
  },
  concrete({ base, seed, holes = true }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      g.drawImage(noise(W, H, 6, 4, seed, 0.18), 0, 0);
      g.drawImage(noise(W, H, 30, 20, seed + 3, 0.1), 0, 0);
      for (let i = 0; i < 400; i++) { g.globalAlpha = 0.25; g.fillStyle = '#4a4a46'; g.beginPath(); g.arc(r() * W, r() * H, 0.4 + r() * 1.3, 0, 7); g.fill(); }
      g.globalAlpha = 0.5; g.fillStyle = '#5a5955';
      g.fillRect(0, 0, W, 1.5); g.fillRect(0, 0, 1.5, H);
      if (holes) for (const [fx, fy] of [[1 / 6, 1 / 4], [1 / 2, 1 / 4], [5 / 6, 1 / 4], [1 / 6, 3 / 4], [1 / 2, 3 / 4], [5 / 6, 3 / 4]]) {
        g.globalAlpha = 0.6; g.fillStyle = '#3d3c39'; g.beginPath(); g.arc(fx * W, fy * H, W * 0.008, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      return c;
    };
  },
  brick({ base, mortar, seed }) {
    return (W, H) => {
      const rows = 16, cols = 4;
      const c = tiled(W, H, cols, rows, 0.5, (g, x, y, w, h, i, j) => {
        const r = rng(seed + i * 17 + j * 3);
        g.fillStyle = shade(base, (r() - 0.5) * 0.3); g.fillRect(x, y, w, h);
        for (let k = 0; k < 12; k++) { g.globalAlpha = 0.15; g.fillStyle = r() > 0.5 ? '#000' : '#fff'; g.fillRect(x + r() * w, y + r() * h, 2, 2); }
        g.globalAlpha = 1;
      });
      grid(c.getContext('2d'), W, H, cols, rows, mortar, 5, 0.5);
      return c;
    };
  },
  stucco({ base, seed }) {
    return (W, H) => {
      const c = canvas(W, H), g = c.getContext('2d');
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      g.drawImage(noise(W, H, 40, 40, seed, 0.1), 0, 0);
      g.drawImage(noise(W, H, 8, 8, seed + 1, 0.06), 0, 0);
      return c;
    };
  },
};

// ── 카탈로그 ──
// cats: 이 마감을 고를 수 있는 면. spec 은 참고용 규격 표기.
const PAINTS = [
  ['paint-white', '퓨어 화이트', '#f4f3ef'], ['paint-warmwhite', '웜 화이트', '#ece6da'], ['paint-greige', '그레이지', '#cfc7ba'],
  ['paint-sage', '세이지 그린', '#a9b39c'], ['paint-dusty', '더스티 블루', '#9aa8b5'], ['paint-terracotta', '테라코타', '#c08a6c'],
  ['paint-navy', '딥 네이비', '#2f3a4c'], ['paint-charcoal', '차콜', '#3c3b39'],
];

export const CATALOG = [
  // 바닥
  { id: 'marble-white', name: '화이트 마블 포세린', group: '타일', cats: ['floor', 'wall'], size: [1.2, 1.2], spec: '600×1200 폴리싱', rough: 0.12,
    gen: draw.marble({ base: '#f1eee8', vein: '#8f8a84', cols: 2, rows: 1, seed: 11 }), scan: { a: 'Marble021', m: 1.2, cells: [2, 1], grout: '#cfcac2' }, bump: groutBump(PX, PX, 2, 1, 2) },
  { id: 'marble-checker', name: '블랙&화이트 체커', group: '타일', cats: ['floor'], size: [1.2, 1.2], spec: '600×600 대리석', rough: 0.14,
    gen: draw.checker({ a: '#efece6', b: '#1d1d1f', va: '#8d8780', vb: '#d6d1c9', seed: 5 }), bump: groutBump(PX, PX, 2, 2, 2) },
  { id: 'stone-grey', name: '차콜 스톤', group: '타일', cats: ['floor', 'wall'], size: [1.2, 1.2], spec: '600×600 무광', rough: 0.7,
    gen: draw.speckle({ base: '#55565a', cols: 2, rows: 2, seed: 4, grout: '#3a3b3e' }), scan: { a: 'Concrete034', m: 1.1, cells: [2, 2], grout: '#3a3b3e', tint: '#66676c' }, bump: groutBump(PX, PX, 2, 2, 2) },
  { id: 'stone-travertine', name: '트래버틴', group: '타일', cats: ['floor', 'wall'], size: [2.4, 1.2], spec: '600×1200 혼드', rough: 0.55,
    gen: draw.travertine({ base: '#d9c7a7', cols: 2, rows: 2, bond: 0.5, seed: 8 }), scan: { a: 'Travertine009', m: 1.2, cells: [2, 2, 0.5], grout: '#b9a888' }, bump: groutBump(PX, PX, 2, 2, 2, 0.5) },
  { id: 'terrazzo', name: '테라조', group: '타일', cats: ['floor', 'wall'], size: [1.0, 1.0], spec: '현장 시공', rough: 0.35,
    gen: draw.terrazzo({ base: '#e9e3d8', chips: ['#9b8f80', '#c7bba9', '#6f6a63', '#b48d72', '#ffffff'], seed: 3 }), scan: { a: 'Terrazzo013', m: 1.0 } },
  { id: 'hex-white', name: '헥사곤 화이트', group: '타일', cats: ['floor', 'wall'], size: [1.2, 1.2124], spec: '200 헥사곤', rough: 0.3,
    gen: draw.hex({ base: '#f2f1ec', grout: '#b8b4ac', seed: 9, alt: '#d8d4cc' }) },
  { id: 'oak-plank', name: '오크 원목마루', group: '마루', cats: ['floor', 'wall'], size: [2.4, 1.14], spec: '190×1900 광폭', rough: 0.55,
    gen: draw.planks({ base: '#c49a6c', rows: 6, seed: 21 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 1.2, mix: 0.5 } },
  { id: 'oak-smoked', name: '스모크 오크', group: '마루', cats: ['floor'], size: [2.4, 1.14], spec: '190×1900 오일', rough: 0.6,
    gen: draw.planks({ base: '#7a5a3f', rows: 6, seed: 22 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 1.2, mix: 0.5 } },
  { id: 'chevron-walnut', name: '월넛 쉐브론', group: '마루', cats: ['floor'], size: [1.2, 1.188], spec: '120×600 쉐브론', rough: 0.5,
    gen: draw.chevron({ base: '#7b5537', seed: 1 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 0.6, mix: 0.35 } },
  { id: 'chevron-oak', name: '내추럴 오크 쉐브론', group: '마루', cats: ['floor'], size: [1.2, 1.188], spec: '120×600 쉐브론', rough: 0.5,
    gen: draw.chevron({ base: '#c9a57b', seed: 2 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 0.6, mix: 0.35 } },

  // 벽
  ...PAINTS.map(([id, name, color]) => ({ id, name, group: '도장', cats: ['wall', 'ceiling'], color, spec: '친환경 수성 무광', rough: 0.92, paint: true })),
  { id: 'linen-paper', name: '린넨 실크벽지', group: '벽지', cats: ['wall'], size: [0.5, 0.5], spec: '실크 1,060mm 폭', rough: 0.8,
    gen: draw.linen({ base: '#ddd5c7', seed: 31 }), scan: { a: 'Fabric082A', mode: 'detail', m: 0.5, mix: 0 } },
  { id: 'linen-grey', name: '린넨 그레이', group: '벽지', cats: ['wall'], size: [0.5, 0.5], spec: '실크 1,060mm 폭', rough: 0.8,
    gen: draw.linen({ base: '#a8a6a2', seed: 32 }), scan: { a: 'Fabric082A', mode: 'detail', m: 0.5, mix: 0 } },
  { id: 'stripe-paper', name: '리젠시 스트라이프', group: '벽지', cats: ['wall'], size: [0.4, 0.4], spec: '실크 1,060mm 폭', rough: 0.75,
    gen: draw.stripe({ a: '#e7e1d4', b: '#cfc4b0', seed: 33 }) },
  { id: 'damask-paper', name: '다마스크', group: '벽지', cats: ['wall'], size: [0.53, 0.53], spec: '실크 1,060mm 폭', rough: 0.7,
    gen: draw.damask({ base: '#3e4a45', ink: '#9da88f', seed: 34 }) },
  { id: 'damask-ivory', name: '다마스크 아이보리', group: '벽지', cats: ['wall'], size: [0.53, 0.53], spec: '실크 1,060mm 폭', rough: 0.7,
    gen: draw.damask({ base: '#ece5d6', ink: '#c9b994', seed: 35 }) },
  { id: 'marble-slab', name: '칼라카타 대판', group: '석재·패널', cats: ['wall', 'floor'], size: [1.2, 2.4], spec: '1200×2400 포세린 대판', rough: 0.1,
    gen: draw.marble({ base: '#f3f0ea', vein: '#9a8566', cols: 1, rows: 1, seed: 41, n: 4, bold: 2.2, grout: '#d9d4cc' }), scan: { a: 'Marble014', m: 2.4, cells: [1, 1], grout: '#d9d4cc' } },
  { id: 'marble-nero', name: '네로 마르퀴나', group: '석재·패널', cats: ['wall', 'floor'], size: [1.2, 2.4], spec: '1200×2400 포세린 대판', rough: 0.12,
    gen: draw.marble({ base: '#1c1c1e', vein: '#d8d4cc', cols: 1, rows: 1, seed: 42, n: 3, bold: 1.6, grout: '#333' }), scan: { a: 'Marble016', m: 2.4, cells: [1, 1], grout: '#333' } },
  { id: 'wood-slat', name: '월넛 슬랫 패널', group: '석재·패널', cats: ['wall', 'ceiling'], size: [0.6, 1.2], spec: '40×20 루버', rough: 0.6,
    gen: draw.slats({ base: '#6d4a2f', seed: 43 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 0.6, mix: 0.4, rot: true } },
  { id: 'concrete', name: '노출 콘크리트', group: '석재·패널', cats: ['wall', 'ceiling', 'exterior'], size: [1.8, 0.9], spec: '1800×900 패널', rough: 0.85,
    gen: draw.concrete({ base: '#a6a49f', seed: 44 }), scan: { a: 'Concrete034', m: 1.1, cells: [1, 1], grout: '#8d8b86' } },
  { id: 'subway-white', name: '서브웨이 화이트', group: '타일', cats: ['wall'], size: [0.6, 0.3], spec: '75×150 유광', rough: 0.15,
    gen: draw.marble({ base: '#f6f5f1', vein: '#e2e0da', cols: 4, rows: 4, bond: 0.5, seed: 45, n: 0, grout: '#bdb9b1' }), bump: groutBump(PX, PX, 4, 4, 3, 0.5) },
  { id: 'subway-green', name: '서브웨이 딥그린', group: '타일', cats: ['wall'], size: [0.6, 0.3], spec: '75×150 유광', rough: 0.15,
    gen: draw.marble({ base: '#2f4f45', vein: '#2b463e', cols: 4, rows: 4, bond: 0.5, seed: 46, n: 0, grout: '#c9c5bb' }), bump: groutBump(PX, PX, 4, 4, 3, 0.5) },

  // 천장
  { id: 'ceil-white', name: '천장 화이트', group: '도장', cats: ['ceiling'], color: '#f6f5f2', spec: '무광 수성', rough: 0.95, paint: true },
  { id: 'ceil-oak', name: '오크 루버 천장', group: '석재·패널', cats: ['ceiling'], size: [1.2, 0.6], spec: '40×20 루버', rough: 0.6,
    gen: draw.slats({ base: '#c49a6c', gap: '#3a2a1a', vertical: false, seed: 51 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 0.6, mix: 0.4 } },

  // 외장
  { id: 'ext-stucco', name: '화이트 스타코', group: '외장', cats: ['exterior'], size: [1, 1], spec: '수성 스타코', rough: 0.95,
    gen: draw.stucco({ base: '#ece9e2', seed: 61 }), scan: { a: 'Plaster001', m: 1.0 } },
  { id: 'ext-limestone', name: '라임스톤 패널', group: '외장', cats: ['exterior'], size: [2.4, 1.2], spec: '600×1200 버너', rough: 0.8,
    gen: draw.travertine({ base: '#d8cfbc', cols: 2, rows: 2, bond: 0, seed: 62 }), scan: { a: 'Travertine009', m: 1.2, cells: [2, 2], grout: '#b9a888', tint: '#f2eee6' } },
  { id: 'ext-brick', name: '다크 브릭', group: '외장', cats: ['exterior'], size: [1.04, 1.04], spec: '230×60 고벽돌', rough: 0.9,
    gen: draw.brick({ base: '#4c3a33', mortar: '#8f8a82', seed: 63 }), scan: { a: 'Bricks061', m: 1.04, tint: '#a58272' } },
  { id: 'ext-cedar', name: '시더 사이딩', group: '외장', cats: ['exterior'], size: [1.2, 2.4], spec: '140 세로 사이딩', rough: 0.75,
    gen: draw.slats({ base: '#9c6d45', gap: '#3b2616', n: 8, seed: 64 }), scan: { a: 'WoodFloor062', mode: 'detail', m: 0.6, mix: 0.4, rot: true } },
  { id: 'ext-basalt', name: '제주 현무암', group: '외장', cats: ['exterior', 'wall'], size: [1.2, 0.6], spec: '300×600 버너', rough: 0.95,
    gen: draw.speckle({ base: '#45464a', cols: 2, rows: 2, seed: 65, grout: '#2c2d30', dots: 2600, dot: ['#1b1b1d', '#6a6b70', '#0f0f10'] }), bump: groutBump(PX, PX, 2, 2, 2) },
];

// 시공비 포함 ㎡당 예시 단가(원). 실제 업체 단가는 관리자 화면(admin.html)에서 바꾼다.
const BASE_PRICE = {
  'marble-white': 160000, 'marble-checker': 220000, 'stone-grey': 140000, 'stone-travertine': 230000, terrazzo: 260000, 'hex-white': 150000,
  'oak-plank': 180000, 'oak-smoked': 200000, 'chevron-walnut': 280000, 'chevron-oak': 240000,
  'linen-paper': 30000, 'linen-grey': 30000, 'stripe-paper': 38000, 'damask-paper': 45000, 'damask-ivory': 45000,
  'marble-slab': 380000, 'marble-nero': 420000, 'wood-slat': 210000, concrete: 160000, 'subway-white': 120000, 'subway-green': 130000,
  'ceil-white': 22000, 'ceil-oak': 190000,
  'ext-stucco': 90000, 'ext-limestone': 260000, 'ext-brick': 170000, 'ext-cedar': 190000, 'ext-basalt': 240000,
};
const PAINT_PRICE = 25000;
for (const m of CATALOG) m.basePrice = BASE_PRICE[m.id] ?? (m.paint ? PAINT_PRICE : 100000);

// 업체가 바꾼 이름·규격·단가·사진·숨김을 반영한다. 처음엔 이 브라우저 값으로, 체험 화면은 서버 값을 받아 다시 부른다.
for (const m of CATALOG) m.base = { name: m.name, spec: m.spec };
export let ADMIN = { prices: {}, edits: {}, hidden: [] };
export function applyAdmin(a = {}) {
  ADMIN = { prices: {}, edits: {}, hidden: [], ...a };
  for (const m of CATALOG) {
    const e = ADMIN.edits[m.id] || {};
    m.name = e.name || m.base.name; m.spec = e.spec || m.base.spec;
    if (e.src) m.src = e.src; else delete m.src;
    m.price = ADMIN.prices[m.id] ?? m.basePrice;
    m.hidden = ADMIN.hidden.includes(m.id);
  }
}
applyAdmin(getAdmin());
export const priceOf = (id) => resolveEntry(id).price ?? PAINT_PRICE;

export const BY_ID = Object.fromEntries(CATALOG.map((m) => [m.id, m]));

// 사용자가 고른 임의 색 도장: 'paint#rrggbb'
export function resolveEntry(id) {
  if (BY_ID[id]) return BY_ID[id];
  if (id.startsWith('paint#')) return { id, name: '맞춤 도장 ' + id.slice(5).toUpperCase(), group: '도장', cats: ['wall', 'ceiling'], color: id.slice(5), spec: '조색 · 친환경 수성 무광', rough: 0.92, paint: true, price: ADMIN.prices['paint-white'] ?? PAINT_PRICE };
  return BY_ID['paint-white'];
}

// ── 텍스처·재질 만들기 (처음 쓸 때 한 번만) ──
const canvases = new Map(), materials = new Map();
let maxAniso = 8;
export function setAnisotropy(n) { maxAniso = n; }

// ── 실사 스캔 ──
const SCANS = new Map(); // 자산 → { c, n, r } (Image)
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const scanUrl = (a, k) => new URL(`../textures/${a}_${k}.jpg`, import.meta.url).href;
// 색 지도만 먼저 읽는다(견본 칩·첫 화면에 필요). 결·광택 지도는 그 재질을 처음 쓸 때 읽는다.
export function loadScans() {
  const ids = [...new Set(CATALOG.filter((e) => e.scan).map((e) => e.scan.a))];
  return Promise.all(ids.map((a) => loadImg(scanUrl(a, 'c')).then((c) => SCANS.set(a, { c }), () => {})));
}
const extras = new Map();
function scanExtras(a) {
  if (!extras.has(a)) extras.set(a, Promise.all(['n', 'r'].map((k) => loadImg(scanUrl(a, k)).catch(() => null)))
    .then(([n, r]) => Object.assign(SCANS.get(a), { n, r })));
  return extras.get(a);
}
// 스캔 한 장을 텍스처 캔버스에 깐다. kind: 'c'(색) | 'n'(요철) | 'r'(광택)
// 캔버스 경계에서 이음매가 없도록 가로·세로 반복 횟수를 정수로 맞추고, 줄눈이 있으면 칸마다 다른 부분을 쓴다.
function scanCanvas(e, img, kind, under) {
  const s = e.scan, W = HI, H = Math.round(HI * e.size[1] / e.size[0]);
  const c = canvas(W, H), g = c.getContext('2d');
  const pat = g.createPattern(img, 'repeat');
  const kx = Math.max(1, Math.round(e.size[0] / s.m)), ky = Math.max(1, Math.round(e.size[1] / s.m));
  const sx = W / kx / img.width, sy = H / ky / img.height;
  const place = (ox, oy) => pat.setTransform(s.rot ? new DOMMatrix().translate(ox, oy).rotate(90).translate(0, -img.height * sx).scale(sx, sy)
    : new DOMMatrix().translate(ox, oy).scale(sx, sy));
  if (s.mode === 'detail') {
    if (kind === 'c') {
      g.drawImage(under, 0, 0, W, H);
      if (s.mix) { place(0, 0); g.globalCompositeOperation = 'overlay'; g.globalAlpha = s.mix; g.fillStyle = pat; g.fillRect(0, 0, W, H); }
    } else { place(0, 0); g.fillStyle = pat; g.fillRect(0, 0, W, H); }
    return c;
  }
  const [cols, rows, bond = 0] = s.cells || [1, 1], cw = W / cols, rh = H / rows, r = rng(e.id.length * 977 + cols * 31);
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
    const x = i * cw + (j % 2) * bond * cw; if (x >= W) continue;
    const ox = r() * W, oy = r() * H, lum = (r() - 0.5) * 0.08;
    wrapDraw(W, H, x, j * rh, cw, rh, (xx, yy) => {
      g.save(); g.beginPath(); g.rect(xx, yy, cw, rh); g.clip();
      place(s.cells ? xx + ox : 0, s.cells ? yy + oy : 0); g.fillStyle = pat; g.fillRect(xx, yy, cw, rh);
      if (kind === 'c' && s.cells && lum) { g.globalAlpha = Math.abs(lum); g.fillStyle = lum > 0 ? '#fff' : '#000'; g.fillRect(xx, yy, cw, rh); }
      g.restore();
    });
  }
  if (kind === 'c' && s.tint) { g.globalCompositeOperation = 'multiply'; g.fillStyle = s.tint; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  if (s.cells) grid(g, W, H, cols, rows, kind === 'c' ? s.grout : kind === 'n' ? '#8080ff' : '#f0f0f0', 3, bond);
  return c;
}
function meanLuma(img) { const c = canvas(8, 8), g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += d[i]; return t / 64 / 255; }

function baseCanvas(e) {
  if (!canvases.has(e.id)) {
    const W = HI, H = Math.round(HI * e.size[1] / e.size[0]);
    let c = e.gen(W, H, W / e.size[0]);
    const sc = e.scan && SCANS.get(e.scan.a);
    if (sc) c = scanCanvas(e, sc.c, 'c', c);
    canvases.set(e.id, c);
  }
  return canvases.get(e.id);
}
function tex(c, e, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / e.size[0], 1 / e.size[1]);
  t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function getMaterial(id) {
  if (materials.has(id)) return materials.get(id);
  const e = resolveEntry(id);
  // 광택 마감은 환경 반사가 덩어리져 보이지 않게 약간 무디게
  const rough = e.rough ?? 0.8;
  const m = new THREE.MeshStandardMaterial({ roughness: Math.max(rough, 0.2), metalness: 0, envMapIntensity: rough < 0.3 ? 0.55 : 1 });
  if (e.paint) m.color.set(e.color);
  else if (e.src) { new THREE.TextureLoader().load(e.src, (t) => { Object.assign(t, tex(t.image, e, true)); m.map = t; m.needsUpdate = true; }); }
  else {
    m.map = tex(baseCanvas(e), e, true);
    if (e.scan && SCANS.has(e.scan.a)) { // 요철·광택 지도는 받는 대로 붙인다
      scanExtras(e.scan.a).then(({ n, r }) => {
        if (n) { m.normalMap = tex(scanCanvas(e, n, 'n'), e, false); const k = e.scan.ns ?? 0.7; m.normalScale.set(k, k); }
        if (r) { m.roughnessMap = tex(scanCanvas(e, r, 'r'), e, false); m.roughness = Math.min(1, Math.max(rough, 0.2) / Math.max(0.15, meanLuma(r))); }
        m.needsUpdate = true;
      });
    } else if (e.bump) { m.bumpMap = tex(e.bump, e, false); m.bumpScale = 1.2; }
  }
  materials.set(id, m);
  return m;
}

// 견본 이미지 (패널의 칩)
const thumbs = new Map();
export function thumb(id) {
  if (thumbs.has(id)) return thumbs.get(id);
  const e = resolveEntry(id);
  const c = canvas(120, 120), g = c.getContext('2d');
  if (e.src) { thumbs.set(id, e.src); return e.src; } // 업체가 올린 실제 자재 사진
  if (e.paint) { g.fillStyle = e.color; g.fillRect(0, 0, 120, 120); }
  else {
    const src = baseCanvas(e);
    // 칩 한 장이 실제 0.9m 정도를 보여 주도록 잘라 쓴다 (큰 패턴은 일부만)
    const span = Math.min(e.size[0], 0.9), sw = src.width * span / e.size[0];
    g.drawImage(src, 0, 0, sw, sw, 0, 0, 120, 120);
  }
  const url = c.toDataURL('image/jpeg', 0.85);
  thumbs.set(id, url);
  return url;
}
