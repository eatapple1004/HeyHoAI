/** 사용자 저장 템플릿 데이터 API 계약 */
export class CreateTemplateDataDto {
  templateType!: string;
  name!: string;
  characterId?: string;
  data?: Record<string, unknown>;
}
export class UpdateTemplateDataDto {
  name?: string;
  data?: Record<string, unknown>;
}
export class ListTemplateDataQueryDto {
  templateType?: string;
  characterId?: string;
}
