/** 사용자 저장 템플릿 데이터 행(VO) — template_data 테이블 */
export interface TemplateDataVo {
  readonly id: string;
  readonly template_type: string;
  readonly character_id: string | null;
  readonly name: string;
  readonly data: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
  readonly user_id: string;
}
