import { Controller, HttpCode, Get, Post, Patch, Delete, Req, Res, Next, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  GenerateService,
  GENERATE_UPLOAD_OPTIONS,
  BGM_UPLOAD_OPTIONS,
  UGC_MAX_PRODUCT_IMAGES,
} from './generate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/generate — 생성 엔진(이미지·영상·UGC 광고·커뮤니티·리뷰·BGM·로그). 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   응답은 레거시 핸들러가 직접 쓴다(@Res) — 스트리밍·202·{error} 형태·백그라운드 작업을 그대로 보존.
//   멀티파트는 레거시와 동일한 multer 설정을 Nest 인터셉터에 넘겨 저장경로·파일명·용량 제한을 맞춘다.
@Controller('api/generate')
@UseGuards(JwtAuthGuard)
export class GenerateController {
  constructor(private readonly generate: GenerateService) {}

  // POST /api/generate
  @UseInterceptors(FilesInterceptor('referenceImages', 14, GENERATE_UPLOAD_OPTIONS))
  @Post()
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postRoot(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postRoot', req, res, next);
  }

  // POST /api/generate/caption
  @Post('caption')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postCaption(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postCaption', req, res, next);
  }

  // POST /api/generate/enhance
  @Post('enhance')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postEnhance(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postEnhance', req, res, next);
  }

  // GET /api/generate/tools
  @Get('tools')
  getTools(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getTools', req, res, next);
  }

  // GET /api/generate/styles
  @Get('styles')
  getStyles(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getStyles', req, res, next);
  }

  // GET /api/generate/prompts
  @Get('prompts')
  getPrompts(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getPrompts', req, res, next);
  }

  // GET /api/generate/prompts/:idx
  @Get('prompts/:idx')
  getPrompts2(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getPrompts2', req, res, next);
  }

  // GET /api/generate/results
  @Get('results')
  getResults(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getResults', req, res, next);
  }

  // GET /api/generate/community
  @Get('community')
  getCommunity(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getCommunity', req, res, next);
  }

  // PATCH /api/generate/results/:idx/visibility
  @Patch('results/:idx/visibility')
  patchResultsVisibility(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('patchResultsVisibility', req, res, next);
  }

  // POST /api/generate/results/:idx/report
  @Post('results/:idx/report')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postResultsReport(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postResultsReport', req, res, next);
  }

  // POST /api/generate/results/:idx/like
  @Post('results/:idx/like')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postResultsLike(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postResultsLike', req, res, next);
  }

  // DELETE /api/generate/results/:idx/like
  @Delete('results/:idx/like')
  deleteResultsLike(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('deleteResultsLike', req, res, next);
  }

  // GET /api/generate/creations/:idx
  @Get('creations/:idx')
  getCreations(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getCreations', req, res, next);
  }

  // POST /api/generate/creations/:idx/add-to-my-templates
  @Post('creations/:idx/add-to-my-templates')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postCreationsAddToMyTemplates(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postCreationsAddToMyTemplates', req, res, next);
  }

  // DELETE /api/generate/creations/:idx
  @Delete('creations/:idx')
  deleteCreations(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('deleteCreations', req, res, next);
  }

  // GET /api/generate/creator-overview
  @Get('creator-overview')
  getCreatorOverview(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getCreatorOverview', req, res, next);
  }

  // GET /api/generate/reviews
  @Get('reviews')
  getReviews(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getReviews', req, res, next);
  }

  // PATCH /api/generate/reviews/:idx
  @Patch('reviews/:idx')
  patchReviews(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('patchReviews', req, res, next);
  }

  // DELETE /api/generate/reviews/:idx
  @Delete('reviews/:idx')
  deleteReviews(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('deleteReviews', req, res, next);
  }

  // POST /api/generate/video/async
  @UseInterceptors(FileFieldsInterceptor([{ name: 'sourceImage', maxCount: 1 }, { name: 'endFrame', maxCount: 1 }], GENERATE_UPLOAD_OPTIONS))
  @Post('video/async')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postVideoAsync(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postVideoAsync', req, res, next);
  }

  // GET /api/generate/video/jobs
  @Get('video/jobs')
  getVideoJobs(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getVideoJobs', req, res, next);
  }

  // GET /api/generate/video/jobs/:id
  @Get('video/jobs/:id')
  getVideoJobs2(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getVideoJobs2', req, res, next);
  }

