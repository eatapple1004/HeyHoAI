import { Controller, HttpCode, HttpException, Get, Post, Patch, Delete, Param, Query, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccountsService, ACCOUNT_UPLOAD_OPTIONS } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResponse, ApiWithTotal } from '../common/dto/api-response.dto';
import { SocialAccountVo, AccountMediaVo, PostQueueItemVo, ReelTemplateVo, OutfitPromptVo } from './vo/account.vo';
import { ListAccountsQueryDto, ListMediaQueryDto, ListPostQueueQueryDto } from './dto/account.dto';

// /api/accounts — 소셜 계정 연결·미디어·의상/릴스 생성·발행 큐. 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   응답은 레거시 핸들러가 직접 쓴다(@Res) — 202·{error} 형태·백그라운드 작업까지 그대로 보존.
//   경로 충돌 없음: 고정 경로(reel-templates·outfit-prompts·post-queue·media)는 첫 세그먼트가 리터럴이라
//   :id 라우트(:id/status 등)와 겹치지 않는다. 선언 순서는 레거시 파일 순서를 그대로 따랐다.
@Controller('api/accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  /** ops 결과를 Nest 응답으로 변환 — 4xx/5xx는 예외로 올려 전역 필터가 처리한다. */
  private send(res: any, out: { status: number; body: any }) {
    if (out.status >= 400) throw new HttpException(out.body, out.status);
    if (out.status !== 200) res.status(out.status);
    return out.body;
  }

  // POST /api/accounts/sync — Zernio에서 연결된 계정 목록을 가져와 DB 동기화
  @Post('sync')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async sync(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('sync', req));
  }

  // GET /api/accounts — 저장된 계정 목록
  @Get()
  async list(@Req() req: any, @Query() q: ListAccountsQueryDto): Promise<ApiResponse<SocialAccountVo[]>> {
    return { success: true, data: await this.accounts.list(req.user.id, q) };
  }

  // GET /api/accounts/:id — 계정 상세
  @Get(':id')
  async getAccount(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<SocialAccountVo>> {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return { success: true, data: await this.accounts.account(id) };
  }

  // PATCH /api/accounts/:id/status — active|paused|disabled 전환
  @Patch(':id/status')
  async patchStatus(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('patchStatus', req));
  }

  // PATCH /api/accounts/:id/default-captions — 기본 캡션 저장
  @Patch(':id/default-captions')
  async patchDefaultCaptions(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('patchDefaultCaptions', req));
  }

  // GET /api/accounts/:id/analytics/detail — Zernio 계정 지표
  @Get(':id/analytics/detail')
  async getAnalyticsDetail(@Req() req: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id);
    return { success: true, data: await this.accounts.analyticsDetail(id) };
  }

  // GET /api/accounts/:id/analytics/posts — Zernio 게시물 지표
  @Get(':id/analytics/posts')
  async getAnalyticsPosts(@Req() req: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id);
    return { success: true, data: await this.accounts.analyticsPosts(id) };
  }

  // DELETE /api/accounts/:id — 계정 연결 해제
  @Delete(':id')
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('deleteAccount', req));
  }

  // POST /api/accounts/:id/base-photo — 기본 사진 지정
  @Post(':id/base-photo')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postBasePhoto(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postBasePhoto', req));
  }

  // GET /api/accounts/:id/base-photo — 기본 사진 조회
  @Get(':id/base-photo')
  async getBasePhoto(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<AccountMediaVo | null>> {
    await this.accounts.assertOwned(id, req.user.id);
    return { success: true, data: await this.accounts.basePhoto(id) };
  }

  // POST /api/accounts/:id/generate-outfits — 기본 사진 기반 의상 변경 생성(Gemini)
  @Post(':id/generate-outfits')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postGenerateOutfits(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postGenerateOutfits', req));
  }

  // POST /api/accounts/:id/generate-reel — 사진 → 릴스 생성(Kling) + 템플릿 저장
  @Post(':id/generate-reel')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postGenerateReel(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postGenerateReel', req));
  }

  // GET /api/accounts/:id/reel-templates — 릴스 프롬프트 템플릿 목록
  @Get(':id/reel-templates')
  async getReelTemplates(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<ReelTemplateVo[]>> {
    await this.accounts.assertOwned(id, req.user.id);
    return { success: true, data: await this.accounts.reelTemplates(id) };
  }

  // DELETE /api/accounts/reel-templates/:templateId — 릴스 템플릿 삭제
  @Delete('reel-templates/:templateId')
  async deleteReelTemplates(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('deleteReelTemplates', req));
  }

  // GET /api/accounts/:id/outfit-prompts — 의상 프롬프트 목록
  @Get(':id/outfit-prompts')
  async getOutfitPrompts(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<OutfitPromptVo[]>> {
    await this.accounts.assertOwned(id, req.user.id);
    return { success: true, data: await this.accounts.outfitPrompts(id) };
  }

  // POST /api/accounts/:id/outfit-prompts — 의상 프롬프트 저장
  @Post(':id/outfit-prompts')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postOutfitPrompts(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postOutfitPrompts', req));
  }

  // PATCH /api/accounts/outfit-prompts/:promptId — 의상 프롬프트 수정
  @Patch('outfit-prompts/:promptId')
  async patchOutfitPrompts(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('patchOutfitPrompts', req));
  }

  // DELETE /api/accounts/outfit-prompts/:promptId — 의상 프롬프트 삭제
  @Delete('outfit-prompts/:promptId')
  async deleteOutfitPrompts(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('deleteOutfitPrompts', req));
  }

  // POST /api/accounts/:id/batch-reels — 릴스 일괄 생성
  @Post(':id/batch-reels')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postBatchReels(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postBatchReels', req));
  }

  // GET /api/accounts/:id/post-queue — 발행 큐 목록
  @Get(':id/post-queue')
  async getPostQueue(@Req() req: any, @Param('id') id: string, @Query() q: ListPostQueueQueryDto): Promise<ApiResponse<PostQueueItemVo[]>> {
    await this.accounts.assertOwned(id, req.user.id);
    return { success: true, data: await this.accounts.postQueue(id, q) };
  }

  // POST /api/accounts/:id/post-queue — 발행 큐 추가
  @Post(':id/post-queue')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postPostQueue(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postPostQueue', req));
  }

  // PATCH /api/accounts/post-queue/:queueId — 큐 항목 수정
  @Patch('post-queue/:queueId')
  async patchPostQueue(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('patchPostQueue', req));
  }

  // POST /api/accounts/:id/publish-now — 즉시 발행
  @Post(':id/publish-now')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postPublishNow(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postPublishNow', req));
  }

  // POST /api/accounts/post-queue/:queueId/publish — 큐 항목 발행
  @Post('post-queue/:queueId/publish')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postPostQueuePublish(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('postPostQueuePublish', req));
  }

  // POST /api/accounts/post-queue/:queueId/duplicate — 큐 항목 복제
  @Post('post-queue/:queueId/duplicate')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postPostQueueDuplicate(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('postPostQueueDuplicate', req));
  }

  // POST /api/accounts/post-queue/:queueId/reupload — 큐 항목 미디어 재업로드
  @Post('post-queue/:queueId/reupload')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postPostQueueReupload(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('postPostQueueReupload', req));
  }

  // DELETE /api/accounts/post-queue/:queueId — 큐 항목 삭제
  @Delete('post-queue/:queueId')
  async deletePostQueue(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('deletePostQueue', req));
  }

  // GET /api/accounts/:id/media — 계정 미디어 목록(+total)
  @Get(':id/media')
  async getMedia(@Req() req: any, @Param('id') id: string, @Query() q: ListMediaQueryDto): Promise<ApiWithTotal<AccountMediaVo[]>> {
    await this.accounts.assertOwned(id, req.user.id);
    const { data, total } = await this.accounts.media(id, q);
    return { success: true, data, total };
  }

  // POST /api/accounts/:id/media/upload — 미디어 업로드(multipart file)
  @UseInterceptors(FileInterceptor('file', ACCOUNT_UPLOAD_OPTIONS))
  @Post(':id/media/upload')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postMediaUpload(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postMediaUpload', req));
  }

  // POST /api/accounts/:id/media/register — 생성물 파일명을 미디어로 등록
  @Post(':id/media/register')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  async postMediaRegister(@Req() req: any, @Res({ passthrough: true }) res: any, @Param('id') id: string) {
    await this.accounts.assertOwned(id, req.user.id); // 레거시 router.param('id')와 동일
    return this.send(res, await this.accounts.op('postMediaRegister', req));
  }

  // PATCH /api/accounts/media/:mediaId — 미디어 수정
  @Patch('media/:mediaId')
  async patchMedia(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('patchMedia', req));
  }

  // DELETE /api/accounts/media/:mediaId — 미디어 삭제
  @Delete('media/:mediaId')
  async deleteMedia(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.accounts.op('deleteMedia', req));
  }
}
