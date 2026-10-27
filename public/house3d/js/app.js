// 3D 마감 체험 — 걷기 · 3D 전체 · 2D 평면 세 가지 보기에서 면을 눌러 마감을 바로 바꾼다.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { HOMES, homeById } from './homes.js';
import { CATALOG, resolveEntry, getMaterial, thumb, setAnisotropy } from './materials.js';
import { buildHouse, buildSite } from './builder.js';
import { buildFurniture } from './furniture.js';
import { PRESETS } from './presets.js';

const $ = (s) => document.querySelector(s);
// 어떤 주택을 보여 줄지: tour.html?h=주택id
const HOME = homeById(new URLSearchParams(location.search).get('h')), PLAN = HOME.plan;
const SITE = PLAN.site || {};
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

// ── 렌더러·장면 ──
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const SKY = { day: new THREE.Color(0xcfdde6), night: new THREE.Color(0x10151d) };
scene.background = SKY.day.clone();

const hemi = new THREE.HemisphereLight(0xe4ecf2, 0x8a7a66, 0.9);
const sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

const house = buildHouse(PLAN), site = buildSite(house.bounds, SITE, house.roomAt), furn = buildFurniture(PLAN.furniture, PLAN.height);
const CX = (house.bounds.x0 + house.bounds.x1) / 2, CZ = (house.bounds.z0 + house.bounds.z1) / 2;
{ // 해와 그림자 범위를 집 크기에 맞춘다
  const half = Math.max(house.bounds.x1 - house.bounds.x0, house.bounds.z1 - house.bounds.z0) / 2 + 7;
  sun.position.set(CX - 9, 16, CZ + 19); sun.target.position.set(CX, 0, CZ);
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 80 });
}
scene.fog = new THREE.Fog(SKY.day.clone(), ...(site.fog || [45, 130]));
scene.add(house.group, site.group, furn.group);
const colliders = [...house.colliders, ...site.colliders, ...furn.colliders];
const surfaces = house.surfaces;
const SURF = Object.fromEntries(surfaces.map((s) => [s.id, s]));
const pickables = surfaces.map((s) => s.mesh);
const blockers = [];
[furn.group, house.roof].forEach((g) => g.traverse((o) => o.isMesh && blockers.push(o)));

// 밤 조명: 방마다 천장 아래 따뜻한 점광원
const roomLights = PLAN.rooms.map((r) => {
  const area = (r.x1 - r.x0) * (r.z1 - r.z0);
  const l = new THREE.PointLight(0xffcf96, 0, 0, 2);
  l.position.set((r.x0 + r.x1) / 2, PLAN.height - 0.35, (r.z0 + r.z1) / 2);
  l.userData.power = 3.4 * Math.pow(area, 0.75);
  return l;
});

// ── 마감 상태 ──
// room[방id][kind] = 재질 id, over[면id] = 재질 id (그 면만)
const KIND_KO = { floor: '바닥', wall: '벽', ceiling: '천장' };
let state = initialState();
function initialState() {
  const over = {};
  for (const [f, v] of Object.entries(PLAN.accents || {})) { const k = PLAN.features?.[f]; if (SURF[k]) over[k] = v; }
  return { room: {}, over };
}
const ROOM = Object.fromEntries(PLAN.rooms.map((r) => [r.id, r]));
// 기본 마감: 방 id → 방 종류('@type') → 집 전체('*') 순으로 찾는다
const defaultFor = (room, kind) => PLAN.defaults[room]?.[kind] ?? PLAN.defaults['@' + ROOM[room]?.type]?.[kind] ?? PLAN.defaults['*'][kind];
function matIdOf(s) {
  const kind = s.kind;
  return state.over[s.id] ?? state.room[s.room]?.[kind] ?? defaultFor(s.room, kind);
}
function applyAll() { for (const s of surfaces) s.mesh.material = getMaterial(matIdOf(s)); }

const undoStack = [];
function commit(fn) {
  undoStack.push(JSON.stringify(state)); if (undoStack.length > 60) undoStack.shift();
  fn(); applyAll(); afterChange();
}
function afterChange() {
  $('#undoBtn').disabled = !undoStack.length;
  if (selected) renderPanel();
  saveLocal();
}
function setRoom(room, kind, id) { (state.room[room] ||= {})[kind] = id; }

