/**
 * product-ad — 무출연(no presenter) 제품 광고 프로파일 (v1 우선)
 * ============================================================================
 * 브레인이 spoken(발화) 없이 broll(제품컷)만 내도록 유도. 설득 메시지는
 * onScreenText(키네틱 자막)로, 씬은 전부 제품 렌더 → 모션 클립으로 배선된다.
 */
module.exports = {
  outputType: 'product-ad',
  label: 'Product Ad (no presenter)',
  aspect: '9:16',
  defaultDurationSec: 20,

  // 브레인이 낼 수 있는 씬 타입(이 프로파일은 broll 전용)
  sceneTypes: ['broll'],

  // 시스템 프롬프트에 주입해 연출 방향을 고정
  systemGuide: [
    'OUTPUT TYPE: product ad with NO on-camera presenter and NO spoken dialogue.',
    '- Every scene MUST be type "broll" — a product-focused visual. Do NOT emit "spoken" scenes.',
    '- Put the persuasive message in "onScreenText" (short kinetic caption overlays), NOT in spoken lines. Leave "spoken" empty.',
    '- Vary shots across the ad: hero shot, macro/texture detail, product-in-use or styled scene, and a final CTA card.',
    '- "brollPrompt": a vivid product photo prompt (subject, angle, lighting, surface, mood). NO human faces, NO people.',
    '- First 2s must be a scroll-stopping visual; end on a hard CTA.',
  ].join('\n'),

  // v1 렌더 라우팅: 모든 씬 → 제품 이미지 렌더 → 모션 클립
  renderMap: { broll: 'product-render' },
};
