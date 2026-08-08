import { Injectable } from '@nestjs/common';
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
  generateImages(userId: string, characterId: string, body: any) {
    return imageApi.generate(userId, characterId, body);
  }
  listImages(userId: string, characterId: string, q: any) {
    return imageApi.listByCharacter(userId, characterId, q || {});
  }
  listImageJobs(userId: string, characterId: string) {
    return imageApi.listJobs(userId, characterId);
  }
  setMasterImage(userId: string, characterId: string, imageId: string) {
    return imageApi.setMaster(userId, characterId, imageId);
  }
  getImage(userId: string, id: string) {
    return imageApi.getById(userId, id);
  }

  // ── 영상 ──
  generateVideo(userId: string, characterId: string, body: any) {
    return videoApi.generate(userId, characterId, body);
  }
  listVideos(userId: string, characterId: string, q: any) {
    return videoApi.listByCharacter(userId, characterId, q || {});
  }
  listVideoJobs(userId: string, characterId: string) {
    return videoApi.listJobs(userId, characterId);
  }
  getVideo(userId: string, id: string) {
    return videoApi.getById(userId, id);
  }
  getVideoJob(userId: string, jobId: string) {
    return videoApi.getJob(userId, jobId);
  }

  // ── 비주얼 속성/프리셋 ──
  listCategories() {
    return visualApi.listCategories();
  }
  listAttributes(q: any) {
    return visualApi.listAttributes(q || {});
  }
  createAttribute(body: any) {
    return visualApi.createAttribute(body);
  }
  compilePrompt(body: any) {
    return visualApi.compilePrompt(body || {});
  }
  createPreset(userId: string, characterId: string, body: any) {
    return visualApi.createPreset(userId, characterId, body || {});
  }
  listPresets(userId: string, characterId: string) {
    return visualApi.listPresets(userId, characterId);
  }
}
