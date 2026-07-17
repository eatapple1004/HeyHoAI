const { z } = require('zod');

// ─── API 요청 스키마 ───

const generateImagesRequestSchema = z.object({
  provider: z.enum(['replicate', 'fal', 'nano-banana']).default('nano-banana'),
  count: z.number().int().min(1).max(8).default(4),
  width: z.number().int().min(512).max(2048).default(1080),
  height: z.number().int().min(512).max(2048).default(1350), // IG portrait 4:5
  customScenes: z
    .array(
      z.object({
        scene: z.string().min(5),
        pose: z.string().min(5),
      })
    )
    .optional(),
});

// ⛔ 프롬프트 금지어 검사 제거 (2026-07-17 사용자 결정) — 근거는 ugcScript.service.js의 같은 주석 참조.
//   실제 게이트는 이미지 생성 레벨이다(Gemini 자체 정책) — 위반 프롬프트는 우리가 안 막아도 거기서 거절된다.
//   반면 부분문자열 목록은 멀쩡한 상거래 프롬프트를 막았다:
//     'underwear'·'lingerie' → 속옷 브랜드는 광고 자체가 불가 · 'teen'→"teenager"·"sixteen" ·
//     'child'→"children" · 'minor'→"minority" · 'nude'→"rose-nude"(립스틱 셰이드).
//   ⚠️ 되살릴 거면 부분문자열 목록 말고 **구조화된 판정**으로. 같은 오탐이 그대로 재발한다.

module.exports = {
  generateImagesRequestSchema,
};
