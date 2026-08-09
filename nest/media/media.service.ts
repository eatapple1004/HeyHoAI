import { Injectable } from '@nestjs/common';
import { ImageAssetVo, VideoAssetVo, GenerationJobVo, VideoJobVo, VisualAttributeVo, VisualCategoryVo, VisualPresetVo } from './vo/media.vo';
import { GenerateImagesResultDto, GenerateVideoResultDto, CompilePromptResultDto, ListByStatusQueryDto, CreateVisualPresetDto, CompilePromptDto, ListAttributesQueryDto } from './dto/media.dto';
import * as path from 'path';

// 이미지·영상·비주얼 오케스트레이션 재사용(중복 금지) — 레거시 *.api.js 단일소스.
//   dist/media/media.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const imageApi = require(path.join(__dirname, '..', '..', 'src', 'images', 'image.api.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const videoApi = require(path.join(__dirname, '..', '..', 'src', 'videos', 'video.api.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const visualApi = require(path.join(__dirname, '..', '..', 'src', 'visuals', 'visual.api.js'));

@Injectable()
export class MediaService {
  // ── 이미지 ──
  generateImages(userId: string, characterId: string, body: any): Promise<GenerateImagesResultDto> {
    return imageApi.generate(userId, characterId, body);
  }
  listImages(userId: string, characterId: string, q: ListByStatusQueryDto): Promise<ImageAssetVo[]> {
    return imageApi.listByCharacter(userId, characterId, q || {});
  }
  listImageJobs(userId: string, characterId: string): Promise<GenerationJobVo[]> {
    return imageApi.listJobs(userId, characterId);
  }
  setMasterImage(userId: string, characterId: string, imageId: string): Promise<ImageAssetVo> {
    return imageApi.setMaster(userId, characterId, imageId);
  }
  getImage(userId: string, id: string): Promise<ImageAssetVo> {
    return imageApi.getById(userId, id);
  }

  // ── 영상 ──
  generateVideo(userId: string, characterId: string, body: any): Promise<GenerateVideoResultDto> {
    return videoApi.generate(userId, characterId, body);
  }
  listVideos(userId: string, characterId: string, q: ListByStatusQueryDto): Promise<VideoAssetVo[]> {
    return videoApi.listByCharacter(userId, characterId, q || {});
  }
  listVideoJobs(userId: string, characterId: string): Promise<VideoJobVo[]> {
    return videoApi.listJobs(userId, characterId);
  }
  getVideo(userId: string, id: string): Promise<VideoAssetVo> {
    return videoApi.getById(userId, id);
  }
  getVideoJob(userId: string, jobId: string): Promise<VideoJobVo> {
    return videoApi.getJob(userId, jobId);
  }

  // ── 비주얼 속성/프리셋 ──
  listCategories(): Promise<VisualCategoryVo[]> {
    return visualApi.listCategories();
  }
  listAttributes(q: ListAttributesQueryDto): Promise<VisualAttributeVo[]> {
    return visualApi.listAttributes(q || {});
  }
  createAttribute(body: any): Promise<VisualAttributeVo> {
    return visualApi.createAttribute(body);
  }
  compilePrompt(body: CompilePromptDto): Promise<CompilePromptResultDto> {
    return visualApi.compilePrompt(body || {});
  }
  createPreset(userId: string, characterId: string, body: CreateVisualPresetDto): Promise<VisualPresetVo> {
    return visualApi.createPreset(userId, characterId, body || {});
  }
  listPresets(userId: string, characterId: string): Promise<VisualPresetVo[]> {
    return visualApi.listPresets(userId, characterId);
  }
}
