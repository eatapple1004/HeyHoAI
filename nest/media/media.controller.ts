import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 캐릭터 하위 미디어 경로 — 레거시에서 image/video/visual 라우터가 /api 루트에 나눠 마운트돼
//   /api/characters/:characterId/... 를 공유하던 것을 하나의 컨트롤러로 모았다.
//   ⚠️ CharactersController(/api/characters)보다 먼저 등록해야 :id 라우트가 먼저 잡지 않는다.
@Controller('api/characters/:characterId')
@UseGuards(JwtAuthGuard)
export class CharacterMediaController {
  constructor(private readonly media: MediaService) {}

  // POST /api/characters/:characterId/images/generate (201)
  @Post('images/generate')
  async generateImages(@Req() req: any, @Param('characterId') characterId: string, @Body() body: any) {
    return { success: true, data: await this.media.generateImages(req.user.id, characterId, body) };
  }

  // GET /api/characters/:characterId/images/jobs — :imageId보다 먼저 선언
  @Get('images/jobs')
  async imageJobs(@Req() req: any, @Param('characterId') characterId: string) {
    return { success: true, data: await this.media.listImageJobs(req.user.id, characterId) };
  }

  // GET /api/characters/:characterId/images
  @Get('images')
  async images(@Req() req: any, @Param('characterId') characterId: string, @Query() q: any) {
    return { success: true, data: await this.media.listImages(req.user.id, characterId, q) };
  }

  // PUT /api/characters/:characterId/images/:imageId/master
  @Put('images/:imageId/master')
  async setMaster(
    @Req() req: any,
    @Param('characterId') characterId: string,
    @Param('imageId') imageId: string,
  ) {
    return { success: true, data: await this.media.setMasterImage(req.user.id, characterId, imageId) };
  }

  // POST /api/characters/:characterId/videos/generate (201)
  @Post('videos/generate')
  async generateVideo(@Req() req: any, @Param('characterId') characterId: string, @Body() body: any) {
    return { success: true, data: await this.media.generateVideo(req.user.id, characterId, body) };
  }

  // GET /api/characters/:characterId/videos/jobs
  @Get('videos/jobs')
  async videoJobs(@Req() req: any, @Param('characterId') characterId: string) {
    return { success: true, data: await this.media.listVideoJobs(req.user.id, characterId) };
  }

  // GET /api/characters/:characterId/videos
  @Get('videos')
  async videos(@Req() req: any, @Param('characterId') characterId: string, @Query() q: any) {
    return { success: true, data: await this.media.listVideos(req.user.id, characterId, q) };
  }

  // POST /api/characters/:characterId/visual-presets (201)
  @Post('visual-presets')
  async createPreset(@Req() req: any, @Param('characterId') characterId: string, @Body() body: any) {
    return { success: true, data: await this.media.createPreset(req.user.id, characterId, body) };
  }

  // GET /api/characters/:characterId/visual-presets
  @Get('visual-presets')
  async listPresets(@Req() req: any, @Param('characterId') characterId: string) {
    return { success: true, data: await this.media.listPresets(req.user.id, characterId) };
  }
}

// /api/images — 이미지 단건 조회
@Controller('api/images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly media: MediaService) {}

  // GET /api/images/:id
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.media.getImage(req.user.id, id) };
  }
}

// /api/videos — 영상·Job 단건 조회
@Controller('api/videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly media: MediaService) {}

  // GET /api/videos/jobs/:jobId — :id보다 먼저 선언
  @Get('jobs/:jobId')
  async getJob(@Req() req: any, @Param('jobId') jobId: string) {
    return { success: true, data: await this.media.getVideoJob(req.user.id, jobId) };
  }

  // GET /api/videos/:id
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.media.getVideo(req.user.id, id) };
  }
}

// /api/visuals — 카테고리·속성·프롬프트 컴파일
@Controller('api/visuals')
@UseGuards(JwtAuthGuard)
export class VisualsController {
  constructor(private readonly media: MediaService) {}

  // GET /api/visuals/categories
  @Get('categories')
  async categories() {
    return { success: true, data: await this.media.listCategories() };
  }

  // GET /api/visuals/attributes?category=&tags=
  @Get('attributes')
  async attributes(@Query() q: any) {
    return { success: true, data: await this.media.listAttributes(q) };
  }

  // POST /api/visuals/attributes (201)
  @Post('attributes')
  async createAttribute(@Body() body: any) {
    return { success: true, data: await this.media.createAttribute(body) };
  }

  // POST /api/visuals/compile — attribute_ids → 조합 프롬프트
  @Post('compile')
  @HttpCode(200) // 레거시 res.json=200
  async compile(@Body() body: any) {
    return { success: true, data: await this.media.compilePrompt(body) };
  }
}
