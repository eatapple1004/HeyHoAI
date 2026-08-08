import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 콘텐츠·발행 오케스트레이션 재사용(중복 금지) — 레거시 publishing.api.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'publishing.api.js'));

@Injectable()
export class PublishingService {
  createContent(userId: string, body: any) {
    return legacy.createContent(userId, body);
  }
  // { data, total } — total은 응답 pagination에 들어간다.
  listContents(userId: string, characterId: string, q: any) {
    return legacy.listContents(userId, characterId, q || {});
  }
  getContent(userId: string, id: string) {
    return legacy.getContent(userId, id);
  }
  updateContent(userId: string, id: string, body: any) {
    return legacy.updateContent(userId, id, body);
  }
  regenerateCaption(userId: string, id: string) {
    return legacy.regenerateCaption(userId, id);
  }
  approveContent(userId: string, id: string) {
    return legacy.approveContent(userId, id);
  }
  rejectContent(userId: string, id: string) {
    return legacy.rejectContent(userId, id);
  }
  schedulePublish(userId: string, id: string, body: any) {
    return legacy.schedulePublish(userId, id, body || {});
  }
  publishNow(userId: string, id: string) {
    return legacy.publishNow(userId, id);
  }
  retryPublish(userId: string, id: string) {
    return legacy.retryPublish(userId, id);
  }
  cancelPublish(userId: string, id: string) {
    return legacy.cancelPublish(userId, id);
  }
  listPublishJobs(userId: string, characterId: string, q: any) {
    return legacy.listPublishJobs(userId, characterId, q || {});
  }
}