// 저장: 이 브라우저에 자동 저장 + 링크(#s=...)로 공유
const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '');
const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s))));
const STORE = 'hw-state:' + PLAN.id;
function saveLocal() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {} }
function loadState() {
  try {
    const h = new URLSearchParams(location.hash.slice(1)).get('s');
    if (h) return dec(h);
    const l = localStorage.getItem(STORE); if (l) return JSON.parse(l);
  } catch {}
  return null;
}
const loaded = loadState();
if (loaded?.room && loaded?.over) state = loaded;
applyAll();

// ── 카메라와 보기 모드 ──
const persp = new THREE.PerspectiveCamera(70, 1, 0.05, site.far || 300);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
let camera = persp, mode = 'walk';
const player = { x: PLAN.start.x, z: PLAN.start.z, yaw: PLAN.start.yaw, pitch: -0.04, eye: 1.6, r: 0.28 };
const orbit = { theta: 0.5, phi: 0.95, dist: 34, tx: CX, tz: CZ };
const plan2d = { cx: CX, cz: CZ, zoom: 10 };

// 3D 전체·2D 보기에서 보이는 내 위치 표시
const marker = new THREE.Group();
{
  const m = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 20), m); body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), m); head.position.y = 1.72;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 16), m); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.0, 0.38);
  marker.add(body, head, nose); marker.traverse((o) => { o.castShadow = true; o.userData.noPick = true; });
  scene.add(marker);
}

function setMode(m, opts = {}) {
  mode = m;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  const inside = m === 'walk';
  house.roof.visible = inside;
  house.ceilings.forEach((c) => (c.visible = inside));
  marker.visible = !inside;
  camera = m === 'plan' ? ortho : persp;
  persp.fov = inside ? 70 : 40; persp.updateProjectionMatrix();
  // 화면 비율에 맞춰 집 전체가 들어오게
  const b = house.bounds, bw = b.x1 - b.x0 + 3, bh = b.z1 - b.z0 + 3, asp = innerWidth / innerHeight;
  if (m === 'doll' && !opts.keep) { orbit.tx = (b.x0 + b.x1) / 2; orbit.tz = (b.z0 + b.z1) / 2 + 1; orbit.dist = Math.max(30, 26 / Math.min(1, asp * 0.9)); }
  if (m === 'plan' && !opts.keep) { plan2d.cx = (b.x0 + b.x1) / 2; plan2d.cz = (b.z0 + b.z1) / 2; plan2d.zoom = Math.max(bh / 2, bw / 2 / asp); }
  $('#roomName').style.opacity = inside ? 1 : 0;
  $('#hint').style.display = inside && !hintClosed && !isTouch ? '' : 'none';
  $('#mini').style.display = inside ? '' : 'none';
  $('#joy').classList.toggle('show', inside);
  $('#labels').style.display = inside ? 'none' : '';
  resize();
}
let hintClosed = false;
$('#hintX').onclick = () => { hintClosed = true; $('#hint').style.display = 'none'; };
document.querySelectorAll('#modes button').forEach((b) => (b.onclick = () => fadeTo(() => setMode(b.dataset.mode))));

function fadeTo(fn) {
  const f = $('#fade'); f.style.opacity = 1;
  setTimeout(() => { fn(); requestAnimationFrame(() => (f.style.opacity = 0)); }, 220);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  persp.aspect = w / h; persp.updateProjectionMatrix();
  const a = w / h, z = plan2d.zoom;
  Object.assign(ortho, { left: -z * a, right: z * a, top: z, bottom: -z }); ortho.updateProjectionMatrix();
}
addEventListener('resize', resize);

