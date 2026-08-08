import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 사용자 템플릿 데이터 재사용(중복 금지) — 레거시 templateData.service.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'generate', 'templateData.service.js'));

@Injectable()
export class TemplateDataService {
  create(userId: string, body: any) {
    return legacy.create(userId, body || {});
  }
  list(userId: string, q: any) {
    return legacy.list(userId, q || {});
  }
  getById(userId: string, id: string) {
    return legacy.getById(userId, id);
  }
  update(userId: string, id: string, body: any) {
    return legacy.update(userId, id, body || {});
  }
  remove(userId: string, id: string) {
    return legacy.remove(userId, id);
  }
}
