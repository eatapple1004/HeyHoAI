/**
 * model-editorial — 모델 출연(on-model) 화보 프로파일 (v1 2순위)
 * ============================================================================
 * 무출연 대신 버추얼 모델이 제품을 착용/사용한 화보 컷. 얼굴이 "말하는" 게
 * 아니라(=벤더 불필요), 모델 로스터 이미지를 reference로 넣어 정지 화보를 렌더한 뒤
 * 모션을 부여한다. 발화 없음 — 메시지는 자막.
 */
module.exports = {
  outputType: 'model-editorial',
  label: 'Model Editorial (on-model, no dialogue)',
  aspect: '9:16',
  defaultDurationSec: 20,

  sceneTypes: ['broll'],

  systemGuide: [
    'OUTPUT TYPE: on-model editorial with NO spoken dialogue (the model does NOT talk to camera).',
    '- Every scene MUST be type "broll". A human model wears/uses the product; treat it like a fashion/beauty editorial.',
    '- Put any message in "onScreenText" overlays, NOT spoken lines. Leave "spoken" empty.',
    '- Vary looks and framing: full look, detail/worn close-up, movement/pose, and a final CTA card.',
    '- "brollPrompt": describe the styling, wardrobe, pose, mood, lighting, and setting — the model identity is supplied separately via a reference image, so do NOT describe a specific face.',
    '- First 2s must stop the scroll; end on a hard CTA.',
  ].join('\n'),

  // v1 렌더 라우팅: 모델 로스터 reference 주입 렌더 → 모션 클립
  renderMap: { broll: 'model-render' },
};
