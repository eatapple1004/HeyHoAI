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
  // (2026-07-30) 통합 가이드 — 제품 단독/모델 착용을 **브리프·사진으로 판단**한다(형식 토글 폐지).
  //   ⚠️ 씬별 SUBJECT 판단 규칙은 builder가 단독으로 소유한다. 여기서 "NO people"을 절대 금지로 못박으면
  //      builder의 모델 씬 지시와 한 프롬프트 안에서 싸우므로 뺐다(제품 씬 한정 금지는 builder가 건다).
  systemGuide: [
    'OUTPUT TYPE: product ad — no talking head, no dialogue, no lip-sync. The video is carried by visuals + background music.',
    '- Every scene is type "broll".',
    '- Vary shots across the ad: hero shot, macro/texture detail, product-in-use or styled scene, and a final CTA beat.',
    '- "brollPrompt": a vivid photo prompt (subject, angle, lighting, surface, mood).',
    '- First 2s must be a scroll-stopping visual; end on a hard CTA.',
  ].join('\n'),

  // v1 렌더 라우팅: 모든 씬 → 제품 이미지 렌더 → 모션 클립
  renderMap: { broll: 'product-render' },
};