function updateCamera() {
  if (mode === 'walk') {
    const cp = Math.cos(player.pitch);
    persp.position.set(player.x, player.eye, player.z);
    persp.lookAt(player.x + Math.sin(player.yaw) * cp, player.eye + Math.sin(player.pitch), player.z + Math.cos(player.yaw) * cp);
  } else if (mode === 'doll') {
    const { theta, phi, dist, tx, tz } = orbit;
    persp.position.set(tx + dist * Math.cos(phi) * Math.sin(theta), dist * Math.sin(phi), tz + dist * Math.cos(phi) * Math.cos(theta));
    persp.lookAt(tx, 0, tz);
  } else {
    ortho.position.set(plan2d.cx, 60, plan2d.cz); ortho.up.set(0, 0, -1); ortho.lookAt(plan2d.cx, 0, plan2d.cz);
  }
  marker.position.set(player.x, 0, player.z); marker.rotation.y = player.yaw;
}

// ── 이동과 충돌 ──
function collide(x, z) {
  const r = player.r;
  for (let it = 0; it < 3; it++) {
    for (const [x0, z0, x1, z1] of colliders) {
      const cx = Math.max(x0, Math.min(x, x1)), cz = Math.max(z0, Math.min(z, z1));
      const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (r - d) / d; x += dx * k; z += dz * k; }
      else { // 중심이 사각형 안: 가장 가까운 변으로 밀어낸다
        const opts = [[x - x0 + r, -1, 0], [x1 - x + r, 1, 0], [z - z0 + r, 0, -1], [z1 - z + r, 0, 1]].sort((a, b) => a[0] - b[0]);
        x += opts[0][1] * opts[0][0]; z += opts[0][2] * opts[0][0];
      }
    }
  }
  const b = house.bounds;
  return [Math.max(b.x0 - 14, Math.min(b.x1 + 14, x)), Math.max(b.z0 - 14, Math.min(b.z1 + 14, z))];
}
function moveBy(dx, dz) { [player.x, player.z] = collide(player.x + dx, player.z + dz); }

const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, dialog')) return;
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') select(null);
  if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') { e.preventDefault(); undo(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

let autoWalk = null; // { x, z, stuck }
const joy = { x: 0, y: 0 };
function stepWalk(dt) {
  let f = 0, s = 0, turn = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyA')) s -= 1;
  if (keys.has('KeyD')) s += 1;
  if (keys.has('ArrowLeft')) turn += 1;
  if (keys.has('ArrowRight')) turn -= 1;
  f -= joy.y; s += joy.x;
  player.yaw += turn * dt * 1.8;
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3.6 : 1.9) * dt;
  if (f || s) {
    autoWalk = null;
    const len = Math.hypot(f, s) > 1 ? Math.hypot(f, s) : 1;
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw), rx = -Math.cos(player.yaw), rz = Math.sin(player.yaw);
    moveBy(((fx * f + rx * s) / len) * speed, ((fz * f + rz * s) / len) * speed);
  } else if (autoWalk) {
    const dx = autoWalk.x - player.x, dz = autoWalk.z - player.z, d = Math.hypot(dx, dz);
    if (d < 0.08) autoWalk = null;
    else {
      const k = Math.min(d, speed * 1.2) / d, bx = player.x, bz = player.z;
      moveBy(dx * k, dz * k);
      if (Math.hypot(player.x - bx, player.z - bz) < speed * 0.2) { if ((autoWalk.stuck += dt) > 0.4) autoWalk = null; }
      else autoWalk.stuck = 0;
    }
  }
}
function teleport(x, z, yaw) {
  fadeTo(() => { [player.x, player.z] = collide(x, z); if (yaw != null) player.yaw = yaw; autoWalk = null; });
}

