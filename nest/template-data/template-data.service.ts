import { Injectable } from '@nestjs/common';
import { TemplateDataRepository } from './template-data.repository';
import { TemplateDataVo } from './vo/template-data.vo';
import { CreateTemplateDataDto, UpdateTemplateDataDto, ListTemplateDataQueryDto } from './dto/template-data.dto';

/** statusCode 에러 — LegacyErrorFilter가 레거시와 동일 형식으로 응답 */
function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

@Injectable()
export class TemplateDataService {
  constructor(private readonly repo: TemplateDataRepository) {}

  create(userId: string, body: CreateTemplateDataDto): Promise<TemplateDataVo> {
    const { templateType, name } = body || ({} as CreateTemplateDataDto);
    if (!templateType || !name) throw httpError(400, 'templateType and name required');
    return this.repo.insert(userId, body);
  }

  list(userId: string, q: ListTemplateDataQueryDto): Promise<TemplateDataVo[]> {
    return this.repo.findAll(userId, q || {});
  }

  async getById(userId: string, id: string): Promise<TemplateDataVo> {
    const row = await this.repo.findById(userId, id);
    if (!row) throw httpError(404, 'Not found');
    return row;
  }

  async update(userId: string, id: string, body: UpdateTemplateDataDto): Promise<TemplateDataVo> {
    const row = await this.repo.update(userId, id, body || {});
    if (!row) throw httpError(404, 'Not found');
    return row;
  }

  async remove(userId: string, id: string): Promise<TemplateDataVo> {
    const row = await this.repo.remove(userId, id);
    if (!row) throw httpError(404, 'Not found');
    return row;
  }
}
