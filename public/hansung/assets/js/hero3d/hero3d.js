// 메인 첫 화면 3D 도면 — prototypes/blueprint-3d 에서 옮겨 왔다.
// 장면 구성은 Three.js, 시간·스크롤 진행은 Anime.js가 맡는다.
// Anime.js는 DOM뿐 아니라 일반 JS 객체(state)의 숫자도 움직일 수 있어서,
// state 값을 스크롤에 동기화하고 매 프레임 그 값을 읽어 3D 장면에 반영한다.
import * as THREE from './vendor/three.module.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createTimeline, animate, onScroll, stagger, utils } from './vendor/anime.esm.min.js';
import { buildTrailer, REF, AXLES, MAT, LINE_MAT } from './trailer.js';

if (document.documentElement.classList.contains('has-3d') && document.getElementById('h3')) init();

function init() {
const $ = (s) => document.querySelector(s);
const root = $('#h3');
const canvas = $('#h3-gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
catch (e) { document.documentElement.classList.remove('has-3d'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.5 : 2)); // 휴대폰은 1.5배로 제한해 발열·배터리 부담을 줄인다
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(8, 12, 9); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fb4c8, 1.6); rim.position.set(-10, 4, -8); scene.add(rim);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
const trailer = buildTrailer();
scene.add(trailer);
const parts = trailer.children;
const wheels = [];
trailer.traverse((o) => { if (o.userData.wheel) wheels.push(o); });

// 바닥: 어두운 장면에서는 접지 그림자, 밝은 장면에서는 도면 격자
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(.55, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(18, 6.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.set(REF.L / 2, 0.002, 0); scene.add(shadow);
const grid = new THREE.GridHelper(48, 96, 0x5d666d, 0x8c959b);
grid.position.set(REF.L / 2, 0, 0);
grid.material.transparent = true; grid.material.opacity = 0; grid.material.depthWrite = false;
scene.add(grid);

// ── 애니메이션 상태: Anime.js가 이 숫자들을 움직인다 ──
// 역방향: 정측면 선 도면(치수) → 입체로 돌며 분해 → 어두워지며 실물 → 재조립
const S = {
  az: 0, el: 0, dist: 41, fov: 13, ty: -1.0, shift: 0,              // 카메라 (정측면 망원)
  explode: 0, solid: 0, draw: 1, light: 1, dims: 1, roll: 0,         // 장면
  introDraw: 0, introDims: 0, introDist: 0, tease: 0,                          // 첫 진입 연출 (스크롤과 별도, 곱해서 적용)
};
const DARK = new THREE.Color(0x101315), PAPER = new THREE.Color(0xecedea), BG = new THREE.Color();
const LINE_DARK = new THREE.Color(0xaab3b9), LINE_LIGHT = new THREE.Color(0x4f585e);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const maxOrder = Math.max(...parts.map((p) => p.userData.order));

// 치수선 오버레이 (SVG, 3D 좌표를 화면에 투영해 매 프레임 갱신)
const svg = $('#h3-dims');
const DIMS = [
  { a: [AXLES[2], -0.28, 0], b: [AXLES[1], -0.28, 0], t: '1,310' },
  { a: [AXLES[1], -0.28, 0], b: [AXLES[0], -0.28, 0], t: '1,310' },
  { a: [AXLES[0], -0.28, 0], b: [REF.kingpin, -0.28, 0], t: '7,670' },
  { a: [0, -0.78, 0], b: [REF.L, -0.78, 0], t: '12,390' },
  { a: [REF.L + 0.55, 0, 0], b: [REF.L + 0.55, REF.H, 0], t: '1,500', v: true },
];
const EXT = [[AXLES[2], 0, -0.36], [AXLES[1], 0, -0.36], [AXLES[0], 0, -0.36], [REF.kingpin, 1.1, -0.36], [0, 0.5, -0.86], [REF.L, 1.5, -0.86]];
DIMS.forEach((d) => {
  d.line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); svg.appendChild(d.line);
  d.txt = document.createElement('span'); d.txt.className = 'h3-dim-t' + (d.v ? ' v' : ''); d.txt.textContent = d.t; $('#h3-dimtxt').appendChild(d.txt);
  d.ca = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); d.ca.setAttribute('r', 2.5); svg.appendChild(d.ca);
  d.cb = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); d.cb.setAttribute('r', 2.5); svg.appendChild(d.cb);
});
EXT.forEach((e) => { e.line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); e.line.setAttribute('class', 'ext'); svg.appendChild(e.line); });
const v3 = new THREE.Vector3();
function project(p, w, h) { v3.set(p[0], p[1], p[2]).project(camera); return [(v3.x + 1) / 2 * w, (1 - v3.y) / 2 * h]; }

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
}
new ResizeObserver(resize).observe(canvas); resize();