// ── 입력: 드래그 = 둘러보기/회전/이동, 짧게 누름 = 면 선택 ──
const pointers = new Map();
let drag = null, pinch0 = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0, t: performance.now() };
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
  canvas.classList.add('grabbing');
});
canvas.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.dirty = true;
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0) zoomBy(pinch0 / d); pinch0 = d; return;
  }
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
  if (drag.moved < 4) return;
  if (mode === 'walk') {
    // 모바일: 손가락이 가는 쪽으로 시선이 간다. 데스크톱: 화면을 잡아끄는 방식
    const k = isTouch ? -0.006 : 0.0042;
    player.yaw += dx * k; player.pitch = Math.max(-1.25, Math.min(1.25, player.pitch + dy * k));
  } else if (mode === 'doll') {
    if (e.buttons === 2 || e.shiftKey) { panDoll(dx, dy); }
    else { orbit.theta -= dx * 0.006; orbit.phi = Math.max(0.2, Math.min(1.52, orbit.phi + dy * 0.005)); }
  } else {
    const k = (2 * plan2d.zoom) / innerHeight; plan2d.cx -= dx * k; plan2d.cz -= dy * k;
  }
});
function panDoll(dx, dy) {
  const k = orbit.dist * 0.0016, c = Math.cos(orbit.theta), s = Math.sin(orbit.theta);
  orbit.tx -= (dx * c - dy * s) * k; orbit.tz -= (-dx * s - dy * c) * k;
}
const endPointer = (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (drag && pointers.size === 0 && drag.moved < 6 && e.type === 'pointerup' && performance.now() - drag.t < 600) onTap(e.clientX, e.clientY, e);
  if (pointers.size === 0) { drag = null; pinch0 = 0; canvas.classList.remove('grabbing'); }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
function zoomBy(f) {
  if (mode === 'doll') orbit.dist = Math.max(8, Math.min(90, orbit.dist * f));
  else if (mode === 'plan') { plan2d.zoom = Math.max(3, Math.min(40, plan2d.zoom * f)); resize(); }
  else { persp.fov = Math.max(35, Math.min(80, persp.fov * f)); persp.updateProjectionMatrix(); }
}

// 탭 두 번(또는 더블클릭) = 그 바닥으로 이동
let lastTap = { t: 0, x: 0, y: 0 };
function onTap(x, y) {
  const now = performance.now(), dbl = now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 20;
  lastTap = { t: dbl ? 0 : now, x, y };
  clearTimeout(onTap.h);
  const hit = pick(x, y);
  if (dbl) {
    const p = hit?.point || groundAt(x, y);
    if (!p) return;
    if (mode === 'walk') { if (hit?.surface?.kind === 'floor' || !hit?.surface) autoWalk = { x: p.x, z: p.z, stuck: 0 }; }
    else {  // 3D 전체·2D에서 두 번 누르면 그 자리로 들어가 걷기
      const look = Math.atan2(orbit.tx - p.x, orbit.tz - p.z);
      fadeTo(() => { [player.x, player.z] = collide(p.x, p.z); player.yaw = mode === 'plan' ? player.yaw : look + Math.PI; player.pitch = -0.05; setMode('walk'); });
    }
    return;
  }
  // 두 번째 탭을 잠깐 기다렸다가 선택한다 (더블클릭으로 걸을 때 패널이 열리지 않게)
  onTap.h = setTimeout(() => select(hit?.surface || null), 260);
}

// ── 고르기(레이캐스트) ──
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const objs = [...pickables, ...blockers].filter((o) => o.visible);
  const hit = ray.intersectObjects(objs, false)[0];
  if (!hit) return null;
  return { point: hit.point, surface: hit.object.userData.surface || null };
}
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundAt(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(groundPlane, new THREE.Vector3());
}

// 마우스를 올린 면 안내
const mouse = { x: 0, y: 0, dirty: false };
const tip = $('#tip');
canvas.addEventListener('pointerleave', () => { tip.style.display = 'none'; hoverSurface(null); });
function updateHover() {
  if (isTouch || !mouse.dirty || pointers.size) return;
  mouse.dirty = false;
  const s = pick(mouse.x, mouse.y)?.surface;
  hoverSurface(s);
  if (s) {
    tip.innerHTML = `${surfaceTitle(s)}<small>${resolveEntry(matIdOf(s)).name}</small>`;
    tip.style.left = mouse.x + 'px'; tip.style.top = mouse.y + 'px'; tip.style.display = 'block';
    canvas.classList.add('pick');
  } else { tip.style.display = 'none'; canvas.classList.remove('pick'); }
}

