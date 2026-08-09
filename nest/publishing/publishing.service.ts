import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { PublishingRepository } from './publishing.repository';
import { CharacterRepository } from '../characters/character.repository';
import { MediaRepository } from '../media/media.repository';
import { OwnershipService } from '../common/security/ownership.service';
import { ContentVo, PublishJobVo } from './vo/content.vo';
import {
  SchedulePublishResultDto, PublishNowResultDto, CreateContentDto, UpdateContentDto,
  ScheduleContentDto, ListContentsQueryDto, ListPublishJobsQueryDto,
} from './dto/content.dto';

// 캡션 자동생성은 Claude 호출 엔진 — 이식 대상이 아니다(프롬프트·모델 설정 덩어리).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generateCaption } = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'caption.service.js'));
// 검증 스키마는 zod 단일소스 재사용(규칙 복제 금지).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  createContentRequestSchema, updateContentRequestSchema, scheduleContentRequestSchema,
} = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'content.validator.js'));

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

/** 편집 가능한 상태 — 게시가 걸린 뒤(scheduled 이후)엔 캡션을 바꿀 수 없다 */
const EDITABLE = ['draft', 'approved'];

@Injectable()
export class PublishingService {
  constructor(
    private readonly repo: PublishingRepository,
    private readonly characters: CharacterRepository,
    private readonly media: MediaRepository,
    private readonly ownership: OwnershipService,
  ) {}

  // ── 콘텐츠 ──

  /** 캐릭터 확인 → 미디어 소속 확인 → 캡션(수동 or Claude) → draft 저장 */
  async createContent(userId: string, body: CreateContentDto): Promise<ContentVo> {
    const input = createContentRequestSchema.parse(body);
    await this.ownership.assertCharacterOwned(input.characterId, userId);

    const character = await this.characters.findById(input.characterId);
    if (!character) throw httpError(404, 'Character not found');
    await this.assertMediaBelongsToCharacter(input.mediaType, input.mediaAssetIds, input.characterId);

    const caption = input.manualCaption
      ? { caption: input.manualCaption, hashtags: input.manualHashtags || [], callToAction: '', altText: '' }
      : await generateCaption({
          persona: (character as any).persona,
          mediaType: input.mediaType,
          mediaContext: input.mediaContext,
          theme: input.theme,
          mood: input.mood,
          language: input.language,
        });

    return this.repo.insertContent({
      characterId: input.characterId,
      mediaType: input.mediaType,
      mediaAssetIds: input.mediaAssetIds,
      caption: caption.caption,
      hashtags: caption.hashtags,
      callToAction: caption.callToAction,
      altText: caption.altText,
      mediaContext: input.mediaContext,
    });
  }