const target = new THREE.Vector3();
let progress = 0;
let visible = true;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(root);
function frame(t) {
  if (!visible) { requestAnimationFrame(frame); return; }
  const w = canvas.clientWidth, h = canvas.clientHeight, aspect = w / h, narrow = w < 760;

  // 카메라: 방위각·고도·거리. 좁은 화면에서는 트레일러가 잘리지 않게 거리를 늘린다
  const side = clamp01((34 - S.fov) / 21);           // 0: 입체 시점, 1: 정측면 망원
  // 좁은 화면: 정측면은 트레일러가 폭을 거의 채우게, 입체 시점은 조금 더 가깝게
  const fit = narrow ? Math.max(1, (1.2 + 0.52 * side) / aspect) : Math.max(1, (1.3 + 0.55 * side) / aspect);
  const az = S.az + Math.sin(t / 2600) * 0.025 * S.solid;
  const dist = (S.dist + S.introDist) * fit;
  target.set(REF.L / 2, S.ty, 0);
  camera.position.set(target.x + dist * Math.cos(S.el) * Math.sin(az), target.y + dist * Math.sin(S.el), dist * Math.cos(S.el) * Math.cos(az));
  camera.fov = S.fov;
  camera.lookAt(target);
  const sh = narrow ? 0 : S.shift;
  camera.setViewOffset(w, h, -sh * w, narrow ? 0.14 * h * S.solid : 0, w, h);
  camera.updateProjectionMatrix();

  // 스크롤 전에는 부품이 살짝 들썩이며 "내리면 분해된다"를 예고한다
  const idle = clamp01(1 - progress * 40);
  // 부품 분해: 부품마다 시차를 두어 순서대로 벌어진다
  parts.forEach((p) => {
    const d = p.userData; if (!d.explode) return;
    const k = ease(clamp01((S.explode + S.tease * idle - (d.order / maxOrder) * 0.35) / 0.65));
    p.position.copy(d.base).addScaledVector(d.explode, k);
    // 선 그리기: 부품 순서대로 선이 그어진다
    const dk = clamp01((S.draw * S.introDraw - (d.order / maxOrder) * 0.45) / 0.55);
    d.lines.forEach((ls) => ls.geometry.setDrawRange(0, Math.floor(ls.userData.count * dk / 2) * 2));
  });
  wheels.forEach((wh) => { wh.rotation.z = S.roll; });

  // 재질: 실물 렌더 ↔ 선 도면
  const op = S.solid;
  Object.values(MAT).forEach((m) => {
    const tr = op < 0.999;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    m.opacity = op; m.depthWrite = op > 0.35;
  });
  trailer.traverse((o) => { if (o.isMesh) o.visible = op > 0.003; });
  LINE_MAT.opacity = Math.min(1, S.draw * S.introDraw * 3) * (0.55 + 0.45 * S.light);
  LINE_MAT.color.copy(LINE_DARK).lerp(LINE_LIGHT, S.light);
  BG.copy(DARK).lerp(PAPER, S.light);
  renderer.setClearColor(BG);
  const lightUI = S.light > 0.5;
  root.style.setProperty('--h3-bg', '#' + BG.getHexString());
  root.style.setProperty('--h3-fg', lightUI ? '#15191C' : '#FFFFFF');
  root.style.setProperty('--h3-fg-2', lightUI ? 'rgba(21,25,28,.3)' : 'rgba(255,255,255,.3)');
  root.classList.toggle('is-dark', !lightUI);
  shadow.material.opacity = (1 - S.light) * 0.9 * op;
  grid.material.opacity = S.light * 0.22 * clamp01(S.el / 0.18);
  grid.visible = grid.material.opacity > 0.005;
  shadow.visible = shadow.material.opacity > 0.005;

  renderer.render(scene, camera);

  // 치수선
  const dims = S.dims * S.introDims;
  svg.style.opacity = dims > 0 ? 1 : 0;
  DIMS.forEach((d, i) => {
    const k = ease(clamp01(dims * 1.6 - i * 0.15));
    const [ax, ay] = project(d.a, w, h), [bx, by] = project(d.b, w, h);
    const ex = ax + (bx - ax) * k, ey = ay + (by - ay) * k;
    d.line.setAttribute('x1', ax); d.line.setAttribute('y1', ay); d.line.setAttribute('x2', ex); d.line.setAttribute('y2', ey);
    d.ca.setAttribute('cx', ax); d.ca.setAttribute('cy', ay); d.cb.setAttribute('cx', ex); d.cb.setAttribute('cy', ey);
    d.ca.style.opacity = k > 0 ? 1 : 0; d.cb.style.opacity = k > 0 ? 1 : 0;
    d.txt.style.opacity = narrow && i < 2 ? 0 : clamp01(k * 2 - 1); // 좁은 화면에선 1,310 두 개가 겹쳐 숨긴다
    d.txt.style.transform = `translate(${(ax + bx) / 2}px, ${(ay + by) / 2}px)`;
  });
  EXT.forEach((e, i) => {
    const k = clamp01(dims * 2 - 0.2);
    const [x, y0] = project([e[0], e[1], 0], w, h), [, y1] = project([e[0], e[2], 0], w, h);
    e.line.setAttribute('x1', x); e.line.setAttribute('x2', x); e.line.setAttribute('y1', y0); e.line.setAttribute('y2', y0 + (y1 - y0) * k);
  });

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ── 1) 첫 진입: 정측면 도면이 선으로 그려지고 치수가 붙는다 (스크롤과 무관) ──
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seekTo = (location.hash.match(/s=([\d.]+)/) || [])[1];
if (!reduce && !seekTo) {
  utils.set(S, { introDist: 6 });
  animate(S, { introDraw: [0, 1], duration: 2400, ease: 'inOutQuad', delay: 200 });
  animate(S, { introDist: 0, duration: 2800, ease: 'outExpo' });
  animate(S, { introDims: [0, 1], duration: 1400, ease: 'linear', delay: 2300 });
  // 도면이 다 그려진 뒤: 스크롤 안내가 나타나고 부품이 들썩이기 시작한다
  animate('#h3-cue', { opacity: [0, 1], y: [12, 0], duration: 700, delay: 3500, ease: 'outQuart' });
  animate(S, { tease: [0, 0.16], duration: 1100, delay: 3700, ease: 'inOutSine', loop: true, alternate: true });
  animate('.h3-intro > *', { opacity: [0, 1], y: [24, 0], duration: 900, delay: stagger(110, { start: 900 }), ease: 'outQuart' });
} else {
  utils.set(S, { introDraw: 1, introDims: 1 });
}