// 선택·마우스 올림 표시: 면 위에 반투명 막을 한 겹 덮는다
const hlSel = new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const hlHover = hlSel.clone(); hlHover.color.set(0xffffff); hlHover.opacity = 0.12;
const selMesh = new THREE.Mesh(undefined, hlSel), hoverMesh = new THREE.Mesh(undefined, hlHover);
selMesh.visible = hoverMesh.visible = false; selMesh.renderOrder = hoverMesh.renderOrder = 3;
selMesh.userData.noPick = hoverMesh.userData.noPick = true;
scene.add(selMesh, hoverMesh);
function hoverSurface(s) {
  hoverMesh.visible = !!s && s !== selected;
  if (s) hoverMesh.geometry = s.mesh.geometry;
}

// ── 마감 패널 ──
let selected = null, scope = 'room', tab = null;
const surfaceTitle = (s) => (s.room === 'exterior' ? '외관 · 외벽' : `${s.roomName} · ${KIND_KO[s.kind]}`);
const catOf = (s) => (s.room === 'exterior' ? 'exterior' : s.kind);

function select(s) {
  selected = s;
  selMesh.visible = !!s; hoverMesh.visible = false;
  if (!s) { $('#panel').classList.remove('open'); return; }
  selMesh.geometry = s.mesh.geometry;
  scope = s.kind === 'wall' && s.room !== 'exterior' && state.over[s.id] ? 'surface' : 'room';
  const cur = resolveEntry(matIdOf(s));
  const groups = groupsFor(s);
  tab = groups.includes(cur.group) ? cur.group : groups[0];
  renderPanel();
  $('#panel').classList.add('open');
}
function groupsFor(s) {
  const cat = catOf(s), order = ['타일', '마루', '도장', '벽지', '석재·패널', '외장'];
  return order.filter((g) => CATALOG.some((m) => m.group === g && m.cats.includes(cat)));
}
function renderPanel() {
  const s = selected, cur = resolveEntry(matIdOf(s)), cat = catOf(s);
  $('#pWhere').textContent = surfaceTitle(s) + (s.area ? ` · 약 ${s.area.toFixed(1)}㎡` : '');
  $('#pName').textContent = cur.name;
  $('#pSpec').textContent = `${cur.group} · ${cur.spec} (참고)`;

  const scopes = s.room === 'exterior' ? [] : s.kind === 'wall'
    ? [['surface', '이 벽면만'], ['room', '방 전체 벽'], ['house', '집 전체 벽']]
    : [['room', '이 방만'], ['house', `집 전체 ${KIND_KO[s.kind]}`]];
  $('#pScope').innerHTML = scopes.map(([k, t]) => `<button data-k="${k}" class="${k === scope ? 'on' : ''}">${t}</button>`).join('');
  $('#pScope').querySelectorAll('button').forEach((b) => (b.onclick = () => { scope = b.dataset.k; renderPanel(); }));

  const groups = groupsFor(s);
  $('#pTabs').innerHTML = groups.map((g) => `<button class="${g === tab ? 'on' : ''}">${g}</button>`).join('');
  $('#pTabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { tab = b.textContent; renderPanel(); }));

  const items = CATALOG.filter((m) => m.group === tab && m.cats.includes(cat));
  const grid = $('#pGrid');
  grid.innerHTML = items.map((m) => `<button class="chip ${m.id === cur.id ? 'on' : ''}" data-id="${m.id}">
      <i style="background-image:url(${thumb(m.id)})"></i><span>${m.name}</span><small>${m.spec}</small></button>`).join('')
    + (tab === '도장' ? `<label class="chip custom ${cur.id.startsWith('paint#') ? 'on' : ''}"><i><input type="color" value="${cur.paint ? cur.color : '#d8cfc0'}"></i><span>직접 조색</span><small>원하는 색</small></label>` : '');
  grid.querySelectorAll('button.chip').forEach((b) => (b.onclick = () => applyMat(b.dataset.id)));
  const ci = grid.querySelector('input[type=color]');
  if (ci) {
    ci.addEventListener('click', () => undoStack.push(JSON.stringify(state)));
    ci.addEventListener('input', () => { applyMat('paint' + ci.value, true); });
  }
}
function applyMat(id, noHistory) {
  const s = selected; if (!s) return;
  const run = () => {
    if (s.room === 'exterior') { setRoom('exterior', 'wall', id); for (const k in state.over) if (SURF[k]?.room === 'exterior') delete state.over[k]; return; }
    if (scope === 'surface') { state.over[s.id] = id; return; }
    const rooms = scope === 'house' ? PLAN.rooms.map((r) => r.id) : [s.room];
    rooms.forEach((r) => setRoom(r, s.kind, id));
    for (const k in state.over) { const o = SURF[k]; if (o && o.kind === s.kind && rooms.includes(o.room)) delete state.over[k]; }
  };
  if (noHistory) { run(); applyAll(); $('#undoBtn').disabled = !undoStack.length; saveLocal();
    $('#pName').textContent = resolveEntry(matIdOf(s)).name; return; }
  commit(run);
}
function undo() { if (!undoStack.length) return; state = JSON.parse(undoStack.pop()); applyAll(); afterChange(); toast('되돌렸습니다'); }
$('#undoBtn').onclick = undo;
$('#resetBtn').onclick = () => commit(() => { state = initialState(); });
$('#pClose').onclick = () => select(null);

// 프리셋
$('#preset').innerHTML += PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
$('#preset').onchange = (e) => {
  const p = PRESETS[e.target.value]; e.target.value = ''; if (!p) return;
  commit(() => {
    state = { room: {}, over: {} };
    for (const r of PLAN.rooms) {
      const base = { ...p.all, ...(r.wet ? p.wet : {}), ...(p.types?.[r.type] || {}) };
      for (const k of ['floor', 'wall', 'ceiling']) if (base[k]) setRoom(r.id, k, base[k]);
    }
    if (p.exterior) setRoom('exterior', 'wall', p.exterior);
    for (const [f, v] of Object.entries(p.features || {})) { const k = PLAN.features?.[f]; if (SURF[k]) state.over[k] = v; }
  });
  toast(`'${p.name}' 적용`);
};

// 낮·밤
let night = false;
document.querySelectorAll('#time button').forEach((b) => (b.onclick = () => setNight(b.dataset.t === 'night')));
function setNight(n) {
  night = n;
  document.querySelectorAll('#time button').forEach((b) => b.classList.toggle('on', (b.dataset.t === 'night') === n));
  if (n && !roomLights[0].parent) scene.add(...roomLights);
  roomLights.forEach((l) => (l.intensity = n ? l.userData.power : 0));
  sun.intensity = n ? 0.25 : 3.0; sun.color.set(n ? 0x8fa6d6 : 0xfff1dc);
  hemi.intensity = n ? 0.08 : 0.9;
  scene.environmentIntensity = n ? 0.18 : 1;
  scene.background.copy(n ? SKY.night : SKY.day); scene.fog.color.copy(scene.background);
}

// 공유 링크
$('#shareBtn').onclick = async () => {
  const url = location.href.split('#')[0] + '#s=' + enc(state);
  window.history.replaceState(null, '', url);
  try { await navigator.clipboard.writeText(url); toast('이 마감 조합 링크를 복사했습니다'); } catch { toast('주소창의 링크를 복사해 주세요'); }
};
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => (el.style.opacity = 0), 1800); }