  async listContents(userId: string, characterId: string, q: ListContentsQueryDto): Promise<{ data: ContentVo[]; total: number }> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    const { status, limit, offset } = q || ({} as ListContentsQueryDto);
    const result = await this.repo.findContentsByCharacter(characterId, {
      status,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      offset: offset ? parseInt(String(offset), 10) : undefined,
    });
    return { data: result.rows, total: result.total };
  }

  async getContent(userId: string, id: string): Promise<ContentVo> {
    await this.ownership.assertContentOwned(id, userId);
    return this.getContentOrThrow(id);
  }

  async updateContent(userId: string, id: string, body: UpdateContentDto): Promise<ContentVo> {
    await this.ownership.assertContentOwned(id, userId);
    const content = await this.getContentOrThrow(id);
    this.assertEditable(content, 'edit');
    const fields = updateContentRequestSchema.parse(body);
    return (await this.repo.updateContent(id, fields)) as ContentVo;
  }

  /** 캡션 재생성 — 승인 상태였어도 **draft로 되돌린다**(사람이 다시 확인해야 하므로) */
  async regenerateCaption(userId: string, id: string): Promise<ContentVo> {
    await this.ownership.assertContentOwned(id, userId);
    const content = await this.getContentOrThrow(id);
    this.assertEditable(content, 'regenerate caption');

    const character = await this.characters.findById(content.character_id);
    const caption = await generateCaption({
      persona: (character as any)?.persona,
      mediaType: content.media_type,
      mediaContext: (content as any).media_context,
    });
    return (await this.repo.updateContent(id, {
      caption: caption.caption,
      hashtags: caption.hashtags,
      call_to_action: caption.callToAction,
      alt_text: caption.altText,
      status: 'draft',
    })) as ContentVo;
  }

  async approveContent(userId: string, id: string): Promise<ContentVo> {
    await this.ownership.assertContentOwned(id, userId);
    const content = await this.getContentOrThrow(id);
    if (content.status !== 'draft') {
      throw httpError(400, `Cannot approve content in "${content.status}" status`);
    }
    return (await this.repo.updateContentStatus(id, 'approved')) as ContentVo;
  }

  async rejectContent(userId: string, id: string): Promise<ContentVo> {
    await this.ownership.assertContentOwned(id, userId);
    const content = await this.getContentOrThrow(id);
    this.assertEditable(content, 'reject');
    return (await this.repo.updateContentStatus(id, 'rejected')) as ContentVo;
  }

  // ── 발행 Job ──

  /** 예약(또는 즉시 대기) — **승인된 콘텐츠만** 게시 대기열에 들어간다 */
  async schedulePublish(userId: string, id: string, body: ScheduleContentDto): Promise<SchedulePublishResultDto> {
    await this.ownership.assertContentOwned(id, userId);
    const opts = (body || ({} as ScheduleContentDto)).scheduledAt ? scheduleContentRequestSchema.parse(body) : {};
    return this.scheduleInternal(id, opts);
  }

  /** 승인 → 예약 → 실행을 한 번에(사용자가 "지금 올리기"를 눌렀을 때) */
  async publishNow(userId: string, id: string): Promise<PublishNowResultDto> {
    await this.ownership.assertContentOwned(id, userId);
    const content = await this.getContentOrThrow(id);
    if (content.status === 'draft') await this.repo.updateContentStatus(id, 'approved');
    const { publishJob } = await this.scheduleInternal(id, {});
    return this.executePublish(publishJob.id);
  }

  async retryPublish(userId: string, id: string): Promise<PublishNowResultDto> {
    await this.ownership.assertPublishJobOwned(id, userId);
    const job = await this.getJobOrThrow(id);
    if (job.status !== 'failed') throw httpError(400, 'Only failed jobs can be retried');
    await this.repo.updateJobStatus(id, { status: 'pending' });
    await this.repo.updateContentStatus(job.content_id, 'scheduled');
    return this.executePublish(id);
  }

  /** 취소 — 콘텐츠는 approved로 되돌린다(다시 예약할 수 있게) */
  async cancelPublish(userId: string, id: string): Promise<PublishJobVo> {
    await this.ownership.assertPublishJobOwned(id, userId);
    const job = await this.getJobOrThrow(id);
    if (!['pending', 'scheduled'].includes(job.status)) {
      throw httpError(400, `Cannot cancel job in "${job.status}" status`);
    }
    await this.repo.updateJobStatus(id, { status: 'cancelled' });
    await this.repo.updateContentStatus(job.content_id, 'approved');
    return (await this.repo.findJobById(id)) as PublishJobVo;
  }

  async listPublishJobs(userId: string, characterId: string, q: ListPublishJobsQueryDto): Promise<PublishJobVo[]> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    return this.repo.findJobsByCharacter(characterId, { status: (q || {}).status });
  }

  // ── 내부 ──

  private async scheduleInternal(contentId: string, opts: { scheduledAt?: string }): Promise<SchedulePublishResultDto> {
    const content = await this.getContentOrThrow(contentId);
    if (content.status !== 'approved') {
      throw httpError(400, `Content must be approved before scheduling. Current: "${content.status}"`);
    }
    if (opts.scheduledAt && new Date(opts.scheduledAt) <= new Date()) {
      throw httpError(400, 'Scheduled time must be in the future');
    }
    const publishJob = await this.repo.insertPublishJob({
      contentId, characterId: content.character_id, scheduledAt: opts.scheduledAt,
    });
    const updatedContent = await this.repo.updateContent(contentId, {
      status: 'scheduled', scheduled_at: opts.scheduledAt || null,
    });
    return { content: updatedContent as ContentVo, publishJob };
  }

  /**
   * 게시 실행.
   * ⚠️ **Instagram Graph API 연동 전까지 stub**이다 — 성공을 흉내내고 가짜 media id를 남긴다.
   *   실제 연동 지점: ① POST /{ig-user-id}/media(컨테이너) ② POST /media_publish ③ 결과 id·permalink 저장.
   *   실패 시 Job은 failed, 콘텐츠도 failed로 내려 재시도 대상이 되게 한다.
   */
  private async executePublish(publishJobId: string): Promise<PublishJobVo> {
    const job = await this.getJobOrThrow(publishJobId);
    if (job.status !== 'pending') throw httpError(400, `Job is already "${job.status}"`);

    const attempt = (job.attempt || 0) + 1;
    try {
      await this.repo.updateJobStatus(publishJobId, { status: 'publishing', attempt });
      const stamp = Date.now();
      await this.repo.updateJobStatus(publishJobId, {
        status: 'published',
        igMediaId: `stub_${stamp}`,
        igPermalink: `https://www.instagram.com/p/stub_${stamp}`,
      });
      await this.repo.updateContentStatus(job.content_id, 'published');
      return (await this.repo.findJobById(publishJobId)) as PublishJobVo;
    } catch (err: any) {
      await this.repo.updateJobStatus(publishJobId, { status: 'failed', error: err.message, attempt });
      await this.repo.updateContentStatus(job.content_id, 'failed');
      throw err;
    }
  }

  private async getContentOrThrow(id: string): Promise<ContentVo> {
    const content = await this.repo.findContentById(id);
    if (!content) throw httpError(404, 'Content not found');
    return content;
  }

  private async getJobOrThrow(id: string): Promise<PublishJobVo> {
    const job = await this.repo.findJobById(id);
    if (!job) throw httpError(404, 'Publish job not found');
    return job;
  }

  private assertEditable(content: ContentVo, action: string): void {
    if (!EDITABLE.includes(content.status)) {
      const verb = action === 'edit' ? 'edit content' : action === 'reject' ? 'reject content' : action;
      throw httpError(400, `Cannot ${verb} in "${content.status}" status`);
    }
  }

  /** 다른 캐릭터의 에셋으로 콘텐츠를 만들지 못하게 — id 존재 + 소속을 함께 확인 */
  private async assertMediaBelongsToCharacter(mediaType: string, assetIds: string[], characterId: string): Promise<void> {
    for (const assetId of assetIds) {
      const asset = mediaType === 'video'
        ? await this.media.findVideoById(assetId)
        : await this.media.findImageById(assetId);
      if (!asset) throw httpError(404, `Media asset ${assetId} not found`);
      if (asset.character_id !== characterId) {
        throw httpError(400, `Media asset ${assetId} does not belong to character ${characterId}`);
      }
    }
  }
}
