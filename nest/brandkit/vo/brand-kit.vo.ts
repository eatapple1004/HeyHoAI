/**
 * 브랜드킷 행 — brand_kits 테이블 스냅샷.
 * ⚠️ 응답에 컬럼명(snake_case)이 그대로 나간다(프론트가 이 이름을 읽는다). camelCase로 바꾸지 말 것.
 */
export interface BrandKitVo {
  readonly logo_url: string | null;
  readonly primary_color: string | null;
  readonly font_name: string | null;
  readonly enabled: boolean;
}
