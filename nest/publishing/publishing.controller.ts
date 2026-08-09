import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResponse, ApiPaginated } from '../common/dto/api-response.dto';
import { ContentVo, PublishJobVo } from './vo/content.vo';
import { SchedulePublishResultDto, PublishNowResultDto, CreateContentDto, UpdateContentDto, ScheduleContentDto, ListContentsQueryDto, ListPublishJobsQueryDto } from './dto/content.dto';

// /api/contents — 콘텐츠 초안 작성·승인·캡션 재생성. 인증 필요(= 레거시 requireAuth).
@Controller('api/contents')
@UseGuards(JwtAuthGuard)
export class ContentsController {
  constructor(private readonly publishing: PublishingService) {}

  // POST /api/contents (레거시도 201)
  @Post()
  async create(@Req() req: any, @Body() body: CreateContentDto): Promise<ApiResponse<ContentVo>> {
    return { success: true, data: await this.publishing.createContent(req.user.id, body) };
  }

  // GET /api/contents/:id
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<ContentVo>> {
    return { success: true, data: await this.publishing.getContent(req.user.id, id) };
  }

  // PATCH /api/contents/:id
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateContentDto): Promise<ApiResponse<ContentVo>> {
    return { success: true, data: await this.publishing.updateContent(req.user.id, id, body) };
  }

  // POST /api/contents/:id/regenerate-caption
  @Post(':id/regenerate-caption')
  @HttpCode(200) // 레거시 res.json=200
  async regenerateCaption(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<ContentVo>> {
    return { success: true, data: await this.publishing.regenerateCaption(req.user.id, id) };
  }

  // POST /api/contents/:id/approve
  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<ContentVo>> {
    return { success: true, data: await this.publishing.approveContent(req.user.id, id) };
  }

  // POST /api/contents/:id/reject
  @Post(':id/reject')
  @HttpCode(200)
  async reject(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<ContentVo>> {
    return { success: true, data: await this.publishing.rejectContent(req.user.id, id) };
  }

  // POST /api/contents/:id/schedule — 발행 예약(레거시도 201)
  @Post(':id/schedule')
  async schedule(@Req() req: any, @Param('id') id: string, @Body() body: ScheduleContentDto): Promise<ApiResponse<SchedulePublishResultDto>> {
    return { success: true, data: await this.publishing.schedulePublish(req.user.id, id, body) };
  }

  // POST /api/contents/:id/publish-now — 승인+예약+실행 한 번에
  @Post(':id/publish-now')
  @HttpCode(200)
  async publishNow(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<PublishNowResultDto>> {
    return { success: true, data: await this.publishing.publishNow(req.user.id, id) };
  }
}

// /api/publish-jobs — 발행 작업 재시도·취소
@Controller('api/publish-jobs')
@UseGuards(JwtAuthGuard)
export class PublishJobsController {
  constructor(private readonly publishing: PublishingService) {}

  // POST /api/publish-jobs/:id/retry
  @Post(':id/retry')
  @HttpCode(200)
  async retry(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<PublishNowResultDto>> {
    return { success: true, data: await this.publishing.retryPublish(req.user.id, id) };
  }

  // POST /api/publish-jobs/:id/cancel
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<PublishJobVo>> {
    return { success: true, data: await this.publishing.cancelPublish(req.user.id, id) };
  }
}

// 캐릭터별 콘텐츠·발행작업 목록 — /api/characters를 Nest가 소유하므로 여기서 함께 제공한다.
//   (이 두 경로가 없으면 /api/characters/:id/contents 가 Nest 404로 떨어진다.)
@Controller('api/characters/:characterId')
@UseGuards(JwtAuthGuard)
export class CharacterPublishingController {
  constructor(private readonly publishing: PublishingService) {}

  // GET /api/characters/:characterId/contents (+pagination.total)
  @Get('contents')
  async contents(@Req() req: any, @Param('characterId') characterId: string, @Query() q: ListContentsQueryDto): Promise<ApiPaginated<ContentVo[]>> {
    const { data, total } = await this.publishing.listContents(req.user.id, characterId, q);
    return { success: true, data, pagination: { total } };
  }

  // GET /api/characters/:characterId/publish-jobs
  @Get('publish-jobs')
  async publishJobs(@Req() req: any, @Param('characterId') characterId: string, @Query() q: ListPublishJobsQueryDto): Promise<ApiResponse<PublishJobVo[]>> {
    return { success: true, data: await this.publishing.listPublishJobs(req.user.id, characterId, q) };
  }
}