// ── 미니맵 ──
const svg = $('#miniSvg'), NS = 'http://www.w3.org/2000/svg';
{
  const b = house.bounds, pad = 0.6;
  svg.setAttribute('viewBox', `${b.x0 - pad} ${b.z0 - pad} ${b.x1 - b.x0 + pad * 2} ${b.z1 - b.z0 + pad * 2}`);
  let html = '';
  for (const r of PLAN.rooms) html += `<rect class="room" data-r="${r.id}" x="${r.x0}" y="${r.z0}" width="${r.x1 - r.x0}" height="${r.z1 - r.z0}"/>`;
  for (const w of PLAN.walls) {
    const horiz = w.a[1] === w.b[1], s0 = horiz ? w.a[0] : w.a[1], s1 = horiz ? w.b[0] : w.b[1];
    const gaps = (w.openings || []).filter((o) => o.type !== 'window' && o.type !== 'glass').map((o) => [s0 + o.at, s0 + o.at + o.w]).sort((a, b) => a[0] - b[0]);
    let s = s0; const segs = [];
    for (const [g0, g1] of gaps) { segs.push([s, g0]); s = g1; } segs.push([s, s1]);
    for (const [p, q] of segs) {
      const [x1, y1, x2, y2] = horiz ? [p, w.a[1], q, w.a[1]] : [w.a[0], p, w.a[0], q];
      html += `<line class="wall" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w.ext ? 0.25 : 0.15}"/>`;
    }
  }
  for (const r of PLAN.rooms) if (r.x1 - r.x0 > 2.4) html += `<text x="${(r.x0 + r.x1) / 2}" y="${(r.z0 + r.z1) / 2}">${r.name}</text>`;
  html += `<g id="me"><path class="cone" d="M0 0 L-1.6 3.2 A3.6 3.6 0 0 0 1.6 3.2 Z"/><circle class="me" r="0.38"/></g>`;
  svg.innerHTML = html;
  svg.addEventListener('click', (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    teleport(p.x, p.y);
  });
}
const meEl = svg.querySelector('#me');
let lastRoom = null;
function updateMini() {
  meEl.setAttribute('transform', `translate(${player.x} ${player.z}) rotate(${(-player.yaw * 180) / Math.PI})`);
  const r = house.roomAt(player.x, player.z), name = r ? r.name : '외부';
  if (name !== lastRoom) {
    lastRoom = name; $('#roomName').textContent = name; $('#miniRoom').textContent = name;
    svg.querySelectorAll('.room').forEach((el) => el.classList.toggle('here', el.dataset.r === r?.id));
  }
}

