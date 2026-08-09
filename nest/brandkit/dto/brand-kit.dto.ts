/** PATCH /api/brand-kit 요청 — 미전달 필드는 기존값 유지(부분 수정) */
export class UpdateBrandKitDto {
  primaryColor?: string;
  fontName?: string;
  enabled?: boolean;
}