  // GET /api/generate/faceswap/jobs/:id
  @Get('faceswap/jobs/:id')
  getFaceswapJobs(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getFaceswapJobs', req, res, next);
  }

  // POST /api/generate/ugc/script
  @UseInterceptors(FileFieldsInterceptor([{ name: 'productImage', maxCount: UGC_MAX_PRODUCT_IMAGES }], GENERATE_UPLOAD_OPTIONS))
  @Post('ugc/script')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcScript(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcScript', req, res, next);
  }

  // POST /api/generate/ugc/refine-scene
  @Post('ugc/refine-scene')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcRefineScene(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcRefineScene', req, res, next);
  }

  // POST /api/generate/ugc/suggest-scenes
  @Post('ugc/suggest-scenes')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcSuggestScenes(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcSuggestScenes', req, res, next);
  }

  // POST /api/generate/ugc/suggest-concept
  @UseInterceptors(FileFieldsInterceptor([{ name: 'productImage', maxCount: UGC_MAX_PRODUCT_IMAGES }], GENERATE_UPLOAD_OPTIONS))
  @Post('ugc/suggest-concept')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcSuggestConcept(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcSuggestConcept', req, res, next);
  }

  // POST /api/generate/ugc/render
  @UseInterceptors(FileFieldsInterceptor([{ name: 'productImage', maxCount: UGC_MAX_PRODUCT_IMAGES }], GENERATE_UPLOAD_OPTIONS))
  @Post('ugc/render')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcRender(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcRender', req, res, next);
  }

  // POST /api/generate/ugc/async
  @UseInterceptors(FileFieldsInterceptor([{ name: 'productImage', maxCount: UGC_MAX_PRODUCT_IMAGES }], GENERATE_UPLOAD_OPTIONS))
  @Post('ugc/async')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcAsync(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcAsync', req, res, next);
  }

  // GET /api/generate/ugc/jobs
  @Get('ugc/jobs')
  getUgcJobs(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getUgcJobs', req, res, next);
  }

  // GET /api/generate/ugc/jobs/by-result/:idx
  @Get('ugc/jobs/by-result/:idx')
  getUgcJobsByResult(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getUgcJobsByResult', req, res, next);
  }

  // GET /api/generate/ugc/jobs/:id
  @Get('ugc/jobs/:id')
  getUgcJobs2(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getUgcJobs2', req, res, next);
  }

  // POST /api/generate/ugc/jobs/:id/commit
  @Post('ugc/jobs/:id/commit')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcJobsCommit(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcJobsCommit', req, res, next);
  }

  // POST /api/generate/ugc/re-render
  @Post('ugc/re-render')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postUgcReRender(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postUgcReRender', req, res, next);
  }

  // GET /api/generate/ugc/voice-preview
  @Get('ugc/voice-preview')
  getUgcVoicePreview(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getUgcVoicePreview', req, res, next);
  }

  // POST /api/generate/video
  @UseInterceptors(FileFieldsInterceptor([{ name: 'sourceImage', maxCount: 1 }, { name: 'endFrameImage', maxCount: 1 }], GENERATE_UPLOAD_OPTIONS))
  @Post('video')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postVideo(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postVideo', req, res, next);
  }

  // POST /api/generate/bgm/upload
  @UseInterceptors(FileInterceptor('file', BGM_UPLOAD_OPTIONS))
  @Post('bgm/upload')
  @HttpCode(200) // 레거시 Express 기본값 200 — 핸들러가 res.status(201/202)를 쓰면 그쪽이 우선
  postBgmUpload(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('postBgmUpload', req, res, next);
  }

  // GET /api/generate/bgm/list
  @Get('bgm/list')
  getBgmList(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getBgmList', req, res, next);
  }

  // DELETE /api/generate/bgm/:filename
  @Delete('bgm/:filename')
  deleteBgm(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('deleteBgm', req, res, next);
  }

  // PATCH /api/generate/bgm/:filename
  @Patch('bgm/:filename')
  patchBgm(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('patchBgm', req, res, next);
  }

  // GET /api/generate/images
  @Get('images')
  getImages(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getImages', req, res, next);
  }

  // GET /api/generate/logs
  @Get('logs')
  getLogs(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getLogs', req, res, next);
  }

  // GET /api/generate/logs/files
  @Get('logs/files')
  getLogsFiles(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.generate.run('getLogsFiles', req, res, next);
  }
}