// ── 3) 진행 레일·스크롤 안내 ──
const stages = [...document.querySelectorAll('.h3-rail li')];
const marks = stages.map((li) => +li.querySelector('button').dataset.at);
function updateRail(p) {
  progress = p;
  $('#h3-pct').textContent = String(Math.round(p * 100)).padStart(3, '0');
  $('#h3-railFill').style.transform = `scaleX(${p})`;
  $('#h3-railHead').style.left = `${p * 100}%`;
  let on = 0; marks.forEach((m, i) => { if (p >= m - 0.02) on = i; });
  stages.forEach((li, i) => { li.classList.toggle('is-on', i === on); li.classList.toggle('is-done', i < on); });
  $('#h3-cue').style.visibility = p > 0.03 ? 'hidden' : '';
}
updateRail(0);
const scrollToAt = (at) => {
  const sc = $('#h3');
  const top = sc.getBoundingClientRect().top + scrollY;
  scrollTo({ top: top + (sc.offsetHeight - innerHeight) * at, behavior: reduce ? 'auto' : 'smooth' });
};
stages.forEach((li) => li.querySelector('button').addEventListener('click', (e) => scrollToAt(+e.currentTarget.dataset.at)));
$('#h3-cue').addEventListener('click', () => scrollToAt(0.22));

