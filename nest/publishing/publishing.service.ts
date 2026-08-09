import { Injectable } from '@nestjs/common';
import { ContentVo, PublishJobVo } from './vo/content.vo';
import { SchedulePublishResultDto, PublishNowResultDto, CreateContentDto, UpdateContentDto, ScheduleContentDto, ListContentsQueryDto, ListPublishJobsQueryDto } from './dto/content.dto';
import * as path from 'path';

// 콘텐츠·발행 오케스트레이션 재사용(중복 금지) — 레거시 publishing.api.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'publishing.api.js'));

@Injectable()
export class PublishingService {
  createContent(userId: string, body: CreateContentDto): Promise<ContentVo> {
    return legacy.createContent(userId, body);
  }
  // { data, total } — total은 응답 pagination에 들어간다.
  listContents(userId: string, characterId: string, q: ListContentsQueryDto): Promise<{ data: ContentVo[]; total: number }> {
    return legacy.listContents(userId, characterId, q || {});
  }
  getContent(userId: string, id: string): Promise<ContentVo> {
    return legacy.getContent(userId, id);
  }
  updateContent(userId: string, id: string, body: UpdateContentDto): Promise<ContentVo> {
    return legacy.updateContent(userId, id, body);
  }
  regenerateCaption(userId: string, id: string): Promise<ContentVo> {
    return legacy.regenerateCaption(userId, id);
  }
  approveContent(userId: string, id: string): Promise<ContentVo> {
    return legacy.approveContent(userId, id);
  }
  rejectContent(userId: string, id: string): Promise<ContentVo> {
    return legacy.rejectContent(userId, id);
  }
  schedulePublish(userId: string, id: string, body: ScheduleContentDto): Promise<SchedulePublishResultDto> {
    return legacy.schedulePublish(userId, id, body || {});
  }
  publishNow(userId: string, id: string): Promise<PublishNowResultDto> {
    return legacy.publishNow(userId, id);
  }
  retryPublish(userId: string, id: string): Promise<PublishNowResultDto> {
    return legacy.retryPublish(userId, id);
  }
  cancelPublish(userId: string, id: string): Promise<PublishJobVo> {
    return legacy.cancelPublish(userId, id);
  }
  listPublishJobs(userId: string, characterId: string, q: ListPublishJobsQueryDto): Promise<PublishJobVo[]> {
    return legacy.listPublishJobs(userId, characterId, q || {});
  }
}