// ── 방 이름표 (3D 전체·2D) ──
const labelEls = PLAN.rooms.map((r) => {
  const el = document.createElement('div'); el.className = 'rl';
  const a = (r.x1 - r.x0) * (r.z1 - r.z0);
  el.innerHTML = `${r.name}<small>${a.toFixed(1)}㎡ · ${(a / 3.3058).toFixed(1)}평</small>`;
  $('#labels').appendChild(el);
  return { el, p: new THREE.Vector3((r.x0 + r.x1) / 2, 0.1, (r.z0 + r.z1) / 2) };
});
const tmp = new THREE.Vector3();
function updateLabels() {
  if (mode === 'walk') return;
  for (const { el, p } of labelEls) {
    tmp.copy(p).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.style.display = vis ? '' : 'none';
    if (vis) el.style.transform = `translate(${(tmp.x + 1) / 2 * innerWidth}px, ${(1 - tmp.y) / 2 * innerHeight}px) translate(-50%, -50%)`;
  }
}

// ── 터치 조이스틱 ──
{
  const pad = $('#joy'), knob = pad.querySelector('i');
  let id = null;
  const set = (e) => {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R; const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    joy.x = x; joy.y = y; knob.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`;
  };
  pad.addEventListener('pointerdown', (e) => { id = e.pointerId; pad.setPointerCapture(id); set(e); });
  pad.addEventListener('pointermove', (e) => e.pointerId === id && set(e));
  const end = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
}

// ── 마감 사양서 ──
function specData() {
  const rows = [], totals = new Map();
  const places = [...PLAN.rooms.map((r) => ({ id: r.id, name: r.name })), { id: 'exterior', name: '외관' }];
  for (const pl of places) for (const kind of ['floor', 'wall', 'ceiling']) {
    const list = surfaces.filter((s) => s.room === pl.id && s.kind === kind);
    if (!list.length) continue;
    const byMat = new Map();
    for (const s of list) { const id = matIdOf(s); byMat.set(id, (byMat.get(id) || 0) + s.area); }
    for (const [id, area] of byMat) {
      const e = resolveEntry(id);
      rows.push({ room: pl.name, part: pl.id === 'exterior' ? '외벽' : KIND_KO[kind], id, name: e.name, group: e.group, spec: e.spec, area });
      totals.set(id, (totals.get(id) || 0) + area);
    }
  }
  return { rows, totals: [...totals].map(([id, area]) => ({ id, ...resolveEntry(id), area })).sort((a, b) => b.area - a.area) };
}
function openSpec() {
  const { rows, totals } = specData();
  $('#specRooms').innerHTML = '<tr><th>공간</th><th>부위</th><th>마감</th><th>규격(참고)</th><th style="text-align:right">면적</th></tr>' + rows.map((r, i) =>
    `<tr><td>${i && rows[i - 1].room === r.room ? '' : r.room}</td><td>${r.part}</td><td><span class="sw" style="background-image:url(${thumb(r.id)})"></span>${r.name}</td><td>${r.spec}</td><td class="num">${r.area.toFixed(1)}㎡</td></tr>`).join('');
  $('#specTotals').innerHTML = '<tr><th>자재</th><th>구분</th><th style="text-align:right">면적</th><th style="text-align:right">할증 10% 포함</th></tr>' + totals.map((t) =>
    `<tr><td><span class="sw" style="background-image:url(${thumb(t.id)})"></span>${t.name}</td><td>${t.group}</td><td class="num">${t.area.toFixed(1)}㎡</td><td class="num">${(t.area * 1.1).toFixed(1)}㎡</td></tr>`).join('');
  $('#spec').showModal();
}
$('#specBtn').onclick = openSpec;
$('#specX').onclick = () => $('#spec').close();
$('#printBtn').onclick = () => window.print();
function payload(extra) {
  const { rows, totals } = specData();
  return { home: PLAN.id, plan: PLAN.name, region: HOME.region, kind: HOME.kind, createdAt: new Date().toISOString(), link: location.href.split('#')[0] + '#s=' + enc(state),
    finishes: rows.map(({ room, part, name, spec, area }) => ({ room, part, material: name, spec, area: +area.toFixed(2) })),
    totals: totals.map((t) => ({ material: t.name, area: +t.area.toFixed(2) })), state, ...extra };
}
function download(name, obj) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#jsonBtn').onclick = () => download('마감사양.json', payload());
$('#reqForm').onsubmit = (e) => {
  e.preventDefault();
  const req = payload({ request: Object.fromEntries(new FormData(e.target)) });
  // 접수 API 연결 전 시안: 요청 내용을 이 브라우저에 보관하고 파일로 내려 준다
  try { const l = JSON.parse(localStorage.getItem('hw-requests') || '[]'); l.push(req); localStorage.setItem('hw-requests', JSON.stringify(l)); } catch {}
  download('시공상담요청.json', req);
  const ok = $('#reqOk'); ok.style.display = 'block';
  ok.textContent = `요청 내용이 정리되었습니다 (마감 ${req.finishes.length}건). 시안 단계라 아직 서버로 보내지 않고 파일로 저장했습니다. 접수 연동 후 담당자에게 바로 전달됩니다.`;
};

// ── 루프 ──
const timer = new THREE.Timer();
function frame() {
  timer.update(); const dt = Math.min(timer.getDelta(), 0.05);
  if (mode === 'walk') { stepWalk(dt); updateMini(); }
  updateCamera(); updateHover(); updateLabels();
  hlSel.opacity = 0.16 + Math.sin(performance.now() / 260) * 0.08;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
$('#planName').textContent = PLAN.name;
document.title = `${PLAN.name} · 3D 마감 체험`;
$('#planMeta').textContent = `${HOME.region} · ${HOME.type} · ${HOME.kind}형 시연 평면`;
$('#reqForm [name=type]').value = HOME.kind === '분양' ? '분양 상담' : '신축 시공';
// 다른 주택으로 바꾸기
$('#homeSel').innerHTML = HOMES.map((h) => `<option value="${h.plan.id}" ${h === HOME ? 'selected' : ''}>${h.region} · ${h.plan.name}</option>`).join('');
$('#homeSel').onchange = (e) => { location.href = `?h=${e.target.value}`; };
setMode('walk');
requestAnimationFrame(() => { frame(); const l = $('#loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 450); });

// 점검용
window.__app = { setMode, select, applyMat, SURF, player, orbit, plan2d, state: () => state, setNight, openSpec, PRESETS, teleport, renderer };