// ── 2) 스크롤: 도면 → 입체·분해 → 실물 → 재조립 ──
// 위치(ms)는 스크롤 진행 비율로 환산된다. 전체 4000 = 스크롤 구간 100%
const tl = createTimeline({
  defaults: { ease: 'inOutSine', duration: 1000 },
  autoplay: seekTo || reduce ? false : onScroll({ target: '#h3', enter: 'start start', leave: 'end end', sync: 0.12 }),
  onUpdate: (self) => updateRail(self.progress),
})
  // 0–1300: 치수가 걷히고, 정측면에서 입체 시점으로 돌며 분해 (선 도면 상태)
  .add('.h3-intro', { opacity: 0, y: 30, duration: 400 }, 0)
  .add(S, { dims: 0, duration: 400, ease: 'linear' }, 0)
  .add(S, { az: -0.35, el: 0.3, fov: 34, dist: 21, ty: 1.5, shift: 0.1, duration: 1000, ease: 'inOutCubic' }, 300)
  .add(S, { explode: 1, roll: -6, duration: 900 }, 500)
  .add('.h3-toolbox', { opacity: [0, 1], duration: 400 }, 900)
  .add('.h3-toolbox li i', { scaleX: [0, 1], duration: 500, delay: stagger(50) }, 1000)
  // 1700–2600: 배경이 어두워지며 선이 거꾸로 지워지고 실물이 드러난다
  .add('.h3-toolbox', { opacity: 0, duration: 300 }, 1700)
  .add(S, { light: 0, duration: 800 }, 1700)
  .add(S, { solid: 1, duration: 600 }, 1900)
  .add(S, { draw: 0, duration: 800, ease: 'inOutQuad' }, 1800)
  .add(S, { az: -0.75, el: 0.42, dist: 17.5, ty: 1.2, shift: 0, duration: 900 }, 1700)
  .add('.h3-explode', { opacity: [0, 1], y: [20, 0], duration: 400 }, 2200)
  .add('.h3-explode', { opacity: 0, duration: 300 }, 2800)
  // 2700–3700: 재조립하며 앞쪽 3/4 시점으로
  .add(S, { explode: 0, roll: -10, duration: 1000 }, 2700)
  .add(S, { az: 0.95, el: 0.16, dist: 19, ty: 1.0, shift: 0.14, duration: 1000, ease: 'inOutCubic' }, 2700)
  .add('.h3-final > *', { opacity: [0, 1], y: [24, 0], duration: 500, delay: stagger(80) }, 3300)
  .add(S, { roll: -10, duration: 200 }, 3800);

if (seekTo) setTimeout(() => updateRail(+seekTo), 250);
if (seekTo) setTimeout(() => tl.seek(tl.duration * +seekTo), 200);
if (reduce) tl.seek(tl.duration);
}
