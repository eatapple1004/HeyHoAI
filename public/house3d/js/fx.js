// 화면 후처리(고화질 효과) — 구석·틈의 그림자(GTAO), 밝은 곳의 은은한 빛 번짐(블룸), 계단 현상 제거(멀티샘플).
//   걷기·3D 전체(원근 카메라)에서만 쓴다. 2D 평면(직교 카메라)은 효과 없이 그대로 그린다.
//   휴대폰은 기본으로 끈다(그래픽 부담) — 화면의 「고화질」 버튼으로 켜고 끈다.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';

export function createFX(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  // 효과를 거치면 캔버스 자체의 안티에일리어싱이 안 먹으므로, 중간 그림을 4배 멀티샘플로 그린다
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(scene, camera);
  // 반경은 m 단위(장면 단위). 70cm 정도여야 벽·바닥이 만나는 구석, 가구 밑이 눈에 띄게 어두워진다(40cm 는 거의 안 보였음)
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.blendIntensity = 1;
  ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 2, thickness: 2, scale: 1.3, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  // 블룸은 밤에만 — 조명 둘레가 은은히 번지게. 이 단계의 밝기는 톤매핑 전 값이라 흰 벽도 1 근처까지 올라가므로,
  //   낮에 켜면 화면 전체가 뿌옇게 된다(실측). 밤 실내조명 아래 벽도 1을 훌쩍 넘어서, 기준을 3 으로 높여야 광원 바로 둘레만 번진다(1.1 은 방 전체가 번졌음).
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.25, 3.0);
  bloom.enabled = false;
  composer.addPass(render); composer.addPass(ao); composer.addPass(bloom); composer.addPass(new OutputPass());

  return {
    setSize(w, h, ratio) { composer.setPixelRatio(ratio); composer.setSize(w, h); },
    setNight(n) { bloom.enabled = n; },
    render() { composer.render(); },
    passes: { ao, bloom }, // 점검용
  };
}
