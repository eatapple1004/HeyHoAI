// 방별 반사(반사 프로브) — 방 가운데서 그 방을 360° 로 찍어, 그 방의 벽·바닥·천장 반사와 주변광으로 쓴다.
//   폴리싱 대리석 바닥에 가짜 스튜디오 조명 대신 그 방의 창·가구·벽이 비친다.
//   면마다 '자기 방' 프로브를 쓴다 — 보는 사람이 어디 서 있든 같은 면은 같은 빛(예전엔 서 있는 방의 프로브를 화면 전체에 써서
//   문턱을 넘을 때마다 보이는 모든 면의 빛이 한꺼번에 바뀌었다, 사용자 지적).
//   반사 방향은 방 상자에 맞춰 보정한다(상자 투영) — 방 가운데서 찍은 그림을 그대로 쓰면 변기·욕조 같은 흰 물체가
//   바닥 엉뚱한 곳에 뿌옇게 번져 비친다(실측).
//   한 프레임에 하나씩 찍는다(6면 렌더 + 흐림 단계, 수십 ms). 마감·낮밤이 바뀌면 다시 찍는다.
import * as THREE from 'three';

// envmap 조각의 반사 방향 계산에 상자 투영을 끼워 넣는다. 확산광(irradiance)은 그대로 법선 방향.
const RADIANCE = 'vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );';
const PARS = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(RADIANCE, `
      if ( probeOn > 0.5 ) {
        vec3 rmax = ( probeMax - vProbeWorld ) / reflectVec, rmin = ( probeMin - vProbeWorld ) / reflectVec;
        vec3 rf = max( rmax, rmin );
        float t = min( min( rf.x, rf.y ), rf.z );
        reflectVec = vProbeWorld + reflectVec * t - probePos;
      }
      ${RADIANCE}`);
if (PARS === THREE.ShaderChunk.envmap_physical_pars_fragment) console.warn('probes: 상자 투영을 끼우지 못함(three 버전 확인)');

function boxProject(m, u) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vProbeWorld;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vProbeWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = 'varying vec3 vProbeWorld;\nuniform vec3 probeMin, probeMax, probePos;\nuniform float probeOn;\n'
      + sh.fragmentShader.replace('#include <envmap_physical_pars_fragment>', PARS);
  };
  m.customProgramCacheKey = () => 'probe-box';
}

// baseIntensity() = 찍는 순간의 기본 환경광 세기(낮 1, 밤 0.18) — 밤에 낮 세기로 찍으면 반사 맵이 하얗게 날아간다(실측)
// probeIntensity() = 프로브를 쓰는 면의 반사 세기(낮 1.35, 밤 0.3 — app.js 참고)
export function createProbes(renderer, scene, pmrem, baseEnv, baseIntensity = () => 1, probeIntensity = () => 1) {
  const size = 256;
  const target = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(0.05, 400, target);
  const rooms = new Map(); // key → { pos, box, rt, dirty, mats: Map(재료 id → 방 전용 재질) }
  let hide = [];

  function capture(p) {
    const vis = hide.map((o) => o.visible);
    hide.forEach((o) => (o.visible = false));
    const env = scene.environment, k = scene.environmentIntensity;
    // 찍을 때는 모든 면을 기본 환경광으로(프로브가 프로브를 비추는 되먹임 방지 — 다시 찍을수록 밝아진다)
    scene.environment = baseEnv; scene.environmentIntensity = baseIntensity();
    const all = [...rooms.values()].flatMap((r) => [...r.mats.values()]);
    for (const m of all) { m.envMap = null; m.userData.probe.probeOn.value = 0; }
    cam.position.copy(p.pos);
    cam.update(renderer, scene);
    p.rt = pmrem.fromCubemap(target.texture, p.rt);
    p.dirty = false;
    for (const r of rooms.values()) for (const m of r.mats.values()) restore(r, m);
    scene.environment = env; scene.environmentIntensity = k;
    hide.forEach((o, i) => (o.visible = vis[i]));
  }
  // 아직 안 찍은 방은 기본 환경광으로(상자 투영 끔)
  function restore(r, m) {
    m.envMap = r.rt ? r.rt.texture : null;
    m.envMapIntensity = r.rt ? probeIntensity() : 1;
    m.userData.probe.probeOn.value = r.rt ? 1 : 0;
  }

  return {
    // 방 등록 — pos = 찍는 자리, box = [min, max] 방 상자(상자 투영용)
    add(key, pos, box) { if (!rooms.has(key)) rooms.set(key, { pos, box, rt: null, dirty: true, mats: new Map() }); },
    has: (key) => rooms.has(key),
    // 그 방 전용 재질 — base 를 복제해 그 방 프로브를 붙인다(같은 재료라도 방마다 따로)
    material(key, id, base) {
      const r = rooms.get(key);
      let m = r.mats.get(id);
      if (!m) {
        m = base.clone();
        m.userData.probe = { probeMin: { value: r.box[0] }, probeMax: { value: r.box[1] }, probePos: { value: r.pos }, probeOn: { value: 0 } };
        boxProject(m, m.userData.probe);
        r.mats.set(id, m); restore(r, m);
      }
      return m;
    },
    // 기본 재질의 지도(요철·광택·사진)가 늦게 붙으면 방 전용 복제본에도 옮긴다
    sync(id, base) {
      for (const r of rooms.values()) {
        const m = r.mats.get(id); if (!m) continue;
        for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap']) m[k] = base[k];
        m.normalScale.copy(base.normalScale); m.bumpScale = base.bumpScale; m.roughness = base.roughness; m.color.copy(base.color);
        m.needsUpdate = true;
      }
    },
    setHide(list) { hide = list; },
    // 한 프레임에 낡은 프로브 하나만 다시 찍는다 — near 에 가까운 방부터
    tick(near) {
      let best = null, bd = Infinity;
      for (const p of rooms.values()) if (p.dirty) { const d = near ? p.pos.distanceToSquared(near) : 0; if (d < bd) { bd = d; best = p; } }
      if (best) capture(best);
    },
    // 낮밤이 바뀌면 세기만 다시 맞춘다(다시 찍는 건 dirtyAll)
    refresh() { for (const r of rooms.values()) for (const m of r.mats.values()) restore(r, m); },
    dirtyAll() { for (const p of rooms.values()) p.dirty = true; },
  };
}
