const { z } = require('zod');

const generateVideoRequestSchema = z.object({
  provider: z.enum(['runway', 'kling', 'minimax']).default('runway'),
  videoStyle: z.enum(['slow_motion', 'natural', 'dynamic', 'cinematic', 'loop']).default('natural'),
  prompt: z.string().max(4000).optional(),
  durationSec: z.number().int().min(3).max(10).optional(), // provider 지원 범위 내에서
  sourceImageId: z.string().uuid().optional(),              // 지정 안 하면 master image 사용
  sourceImageUrl: z.string().min(1).optional(),             // image_assets에 없는 임의 이미지 URL 직접 사용
});

// ⛔ Motion prompt 금지어 검사 제거 (2026-07-17 사용자 결정) — 근거는 ugcScript.service.js의 같은 주석 참조.
//   실제 게이트는 영상 생성 레벨이다(Kling 자체 정책). 반면 이 목록은 부분문자열이라 오탐이 특히 심했다:
//     'strip'→**"pinstripe"·"striped"**(줄무늬 옷) · 'kill'→**"skill"**("skilled craftsmanship") ·
//     'take off'→**"take off the cap"**(립스틱 뚜껑 열기) · 'grinding'→커피 그라인더 ·
//     'intimate'→"intimate lighting"(조명 용어) · 'school'→"old-school" · 'fight'→"fighter".
//   ⚠️ 되살릴 거면 부분문자열 목록 말고 **구조화된 판정**으로. 같은 오탐이 그대로 재발한다.

module.exports = {
  generateVideoRequestSchema,
};
